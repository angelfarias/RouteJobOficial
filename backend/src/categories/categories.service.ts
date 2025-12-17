import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { App } from 'firebase-admin/app';
import { getFirestore, Firestore, Timestamp } from 'firebase-admin/firestore';
import { Category, CategoryNode, DeletionStrategy } from './interfaces/category.interface';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Injectable()
export class CategoriesService {
  private db: Firestore;

  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseApp: App,
  ) {
    this.db = getFirestore(this.firebaseApp);
  }

  async createCategory(parentId: string | null, dto: CreateCategoryDto): Promise<Category> {
    const now = Timestamp.now();
    const docRef = this.db.collection('categories').doc();

    // Validate parent exists if provided
    let parentCategory: Category | null = null;
    if (parentId) {
      parentCategory = await this.findById(parentId);
      if (!parentCategory) {
        throw new BadRequestException(`Parent category with ID ${parentId} not found`);
      }
      
      // Check for circular reference (basic check)
      if (parentId === docRef.id) {
        throw new BadRequestException('Category cannot be its own parent');
      }
    }

    // Calculate path and level
    const path = parentCategory ? [...parentCategory.path, dto.name] : [dto.name];
    const pathString = path.join('.');
    const level = parentCategory ? parentCategory.level + 1 : 0;

    // Create category data
    const categoryData: Omit<Category, 'id'> = {
      name: dto.name,
      description: dto.description || '',
      parentId: parentId,
      path: path,
      pathString: pathString,
      level: level,
      isActive: dto.isActive ?? true,
      displayOrder: dto.displayOrder ?? 0,
      createdAt: now,
      updatedAt: now,
      childCount: 0,
      vacancyCount: 0,
      totalVacancyCount: 0,
    };

    await docRef.set(categoryData);

    // Update parent's child count if applicable
    if (parentCategory) {
      await this.updateChildCount(parentId!, parentCategory.childCount + 1);
    }

    return { id: docRef.id, ...categoryData };
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const docRef = this.db.collection('categories').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const currentCategory = { id: doc.id, ...doc.data() } as Category;
    const now = Timestamp.now();

    // Prepare update data
    const updateData: Partial<Category> = {
      updatedAt: now,
    };

    if (dto.name !== undefined) {
      updateData.name = dto.name;
      
      // If name changes, we need to update the path
      const newPath = [...currentCategory.path];
      newPath[newPath.length - 1] = dto.name;
      updateData.path = newPath;
      updateData.pathString = newPath.join('.');
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }

    if (dto.displayOrder !== undefined) {
      updateData.displayOrder = dto.displayOrder;
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    await docRef.update(updateData);

    // If name changed, update all descendant paths
    if (dto.name !== undefined && dto.name !== currentCategory.name) {
      const newPath = updateData.path!;
      const newLevel = currentCategory.level;
      await this.updateDescendantPaths(id, newPath, newLevel);
    }

    return { ...currentCategory, ...updateData };
  }

  async deleteCategory(id: string, strategy: DeletionStrategy): Promise<void> {
    const category = await this.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if category has active vacancies
    const hasActiveVacancies = await this.hasActiveVacancies(id);
    if (hasActiveVacancies) {
      throw new BadRequestException(
        `Cannot delete category ${category.name} because it has active job vacancies. ` +
        'Please reassign or remove the vacancies first.'
      );
    }

    // Get all child categories
    const children = await this.getChildCategories(id);

    // Handle children based on strategy
    switch (strategy) {
      case DeletionStrategy.CASCADE:
        await this.cascadeDeleteChildren(children);
        break;
      
      case DeletionStrategy.MOVE_TO_PARENT:
        await this.moveChildrenToParent(children, category.parentId);
        break;
      
      case DeletionStrategy.MOVE_TO_ROOT:
        await this.moveChildrenToRoot(children);
        break;
      
      default:
        throw new BadRequestException(`Invalid deletion strategy: ${strategy}`);
    }

    // Update parent's child count if category has a parent
    if (category.parentId) {
      const parent = await this.findById(category.parentId);
      if (parent) {
        await this.updateChildCount(category.parentId, parent.childCount - 1);
      }
    }

    // Delete the category itself
    await this.db.collection('categories').doc(id).delete();
  }

  async moveCategory(id: string, newParentId: string | null): Promise<Category> {
    const category = await this.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Validate new parent exists if provided
    if (newParentId) {
      const newParent = await this.findById(newParentId);
      if (!newParent) {
        throw new BadRequestException(`New parent category with ID ${newParentId} not found`);
      }

      // Prevent circular references
      const isValidMove = await this.validateParentChild(id, newParentId);
      if (!isValidMove) {
        throw new BadRequestException('Cannot move category: would create circular reference');
      }
    }

    // If moving to the same parent, no operation needed
    if (category.parentId === newParentId) {
      return category;
    }

    // Update old parent's child count
    if (category.parentId) {
      const oldParent = await this.findById(category.parentId);
      if (oldParent) {
        await this.updateChildCount(category.parentId, oldParent.childCount - 1);
      }
    }

    // Update the category's parent and recalculate paths
    await this.updateCategoryParent(category, newParentId);

    // Return the updated category
    return await this.findById(id) as Category;
  }

  async getCategoryTree(): Promise<CategoryNode[]> {
    // Get all categories (we'll filter active ones in memory to avoid index requirements)
    const snapshot = await this.db
      .collection('categories')
      .get();

    const allCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
    
    // Filter active categories and sort in memory
    const categories = allCategories
      .filter(cat => cat.isActive !== false) // Include categories where isActive is true or undefined
      .sort((a, b) => {
        // Sort by displayOrder first, then by name
        if (a.displayOrder !== b.displayOrder) {
          return (a.displayOrder || 0) - (b.displayOrder || 0);
        }
        return (a.name || '').localeCompare(b.name || '');
      });

    // Build the tree structure
    return this.buildCategoryTree(categories);
  }

  async getCategoryPath(id: string): Promise<string[]> {
    const category = await this.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category.path;
  }

  async searchCategories(query: string, options?: { limit?: number; parentId?: string }): Promise<Category[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const limit = options?.limit || 20;

    // Get all active categories
    let categoriesQuery = this.db
      .collection('categories')
      .where('isActive', '==', true);

    // If parentId is specified, filter by parent
    if (options?.parentId) {
      categoriesQuery = categoriesQuery.where('parentId', '==', options.parentId);
    }

    const snapshot = await categoriesQuery.get();
    const allCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));

    // Filter categories based on search query
    const matchingCategories = allCategories.filter(category => {
      // Search in name (primary match)
      const nameMatch = category.name.toLowerCase().includes(normalizedQuery);
      
      // Search in description (secondary match)
      const descriptionMatch = category.description?.toLowerCase().includes(normalizedQuery) || false;
      
      // Search in path (tertiary match - for finding categories by parent names)
      const pathMatch = category.path.some(pathSegment => 
        pathSegment.toLowerCase().includes(normalizedQuery)
      );

      return nameMatch || descriptionMatch || pathMatch;
    });

    // Sort by relevance (name matches first, then description, then path)
    const sortedCategories = matchingCategories.sort((a, b) => {
      const aNameMatch = a.name.toLowerCase().includes(normalizedQuery);
      const bNameMatch = b.name.toLowerCase().includes(normalizedQuery);
      
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      
      // If both or neither match by name, sort by name alphabetically
      return a.name.localeCompare(b.name);
    });

    // Apply limit
    return sortedCategories.slice(0, limit);
  }

  async findById(id: string): Promise<Category | null> {
    const docRef = this.db.collection('categories').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() } as Category;
  }

  async findByPath(path: string[]): Promise<Category | null> {
    const pathString = path.join('.');
    const snapshot = await this.db
      .collection('categories')
      .where('pathString', '==', pathString)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Category;
  }

  // Helper method to update child count
  private async updateChildCount(categoryId: string, newCount: number): Promise<void> {
    const docRef = this.db.collection('categories').doc(categoryId);
    await docRef.update({
      childCount: newCount,
      updatedAt: Timestamp.now(),
    });
  }

  // Helper method to validate parent-child relationships
  private async validateParentChild(categoryId: string, parentId: string): Promise<boolean> {
    // Prevent circular references by checking if parentId is a descendant of categoryId
    let currentParentId: string | null = parentId;
    const visited = new Set<string>();

    while (currentParentId && !visited.has(currentParentId)) {
      if (currentParentId === categoryId) {
        return false; // Circular reference detected
      }

      visited.add(currentParentId);
      const parent = await this.findById(currentParentId);
      currentParentId = parent?.parentId || null;
    }

    return true;
  }

  // Helper method to check if category has active vacancies
  private async hasActiveVacancies(categoryId: string): Promise<boolean> {
    // Check in category-vacancy associations
    const snapshot = await this.db
      .collection('category-vacancies')
      .where('categoryId', '==', categoryId)
      .limit(1)
      .get();

    return !snapshot.empty;
  }

  // Helper method to get all direct child categories
  private async getChildCategories(parentId: string): Promise<Category[]> {
    const snapshot = await this.db
      .collection('categories')
      .where('parentId', '==', parentId)
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
  }

  // Helper method for cascade deletion
  private async cascadeDeleteChildren(children: Category[]): Promise<void> {
    for (const child of children) {
      // Recursively delete each child (which will handle their children too)
      await this.deleteCategory(child.id, DeletionStrategy.CASCADE);
    }
  }

  // Helper method to move children to parent
  private async moveChildrenToParent(children: Category[], newParentId: string | null): Promise<void> {
    for (const child of children) {
      await this.updateCategoryParent(child, newParentId);
    }
  }

  // Helper method to move children to root
  private async moveChildrenToRoot(children: Category[]): Promise<void> {
    for (const child of children) {
      await this.updateCategoryParent(child, null);
    }
  }

  // Helper method to update a category's parent and recalculate paths
  private async updateCategoryParent(category: Category, newParentId: string | null): Promise<void> {
    let newPath: string[];
    let newLevel: number;

    if (newParentId) {
      const newParent = await this.findById(newParentId);
      if (!newParent) {
        throw new BadRequestException(`New parent category with ID ${newParentId} not found`);
      }
      newPath = [...newParent.path, category.name];
      newLevel = newParent.level + 1;
      
      // Update new parent's child count
      await this.updateChildCount(newParentId, newParent.childCount + 1);
    } else {
      // Moving to root
      newPath = [category.name];
      newLevel = 0;
    }

    const newPathString = newPath.join('.');

    // Update the category
    await this.db.collection('categories').doc(category.id).update({
      parentId: newParentId,
      path: newPath,
      pathString: newPathString,
      level: newLevel,
      updatedAt: Timestamp.now(),
    });

    // Update all descendants' paths recursively
    await this.updateDescendantPaths(category.id, newPath, newLevel);
  }

  // Helper method to update all descendant paths when a category is moved
  private async updateDescendantPaths(categoryId: string, newParentPath: string[], newParentLevel: number): Promise<void> {
    const descendants = await this.getChildCategories(categoryId);

    for (const descendant of descendants) {
      const newPath = [...newParentPath, descendant.name];
      const newLevel = newParentLevel + 1;
      const newPathString = newPath.join('.');

      await this.db.collection('categories').doc(descendant.id).update({
        path: newPath,
        pathString: newPathString,
        level: newLevel,
        updatedAt: Timestamp.now(),
      });

      // Recursively update this descendant's children
      await this.updateDescendantPaths(descendant.id, newPath, newLevel);
    }
  }

  // Helper method to build hierarchical tree structure from flat category list
  private buildCategoryTree(categories: Category[]): CategoryNode[] {
    // Create a map for quick lookup
    const categoryMap = new Map<string, Category>();
    const nodeMap = new Map<string, CategoryNode>();

    // Initialize all nodes
    for (const category of categories) {
      categoryMap.set(category.id, category);
      nodeMap.set(category.id, {
        category,
        children: [],
        vacancyCount: category.vacancyCount,
        isExpanded: false,
      });
    }

    // Build the tree structure
    const rootNodes: CategoryNode[] = [];

    for (const category of categories) {
      const node = nodeMap.get(category.id)!;

      if (category.parentId && nodeMap.has(category.parentId)) {
        // Add to parent's children
        const parentNode = nodeMap.get(category.parentId)!;
        parentNode.children.push(node);
      } else {
        // Root level category
        rootNodes.push(node);
      }
    }

    // Sort children by displayOrder and name
    this.sortCategoryNodes(rootNodes);

    return rootNodes;
  }

  // Helper method to recursively sort category nodes
  private sortCategoryNodes(nodes: CategoryNode[]): void {
    nodes.sort((a, b) => {
      // First sort by displayOrder
      if (a.category.displayOrder !== b.category.displayOrder) {
        return a.category.displayOrder - b.category.displayOrder;
      }
      // Then sort by name
      return a.category.name.localeCompare(b.category.name);
    });

    // Recursively sort children
    for (const node of nodes) {
      if (node.children.length > 0) {
        this.sortCategoryNodes(node.children);
      }
    }
  }

  // Helper method to get all categories with their vacancy counts
  async getCategoriesWithVacancyCount(): Promise<Category[]> {
    const snapshot = await this.db
      .collection('categories')
      .where('isActive', '==', true)
      .get();

    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));

    // Update vacancy counts for each category
    for (const category of categories) {
      const vacancyCount = await this.getVacancyCountForCategory(category.id);
      const totalVacancyCount = await this.getTotalVacancyCountForCategory(category.id);
      
      // Update the category with current counts
      await this.db.collection('categories').doc(category.id).update({
        vacancyCount,
        totalVacancyCount,
        updatedAt: Timestamp.now(),
      });

      category.vacancyCount = vacancyCount;
      category.totalVacancyCount = totalVacancyCount;
    }

    return categories;
  }

  // Helper method to get vacancy count for a specific category
  private async getVacancyCountForCategory(categoryId: string): Promise<number> {
    const snapshot = await this.db
      .collection('category-vacancies')
      .where('categoryId', '==', categoryId)
      .get();

    return snapshot.size;
  }

  // Helper method to get total vacancy count including descendants
  private async getTotalVacancyCountForCategory(categoryId: string): Promise<number> {
    let totalCount = await this.getVacancyCountForCategory(categoryId);

    // Add counts from all descendants
    const children = await this.getChildCategories(categoryId);
    for (const child of children) {
      totalCount += await this.getTotalVacancyCountForCategory(child.id);
    }

    return totalCount;
  }

  // Advanced search method with multiple criteria
  async searchCategoriesAdvanced(criteria: {
    query?: string;
    parentId?: string;
    level?: number;
    minVacancyCount?: number;
    maxVacancyCount?: number;
    includeInactive?: boolean;
    sortBy?: 'name' | 'vacancyCount' | 'level' | 'displayOrder';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<{ categories: Category[]; total: number }> {
    let query: any = this.db.collection('categories');

    // Apply filters
    if (!criteria.includeInactive) {
      query = query.where('isActive', '==', true);
    }

    if (criteria.parentId !== undefined) {
      query = query.where('parentId', '==', criteria.parentId);
    }

    if (criteria.level !== undefined) {
      query = query.where('level', '==', criteria.level);
    }

    const snapshot = await query.get();
    let categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));

    // Apply text search filter
    if (criteria.query && criteria.query.trim().length > 0) {
      const normalizedQuery = criteria.query.toLowerCase().trim();
      categories = categories.filter(category => {
        const nameMatch = category.name.toLowerCase().includes(normalizedQuery);
        const descriptionMatch = category.description?.toLowerCase().includes(normalizedQuery) || false;
        const pathMatch = category.path.some(pathSegment => 
          pathSegment.toLowerCase().includes(normalizedQuery)
        );
        return nameMatch || descriptionMatch || pathMatch;
      });
    }

    // Apply vacancy count filters
    if (criteria.minVacancyCount !== undefined) {
      categories = categories.filter(cat => cat.totalVacancyCount >= criteria.minVacancyCount!);
    }

    if (criteria.maxVacancyCount !== undefined) {
      categories = categories.filter(cat => cat.totalVacancyCount <= criteria.maxVacancyCount!);
    }

    const total = categories.length;

    // Apply sorting
    if (criteria.sortBy) {
      categories.sort((a, b) => {
        let comparison = 0;
        
        switch (criteria.sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'vacancyCount':
            comparison = a.totalVacancyCount - b.totalVacancyCount;
            break;
          case 'level':
            comparison = a.level - b.level;
            break;
          case 'displayOrder':
            comparison = a.displayOrder - b.displayOrder;
            break;
        }

        return criteria.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    // Apply pagination
    const offset = criteria.offset || 0;
    const limit = criteria.limit || 50;
    const paginatedCategories = categories.slice(offset, offset + limit);

    return {
      categories: paginatedCategories,
      total,
    };
  }

  // Method to get category suggestions for autocomplete
  async getCategorySuggestions(query: string, limit: number = 10): Promise<string[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    
    // Get all active categories
    const snapshot = await this.db
      .collection('categories')
      .where('isActive', '==', true)
      .get();

    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));

    // Extract unique suggestions from category names and paths
    const suggestions = new Set<string>();

    categories.forEach(category => {
      // Add category name if it matches
      if (category.name.toLowerCase().includes(normalizedQuery)) {
        suggestions.add(category.name);
      }

      // Add path segments that match
      category.path.forEach(pathSegment => {
        if (pathSegment.toLowerCase().includes(normalizedQuery)) {
          suggestions.add(pathSegment);
        }
      });
    });

    // Convert to array, sort by relevance, and limit
    return Array.from(suggestions)
      .sort((a, b) => {
        // Prioritize exact matches and prefix matches
        const aStartsWith = a.toLowerCase().startsWith(normalizedQuery);
        const bStartsWith = b.toLowerCase().startsWith(normalizedQuery);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        
        // Then sort alphabetically
        return a.localeCompare(b);
      })
      .slice(0, limit);
  }

  // Method to filter categories by multiple criteria
  async filterCategories(filters: {
    parentIds?: string[];
    levels?: number[];
    hasVacancies?: boolean;
    isActive?: boolean;
    nameContains?: string;
    minChildCount?: number;
    maxChildCount?: number;
  }): Promise<Category[]> {
    let query: any = this.db.collection('categories');

    // Apply simple filters that can be done at database level
    if (filters.isActive !== undefined) {
      query = query.where('isActive', '==', filters.isActive);
    }

    const snapshot = await query.get();
    let categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));

    // Apply complex filters in memory
    if (filters.parentIds && filters.parentIds.length > 0) {
      categories = categories.filter(cat => 
        filters.parentIds!.includes(cat.parentId || '')
      );
    }

    if (filters.levels && filters.levels.length > 0) {
      categories = categories.filter(cat => 
        filters.levels!.includes(cat.level)
      );
    }

    if (filters.hasVacancies !== undefined) {
      if (filters.hasVacancies) {
        categories = categories.filter(cat => cat.totalVacancyCount > 0);
      } else {
        categories = categories.filter(cat => cat.totalVacancyCount === 0);
      }
    }

    if (filters.nameContains) {
      const searchTerm = filters.nameContains.toLowerCase();
      categories = categories.filter(cat => 
        cat.name.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.minChildCount !== undefined) {
      categories = categories.filter(cat => cat.childCount >= filters.minChildCount!);
    }

    if (filters.maxChildCount !== undefined) {
      categories = categories.filter(cat => cat.childCount <= filters.maxChildCount!);
    }

    return categories;
  }

  // Method to get popular categories based on vacancy count
  async getPopularCategories(limit: number = 10): Promise<Category[]> {
    const snapshot = await this.db
      .collection('categories')
      .where('isActive', '==', true)
      .get();

    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));

    // Sort by total vacancy count (including descendants) in descending order
    return categories
      .sort((a, b) => b.totalVacancyCount - a.totalVacancyCount)
      .slice(0, limit);
  }

  // Method to get recently created categories
  async getRecentCategories(limit: number = 10): Promise<Category[]> {
    const snapshot = await this.db
      .collection('categories')
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
  }
}