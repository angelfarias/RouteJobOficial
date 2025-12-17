# Job Category Tree Design Document

## Overview

The Job Category Tree feature introduces a hierarchical categorization system to the RouteJob platform, enabling structured organization of job vacancies through unlimited nesting levels. The system integrates seamlessly with the existing Firebase/Firestore architecture and enhances the job matching algorithm by providing category-based filtering and scoring.

The design follows a hybrid approach combining adjacency list patterns with path enumeration to optimize both query performance and data consistency in Firestore. This enables efficient hierarchical queries while maintaining the flexibility to support complex category operations.

## Architecture

### System Integration

The Category Tree system integrates with existing RouteJob components:

- **Vacancies Service**: Enhanced to support category assignments and filtering
- **Match Service**: Extended to incorporate category preferences in scoring algorithms  
- **Companies Service**: Updated to allow category selection during vacancy creation
- **Candidates Service**: Enhanced to store and manage category preferences

### Data Flow

1. **Category Management**: Administrators create/update/delete categories through dedicated endpoints
2. **Vacancy Classification**: Companies assign categories during vacancy creation/editing
3. **Candidate Filtering**: Candidates browse and filter jobs using the category tree
4. **Match Enhancement**: Category preferences influence job recommendation scores
5. **Analytics**: Reporting system aggregates data across category hierarchies

## Components and Interfaces

### Core Services

#### CategoryService
```typescript
interface CategoryService {
  createCategory(parentId: string | null, data: CreateCategoryDto): Promise<Category>
  updateCategory(id: string, data: UpdateCategoryDto): Promise<Category>
  deleteCategory(id: string, strategy: DeletionStrategy): Promise<void>
  moveCategory(id: string, newParentId: string | null): Promise<Category>
  getCategoryTree(): Promise<CategoryNode[]>
  getCategoryPath(id: string): Promise<string[]>
  searchCategories(query: string): Promise<Category[]>
}
```

#### CategoryVacancyService
```typescript
interface CategoryVacancyService {
  assignCategories(vacancyId: string, categoryIds: string[]): Promise<void>
  removeCategories(vacancyId: string, categoryIds: string[]): Promise<void>
  getVacanciesByCategory(categoryId: string, includeDescendants: boolean): Promise<Vacancy[]>
  getCategoriesForVacancy(vacancyId: string): Promise<Category[]>
}
```

#### CategoryAnalyticsService
```typescript
interface CategoryAnalyticsService {
  getCategoryStats(categoryId: string): Promise<CategoryStats>
  getPopularityMetrics(timeRange: TimeRange): Promise<PopularityMetric[]>
  generateCategoryReport(filters: ReportFilters): Promise<CategoryReport>
}
```

### API Endpoints

#### Category Management
- `POST /categories` - Create new category
- `PUT /categories/:id` - Update category
- `DELETE /categories/:id` - Delete category
- `POST /categories/:id/move` - Move category to new parent
- `GET /categories/tree` - Get complete category tree
- `GET /categories/search` - Search categories with autocomplete

#### Vacancy-Category Operations
- `POST /vacancies/:id/categories` - Assign categories to vacancy
- `DELETE /vacancies/:id/categories` - Remove categories from vacancy
- `GET /categories/:id/vacancies` - Get vacancies in category
- `GET /vacancies/:id/categories` - Get categories for vacancy

#### Analytics and Reporting
- `GET /categories/:id/stats` - Get category statistics
- `GET /categories/analytics/popularity` - Get popularity metrics
- `POST /categories/reports` - Generate custom reports

## Data Models

### Category Entity
```typescript
interface Category {
  id: string
  name: string
  description?: string
  parentId: string | null
  path: string[]           // Full path from root: ['tech', 'software', 'frontend']
  pathString: string       // Dot-separated path: 'tech.software.frontend'
  level: number           // Depth in tree (0 = root)
  isActive: boolean
  displayOrder: number
  createdAt: Timestamp
  updatedAt: Timestamp
  
  // Computed fields for efficiency
  childCount: number
  vacancyCount: number
  totalVacancyCount: number  // Including descendants
}
```

### CategoryVacancy Association
```typescript
interface CategoryVacancy {
  id: string
  categoryId: string
  vacancyId: string
  assignedAt: Timestamp
  assignedBy: string  // User ID who made the assignment
}
```

### CategoryNode (Tree Representation)
```typescript
interface CategoryNode {
  category: Category
  children: CategoryNode[]
  vacancyCount: number
  isExpanded?: boolean
}
```

### Category Statistics
```typescript
interface CategoryStats {
  categoryId: string
  vacancyCount: number
  applicationCount: number
  averageMatchScore: number
  popularityRank: number
  trendDirection: 'up' | 'down' | 'stable'
  lastUpdated: Timestamp
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After reviewing all properties identified in the prework, I've identified several areas for consolidation:

- Properties 1.1, 1.2, 1.4 all relate to category tree operations maintaining structural integrity - these can be combined into a comprehensive tree integrity property
- Properties 2.1, 2.2, 2.5 all relate to vacancy-category assignment operations - these can be consolidated into assignment consistency properties  
- Properties 3.2 and 3.5 both relate to category-based vacancy retrieval with hierarchy consideration - these can be combined
- Properties 4.1, 4.2, 4.3 all relate to matching algorithm integration - these can be consolidated into matching integration properties
- Properties 6.1, 6.2, 6.4 all relate to analytics calculations - these can be combined into analytics accuracy properties

### Core Properties

**Property 1: Category tree structural integrity**
*For any* category tree operation (create, update, move, delete), the resulting tree structure should maintain valid parent-child relationships, correct path information, and proper hierarchy levels
**Validates: Requirements 1.1, 1.2, 1.4**

**Property 2: Category deletion strategy consistency**  
*For any* category deletion with children, the system should apply the specified deletion strategy consistently and handle all affected relationships
**Validates: Requirements 1.3**

**Property 3: Unlimited nesting support**
*For any* category tree depth, all operations should function correctly without depth limitations
**Validates: Requirements 1.5**

**Property 4: Vacancy-category assignment consistency**
*For any* vacancy and category assignment operation, the system should maintain bidirectional consistency between vacancy-category relationships
**Validates: Requirements 2.1, 2.2, 2.5**

**Property 5: Category deletion orphan handling**
*For any* category deletion that affects vacancy assignments, the system should handle orphaned vacancies according to the defined policy
**Validates: Requirements 2.3**

**Property 6: Category validation integrity**
*For any* category assignment attempt, the system should validate that all referenced categories exist in the tree
**Validates: Requirements 2.4**

**Property 7: Hierarchical vacancy retrieval**
*For any* category selection, the system should return all vacancies from that category and its descendants with accurate counts
**Validates: Requirements 3.2, 3.5**

**Property 8: Category filtering accuracy**
*For any* combination of category filters, the returned results should match exactly the specified criteria
**Validates: Requirements 3.1, 3.3**

**Property 9: Category search functionality**
*For any* search query, the autocomplete system should return relevant category suggestions based on name and hierarchy
**Validates: Requirements 3.4**

**Property 10: Matching algorithm integration**
*For any* matching operation, category data should be provided correctly and influence scores according to candidate preferences and hierarchy relationships
**Validates: Requirements 4.1, 4.2, 4.3**

**Property 11: API consistency**
*For any* category-related API operation, the interface should follow consistent patterns and return predictable data structures
**Validates: Requirements 4.4**

**Property 12: Referential integrity maintenance**
*For any* category update operation, all references across related entities should remain valid and consistent
**Validates: Requirements 5.3**

**Property 13: Analytics calculation accuracy**
*For any* category analytics request, the calculated metrics should accurately reflect vacancy counts, popularity, and time-based statistics including descendant data
**Validates: Requirements 6.1, 6.2, 6.4**

**Property 14: Data export completeness**
*For any* category tree export operation, the output should include complete hierarchy information and relationships
**Validates: Requirements 6.3**

## Error Handling

### Category Operations
- **Invalid Parent Reference**: Prevent circular references and invalid parent assignments
- **Deletion Conflicts**: Handle categories with active vacancies or child categories
- **Concurrent Modifications**: Implement optimistic locking for category updates
- **Path Corruption**: Validate and repair category paths during operations

### Vacancy Assignments  
- **Invalid Category References**: Validate category existence before assignment
- **Orphaned Assignments**: Clean up assignments when categories are deleted
- **Duplicate Assignments**: Prevent duplicate category assignments per vacancy

### Performance Safeguards
- **Deep Tree Queries**: Implement query limits and pagination for deep hierarchies
- **Bulk Operations**: Provide batch processing for large category operations
- **Cache Invalidation**: Ensure cache consistency during category modifications

## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit testing and property-based testing to ensure comprehensive coverage:

**Unit Testing**:
- Specific examples demonstrating correct category tree operations
- Edge cases like empty trees, single-node trees, and maximum depth scenarios
- Integration points between category service and existing vacancy/match services
- Error conditions and boundary value testing

**Property-Based Testing**:
- Universal properties that should hold across all category tree configurations
- Random tree generation for testing structural integrity
- Automated testing of category operations across diverse input spaces
- Verification of invariants under concurrent operations

**Property-Based Testing Framework**: 
We will use **fast-check** for TypeScript/Node.js property-based testing, which integrates well with Jest and provides excellent support for complex data structure generation.

**Configuration Requirements**:
- Each property-based test must run a minimum of 100 iterations
- Tests must be tagged with comments referencing design document properties
- Tag format: `**Feature: job-category-tree, Property {number}: {property_text}**`
- Each correctness property must be implemented by a single property-based test

### Test Categories

1. **Structural Integrity Tests**: Verify tree structure remains valid after all operations
2. **Assignment Consistency Tests**: Ensure vacancy-category relationships remain bidirectional
3. **Hierarchy Query Tests**: Validate correct retrieval of hierarchical data
4. **Performance Boundary Tests**: Test system behavior at scale limits
5. **Integration Tests**: Verify seamless integration with existing RouteJob components

### Test Data Generation

- **Random Tree Generator**: Creates diverse category tree structures for testing
- **Vacancy-Category Generator**: Produces realistic vacancy-category assignments
- **Query Pattern Generator**: Creates diverse search and filter combinations
- **Concurrent Operation Generator**: Simulates realistic concurrent usage patterns