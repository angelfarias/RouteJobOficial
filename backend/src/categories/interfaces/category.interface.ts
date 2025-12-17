import { Timestamp } from 'firebase-admin/firestore';

export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId: string | null;
  path: string[];           // Full path from root: ['tech', 'software', 'frontend']
  pathString: string;       // Dot-separated path: 'tech.software.frontend'
  level: number;           // Depth in tree (0 = root)
  isActive: boolean;
  displayOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Computed fields for efficiency
  childCount: number;
  vacancyCount: number;
  totalVacancyCount: number;  // Including descendants
}

export interface CategoryNode {
  category: Category;
  children: CategoryNode[];
  vacancyCount: number;
  isExpanded?: boolean;
}

export interface CategoryVacancy {
  id: string;
  categoryId: string;
  vacancyId: string;
  assignedAt: Timestamp;
  assignedBy: string;  // User ID who made the assignment
}

export interface CategoryStats {
  categoryId: string;
  vacancyCount: number;
  applicationCount: number;
  averageMatchScore: number;
  popularityRank: number;
  trendDirection: 'up' | 'down' | 'stable';
  lastUpdated: Timestamp;
}

export enum DeletionStrategy {
  CASCADE = 'cascade',           // Delete all child categories
  MOVE_TO_PARENT = 'move_to_parent',  // Move children to parent
  MOVE_TO_ROOT = 'move_to_root'       // Move children to root level
}

export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

export interface PopularityMetric {
  categoryId: string;
  categoryName: string;
  vacancyCount: number;
  applicationCount: number;
  popularityScore: number;
  rank: number;
}

export interface ReportFilters {
  categoryIds?: string[];
  timeRange?: TimeRange;
  includeDescendants?: boolean;
  minVacancyCount?: number;
}