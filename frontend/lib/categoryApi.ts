import { getApiUrl } from './env';
import { fallbackCategories, fallbackCategoryTree } from './fallbackCategories';

export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId: string | null;
  path: string[];
  pathString: string;
  level: number;
  isActive: boolean;
  displayOrder: number;
  childCount: number;
  vacancyCount: number;
  totalVacancyCount: number;
  createdAt: any;
  updatedAt: any;
}

export interface CategoryNode {
  category: Category;
  children: CategoryNode[];
  vacancyCount: number;
  isExpanded?: boolean;
}

export interface VacancyWithCategories {
  id: string;
  title: string;
  description: string;
  company: string;
  branchName: string;
  location: {
    latitude: number;
    longitude: number;
  };
  categories: Category[];
  salaryMin?: number;
  salaryMax?: number;
  jornada?: string;
  tipoContrato?: string;
  createdAt: any;
}

export class CategoryAPI {
  private static getBaseUrl() {
    return getApiUrl();
  }

  // Category Management
  static async getCategoryTree(): Promise<CategoryNode[]> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/categories/tree`);
      if (!response.ok) throw new Error('Failed to fetch category tree');
      return response.json();
    } catch (error) {
      console.warn('Using fallback category tree:', error.message);
      return fallbackCategoryTree;
    }
  }

  static async getAllCategories(params?: {
    includeInactive?: boolean;
    parentId?: string;
    level?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ categories: Category[]; total: number }> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.includeInactive) searchParams.set('includeInactive', 'true');
      if (params?.parentId) searchParams.set('parentId', params.parentId);
      if (params?.level !== undefined) searchParams.set('level', params.level.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());

      const response = await fetch(`${this.getBaseUrl()}/categories?${searchParams}`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    } catch (error) {
      console.warn('Using fallback categories:', error.message);
      // Filter fallback categories based on params
      let filteredCategories = [...fallbackCategories];
      
      if (!params?.includeInactive) {
        filteredCategories = filteredCategories.filter(cat => cat.isActive);
      }
      
      if (params?.parentId !== undefined) {
        filteredCategories = filteredCategories.filter(cat => cat.parentId === params.parentId);
      }
      
      if (params?.level !== undefined) {
        filteredCategories = filteredCategories.filter(cat => cat.level === params.level);
      }
      
      const total = filteredCategories.length;
      const offset = params?.offset || 0;
      const limit = params?.limit || 50;
      
      return {
        categories: filteredCategories.slice(offset, offset + limit),
        total
      };
    }
  }

  static async searchCategories(query: string, options?: {
    limit?: number;
    parentId?: string;
  }): Promise<Category[]> {
    try {
      const searchParams = new URLSearchParams({ query });
      if (options?.limit) searchParams.set('limit', options.limit.toString());
      if (options?.parentId) searchParams.set('parentId', options.parentId);

      const response = await fetch(`${this.getBaseUrl()}/categories/search?${searchParams}`);
      if (!response.ok) throw new Error('Failed to search categories');
      return response.json();
    } catch (error) {
      console.warn('Using fallback category search:', error.message);
      // Fallback search in local data
      const normalizedQuery = query.toLowerCase();
      const limit = options?.limit || 20;
      
      let results = fallbackCategories.filter(category => {
        const nameMatch = category.name.toLowerCase().includes(normalizedQuery);
        const descriptionMatch = category.description?.toLowerCase().includes(normalizedQuery) || false;
        const pathMatch = category.path.some(pathSegment => 
          pathSegment.toLowerCase().includes(normalizedQuery)
        );
        return nameMatch || descriptionMatch || pathMatch;
      });

      if (options?.parentId) {
        results = results.filter(cat => cat.parentId === options.parentId);
      }

      return results.slice(0, limit);
    }
  }

  static async getCategorySuggestions(query: string, limit = 10): Promise<string[]> {
    const searchParams = new URLSearchParams({ query, limit: limit.toString() });
    const response = await fetch(`${this.getBaseUrl()}/categories/suggestions?${searchParams}`);
    if (!response.ok) throw new Error('Failed to get category suggestions');
    return response.json();
  }

  static async getPopularCategories(limit = 10): Promise<Category[]> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/categories/popular?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch popular categories');
      return response.json();
    } catch (error) {
      console.warn('Using fallback popular categories:', error.message);
      // Return most popular categories from fallback data (sorted by totalVacancyCount)
      return fallbackCategories
        .sort((a, b) => b.totalVacancyCount - a.totalVacancyCount)
        .slice(0, limit);
    }
  }

  // Vacancy-Category Operations
  static async getVacanciesByCategory(
    categoryId: string, 
    includeDescendants = false
  ): Promise<VacancyWithCategories[]> {
    const searchParams = new URLSearchParams({
      includeDescendants: includeDescendants.toString()
    });
    const response = await fetch(`${this.getBaseUrl()}/categories/${categoryId}/vacancies?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch vacancies by category');
    return response.json();
  }

  static async getCategoriesForVacancy(vacancyId: string): Promise<Category[]> {
    const response = await fetch(`${this.getBaseUrl()}/vacancies/${vacancyId}/categories`);
    if (!response.ok) throw new Error('Failed to fetch categories for vacancy');
    return response.json();
  }

  static async assignCategoriesToVacancy(
    vacancyId: string, 
    categoryIds: string[], 
    assignedBy?: string
  ): Promise<void> {
    const response = await fetch(`${this.getBaseUrl()}/vacancies/${vacancyId}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryIds, assignedBy })
    });
    if (!response.ok) throw new Error('Failed to assign categories to vacancy');
  }

  static async removeCategoriesFromVacancy(
    vacancyId: string, 
    categoryIds: string[]
  ): Promise<void> {
    const response = await fetch(`${this.getBaseUrl()}/vacancies/${vacancyId}/categories`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryIds })
    });
    if (!response.ok) throw new Error('Failed to remove categories from vacancy');
  }

  // Enhanced Vacancy Search
  static async searchVacanciesByCategories(
    categoryIds: string[],
    options?: {
      includeDescendants?: boolean;
      limit?: number;
      offset?: number;
      activeOnly?: boolean;
    }
  ): Promise<{ vacancies: VacancyWithCategories[]; total: number }> {
    const searchParams = new URLSearchParams({
      categoryIds: categoryIds.join(',')
    });
    if (options?.includeDescendants) searchParams.set('includeDescendants', 'true');
    if (options?.limit) searchParams.set('limit', options.limit.toString());
    if (options?.offset) searchParams.set('offset', options.offset.toString());
    if (options?.activeOnly !== undefined) searchParams.set('activeOnly', options.activeOnly.toString());

    const response = await fetch(`${this.getBaseUrl()}/vacancies/search/by-categories?${searchParams}`);
    if (!response.ok) throw new Error('Failed to search vacancies by categories');
    return response.json();
  }

  static async searchVacanciesAdvanced(filters: {
    categoryIds?: string[];
    includeDescendants?: boolean;
    companyId?: string;
    branchId?: string;
    salaryMin?: number;
    salaryMax?: number;
    jornada?: string;
    tipoContrato?: string;
    location?: {
      latitude: number;
      longitude: number;
      radiusKm: number;
    };
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'salary' | 'distance';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ vacancies: VacancyWithCategories[]; total: number }> {
    const response = await fetch(`${this.getBaseUrl()}/vacancies/search/advanced`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filters)
    });
    if (!response.ok) throw new Error('Failed to perform advanced vacancy search');
    return response.json();
  }

  // Enhanced Location Search with Categories
  static async getNearbyVacancies(
    uid: string,
    radioKm?: number,
    categoryIds?: string[]
  ): Promise<VacancyWithCategories[]> {
    const searchParams = new URLSearchParams({ uid });
    if (radioKm) searchParams.set('radioKm', radioKm.toString());
    if (categoryIds && categoryIds.length > 0) {
      searchParams.set('categoryIds', categoryIds.join(','));
    }

    const response = await fetch(`${this.getBaseUrl()}/vacancies/cercanas?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch nearby vacancies');
    const data = await response.json();
    return data.vacantes || [];
  }

  // Enhanced Matching API methods
  static async setCandidatePreferences(
    uid: string,
    preferredCategories: string[],
    categoryWeights?: { [categoryId: string]: number }
  ): Promise<void> {
    const response = await fetch(`${this.getBaseUrl()}/candidates/category-preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid,
        preferredCategories,
        categoryWeights,
      }),
    });

    if (!response.ok) throw new Error('Failed to set category preferences');
  }

  static async setMatchWeights(
    uid: string,
    weights: {
      location?: number;
      category?: number;
      experience?: number;
      skills?: number;
    }
  ): Promise<void> {
    const response = await fetch(`${this.getBaseUrl()}/candidates/match-weights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, weights }),
    });

    if (!response.ok) throw new Error('Failed to set match weights');
  }

  static async getEnhancedMatches(
    candidateId: string,
    filters: {
      enableDetailedMatching?: boolean;
      minCategoryScore?: number;
      categoryIds?: string[];
      includeHierarchical?: boolean;
    } = {}
  ): Promise<any[]> {
    const searchParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          searchParams.set(key, value.join(','));
        } else {
          searchParams.set(key, value.toString());
        }
      }
    });

    const response = await fetch(`${this.getBaseUrl()}/match/candidate/${candidateId}?${searchParams}`);
    if (!response.ok) throw new Error('Failed to fetch enhanced matches');
    return response.json();
  }

  static async getMatchStatistics(candidateId: string): Promise<{
    totalMatches: number;
    averageScore: number;
    categoryBreakdown: { [categoryId: string]: number };
    topCategories: Array<{ categoryId: string; categoryName: string; matchCount: number }>;
  }> {
    const response = await fetch(`${this.getBaseUrl()}/match/candidate/${candidateId}/statistics`);
    if (!response.ok) throw new Error('Failed to fetch match statistics');
    return response.json();
  }
}