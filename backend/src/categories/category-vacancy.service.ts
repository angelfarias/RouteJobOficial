import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type { App } from 'firebase-admin/app';
import { getFirestore, Firestore, Timestamp } from 'firebase-admin/firestore';
import { Category, CategoryVacancy } from './interfaces/category.interface';
import { CategoriesService } from './categories.service';

@Injectable()
export class CategoryVacancyService {
  private db: Firestore;

  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseApp: App,
    private readonly categoriesService: CategoriesService,
  ) {
    this.db = getFirestore(this.firebaseApp);
  }

  async assignCategories(vacancyId: string, categoryIds: string[], assignedBy?: string): Promise<void> {
    // Validate vacancy exists
    const vacancy = await this.getVacancyById(vacancyId);
    if (!vacancy) {
      throw new NotFoundException(`Vacancy with ID ${vacancyId} not found`);
    }

    // Validate all categories exist
    const categories = await Promise.all(
      categoryIds.map(id => this.categoriesService.findById(id))
    );

    const invalidCategories = categoryIds.filter((id, index) => !categories[index]);
    if (invalidCategories.length > 0) {
      throw new BadRequestException(
        `Categories not found: ${invalidCategories.join(', ')}`
      );
    }

    // Remove existing assignments for this vacancy
    await this.removeAllCategoriesForVacancy(vacancyId);

    // Create new assignments
    const now = Timestamp.now();
    const batch = this.db.batch();

    for (const categoryId of categoryIds) {
      const docRef = this.db.collection('category-vacancies').doc();
      const assignment: Omit<CategoryVacancy, 'id'> = {
        categoryId,
        vacancyId,
        assignedAt: now,
        assignedBy: assignedBy || 'system',
      };
      batch.set(docRef, assignment);
    }

    await batch.commit();

    // Update vacancy counts for affected categories
    await this.updateVacancyCountsForCategories(categoryIds);
  }

  async removeCategories(vacancyId: string, categoryIds: string[]): Promise<void> {
    // Validate vacancy exists
    const vacancy = await this.getVacancyById(vacancyId);
    if (!vacancy) {
      throw new NotFoundException(`Vacancy with ID ${vacancyId} not found`);
    }

    // Get existing assignments to remove
    const assignmentsToRemove = await this.getAssignmentsForVacancyAndCategories(vacancyId, categoryIds);

    if (assignmentsToRemove.length === 0) {
      return; // No assignments to remove
    }

    // Remove assignments
    const batch = this.db.batch();
    for (const assignment of assignmentsToRemove) {
      const docRef = this.db.collection('category-vacancies').doc(assignment.id);
      batch.delete(docRef);
    }

    await batch.commit();

    // Update vacancy counts for affected categories
    await this.updateVacancyCountsForCategories(categoryIds);
  }

  async getVacanciesByCategory(categoryId: string, includeDescendants: boolean = false): Promise<any[]> {
    // Validate category exists
    const category = await this.categoriesService.findById(categoryId);
    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    let categoryIdsToSearch = [categoryId];

    // If including descendants, get all descendant category IDs
    if (includeDescendants) {
      const descendants = await this.getAllDescendantCategories(categoryId);
      categoryIdsToSearch = [categoryId, ...descendants.map(c => c.id)];
    }

    // Get all vacancy assignments for these categories
    const assignments = await this.getAssignmentsForCategories(categoryIdsToSearch);
    const vacancyIds = [...new Set(assignments.map(a => a.vacancyId))]; // Remove duplicates

    // Get vacancy details
    const vacancies = await Promise.all(
      vacancyIds.map(id => this.getVacancyById(id))
    );

    return vacancies.filter(v => v !== null); // Filter out any null results
  }

  async getCategoriesForVacancy(vacancyId: string): Promise<Category[]> {
    // Validate vacancy exists
    const vacancy = await this.getVacancyById(vacancyId);
    if (!vacancy) {
      throw new NotFoundException(`Vacancy with ID ${vacancyId} not found`);
    }

    // Get all category assignments for this vacancy
    const assignments = await this.getAssignmentsForVacancy(vacancyId);
    const categoryIds = assignments.map(a => a.categoryId);

    // Get category details
    const categories = await Promise.all(
      categoryIds.map(id => this.categoriesService.findById(id))
    );

    return categories.filter(c => c !== null) as Category[]; // Filter out any null results
  }

  // Helper method to get vacancy by ID
  private async getVacancyById(vacancyId: string): Promise<any | null> {
    const docRef = this.db.collection('vacancies').doc(vacancyId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() };
  }

  // Helper method to remove all category assignments for a vacancy
  private async removeAllCategoriesForVacancy(vacancyId: string): Promise<void> {
    const assignments = await this.getAssignmentsForVacancy(vacancyId);
    
    if (assignments.length === 0) {
      return;
    }

    const batch = this.db.batch();
    for (const assignment of assignments) {
      const docRef = this.db.collection('category-vacancies').doc(assignment.id);
      batch.delete(docRef);
    }

    await batch.commit();
  }

  // Helper method to get assignments for a vacancy
  private async getAssignmentsForVacancy(vacancyId: string): Promise<CategoryVacancy[]> {
    const snapshot = await this.db
      .collection('category-vacancies')
      .where('vacancyId', '==', vacancyId)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CategoryVacancy));
  }

  // Helper method to get assignments for vacancy and specific categories
  private async getAssignmentsForVacancyAndCategories(
    vacancyId: string, 
    categoryIds: string[]
  ): Promise<CategoryVacancy[]> {
    const allAssignments = await this.getAssignmentsForVacancy(vacancyId);
    return allAssignments.filter(a => categoryIds.includes(a.categoryId));
  }

  // Helper method to get assignments for multiple categories
  private async getAssignmentsForCategories(categoryIds: string[]): Promise<CategoryVacancy[]> {
    if (categoryIds.length === 0) {
      return [];
    }

    // Firestore 'in' queries are limited to 10 items, so we need to batch them
    const batches: string[][] = [];
    for (let i = 0; i < categoryIds.length; i += 10) {
      const batch = categoryIds.slice(i, i + 10);
      batches.push(batch);
    }

    const allAssignments: CategoryVacancy[] = [];
    for (const batch of batches) {
      const snapshot = await this.db
        .collection('category-vacancies')
        .where('categoryId', 'in', batch)
        .get();

      const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CategoryVacancy));
      allAssignments.push(...assignments);
    }

    return allAssignments;
  }

  // Helper method to get all descendant categories
  private async getAllDescendantCategories(categoryId: string): Promise<Category[]> {
    const directChildren = await this.getDirectChildCategories(categoryId);
    let allDescendants = [...directChildren];

    // Recursively get descendants of each child
    for (const child of directChildren) {
      const childDescendants = await this.getAllDescendantCategories(child.id);
      allDescendants.push(...childDescendants);
    }

    return allDescendants;
  }

  // Helper method to get direct child categories
  private async getDirectChildCategories(parentId: string): Promise<Category[]> {
    const snapshot = await this.db
      .collection('categories')
      .where('parentId', '==', parentId)
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
  }

  // Helper method to update vacancy counts for categories
  private async updateVacancyCountsForCategories(categoryIds: string[]): Promise<void> {
    for (const categoryId of categoryIds) {
      await this.updateVacancyCountForCategory(categoryId);
    }
  }

  // Helper method to update vacancy count for a single category
  private async updateVacancyCountForCategory(categoryId: string): Promise<void> {
    const assignments = await this.getAssignmentsForCategories([categoryId]);
    const vacancyCount = assignments.length;

    // Also calculate total count including descendants
    const descendants = await this.getAllDescendantCategories(categoryId);
    const allCategoryIds = [categoryId, ...descendants.map(c => c.id)];
    const allAssignments = await this.getAssignmentsForCategories(allCategoryIds);
    const totalVacancyCount = allAssignments.length;

    // Update the category document
    await this.db.collection('categories').doc(categoryId).update({
      vacancyCount,
      totalVacancyCount,
      updatedAt: Timestamp.now(),
    });
  }

  // Helper method to check if a vacancy has any category assignments
  async hasAnyCategoryAssignments(vacancyId: string): Promise<boolean> {
    const snapshot = await this.db
      .collection('category-vacancies')
      .where('vacancyId', '==', vacancyId)
      .limit(1)
      .get();

    return !snapshot.empty;
  }

  // Helper method to get vacancy count for a category (used by CategoriesService)
  async getVacancyCountForCategory(categoryId: string): Promise<number> {
    const assignments = await this.getAssignmentsForCategories([categoryId]);
    return assignments.length;
  }

  // Helper method to get total vacancy count including descendants (used by CategoriesService)
  async getTotalVacancyCountForCategory(categoryId: string): Promise<number> {
    const descendants = await this.getAllDescendantCategories(categoryId);
    const allCategoryIds = [categoryId, ...descendants.map(c => c.id)];
    const allAssignments = await this.getAssignmentsForCategories(allCategoryIds);
    return allAssignments.length;
  }
}