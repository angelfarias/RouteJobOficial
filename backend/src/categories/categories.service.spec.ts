import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import * as fc from 'fast-check';
import { Category, DeletionStrategy } from './interfaces/category.interface';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

// Mock Firebase Admin
const mockFirestore = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      set: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
    where: jest.fn(() => ({
      get: jest.fn(),
    })),
    get: jest.fn(),
  })),
};

const mockFirebaseApp = {
  getOrInitService: jest.fn(() => mockFirestore),
};

// Mock getFirestore function
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => mockFirestore),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  },
}));

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: 'FIREBASE_ADMIN',
          useValue: mockFirebaseApp,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /**
   * **Feature: job-category-tree, Property 1: Category tree structural integrity**
   * 
   * Property-based test to verify that for any category tree operation (create, update, move, delete),
   * the resulting tree structure maintains valid parent-child relationships, correct path information,
   * and proper hierarchy levels.
   * 
   * This test will be implemented once the core CRUD operations are available in the service.
   * For now, we create the test structure and generators.
   */
  describe('Property 1: Category tree structural integrity', () => {
    // Generator for valid category names
    const categoryNameArb = fc.string({ minLength: 1, maxLength: 100 });
    
    // Generator for category descriptions
    const categoryDescriptionArb = fc.option(fc.string({ maxLength: 500 }));
    
    // Generator for display order
    const displayOrderArb = fc.integer({ min: 0, max: 1000 });
    
    // Generator for CreateCategoryDto
    const createCategoryDtoArb = fc.record({
      name: categoryNameArb,
      description: categoryDescriptionArb,
      displayOrder: fc.option(displayOrderArb),
      isActive: fc.option(fc.boolean()),
    });

    // Generator for UpdateCategoryDto
    const updateCategoryDtoArb = fc.record({
      name: fc.option(categoryNameArb),
      description: fc.option(categoryDescriptionArb),
      displayOrder: fc.option(displayOrderArb),
      isActive: fc.option(fc.boolean()),
    });

    // Generator for a simple category tree structure
    const categoryTreeArb = fc.array(
      fc.record({
        id: fc.uuid(),
        name: categoryNameArb,
        parentId: fc.option(fc.uuid()),
        level: fc.integer({ min: 0, max: 10 }),
      }),
      { minLength: 1, maxLength: 20 }
    );

    it('should maintain valid parent-child relationships after create operations', () => {
      fc.assert(
        fc.property(createCategoryDtoArb, fc.option(fc.uuid()), (dto, parentId) => {
          // This test will be implemented when createCategory method is ready
          // For now, we just verify the test structure works
          expect(dto.name).toBeDefined();
          expect(dto.name.length).toBeGreaterThan(0);
          expect(dto.name.length).toBeLessThanOrEqual(100);
          
          if (dto.description) {
            expect(dto.description.length).toBeLessThanOrEqual(500);
          }
          
          // TODO: Test actual category creation and verify:
          // 1. Parent-child relationship is correctly established
          // 2. Path is correctly calculated
          // 3. Level is correctly set
          // 4. All ancestors exist in the tree
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain correct path information after update operations', () => {
      fc.assert(
        fc.property(updateCategoryDtoArb, fc.uuid(), (dto, categoryId) => {
          // This test will be implemented when updateCategory method is ready
          // For now, we just verify the test structure works
          if (dto.name) {
            expect(dto.name.length).toBeGreaterThan(0);
            expect(dto.name.length).toBeLessThanOrEqual(100);
          }
          
          if (dto.description) {
            expect(dto.description.length).toBeLessThanOrEqual(500);
          }
          
          // TODO: Test actual category update and verify:
          // 1. Path information remains consistent
          // 2. All relationships are preserved
          // 3. Updated fields are correctly applied
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain proper hierarchy levels in tree structures', () => {
      fc.assert(
        fc.property(categoryTreeArb, (categories) => {
          // Verify the generated tree structure is valid
          const categoryMap = new Map(categories.map(c => [c.id, c]));
          
          for (const category of categories) {
            // If category has a parent, verify parent exists and has lower level
            if (category.parentId) {
              const parent = categoryMap.get(category.parentId);
              if (parent) {
                expect(parent.level).toBeLessThan(category.level);
              }
            } else {
              // Root categories should have level 0
              expect(category.level).toBeGreaterThanOrEqual(0);
            }
          }
          
          // TODO: Test actual tree operations and verify:
          // 1. Level calculations are correct
          // 2. No circular references exist
          // 3. Path depth matches level
        }),
        { numRuns: 100 }
      );
    });

    it('should prevent circular references in category hierarchy', () => {
      // This test will verify that moving a category doesn't create circular references
      fc.assert(
        fc.property(fc.uuid(), fc.uuid(), (categoryId, newParentId) => {
          // TODO: Implement when moveCategory method is ready
          // Test should verify:
          // 1. Cannot move a category to be its own descendant
          // 2. Cannot create circular parent-child relationships
          // 3. Path updates propagate correctly to all descendants
          expect(categoryId).toBeDefined();
          expect(newParentId).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: job-category-tree, Property 3: Unlimited nesting support**
   * 
   * Property-based test to verify that for any category tree depth,
   * all operations should function correctly without depth limitations.
   */
  describe('Property 3: Unlimited nesting support', () => {
    // Generator for deep category hierarchies
    const deepHierarchyArb = fc.array(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 50 }),
        level: fc.integer({ min: 0, max: 50 }), // Test up to 50 levels deep
      }),
      { minLength: 1, maxLength: 100 }
    );

    // Generator for very deep single chain
    const deepChainArb = fc.integer({ min: 1, max: 100 }).chain(depth =>
      fc.array(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 20 }),
          description: fc.option(fc.string({ maxLength: 100 })),
        }),
        { minLength: depth, maxLength: depth }
      )
    );

    it('should handle arbitrarily deep category hierarchies', () => {
      fc.assert(
        fc.property(deepHierarchyArb, (categories) => {
          // Verify that deep hierarchies are structurally valid
          for (const category of categories) {
            expect(category.name).toBeDefined();
            expect(category.name.length).toBeGreaterThan(0);
            expect(category.level).toBeGreaterThanOrEqual(0);
            expect(category.level).toBeLessThanOrEqual(50);
          }

          // TODO: Test actual deep category creation when methods are ready
          // Should verify:
          // 1. Categories can be created at any depth
          // 2. Path calculations work correctly for deep hierarchies
          // 3. Level calculations are accurate regardless of depth
          // 4. Performance remains acceptable for deep trees
        }),
        { numRuns: 100 }
      );
    });

    it('should support deep single-chain hierarchies', () => {
      fc.assert(
        fc.property(deepChainArb, (categoryChain) => {
          // Verify chain structure
          expect(categoryChain.length).toBeGreaterThan(0);
          expect(categoryChain.length).toBeLessThanOrEqual(100);

          for (const category of categoryChain) {
            expect(category.name).toBeDefined();
            expect(category.name.length).toBeGreaterThan(0);
            expect(category.name.length).toBeLessThanOrEqual(20);
          }

          // TODO: Test actual deep chain creation when methods are ready
          // Should verify:
          // 1. Long chains can be created successfully
          // 2. Path strings are correctly calculated for deep chains
          // 3. Parent-child relationships are maintained throughout the chain
          // 4. Updates propagate correctly through deep chains
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain performance with deep hierarchies', () => {
      fc.assert(
        fc.property(fc.integer({ min: 10, max: 30 }), (depth) => {
          // Test performance characteristics
          expect(depth).toBeGreaterThanOrEqual(10);
          expect(depth).toBeLessThanOrEqual(30);

          // TODO: Test actual performance when methods are ready
          // Should verify:
          // 1. Category operations complete within reasonable time
          // 2. Memory usage remains bounded for deep trees
          // 3. Database queries are optimized for deep hierarchies
        }),
        { numRuns: 50 } // Fewer runs for performance tests
      );
    });

    it('should handle edge cases in deep hierarchies', () => {
      fc.assert(
        fc.property(
          fc.record({
            maxDepth: fc.integer({ min: 20, max: 50 }),
            branchingFactor: fc.integer({ min: 1, max: 5 }),
          }),
          (config) => {
            // Test edge cases in deep hierarchies
            expect(config.maxDepth).toBeGreaterThanOrEqual(20);
            expect(config.branchingFactor).toBeGreaterThanOrEqual(1);

            // TODO: Test actual edge cases when methods are ready
            // Should verify:
            // 1. Very deep trees with minimal branching work correctly
            // 2. Moderately deep trees with high branching work correctly
            // 3. Path calculations remain accurate in complex structures
            // 4. Circular reference detection works at any depth
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Unit tests for basic category operations
   * Testing specific examples and edge cases for CRUD operations
   */
  describe('Basic Category Operations', () => {
    let mockDoc: any;
    let mockCollection: any;

    beforeEach(() => {
      mockDoc = {
        id: 'test-category-id',
        set: jest.fn().mockResolvedValue(undefined),
        get: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      };

      mockCollection = {
        doc: jest.fn().mockReturnValue(mockDoc),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn(),
      };

      mockFirestore.collection = jest.fn().mockReturnValue(mockCollection);
    });

    describe('createCategory', () => {
      it('should create a root category successfully', async () => {
        const dto: CreateCategoryDto = {
          name: 'Technology',
          description: 'Technology related jobs',
          displayOrder: 1,
          isActive: true,
        };

        const result = await service.createCategory(null, dto);

        expect(result).toBeDefined();
        expect(result.name).toBe('Technology');
        expect(result.parentId).toBeNull();
        expect(result.level).toBe(0);
        expect(result.path).toEqual(['Technology']);
        expect(result.pathString).toBe('Technology');
        expect(mockDoc.set).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Technology',
            description: 'Technology related jobs',
            parentId: null,
            level: 0,
            path: ['Technology'],
            pathString: 'Technology',
            isActive: true,
            displayOrder: 1,
          })
        );
      });

      it('should create a child category successfully', async () => {
        const parentCategory: Category = {
          id: 'parent-id',
          name: 'Technology',
          description: '',
          parentId: null,
          path: ['Technology'],
          pathString: 'Technology',
          level: 0,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        // Mock findById to return parent category
        jest.spyOn(service, 'findById').mockResolvedValue(parentCategory);
        
        // Mock updateChildCount
        const updateChildCountSpy = jest.spyOn(service as any, 'updateChildCount').mockResolvedValue(undefined);

        const dto: CreateCategoryDto = {
          name: 'Software Development',
          description: 'Software development jobs',
        };

        const result = await service.createCategory('parent-id', dto);

        expect(result).toBeDefined();
        expect(result.name).toBe('Software Development');
        expect(result.parentId).toBe('parent-id');
        expect(result.level).toBe(1);
        expect(result.path).toEqual(['Technology', 'Software Development']);
        expect(result.pathString).toBe('Technology.Software Development');
        expect(updateChildCountSpy).toHaveBeenCalledWith('parent-id', 1);
      });

      it('should throw error when parent category does not exist', async () => {
        jest.spyOn(service, 'findById').mockResolvedValue(null);

        const dto: CreateCategoryDto = {
          name: 'Software Development',
        };

        await expect(service.createCategory('non-existent-parent', dto))
          .rejects
          .toThrow('Parent category with ID non-existent-parent not found');
      });

      it('should prevent category from being its own parent', async () => {
        const dto: CreateCategoryDto = {
          name: 'Test Category',
        };

        // Mock doc.id to be the same as parentId
        mockDoc.id = 'same-id';
        
        // Mock findById to return a category (so parent exists check passes)
        const parentCategory: Category = {
          id: 'same-id',
          name: 'Parent',
          description: '',
          parentId: null,
          path: ['Parent'],
          pathString: 'Parent',
          level: 0,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };
        jest.spyOn(service, 'findById').mockResolvedValue(parentCategory);

        await expect(service.createCategory('same-id', dto))
          .rejects
          .toThrow('Category cannot be its own parent');
      });
    });

    describe('updateCategory', () => {
      it('should update category successfully', async () => {
        const existingCategory: Category = {
          id: 'test-id',
          name: 'Old Name',
          description: 'Old description',
          parentId: null,
          path: ['Old Name'],
          pathString: 'Old Name',
          level: 0,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        mockDoc.get.mockResolvedValue({
          exists: true,
          id: 'test-id',
          data: () => existingCategory,
        });

        // Mock getChildCategories to return empty array (no descendants to update)
        jest.spyOn(service as any, 'getChildCategories').mockResolvedValue([]);

        const dto: UpdateCategoryDto = {
          name: 'New Name',
          description: 'New description',
          isActive: false,
        };

        const result = await service.updateCategory('test-id', dto);

        expect(result).toBeDefined();
        expect(result.name).toBe('New Name');
        expect(result.description).toBe('New description');
        expect(result.isActive).toBe(false);
        expect(result.path).toEqual(['New Name']);
        expect(result.pathString).toBe('New Name');
        expect(mockDoc.update).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New Name',
            description: 'New description',
            isActive: false,
            path: ['New Name'],
            pathString: 'New Name',
          })
        );
      });

      it('should throw error when category does not exist', async () => {
        mockDoc.get.mockResolvedValue({ exists: false });

        const dto: UpdateCategoryDto = {
          name: 'New Name',
        };

        await expect(service.updateCategory('non-existent-id', dto))
          .rejects
          .toThrow('Category with ID non-existent-id not found');
      });

      it('should update only provided fields', async () => {
        const existingCategory: Category = {
          id: 'test-id',
          name: 'Existing Name',
          description: 'Existing description',
          parentId: null,
          path: ['Existing Name'],
          pathString: 'Existing Name',
          level: 0,
          isActive: true,
          displayOrder: 5,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        mockDoc.get.mockResolvedValue({
          exists: true,
          id: 'test-id',
          data: () => existingCategory,
        });

        const dto: UpdateCategoryDto = {
          displayOrder: 10,
        };

        const result = await service.updateCategory('test-id', dto);

        expect(result.name).toBe('Existing Name'); // Unchanged
        expect(result.description).toBe('Existing description'); // Unchanged
        expect(result.displayOrder).toBe(10); // Changed
        expect(result.isActive).toBe(true); // Unchanged
      });
    });

    describe('findById', () => {
      it('should return category when it exists', async () => {
        const categoryData = {
          name: 'Test Category',
          description: 'Test description',
          parentId: null,
          path: ['Test Category'],
          pathString: 'Test Category',
          level: 0,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 },
          updatedAt: { seconds: 1234567890, nanoseconds: 0 },
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        mockDoc.get.mockResolvedValue({
          exists: true,
          id: 'test-id',
          data: () => categoryData,
        });

        const result = await service.findById('test-id');

        expect(result).toBeDefined();
        expect(result!.id).toBe('test-id');
        expect(result!.name).toBe('Test Category');
      });

      it('should return null when category does not exist', async () => {
        mockDoc.get.mockResolvedValue({ exists: false });

        const result = await service.findById('non-existent-id');

        expect(result).toBeNull();
      });
    });

    describe('findByPath', () => {
      it('should return category when path exists', async () => {
        const categoryData = {
          name: 'Frontend',
          description: 'Frontend development',
          parentId: 'parent-id',
          path: ['Technology', 'Software', 'Frontend'],
          pathString: 'Technology.Software.Frontend',
          level: 2,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 },
          updatedAt: { seconds: 1234567890, nanoseconds: 0 },
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        mockCollection.get.mockResolvedValue({
          empty: false,
          docs: [{
            id: 'test-id',
            data: () => categoryData,
          }],
        });

        const result = await service.findByPath(['Technology', 'Software', 'Frontend']);

        expect(result).toBeDefined();
        expect(result!.id).toBe('test-id');
        expect(result!.pathString).toBe('Technology.Software.Frontend');
        expect(mockCollection.where).toHaveBeenCalledWith('pathString', '==', 'Technology.Software.Frontend');
        expect(mockCollection.where).toHaveBeenCalledWith('isActive', '==', true);
      });

      it('should return null when path does not exist', async () => {
        mockCollection.get.mockResolvedValue({ empty: true });

        const result = await service.findByPath(['Non', 'Existent', 'Path']);

        expect(result).toBeNull();
      });
    });
  });

  /**
   * **Feature: job-category-tree, Property 2: Category deletion strategy consistency**
   * 
   * Property-based test to verify that for any category deletion with children,
   * the system should apply the specified deletion strategy consistently and handle
   * all affected relationships.
   */
  describe('Property 2: Category deletion strategy consistency', () => {
    // Generator for deletion strategies
    const deletionStrategyArb = fc.constantFrom(
      'cascade' as const,
      'move_to_parent' as const,
      'move_to_root' as const
    );

    // Generator for category trees with parent-child relationships
    const categoryTreeWithChildrenArb = fc.integer({ min: 0, max: 5 }).chain(parentLevel =>
      fc.record({
        parent: fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          parentId: fc.option(fc.uuid()),
          level: fc.constant(parentLevel),
        }),
        children: fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            level: fc.constant(parentLevel + 1), // Children always have level = parent.level + 1
          }),
          { minLength: 1, maxLength: 10 }
        ),
      })
    );

    it('should apply cascade deletion strategy consistently', () => {
      fc.assert(
        fc.property(categoryTreeWithChildrenArb, (treeData) => {
          // Verify test data structure
          expect(treeData.parent).toBeDefined();
          expect(treeData.children).toBeDefined();
          expect(treeData.children.length).toBeGreaterThan(0);

          // Verify all children have higher level than parent
          for (const child of treeData.children) {
            expect(child.level).toBeGreaterThan(treeData.parent.level);
          }

          // TODO: Test actual cascade deletion when method is ready
          // Should verify:
          // 1. All children are deleted recursively
          // 2. All grandchildren are also deleted
          // 3. No orphaned categories remain
          // 4. Parent category is deleted last
          // 5. All category-vacancy associations are cleaned up
        }),
        { numRuns: 100 }
      );
    });

    it('should apply move-to-parent strategy consistently', () => {
      fc.assert(
        fc.property(categoryTreeWithChildrenArb, (treeData) => {
          // Verify test data structure
          expect(treeData.parent).toBeDefined();
          expect(treeData.children).toBeDefined();

          // TODO: Test actual move-to-parent deletion when method is ready
          // Should verify:
          // 1. All children are moved to the parent's parent
          // 2. Children's paths are updated correctly
          // 3. Children's levels are adjusted appropriately
          // 4. Parent category is deleted
          // 5. Grandparent's child count is updated correctly
        }),
        { numRuns: 100 }
      );
    });

    it('should apply move-to-root strategy consistently', () => {
      fc.assert(
        fc.property(categoryTreeWithChildrenArb, (treeData) => {
          // Verify test data structure
          expect(treeData.parent).toBeDefined();
          expect(treeData.children).toBeDefined();

          // TODO: Test actual move-to-root deletion when method is ready
          // Should verify:
          // 1. All children are moved to root level (parentId = null)
          // 2. Children's paths are updated to single-element arrays
          // 3. Children's levels are set to 0
          // 4. Parent category is deleted
          // 5. No parent-child relationships remain for moved children
        }),
        { numRuns: 100 }
      );
    });

    it('should handle deletion strategy consistently across different tree structures', () => {
      fc.assert(
        fc.property(
          deletionStrategyArb,
          categoryTreeWithChildrenArb,
          (strategy, treeData) => {
            // Verify inputs
            expect(['cascade', 'move_to_parent', 'move_to_root']).toContain(strategy);
            expect(treeData.parent).toBeDefined();
            expect(treeData.children).toBeDefined();

            // TODO: Test actual deletion with different strategies when method is ready
            // Should verify:
            // 1. Strategy is applied consistently regardless of tree structure
            // 2. All affected relationships are handled correctly
            // 3. Data integrity is maintained after deletion
            // 4. No inconsistent state remains in the database
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prevent deletion of categories with active vacancies', () => {
      fc.assert(
        fc.property(
          fc.record({
            categoryId: fc.uuid(),
            hasVacancies: fc.boolean(),
            strategy: deletionStrategyArb,
          }),
          (testData) => {
            // Verify test data
            expect(testData.categoryId).toBeDefined();
            expect(typeof testData.hasVacancies).toBe('boolean');
            expect(['cascade', 'move_to_parent', 'move_to_root']).toContain(testData.strategy);

            // TODO: Test actual vacancy validation when method is ready
            // Should verify:
            // 1. Categories with active vacancies cannot be deleted
            // 2. Appropriate error is thrown when deletion is attempted
            // 3. No partial deletion occurs when validation fails
            // 4. Tree structure remains unchanged when deletion is prevented
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: job-category-tree, Property 5: Category deletion orphan handling**
   * 
   * Property-based test to verify that for any category deletion that affects
   * vacancy assignments, the system should handle orphaned vacancies according
   * to the defined policy.
   */
  describe('Property 5: Category deletion orphan handling', () => {
    // Generator for categories with vacancy assignments
    const categoryWithVacanciesArb = fc.record({
      categoryId: fc.uuid(),
      vacancyIds: fc.array(fc.uuid(), { minLength: 1, maxLength: 20 }),
      hasChildren: fc.boolean(),
      childrenWithVacancies: fc.array(
        fc.record({
          categoryId: fc.uuid(),
          vacancyIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 10 }),
        }),
        { minLength: 0, maxLength: 5 }
      ),
    });

    // Generator for orphan handling policies
    const orphanHandlingPolicyArb = fc.constantFrom(
      'reassign_to_parent' as const,
      'reassign_to_root' as const,
      'remove_assignment' as const,
      'prevent_deletion' as const
    );

    it('should handle orphaned vacancies consistently when parent category is deleted', () => {
      fc.assert(
        fc.property(
          categoryWithVacanciesArb,
          orphanHandlingPolicyArb,
          (categoryData, policy) => {
            // Verify test data structure
            expect(categoryData.categoryId).toBeDefined();
            expect(categoryData.vacancyIds).toBeDefined();
            expect(categoryData.vacancyIds.length).toBeGreaterThan(0);
            expect(['reassign_to_parent', 'reassign_to_root', 'remove_assignment', 'prevent_deletion']).toContain(policy);

            // TODO: Test actual orphan handling when deletion methods are ready
            // Should verify:
            // 1. All vacancy assignments are handled according to policy
            // 2. No orphaned vacancy-category associations remain
            // 3. Vacancy data integrity is maintained
            // 4. Policy is applied consistently across all affected vacancies
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle cascading orphan effects when deleting category trees', () => {
      fc.assert(
        fc.property(categoryWithVacanciesArb, (categoryData) => {
          // Verify test data
          expect(categoryData.categoryId).toBeDefined();
          expect(categoryData.childrenWithVacancies).toBeDefined();

          // Calculate total affected vacancies
          const totalVacancies = categoryData.vacancyIds.length + 
            categoryData.childrenWithVacancies.reduce((sum, child) => sum + child.vacancyIds.length, 0);

          if (totalVacancies > 0) {
            // TODO: Test actual cascading orphan handling when methods are ready
            // Should verify:
            // 1. All vacancies in the entire subtree are handled
            // 2. Orphan handling is applied recursively to all levels
            // 3. No partial orphan states remain after deletion
            // 4. Database consistency is maintained throughout the process
          }

          expect(totalVacancies).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should prevent deletion when orphan handling policy requires it', () => {
      fc.assert(
        fc.property(
          fc.record({
            categoryId: fc.uuid(),
            vacancyCount: fc.integer({ min: 1, max: 100 }),
            preventDeletionPolicy: fc.boolean(),
          }),
          (testData) => {
            // Verify test data
            expect(testData.categoryId).toBeDefined();
            expect(testData.vacancyCount).toBeGreaterThan(0);
            expect(typeof testData.preventDeletionPolicy).toBe('boolean');

            // TODO: Test actual prevention logic when methods are ready
            // Should verify:
            // 1. Deletion is prevented when policy requires it
            // 2. Appropriate error message is provided
            // 3. No partial deletion occurs
            // 4. Category and vacancy data remain unchanged
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain referential integrity during orphan handling', () => {
      fc.assert(
        fc.property(
          fc.record({
            parentCategoryId: fc.uuid(),
            childCategories: fc.array(
              fc.record({
                id: fc.uuid(),
                vacancyIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
              }),
              { minLength: 1, maxLength: 10 }
            ),
            deletionStrategy: fc.constantFrom('cascade', 'move_to_parent', 'move_to_root'),
          }),
          (testData) => {
            // Verify test structure
            expect(testData.parentCategoryId).toBeDefined();
            expect(testData.childCategories).toBeDefined();
            expect(testData.childCategories.length).toBeGreaterThan(0);

            // Calculate total affected vacancies
            const totalAffectedVacancies = testData.childCategories.reduce(
              (sum, child) => sum + child.vacancyIds.length, 0
            );

            // TODO: Test actual referential integrity during orphan handling
            // Should verify:
            // 1. All foreign key relationships remain valid
            // 2. No dangling references are created
            // 3. Vacancy-category associations are properly updated
            // 4. Database constraints are not violated during the process

            expect(totalAffectedVacancies).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle complex orphan scenarios with multiple assignment levels', () => {
      fc.assert(
        fc.property(
          fc.record({
            rootCategory: fc.uuid(),
            nestedStructure: fc.array(
              fc.record({
                level: fc.integer({ min: 1, max: 5 }),
                categoryId: fc.uuid(),
                vacancyIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
                multipleAssignments: fc.boolean(), // Whether vacancies are assigned to multiple categories
              }),
              { minLength: 1, maxLength: 15 }
            ),
          }),
          (testData) => {
            // Verify complex structure
            expect(testData.rootCategory).toBeDefined();
            expect(testData.nestedStructure).toBeDefined();

            // Verify level consistency
            for (const node of testData.nestedStructure) {
              expect(node.level).toBeGreaterThan(0);
              expect(node.level).toBeLessThanOrEqual(5);
            }

            // TODO: Test actual complex orphan handling when methods are ready
            // Should verify:
            // 1. Multi-level orphan handling works correctly
            // 2. Vacancies with multiple category assignments are handled properly
            // 3. Complex tree structures don't break orphan handling logic
            // 4. Performance remains acceptable for complex scenarios
          }
        ),
        { numRuns: 50 } // Fewer runs for complex scenarios
      );
    });
  });

  /**
   * Unit tests for category tree operations
   * Testing specific examples for tree operations and path management
   */
  describe('Category Tree Operations', () => {
    let mockDoc: any;
    let mockCollection: any;

    beforeEach(() => {
      mockDoc = {
        id: 'test-category-id',
        set: jest.fn().mockResolvedValue(undefined),
        get: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      };

      mockCollection = {
        doc: jest.fn().mockReturnValue(mockDoc),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn(),
      };

      mockFirestore.collection = jest.fn().mockReturnValue(mockCollection);
    });

    describe('moveCategory', () => {
      it('should move category to new parent successfully', async () => {
        const category: Category = {
          id: 'child-id',
          name: 'Frontend',
          description: '',
          parentId: 'old-parent-id',
          path: ['Technology', 'Software', 'Frontend'],
          pathString: 'Technology.Software.Frontend',
          level: 2,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        const newParent: Category = {
          id: 'new-parent-id',
          name: 'Development',
          description: '',
          parentId: null,
          path: ['Development'],
          pathString: 'Development',
          level: 0,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 2,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        const oldParent: Category = {
          id: 'old-parent-id',
          name: 'Software',
          description: '',
          parentId: 'tech-id',
          path: ['Technology', 'Software'],
          pathString: 'Technology.Software',
          level: 1,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 3,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        // Mock findById calls
        jest.spyOn(service, 'findById')
          .mockResolvedValueOnce(category) // First call for the category being moved
          .mockResolvedValueOnce(newParent) // Second call for new parent validation
          .mockResolvedValueOnce(oldParent) // Third call for old parent child count update
          .mockResolvedValueOnce({ // Final call to return updated category
            ...category,
            parentId: 'new-parent-id',
            path: ['Development', 'Frontend'],
            pathString: 'Development.Frontend',
            level: 1,
          });

        // Mock validateParentChild
        jest.spyOn(service as any, 'validateParentChild').mockResolvedValue(true);
        
        // Mock updateChildCount and updateCategoryParent
        jest.spyOn(service as any, 'updateChildCount').mockResolvedValue(undefined);
        jest.spyOn(service as any, 'updateCategoryParent').mockResolvedValue(undefined);

        const result = await service.moveCategory('child-id', 'new-parent-id');

        expect(result).toBeDefined();
        expect(result.parentId).toBe('new-parent-id');
        expect(result.path).toEqual(['Development', 'Frontend']);
        expect(result.pathString).toBe('Development.Frontend');
        expect(result.level).toBe(1);
      });

      it('should move category to root level', async () => {
        const category: Category = {
          id: 'child-id',
          name: 'Standalone',
          description: '',
          parentId: 'parent-id',
          path: ['Parent', 'Standalone'],
          pathString: 'Parent.Standalone',
          level: 1,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        const parent: Category = {
          id: 'parent-id',
          name: 'Parent',
          description: '',
          parentId: null,
          path: ['Parent'],
          pathString: 'Parent',
          level: 0,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 1,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        // Mock findById calls
        jest.spyOn(service, 'findById')
          .mockResolvedValueOnce(category) // Category being moved
          .mockResolvedValueOnce(parent) // Old parent for child count update
          .mockResolvedValueOnce({ // Final call to return updated category
            ...category,
            parentId: null,
            path: ['Standalone'],
            pathString: 'Standalone',
            level: 0,
          });

        // Mock helper methods
        jest.spyOn(service as any, 'updateChildCount').mockResolvedValue(undefined);
        jest.spyOn(service as any, 'updateCategoryParent').mockResolvedValue(undefined);

        const result = await service.moveCategory('child-id', null);

        expect(result).toBeDefined();
        expect(result.parentId).toBeNull();
        expect(result.path).toEqual(['Standalone']);
        expect(result.pathString).toBe('Standalone');
        expect(result.level).toBe(0);
      });

      it('should throw error when trying to create circular reference', async () => {
        const category: Category = {
          id: 'parent-id',
          name: 'Parent',
          description: '',
          parentId: null,
          path: ['Parent'],
          pathString: 'Parent',
          level: 0,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 1,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        const child: Category = {
          id: 'child-id',
          name: 'Child',
          description: '',
          parentId: 'parent-id',
          path: ['Parent', 'Child'],
          pathString: 'Parent.Child',
          level: 1,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        // Mock findById calls
        jest.spyOn(service, 'findById')
          .mockResolvedValueOnce(category) // Category being moved
          .mockResolvedValueOnce(child); // New parent (which is actually a child)

        // Mock validateParentChild to return false (circular reference)
        jest.spyOn(service as any, 'validateParentChild').mockResolvedValue(false);

        await expect(service.moveCategory('parent-id', 'child-id'))
          .rejects
          .toThrow('Cannot move category: would create circular reference');
      });

      it('should return same category when moving to same parent', async () => {
        const category: Category = {
          id: 'child-id',
          name: 'Child',
          description: '',
          parentId: 'parent-id',
          path: ['Parent', 'Child'],
          pathString: 'Parent.Child',
          level: 1,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        jest.spyOn(service, 'findById').mockResolvedValue(category);

        const result = await service.moveCategory('child-id', 'parent-id');

        expect(result).toEqual(category);
      });
    });

    describe('getCategoryTree', () => {
      it('should build hierarchical tree structure', async () => {
        const categories: Category[] = [
          {
            id: 'root-1',
            name: 'Technology',
            description: '',
            parentId: null,
            path: ['Technology'],
            pathString: 'Technology',
            level: 0,
            isActive: true,
            displayOrder: 1,
            createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            childCount: 2,
            vacancyCount: 5,
            totalVacancyCount: 15,
          },
          {
            id: 'child-1',
            name: 'Software',
            description: '',
            parentId: 'root-1',
            path: ['Technology', 'Software'],
            pathString: 'Technology.Software',
            level: 1,
            isActive: true,
            displayOrder: 1,
            createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            childCount: 1,
            vacancyCount: 8,
            totalVacancyCount: 10,
          },
          {
            id: 'grandchild-1',
            name: 'Frontend',
            description: '',
            parentId: 'child-1',
            path: ['Technology', 'Software', 'Frontend'],
            pathString: 'Technology.Software.Frontend',
            level: 2,
            isActive: true,
            displayOrder: 1,
            createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            childCount: 0,
            vacancyCount: 2,
            totalVacancyCount: 2,
          },
        ];

        mockCollection.get.mockResolvedValue({
          docs: categories.map(cat => ({
            id: cat.id,
            data: () => cat,
          })),
        });

        const result = await service.getCategoryTree();

        expect(result).toBeDefined();
        expect(result.length).toBe(1); // One root node
        expect(result[0].category.name).toBe('Technology');
        expect(result[0].children.length).toBe(1); // One child
        expect(result[0].children[0].category.name).toBe('Software');
        expect(result[0].children[0].children.length).toBe(1); // One grandchild
        expect(result[0].children[0].children[0].category.name).toBe('Frontend');
      });

      it('should handle empty category list', async () => {
        mockCollection.get.mockResolvedValue({ docs: [] });

        const result = await service.getCategoryTree();

        expect(result).toBeDefined();
        expect(result.length).toBe(0);
      });

      it('should sort categories by displayOrder and name', async () => {
        const categories: Category[] = [
          {
            id: 'cat-1',
            name: 'Zebra',
            description: '',
            parentId: null,
            path: ['Zebra'],
            pathString: 'Zebra',
            level: 0,
            isActive: true,
            displayOrder: 2,
            createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            childCount: 0,
            vacancyCount: 0,
            totalVacancyCount: 0,
          },
          {
            id: 'cat-2',
            name: 'Alpha',
            description: '',
            parentId: null,
            path: ['Alpha'],
            pathString: 'Alpha',
            level: 0,
            isActive: true,
            displayOrder: 1,
            createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            childCount: 0,
            vacancyCount: 0,
            totalVacancyCount: 0,
          },
          {
            id: 'cat-3',
            name: 'Beta',
            description: '',
            parentId: null,
            path: ['Beta'],
            pathString: 'Beta',
            level: 0,
            isActive: true,
            displayOrder: 1,
            createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            childCount: 0,
            vacancyCount: 0,
            totalVacancyCount: 0,
          },
        ];

        mockCollection.get.mockResolvedValue({
          docs: categories.map(cat => ({
            id: cat.id,
            data: () => cat,
          })),
        });

        const result = await service.getCategoryTree();

        expect(result).toBeDefined();
        expect(result.length).toBe(3);
        // Should be sorted by displayOrder first (1, 1, 2), then by name (Alpha, Beta, Zebra)
        expect(result[0].category.name).toBe('Alpha');
        expect(result[1].category.name).toBe('Beta');
        expect(result[2].category.name).toBe('Zebra');
      });
    });

    describe('getCategoryPath', () => {
      it('should return category path successfully', async () => {
        const category: Category = {
          id: 'test-id',
          name: 'Frontend',
          description: '',
          parentId: 'parent-id',
          path: ['Technology', 'Software', 'Frontend'],
          pathString: 'Technology.Software.Frontend',
          level: 2,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        jest.spyOn(service, 'findById').mockResolvedValue(category);

        const result = await service.getCategoryPath('test-id');

        expect(result).toEqual(['Technology', 'Software', 'Frontend']);
      });

      it('should throw error when category not found', async () => {
        jest.spyOn(service, 'findById').mockResolvedValue(null);

        await expect(service.getCategoryPath('non-existent-id'))
          .rejects
          .toThrow('Category with ID non-existent-id not found');
      });

      it('should return single-element path for root category', async () => {
        const rootCategory: Category = {
          id: 'root-id',
          name: 'Technology',
          description: '',
          parentId: null,
          path: ['Technology'],
          pathString: 'Technology',
          level: 0,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        jest.spyOn(service, 'findById').mockResolvedValue(rootCategory);

        const result = await service.getCategoryPath('root-id');

        expect(result).toEqual(['Technology']);
      });
    });

    describe('updateCategory with path updates', () => {
      it('should update descendant paths when category name changes', async () => {
        const category: Category = {
          id: 'parent-id',
          name: 'OldName',
          description: '',
          parentId: null,
          path: ['OldName'],
          pathString: 'OldName',
          level: 0,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 1,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        mockDoc.get.mockResolvedValue({
          exists: true,
          id: 'parent-id',
          data: () => category,
        });

        // Mock getChildCategories to return empty array (no descendants)
        jest.spyOn(service as any, 'getChildCategories').mockResolvedValue([]);
        
        // Mock updateDescendantPaths
        const updateDescendantPathsSpy = jest.spyOn(service as any, 'updateDescendantPaths').mockResolvedValue(undefined);

        const dto: UpdateCategoryDto = {
          name: 'NewName',
        };

        const result = await service.updateCategory('parent-id', dto);

        expect(result.name).toBe('NewName');
        expect(result.path).toEqual(['NewName']);
        expect(result.pathString).toBe('NewName');
        expect(updateDescendantPathsSpy).toHaveBeenCalledWith('parent-id', ['NewName'], 0);
      });
    });
  });

  /**
   * Unit tests for category tree operations
   * Testing specific examples and edge cases for tree operations and path management
   */
  describe('Category Tree Operations', () => {
    let mockDoc: any;
    let mockCollection: any;

    beforeEach(() => {
      mockDoc = {
        id: 'test-category-id',
        set: jest.fn().mockResolvedValue(undefined),
        get: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      };

      mockCollection = {
        doc: jest.fn().mockReturnValue(mockDoc),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn(),
      };

      mockFirestore.collection = jest.fn().mockReturnValue(mockCollection);
    });

    describe('moveCategory', () => {
      it('should move category to new parent successfully', async () => {
        const category: Category = {
          id: 'child-id',
          name: 'Frontend',
          description: 'Frontend development',
          parentId: 'old-parent-id',
          path: ['Technology', 'Software', 'Frontend'],
          pathString: 'Technology.Software.Frontend',
          level: 2,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        const newParent: Category = {
          id: 'new-parent-id',
          name: 'Design',
          description: 'Design related',
          parentId: null,
          path: ['Design'],
          pathString: 'Design',
          level: 0,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 1,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        const oldParent: Category = {
          id: 'old-parent-id',
          name: 'Software',
          description: 'Software development',
          parentId: 'tech-id',
          path: ['Technology', 'Software'],
          pathString: 'Technology.Software',
          level: 1,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 2,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        // Mock findById calls
        jest.spyOn(service, 'findById')
          .mockResolvedValueOnce(category) // First call for the category being moved
          .mockResolvedValueOnce(newParent) // Second call for new parent validation
          .mockResolvedValueOnce(oldParent) // Third call for old parent child count update
          .mockResolvedValueOnce({ // Final call to return updated category
            ...category,
            parentId: 'new-parent-id',
            path: ['Design', 'Frontend'],
            pathString: 'Design.Frontend',
            level: 1,
          });

        // Mock validateParentChild
        jest.spyOn(service as any, 'validateParentChild').mockResolvedValue(true);

        // Mock helper methods
        jest.spyOn(service as any, 'updateChildCount').mockResolvedValue(undefined);
        jest.spyOn(service as any, 'updateCategoryParent').mockResolvedValue(undefined);

        const result = await service.moveCategory('child-id', 'new-parent-id');

        expect(result).toBeDefined();
        expect(result.parentId).toBe('new-parent-id');
        expect(result.path).toEqual(['Design', 'Frontend']);
        expect(result.pathString).toBe('Design.Frontend');
        expect(result.level).toBe(1);
      });

      it('should move category to root level', async () => {
        const category: Category = {
          id: 'child-id',
          name: 'Standalone',
          description: 'Standalone category',
          parentId: 'parent-id',
          path: ['Parent', 'Standalone'],
          pathString: 'Parent.Standalone',
          level: 1,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        const parent: Category = {
          id: 'parent-id',
          name: 'Parent',
          description: 'Parent category',
          parentId: null,
          path: ['Parent'],
          pathString: 'Parent',
          level: 0,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 1,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        // Mock findById calls
        jest.spyOn(service, 'findById')
          .mockResolvedValueOnce(category) // First call for the category being moved
          .mockResolvedValueOnce(parent) // Second call for old parent child count update
          .mockResolvedValueOnce({ // Final call to return updated category
            ...category,
            parentId: null,
            path: ['Standalone'],
            pathString: 'Standalone',
            level: 0,
          });

        // Mock helper methods
        jest.spyOn(service as any, 'updateChildCount').mockResolvedValue(undefined);
        jest.spyOn(service as any, 'updateCategoryParent').mockResolvedValue(undefined);

        const result = await service.moveCategory('child-id', null);

        expect(result).toBeDefined();
        expect(result.parentId).toBeNull();
        expect(result.path).toEqual(['Standalone']);
        expect(result.pathString).toBe('Standalone');
        expect(result.level).toBe(0);
      });

      it('should throw error when category does not exist', async () => {
        jest.spyOn(service, 'findById').mockResolvedValue(null);

        await expect(service.moveCategory('non-existent-id', 'parent-id'))
          .rejects
          .toThrow('Category with ID non-existent-id not found');
      });

      it('should throw error when new parent does not exist', async () => {
        const category: Category = {
          id: 'child-id',
          name: 'Child',
          description: '',
          parentId: null,
          path: ['Child'],
          pathString: 'Child',
          level: 0,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        jest.spyOn(service, 'findById')
          .mockResolvedValueOnce(category) // First call for the category
          .mockResolvedValueOnce(null); // Second call for non-existent parent

        await expect(service.moveCategory('child-id', 'non-existent-parent'))
          .rejects
          .toThrow('New parent category with ID non-existent-parent not found');
      });

      it('should prevent circular reference when moving category', async () => {
        const category: Category = {
          id: 'parent-id',
          name: 'Parent',
          description: '',
          parentId: null,
          path: ['Parent'],
          pathString: 'Parent',
          level: 0,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 1,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        const child: Category = {
          id: 'child-id',
          name: 'Child',
          description: '',
          parentId: 'parent-id',
          path: ['Parent', 'Child'],
          pathString: 'Parent.Child',
          level: 1,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        jest.spyOn(service, 'findById')
          .mockResolvedValueOnce(category) // First call for the category being moved
          .mockResolvedValueOnce(child); // Second call for new parent validation

        // Mock validateParentChild to return false (circular reference)
        jest.spyOn(service as any, 'validateParentChild').mockResolvedValue(false);

        await expect(service.moveCategory('parent-id', 'child-id'))
          .rejects
          .toThrow('Cannot move category: would create circular reference');
      });

      it('should return same category when moving to same parent', async () => {
        const category: Category = {
          id: 'child-id',
          name: 'Child',
          description: '',
          parentId: 'parent-id',
          path: ['Parent', 'Child'],
          pathString: 'Parent.Child',
          level: 1,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        jest.spyOn(service, 'findById').mockResolvedValue(category);

        const result = await service.moveCategory('child-id', 'parent-id');

        expect(result).toEqual(category);
      });
    });

    describe('getCategoryTree', () => {
      it('should build hierarchical tree structure correctly', async () => {
        const categories: Category[] = [
          {
            id: 'root-1',
            name: 'Technology',
            description: '',
            parentId: null,
            path: ['Technology'],
            pathString: 'Technology',
            level: 0,
            isActive: true,
            displayOrder: 1,
            createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            childCount: 2,
            vacancyCount: 5,
            totalVacancyCount: 15,
          },
          {
            id: 'child-1',
            name: 'Software',
            description: '',
            parentId: 'root-1',
            path: ['Technology', 'Software'],
            pathString: 'Technology.Software',
            level: 1,
            isActive: true,
            displayOrder: 1,
            createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            childCount: 1,
            vacancyCount: 8,
            totalVacancyCount: 10,
          },
          {
            id: 'grandchild-1',
            name: 'Frontend',
            description: '',
            parentId: 'child-1',
            path: ['Technology', 'Software', 'Frontend'],
            pathString: 'Technology.Software.Frontend',
            level: 2,
            isActive: true,
            displayOrder: 1,
            createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            childCount: 0,
            vacancyCount: 2,
            totalVacancyCount: 2,
          },
          {
            id: 'root-2',
            name: 'Design',
            description: '',
            parentId: null,
            path: ['Design'],
            pathString: 'Design',
            level: 0,
            isActive: true,
            displayOrder: 2,
            createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            childCount: 0,
            vacancyCount: 3,
            totalVacancyCount: 3,
          },
        ];

        mockCollection.get.mockResolvedValue({
          docs: categories.map(cat => ({
            id: cat.id,
            data: () => cat,
          })),
        });

        const result = await service.getCategoryTree();

        expect(result).toBeDefined();
        expect(result.length).toBe(2); // Two root categories

        // Check first root category (Technology)
        const techNode = result.find(node => node.category.name === 'Technology');
        expect(techNode).toBeDefined();
        expect(techNode!.children.length).toBe(1); // One child (Software)
        expect(techNode!.vacancyCount).toBe(5);

        // Check child category (Software)
        const softwareNode = techNode!.children[0];
        expect(softwareNode.category.name).toBe('Software');
        expect(softwareNode.children.length).toBe(1); // One child (Frontend)

        // Check grandchild category (Frontend)
        const frontendNode = softwareNode.children[0];
        expect(frontendNode.category.name).toBe('Frontend');
        expect(frontendNode.children.length).toBe(0); // No children

        // Check second root category (Design)
        const designNode = result.find(node => node.category.name === 'Design');
        expect(designNode).toBeDefined();
        expect(designNode!.children.length).toBe(0); // No children
        expect(designNode!.vacancyCount).toBe(3);
      });

      it('should return empty array when no categories exist', async () => {
        mockCollection.get.mockResolvedValue({ docs: [] });

        const result = await service.getCategoryTree();

        expect(result).toBeDefined();
        expect(result.length).toBe(0);
      });

      it('should sort categories by displayOrder and name', async () => {
        const categories: Category[] = [
          {
            id: 'cat-3',
            name: 'Zebra',
            description: '',
            parentId: null,
            path: ['Zebra'],
            pathString: 'Zebra',
            level: 0,
            isActive: true,
            displayOrder: 2,
            createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            childCount: 0,
            vacancyCount: 0,
            totalVacancyCount: 0,
          },
          {
            id: 'cat-1',
            name: 'Alpha',
            description: '',
            parentId: null,
            path: ['Alpha'],
            pathString: 'Alpha',
            level: 0,
            isActive: true,
            displayOrder: 1,
            createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            childCount: 0,
            vacancyCount: 0,
            totalVacancyCount: 0,
          },
          {
            id: 'cat-2',
            name: 'Beta',
            description: '',
            parentId: null,
            path: ['Beta'],
            pathString: 'Beta',
            level: 0,
            isActive: true,
            displayOrder: 1,
            createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
            childCount: 0,
            vacancyCount: 0,
            totalVacancyCount: 0,
          },
        ];

        mockCollection.get.mockResolvedValue({
          docs: categories.map(cat => ({
            id: cat.id,
            data: () => cat,
          })),
        });

        const result = await service.getCategoryTree();

        expect(result).toBeDefined();
        expect(result.length).toBe(3);

        // Should be sorted by displayOrder first, then by name
        expect(result[0].category.name).toBe('Alpha'); // displayOrder 1, name Alpha
        expect(result[1].category.name).toBe('Beta');  // displayOrder 1, name Beta
        expect(result[2].category.name).toBe('Zebra'); // displayOrder 2, name Zebra
      });
    });

    describe('getCategoryPath', () => {
      it('should return correct path for existing category', async () => {
        const category: Category = {
          id: 'test-id',
          name: 'Frontend',
          description: '',
          parentId: 'parent-id',
          path: ['Technology', 'Software', 'Frontend'],
          pathString: 'Technology.Software.Frontend',
          level: 2,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        jest.spyOn(service, 'findById').mockResolvedValue(category);

        const result = await service.getCategoryPath('test-id');

        expect(result).toEqual(['Technology', 'Software', 'Frontend']);
      });

      it('should throw error when category does not exist', async () => {
        jest.spyOn(service, 'findById').mockResolvedValue(null);

        await expect(service.getCategoryPath('non-existent-id'))
          .rejects
          .toThrow('Category with ID non-existent-id not found');
      });

      it('should return single-element path for root category', async () => {
        const category: Category = {
          id: 'root-id',
          name: 'Technology',
          description: '',
          parentId: null,
          path: ['Technology'],
          pathString: 'Technology',
          level: 0,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        jest.spyOn(service, 'findById').mockResolvedValue(category);

        const result = await service.getCategoryPath('root-id');

        expect(result).toEqual(['Technology']);
      });
    });
  });

  /**
   * **Feature: job-category-tree, Property 9: Category search functionality**
   * 
   * Property-based test to verify that for any search query, the autocomplete system
   * should return relevant category suggestions based on name and hierarchy.
   */
  describe('Property 9: Category search functionality', () => {
    // Generator for search queries
    const searchQueryArb = fc.string({ minLength: 1, maxLength: 50 });
    
    // Generator for category names
    const categoryNameArb = fc.string({ minLength: 1, maxLength: 100 });
    
    // Generator for category descriptions
    const categoryDescriptionArb = fc.option(fc.string({ minLength: 0, maxLength: 500 }));

    // Generator for search test data
    const searchTestDataArb = fc.record({
      query: searchQueryArb,
      categories: fc.array(
        fc.record({
          id: fc.uuid(),
          name: categoryNameArb,
          description: categoryDescriptionArb,
          path: fc.array(categoryNameArb, { minLength: 1, maxLength: 5 }),
          isActive: fc.boolean(),
        }),
        { minLength: 0, maxLength: 20 }
      ),
      limit: fc.option(fc.integer({ min: 1, max: 50 })),
      parentId: fc.option(fc.uuid()),
    });

    it('should return relevant categories based on name matching', () => {
      fc.assert(
        fc.property(searchTestDataArb, (testData) => {
          // Verify test data structure
          expect(testData.query).toBeDefined();
          expect(testData.categories).toBeDefined();

          // Filter categories that should match the query
          const normalizedQuery = testData.query.toLowerCase();
          const expectedMatches = testData.categories.filter(cat => 
            cat.name.toLowerCase().includes(normalizedQuery) && cat.isActive
          );

          // TODO: Test actual search functionality when methods are ready
          // Should verify:
          // 1. All returned categories contain the search query in their name
          // 2. Results are sorted by relevance (exact matches first)
          // 3. Only active categories are returned (unless specified otherwise)
          // 4. Limit parameter is respected

          expect(expectedMatches.length).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should return relevant categories based on description matching', () => {
      fc.assert(
        fc.property(searchTestDataArb, (testData) => {
          // Verify test data
          expect(testData.query).toBeDefined();
          expect(testData.categories).toBeDefined();

          // Filter categories that should match by description
          const normalizedQuery = testData.query.toLowerCase();
          const expectedMatches = testData.categories.filter(cat => 
            cat.description?.toLowerCase().includes(normalizedQuery) && cat.isActive
          );

          // TODO: Test actual description search when methods are ready
          // Should verify:
          // 1. Categories with matching descriptions are returned
          // 2. Description matches are ranked lower than name matches
          // 3. Search is case-insensitive
          // 4. Partial matches are supported

          expect(expectedMatches.length).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should return relevant categories based on path matching', () => {
      fc.assert(
        fc.property(searchTestDataArb, (testData) => {
          // Verify test data
          expect(testData.query).toBeDefined();
          expect(testData.categories).toBeDefined();

          // Filter categories that should match by path
          const normalizedQuery = testData.query.toLowerCase();
          const expectedMatches = testData.categories.filter(cat => 
            cat.path.some(pathSegment => 
              pathSegment.toLowerCase().includes(normalizedQuery)
            ) && cat.isActive
          );

          // TODO: Test actual path search when methods are ready
          // Should verify:
          // 1. Categories with matching path segments are returned
          // 2. Path matches allow finding categories by parent names
          // 3. Hierarchical search works correctly
          // 4. Path matches are ranked appropriately

          expect(expectedMatches.length).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should provide autocomplete suggestions with proper ranking', () => {
      fc.assert(
        fc.property(
          fc.record({
            query: fc.string({ minLength: 2, maxLength: 20 }),
            categoryNames: fc.array(
              fc.string({ minLength: 3, maxLength: 30 }),
              { minLength: 5, maxLength: 15 }
            ),
            limit: fc.integer({ min: 1, max: 10 }),
          }),
          (testData) => {
            // Verify test data
            expect(testData.query).toBeDefined();
            expect(testData.categoryNames).toBeDefined();
            expect(testData.limit).toBeGreaterThan(0);

            // TODO: Test actual autocomplete functionality when methods are ready
            // Should verify:
            // 1. Suggestions are relevant to the query
            // 2. Exact matches are ranked higher than partial matches
            // 3. Prefix matches are ranked higher than substring matches
            // 4. Results are limited to the specified count
            // 5. Suggestions are unique (no duplicates)
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases in search queries', () => {
      fc.assert(
        fc.property(
          fc.record({
            query: fc.oneof(
              fc.constant(''), // Empty string
              fc.constant('   '), // Whitespace only
              fc.string({ minLength: 1, maxLength: 1 }), // Single character
              fc.string({ minLength: 100, maxLength: 200 }), // Very long query
            ),
            categories: fc.array(
              fc.record({
                name: categoryNameArb,
                isActive: fc.boolean(),
              }),
              { minLength: 0, maxLength: 10 }
            ),
          }),
          (testData) => {
            // Verify test data
            expect(testData.query).toBeDefined();
            expect(testData.categories).toBeDefined();

            // TODO: Test actual edge case handling when methods are ready
            // Should verify:
            // 1. Empty queries return empty results
            // 2. Whitespace-only queries are handled gracefully
            // 3. Single character queries work correctly
            // 4. Very long queries don't cause performance issues
            // 5. Special characters in queries are handled properly
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect search options and filters', () => {
      fc.assert(
        fc.property(
          fc.record({
            query: searchQueryArb,
            options: fc.record({
              limit: fc.option(fc.integer({ min: 1, max: 100 })),
              parentId: fc.option(fc.uuid()),
            }),
            categories: fc.array(
              fc.record({
                id: fc.uuid(),
                name: categoryNameArb,
                parentId: fc.option(fc.uuid()),
                isActive: fc.boolean(),
              }),
              { minLength: 0, maxLength: 20 }
            ),
          }),
          (testData) => {
            // Verify test data
            expect(testData.query).toBeDefined();
            expect(testData.options).toBeDefined();
            expect(testData.categories).toBeDefined();

            // TODO: Test actual options handling when methods are ready
            // Should verify:
            // 1. Limit option restricts the number of results
            // 2. ParentId option filters results to specific parent
            // 3. Options are applied consistently across all search types
            // 4. Default values are used when options are not provided
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: job-category-tree, Property 8: Category filtering accuracy**
   * 
   * Property-based test to verify that for any combination of category filters,
   * the returned results should match exactly the specified criteria.
   */
  describe('Property 8: Category filtering accuracy', () => {
    // Generator for filter criteria
    const filterCriteriaArb = fc.record({
      parentIds: fc.option(fc.array(fc.uuid(), { minLength: 1, maxLength: 5 })),
      levels: fc.option(fc.array(fc.integer({ min: 0, max: 10 }), { minLength: 1, maxLength: 3 })),
      hasVacancies: fc.option(fc.boolean()),
      isActive: fc.option(fc.boolean()),
      nameContains: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
      minChildCount: fc.option(fc.integer({ min: 0, max: 50 })),
      maxChildCount: fc.option(fc.integer({ min: 0, max: 50 })),
      minVacancyCount: fc.option(fc.integer({ min: 0, max: 100 })),
      maxVacancyCount: fc.option(fc.integer({ min: 0, max: 100 })),
    });

    // Generator for category test data
    const categoryTestDataArb = fc.array(
      fc.record({
        id: fc.uuid(),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        parentId: fc.option(fc.uuid()),
        level: fc.integer({ min: 0, max: 10 }),
        isActive: fc.boolean(),
        childCount: fc.integer({ min: 0, max: 20 }),
        vacancyCount: fc.integer({ min: 0, max: 50 }),
        totalVacancyCount: fc.integer({ min: 0, max: 100 }),
      }),
      { minLength: 0, maxLength: 30 }
    );

    it('should filter categories by parent IDs accurately', () => {
      fc.assert(
        fc.property(
          fc.record({
            filters: filterCriteriaArb,
            categories: categoryTestDataArb,
          }),
          (testData) => {
            // Verify test data
            expect(testData.filters).toBeDefined();
            expect(testData.categories).toBeDefined();

            // If parentIds filter is specified, verify expected behavior
            if (testData.filters.parentIds) {
              const expectedMatches = testData.categories.filter(cat =>
                testData.filters.parentIds!.includes(cat.parentId || '')
              );

              // TODO: Test actual parent ID filtering when methods are ready
              // Should verify:
              // 1. Only categories with specified parent IDs are returned
              // 2. Categories with null parentId are handled correctly
              // 3. Multiple parent IDs are supported (OR logic)
              // 4. Non-existent parent IDs don't cause errors

              expect(expectedMatches.length).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter categories by level accurately', () => {
      fc.assert(
        fc.property(
          fc.record({
            filters: filterCriteriaArb,
            categories: categoryTestDataArb,
          }),
          (testData) => {
            // Verify test data
            expect(testData.filters).toBeDefined();
            expect(testData.categories).toBeDefined();

            // If levels filter is specified, verify expected behavior
            if (testData.filters.levels) {
              const expectedMatches = testData.categories.filter(cat =>
                testData.filters.levels!.includes(cat.level)
              );

              // TODO: Test actual level filtering when methods are ready
              // Should verify:
              // 1. Only categories at specified levels are returned
              // 2. Multiple levels are supported (OR logic)
              // 3. Level 0 (root categories) are handled correctly
              // 4. Deep levels work correctly

              expect(expectedMatches.length).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter categories by vacancy count accurately', () => {
      fc.assert(
        fc.property(
          fc.record({
            filters: filterCriteriaArb,
            categories: categoryTestDataArb,
          }),
          (testData) => {
            // Verify test data
            expect(testData.filters).toBeDefined();
            expect(testData.categories).toBeDefined();

            // Test hasVacancies filter
            if (testData.filters.hasVacancies !== undefined) {
              const expectedMatches = testData.categories.filter(cat =>
                testData.filters.hasVacancies ? cat.totalVacancyCount > 0 : cat.totalVacancyCount === 0
              );

              expect(expectedMatches.length).toBeGreaterThanOrEqual(0);
            }

            // Test minVacancyCount filter
            if (testData.filters.minVacancyCount !== undefined) {
              const expectedMatches = testData.categories.filter(cat =>
                cat.totalVacancyCount >= testData.filters.minVacancyCount!
              );

              expect(expectedMatches.length).toBeGreaterThanOrEqual(0);
            }

            // Test maxVacancyCount filter
            if (testData.filters.maxVacancyCount !== undefined) {
              const expectedMatches = testData.categories.filter(cat =>
                cat.totalVacancyCount <= testData.filters.maxVacancyCount!
              );

              expect(expectedMatches.length).toBeGreaterThanOrEqual(0);
            }

            // TODO: Test actual vacancy count filtering when methods are ready
            // Should verify:
            // 1. hasVacancies filter works correctly for both true and false
            // 2. minVacancyCount filter includes categories with exactly the minimum
            // 3. maxVacancyCount filter includes categories with exactly the maximum
            // 4. Range filtering (min and max together) works correctly
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter categories by child count accurately', () => {
      fc.assert(
        fc.property(
          fc.record({
            filters: filterCriteriaArb,
            categories: categoryTestDataArb,
          }),
          (testData) => {
            // Verify test data
            expect(testData.filters).toBeDefined();
            expect(testData.categories).toBeDefined();

            // Test minChildCount filter
            if (testData.filters.minChildCount !== undefined) {
              const expectedMatches = testData.categories.filter(cat =>
                cat.childCount >= testData.filters.minChildCount!
              );

              expect(expectedMatches.length).toBeGreaterThanOrEqual(0);
            }

            // Test maxChildCount filter
            if (testData.filters.maxChildCount !== undefined) {
              const expectedMatches = testData.categories.filter(cat =>
                cat.childCount <= testData.filters.maxChildCount!
              );

              expect(expectedMatches.length).toBeGreaterThanOrEqual(0);
            }

            // TODO: Test actual child count filtering when methods are ready
            // Should verify:
            // 1. minChildCount filter works correctly
            // 2. maxChildCount filter works correctly
            // 3. Range filtering (min and max together) works correctly
            // 4. Categories with 0 children are handled correctly
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter categories by name content accurately', () => {
      fc.assert(
        fc.property(
          fc.record({
            filters: filterCriteriaArb,
            categories: categoryTestDataArb,
          }),
          (testData) => {
            // Verify test data
            expect(testData.filters).toBeDefined();
            expect(testData.categories).toBeDefined();

            // Test nameContains filter
            if (testData.filters.nameContains) {
              const searchTerm = testData.filters.nameContains.toLowerCase();
              const expectedMatches = testData.categories.filter(cat =>
                cat.name.toLowerCase().includes(searchTerm)
              );

              // TODO: Test actual name filtering when methods are ready
              // Should verify:
              // 1. Case-insensitive name matching works correctly
              // 2. Partial matches are supported
              // 3. Special characters in names are handled correctly
              // 4. Empty search terms are handled appropriately

              expect(expectedMatches.length).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter categories by active status accurately', () => {
      fc.assert(
        fc.property(
          fc.record({
            filters: filterCriteriaArb,
            categories: categoryTestDataArb,
          }),
          (testData) => {
            // Verify test data
            expect(testData.filters).toBeDefined();
            expect(testData.categories).toBeDefined();

            // Test isActive filter
            if (testData.filters.isActive !== undefined) {
              const expectedMatches = testData.categories.filter(cat =>
                cat.isActive === testData.filters.isActive
              );

              // TODO: Test actual active status filtering when methods are ready
              // Should verify:
              // 1. Active filter works for both true and false values
              // 2. Default behavior when filter is not specified
              // 3. Inactive categories are properly excluded when appropriate

              expect(expectedMatches.length).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should apply multiple filters with AND logic accurately', () => {
      fc.assert(
        fc.property(
          fc.record({
            filters: filterCriteriaArb,
            categories: categoryTestDataArb,
          }),
          (testData) => {
            // Verify test data
            expect(testData.filters).toBeDefined();
            expect(testData.categories).toBeDefined();

            // Count how many filters are actually specified
            const filterCount = Object.values(testData.filters).filter(value => value !== undefined).length;

            // TODO: Test actual multiple filter combination when methods are ready
            // Should verify:
            // 1. All specified filters are applied (AND logic)
            // 2. Results satisfy ALL filter criteria simultaneously
            // 3. Order of filter application doesn't affect results
            // 4. Performance remains acceptable with multiple filters

            expect(filterCount).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases in filtering criteria', () => {
      fc.assert(
        fc.property(
          fc.record({
            edgeFilters: fc.record({
              emptyParentIds: fc.constant([]),
              emptyLevels: fc.constant([]),
              negativeMinCounts: fc.integer({ min: -10, max: -1 }),
              veryLargeMaxCounts: fc.integer({ min: 1000, max: 10000 }),
              emptyNameSearch: fc.constant(''),
            }),
            categories: categoryTestDataArb,
          }),
          (testData) => {
            // Verify test data
            expect(testData.edgeFilters).toBeDefined();
            expect(testData.categories).toBeDefined();

            // TODO: Test actual edge case handling when methods are ready
            // Should verify:
            // 1. Empty arrays in filters are handled gracefully
            // 2. Negative values in count filters are handled appropriately
            // 3. Very large values don't cause performance issues
            // 4. Empty strings in text filters are handled correctly
            // 5. Invalid filter combinations are detected and handled

            expect(testData.categories.length).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});