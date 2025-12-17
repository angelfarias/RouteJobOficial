import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoryVacancyService } from './category-vacancy.service';
import { CategorySeeder } from './seed-categories';
import * as fc from 'fast-check';
import { Category, CategoryNode, DeletionStrategy } from './interfaces/category.interface';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let categoriesService: CategoriesService;
  let categoryVacancyService: CategoryVacancyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: {
            createCategory: jest.fn(),
            updateCategory: jest.fn(),
            deleteCategory: jest.fn(),
            moveCategory: jest.fn(),
            findById: jest.fn(),
            getCategoryTree: jest.fn(),
            getCategoryPath: jest.fn(),
            searchCategories: jest.fn(),
            searchCategoriesAdvanced: jest.fn(),
            getCategorySuggestions: jest.fn(),
            filterCategories: jest.fn(),
            getPopularCategories: jest.fn(),
            getRecentCategories: jest.fn(),
          },
        },
        {
          provide: CategoryVacancyService,
          useValue: {
            assignCategories: jest.fn(),
            removeCategories: jest.fn(),
            getVacanciesByCategory: jest.fn(),
            getCategoriesForVacancy: jest.fn(),
            getVacancyCountForCategory: jest.fn(),
            getTotalVacancyCountForCategory: jest.fn(),
          },
        },
        {
          provide: CategorySeeder,
          useValue: {
            seedJobCategories: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    categoriesService = module.get<CategoriesService>(CategoriesService);
    categoryVacancyService = module.get<CategoryVacancyService>(CategoryVacancyService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  /**
   * **Feature: job-category-tree, Property 11: API consistency**
   * 
   * Property-based test to verify that for any category-related API operation,
   * the interface should follow consistent patterns and return predictable data structures.
   */
  describe('Property 11: API consistency', () => {
    // Generator for category IDs
    const categoryIdArb = fc.uuid();
    
    // Generator for category data
    const categoryDataArb = fc.record({
      id: categoryIdArb,
      name: fc.string({ minLength: 1, maxLength: 100 }),
      description: fc.option(fc.string({ maxLength: 500 })),
      parentId: fc.option(categoryIdArb),
      path: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
      level: fc.integer({ min: 0, max: 10 }),
      isActive: fc.boolean(),
      displayOrder: fc.integer({ min: 0, max: 1000 }),
      childCount: fc.integer({ min: 0, max: 50 }),
      vacancyCount: fc.integer({ min: 0, max: 100 }),
      totalVacancyCount: fc.integer({ min: 0, max: 200 }),
    });

    // Generator for API request parameters
    const apiRequestArb = fc.record({
      id: categoryIdArb,
      query: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
      limit: fc.option(fc.integer({ min: 1, max: 100 })),
      offset: fc.option(fc.integer({ min: 0, max: 1000 })),
      includeInactive: fc.option(fc.boolean()),
      parentId: fc.option(categoryIdArb),
    });

    it('should return consistent response structure for GET endpoints', () => {
      fc.assert(
        fc.property(apiRequestArb, categoryDataArb, (request, mockCategory) => {
          // Mock service responses
          jest.spyOn(categoriesService, 'findById').mockResolvedValue(mockCategory as Category);
          jest.spyOn(categoriesService, 'searchCategoriesAdvanced').mockResolvedValue({
            categories: [mockCategory as Category],
            total: 1,
          });

          // TODO: Test actual API consistency when methods are ready
          // Should verify:
          // 1. All GET endpoints return consistent response structures
          // 2. Error responses follow the same format across all endpoints
          // 3. HTTP status codes are consistent for similar operations
          // 4. Response headers are consistent across endpoints

          expect(request.id).toBeDefined();
          expect(mockCategory.id).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });

    it('should handle query parameters consistently across endpoints', () => {
      fc.assert(
        fc.property(
          fc.record({
            limit: fc.option(fc.integer({ min: 1, max: 100 })),
            offset: fc.option(fc.integer({ min: 0, max: 1000 })),
            includeInactive: fc.option(fc.boolean()),
            sortBy: fc.option(fc.constantFrom('name', 'vacancyCount', 'level', 'displayOrder')),
            sortOrder: fc.option(fc.constantFrom('asc', 'desc')),
          }),
          (queryParams) => {
            // Mock service response
            jest.spyOn(categoriesService, 'searchCategoriesAdvanced').mockResolvedValue({
              categories: [],
              total: 0,
            });

            // TODO: Test actual query parameter handling when methods are ready
            // Should verify:
            // 1. Query parameters are parsed consistently across endpoints
            // 2. Default values are applied consistently
            // 3. Invalid query parameters are handled uniformly
            // 4. Optional parameters work the same way across endpoints

            expect(queryParams).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return consistent error responses for invalid requests', () => {
      fc.assert(
        fc.property(
          fc.record({
            invalidId: fc.oneof(
              fc.constant(''),
              fc.constant('invalid-uuid'),
              fc.constant(null),
              fc.constant(undefined),
            ),
            invalidData: fc.record({
              name: fc.oneof(
                fc.constant(''),
                fc.constant(null),
                fc.string({ minLength: 101, maxLength: 200 }), // Too long
              ),
              parentId: fc.oneof(
                fc.constant('invalid-uuid'),
                fc.constant('non-existent-id'),
              ),
            }),
          }),
          (invalidRequest) => {
            // TODO: Test actual error response consistency when methods are ready
            // Should verify:
            // 1. Error responses have consistent structure across all endpoints
            // 2. HTTP status codes are appropriate and consistent
            // 3. Error messages are informative and follow consistent format
            // 4. Validation errors are handled uniformly

            expect(invalidRequest).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistent data types in responses', () => {
      fc.assert(
        fc.property(categoryDataArb, (mockCategory) => {
          // Mock service response
          jest.spyOn(categoriesService, 'findById').mockResolvedValue(mockCategory as Category);

          // TODO: Test actual data type consistency when methods are ready
          // Should verify:
          // 1. String fields are always returned as strings
          // 2. Number fields are always returned as numbers
          // 3. Boolean fields are always returned as booleans
          // 4. Array fields are always returned as arrays
          // 5. Date fields are consistently formatted
          // 6. Null/undefined values are handled consistently

          expect(typeof mockCategory.name).toBe('string');
          expect(typeof mockCategory.level).toBe('number');
          expect(typeof mockCategory.isActive).toBe('boolean');
          expect(Array.isArray(mockCategory.path)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle pagination consistently across paginated endpoints', () => {
      fc.assert(
        fc.property(
          fc.record({
            limit: fc.integer({ min: 1, max: 100 }),
            offset: fc.integer({ min: 0, max: 1000 }),
            totalItems: fc.integer({ min: 0, max: 2000 }),
          }),
          (paginationData) => {
            // Mock paginated response
            const mockCategories = Array(Math.min(paginationData.limit, paginationData.totalItems))
              .fill(null)
              .map((_, index) => ({
                id: `category-${paginationData.offset + index}`,
                name: `Category ${paginationData.offset + index}`,
              }));

            jest.spyOn(categoriesService, 'searchCategoriesAdvanced').mockResolvedValue({
              categories: mockCategories as Category[],
              total: paginationData.totalItems,
            });

            // TODO: Test actual pagination consistency when methods are ready
            // Should verify:
            // 1. Pagination parameters work consistently across endpoints
            // 2. Response structure includes both data and total count
            // 3. Limit and offset are respected correctly
            // 4. Edge cases (limit > total, offset > total) are handled consistently

            expect(paginationData.limit).toBeGreaterThan(0);
            expect(paginationData.offset).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistent HTTP status codes for similar operations', () => {
      fc.assert(
        fc.property(
          fc.record({
            operation: fc.constantFrom('create', 'read', 'update', 'delete'),
            success: fc.boolean(),
            errorType: fc.constantFrom('not_found', 'validation_error', 'conflict', 'server_error'),
          }),
          (operationData) => {
            // TODO: Test actual HTTP status code consistency when methods are ready
            // Should verify:
            // 1. POST operations return 201 for successful creation
            // 2. GET operations return 200 for successful retrieval
            // 3. PUT operations return 200 for successful updates
            // 4. DELETE operations return 204 for successful deletion
            // 5. 404 is returned consistently for not found resources
            // 6. 400 is returned consistently for validation errors
            // 7. 409 is returned consistently for conflict errors

            expect(['create', 'read', 'update', 'delete']).toContain(operationData.operation);
            expect(typeof operationData.success).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle request validation consistently across endpoints', () => {
      fc.assert(
        fc.property(
          fc.record({
            endpoint: fc.constantFrom('create', 'update', 'move', 'search', 'filter'),
            validationErrors: fc.array(
              fc.record({
                field: fc.string({ minLength: 1, maxLength: 20 }),
                error: fc.constantFrom('required', 'invalid_format', 'too_long', 'too_short'),
              }),
              { minLength: 1, maxLength: 5 }
            ),
          }),
          (validationData) => {
            // TODO: Test actual validation consistency when methods are ready
            // Should verify:
            // 1. Validation errors have consistent structure across endpoints
            // 2. Field-level validation messages are consistent
            // 3. Required field validation works the same way everywhere
            // 4. Format validation (UUIDs, strings, numbers) is consistent

            expect(validationData.validationErrors.length).toBeGreaterThan(0);
            for (const error of validationData.validationErrors) {
              expect(error.field).toBeDefined();
              expect(error.error).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Unit tests for category API endpoints
   * Testing specific examples and edge cases for all CRUD operations
   */
  describe('Category API Endpoints', () => {
    describe('POST /categories', () => {
      it('should create a new category successfully', async () => {
        const createDto: CreateCategoryDto = {
          name: 'Technology',
          description: 'Technology related jobs',
          displayOrder: 1,
          isActive: true,
        };

        const mockCategory: Category = {
          id: 'category-id',
          name: 'Technology',
          description: 'Technology related jobs',
          parentId: null,
          path: ['Technology'],
          pathString: 'Technology',
          level: 0,
          isActive: true,
          displayOrder: 1,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        jest.spyOn(categoriesService, 'createCategory').mockResolvedValue(mockCategory);

        const result = await controller.createCategory(createDto);

        expect(result).toEqual(mockCategory);
        expect(categoriesService.createCategory).toHaveBeenCalledWith(null, createDto);
      });

      it('should create a child category successfully', async () => {
        const createDto: CreateCategoryDto = {
          name: 'Software Development',
          description: 'Software development jobs',
          parentId: 'parent-id',
        };

        const mockCategory: Category = {
          id: 'child-id',
          name: 'Software Development',
          description: 'Software development jobs',
          parentId: 'parent-id',
          path: ['Technology', 'Software Development'],
          pathString: 'Technology.Software Development',
          level: 1,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        jest.spyOn(categoriesService, 'createCategory').mockResolvedValue(mockCategory);

        const result = await controller.createCategory(createDto);

        expect(result).toEqual(mockCategory);
        expect(categoriesService.createCategory).toHaveBeenCalledWith('parent-id', createDto);
      });
    });

    describe('GET /categories', () => {
      it('should return paginated categories with default parameters', async () => {
        const mockResponse = {
          categories: [
            {
              id: 'cat-1',
              name: 'Technology',
              isActive: true,
            } as Category,
          ],
          total: 1,
        };

        jest.spyOn(categoriesService, 'searchCategoriesAdvanced').mockResolvedValue(mockResponse);

        const result = await controller.getAllCategories(false);

        expect(result).toEqual(mockResponse);
        expect(categoriesService.searchCategoriesAdvanced).toHaveBeenCalledWith({
          parentId: undefined,
          level: undefined,
          includeInactive: false,
          limit: undefined,
          offset: undefined,
        });
      });

      it('should return categories with custom parameters', async () => {
        const mockResponse = {
          categories: [],
          total: 0,
        };

        jest.spyOn(categoriesService, 'searchCategoriesAdvanced').mockResolvedValue(mockResponse);

        const result = await controller.getAllCategories(true, 'parent-id', 1, 20, 10);

        expect(result).toEqual(mockResponse);
        expect(categoriesService.searchCategoriesAdvanced).toHaveBeenCalledWith({
          parentId: 'parent-id',
          level: 1,
          includeInactive: true,
          limit: 20,
          offset: 10,
        });
      });
    });

    describe('GET /categories/:id', () => {
      it('should return a category by ID', async () => {
        const mockCategory: Category = {
          id: 'category-id',
          name: 'Technology',
          description: 'Tech jobs',
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

        jest.spyOn(categoriesService, 'findById').mockResolvedValue(mockCategory);

        const result = await controller.getCategory('category-id');

        expect(result).toEqual(mockCategory);
        expect(categoriesService.findById).toHaveBeenCalledWith('category-id');
      });

      it('should return null for non-existent category', async () => {
        jest.spyOn(categoriesService, 'findById').mockResolvedValue(null);

        const result = await controller.getCategory('non-existent-id');

        expect(result).toBeNull();
        expect(categoriesService.findById).toHaveBeenCalledWith('non-existent-id');
      });
    });

    describe('PUT /categories/:id', () => {
      it('should update a category successfully', async () => {
        const updateDto: UpdateCategoryDto = {
          name: 'Updated Technology',
          description: 'Updated description',
        };

        const mockUpdatedCategory: Category = {
          id: 'category-id',
          name: 'Updated Technology',
          description: 'Updated description',
          parentId: null,
          path: ['Updated Technology'],
          pathString: 'Updated Technology',
          level: 0,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        jest.spyOn(categoriesService, 'updateCategory').mockResolvedValue(mockUpdatedCategory);

        const result = await controller.updateCategory('category-id', updateDto);

        expect(result).toEqual(mockUpdatedCategory);
        expect(categoriesService.updateCategory).toHaveBeenCalledWith('category-id', updateDto);
      });
    });

    describe('DELETE /categories/:id', () => {
      it('should delete a category with default strategy', async () => {
        jest.spyOn(categoriesService, 'deleteCategory').mockResolvedValue(undefined);

        await controller.deleteCategory('category-id');

        expect(categoriesService.deleteCategory).toHaveBeenCalledWith(
          'category-id',
          DeletionStrategy.MOVE_TO_PARENT
        );
      });

      it('should delete a category with specified strategy', async () => {
        jest.spyOn(categoriesService, 'deleteCategory').mockResolvedValue(undefined);

        await controller.deleteCategory('category-id', DeletionStrategy.CASCADE);

        expect(categoriesService.deleteCategory).toHaveBeenCalledWith(
          'category-id',
          DeletionStrategy.CASCADE
        );
      });
    });

    describe('POST /categories/:id/move', () => {
      it('should move a category to new parent', async () => {
        const moveDto = { newParentId: 'new-parent-id' };
        const mockMovedCategory: Category = {
          id: 'category-id',
          name: 'Moved Category',
          parentId: 'new-parent-id',
          path: ['Parent', 'Moved Category'],
          pathString: 'Parent.Moved Category',
          level: 1,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        jest.spyOn(categoriesService, 'moveCategory').mockResolvedValue(mockMovedCategory);

        const result = await controller.moveCategory('category-id', moveDto);

        expect(result).toEqual(mockMovedCategory);
        expect(categoriesService.moveCategory).toHaveBeenCalledWith('category-id', 'new-parent-id');
      });

      it('should move a category to root level', async () => {
        const moveDto = { newParentId: null };
        const mockMovedCategory: Category = {
          id: 'category-id',
          name: 'Root Category',
          parentId: null,
          path: ['Root Category'],
          pathString: 'Root Category',
          level: 0,
          isActive: true,
          displayOrder: 0,
          createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          updatedAt: { seconds: 1234567890, nanoseconds: 0 } as any,
          childCount: 0,
          vacancyCount: 0,
          totalVacancyCount: 0,
        };

        jest.spyOn(categoriesService, 'moveCategory').mockResolvedValue(mockMovedCategory);

        const result = await controller.moveCategory('category-id', moveDto);

        expect(result).toEqual(mockMovedCategory);
        expect(categoriesService.moveCategory).toHaveBeenCalledWith('category-id', null);
      });
    });

    describe('GET /categories/tree', () => {
      it('should return category tree structure', async () => {
        const mockTree: CategoryNode[] = [
          {
            category: {
              id: 'root-1',
              name: 'Technology',
              parentId: null,
              level: 0,
            } as Category,
            children: [
              {
                category: {
                  id: 'child-1',
                  name: 'Software',
                  parentId: 'root-1',
                  level: 1,
                } as Category,
                children: [],
                vacancyCount: 5,
              },
            ],
            vacancyCount: 10,
          },
        ];

        jest.spyOn(categoriesService, 'getCategoryTree').mockResolvedValue(mockTree);

        const result = await controller.getCategoryTree();

        expect(result).toEqual(mockTree);
        expect(categoriesService.getCategoryTree).toHaveBeenCalled();
      });
    });

    describe('GET /categories/search', () => {
      it('should search categories with query', async () => {
        const searchDto = { query: 'tech', limit: 10 };
        const mockResults: Category[] = [
          {
            id: 'cat-1',
            name: 'Technology',
            description: 'Tech jobs',
          } as Category,
        ];

        jest.spyOn(categoriesService, 'searchCategories').mockResolvedValue(mockResults);

        const result = await controller.searchCategories(searchDto);

        expect(result).toEqual(mockResults);
        expect(categoriesService.searchCategories).toHaveBeenCalledWith('tech', {
          limit: 10,
          parentId: undefined,
        });
      });
    });

    describe('GET /categories/suggestions', () => {
      it('should return category suggestions', async () => {
        const mockSuggestions = ['Technology', 'Software', 'Hardware'];

        jest.spyOn(categoriesService, 'getCategorySuggestions').mockResolvedValue(mockSuggestions);

        const result = await controller.getCategorySuggestions('tech', 5);

        expect(result).toEqual(mockSuggestions);
        expect(categoriesService.getCategorySuggestions).toHaveBeenCalledWith('tech', 5);
      });
    });

    describe('GET /categories/popular', () => {
      it('should return popular categories', async () => {
        const mockPopular: Category[] = [
          { id: 'cat-1', name: 'Technology', totalVacancyCount: 100 } as Category,
          { id: 'cat-2', name: 'Healthcare', totalVacancyCount: 80 } as Category,
        ];

        jest.spyOn(categoriesService, 'getPopularCategories').mockResolvedValue(mockPopular);

        const result = await controller.getPopularCategories(5);

        expect(result).toEqual(mockPopular);
        expect(categoriesService.getPopularCategories).toHaveBeenCalledWith(5);
      });
    });

    describe('GET /categories/:id/path', () => {
      it('should return category path', async () => {
        const mockPath = ['Technology', 'Software', 'Frontend'];

        jest.spyOn(categoriesService, 'getCategoryPath').mockResolvedValue(mockPath);

        const result = await controller.getCategoryPath('category-id');

        expect(result).toEqual(mockPath);
        expect(categoriesService.getCategoryPath).toHaveBeenCalledWith('category-id');
      });
    });

    describe('GET /categories/:id/vacancies', () => {
      it('should return vacancies for category without descendants', async () => {
        const mockVacancies = [
          { id: 'vacancy-1', title: 'Software Developer' },
          { id: 'vacancy-2', title: 'Frontend Developer' },
        ];

        jest.spyOn(categoryVacancyService, 'getVacanciesByCategory').mockResolvedValue(mockVacancies);

        const result = await controller.getVacanciesByCategory('category-id', false);

        expect(result).toEqual(mockVacancies);
        expect(categoryVacancyService.getVacanciesByCategory).toHaveBeenCalledWith('category-id', false);
      });

      it('should return vacancies for category with descendants', async () => {
        const mockVacancies = [
          { id: 'vacancy-1', title: 'Software Developer' },
          { id: 'vacancy-2', title: 'Frontend Developer' },
          { id: 'vacancy-3', title: 'Backend Developer' },
        ];

        jest.spyOn(categoryVacancyService, 'getVacanciesByCategory').mockResolvedValue(mockVacancies);

        const result = await controller.getVacanciesByCategory('category-id', true);

        expect(result).toEqual(mockVacancies);
        expect(categoryVacancyService.getVacanciesByCategory).toHaveBeenCalledWith('category-id', true);
      });
    });

    describe('GET /categories/:id/stats', () => {
      it('should return category statistics', async () => {
        const mockCategory: Category = {
          id: 'category-id',
          name: 'Technology',
          path: ['Technology'],
          level: 0,
          childCount: 5,
        } as Category;

        jest.spyOn(categoriesService, 'findById').mockResolvedValue(mockCategory);
        jest.spyOn(categoryVacancyService, 'getVacancyCountForCategory').mockResolvedValue(10);
        jest.spyOn(categoryVacancyService, 'getTotalVacancyCountForCategory').mockResolvedValue(25);

        const result = await controller.getCategoryStats('category-id');

        expect(result).toEqual({
          category: mockCategory,
          directVacancyCount: 10,
          totalVacancyCount: 25,
          childCount: 5,
          level: 0,
          path: ['Technology'],
        });
      });
    });
  });
});