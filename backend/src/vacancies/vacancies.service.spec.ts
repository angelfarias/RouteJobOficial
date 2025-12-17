import { Test, TestingModule } from '@nestjs/testing';
import { VacanciesService } from './vacancies.service';
import { CategoryVacancyService } from '../categories/category-vacancy.service';

// Mock Firebase Admin
const mockFirestore = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      id: 'mock-id',
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: 'mock-id',
        data: () => ({
          title: 'Test Vacancy',
          description: 'Test Description',
          companyId: 'company-1',
          branchId: 'branch-1',
          active: true,
          location: { latitude: 40.7128, longitude: -74.0060 },
          createdAt: { seconds: 1234567890 },
        }),
      }),
    })),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      docs: [
        {
          id: 'vacancy-1',
          data: () => ({
            title: 'Software Developer',
            companyId: 'company-1',
            branchId: 'branch-1',
            active: true,
            location: { latitude: 40.7128, longitude: -74.0060 },
            createdAt: { seconds: 1234567890 },
          }),
        },
        {
          id: 'vacancy-2',
          data: () => ({
            title: 'Product Manager',
            companyId: 'company-2',
            branchId: 'branch-2',
            active: true,
            location: { latitude: 40.7589, longitude: -73.9851 },
            createdAt: { seconds: 1234567891 },
          }),
        },
      ],
    }),
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

describe('VacanciesService - Category Integration', () => {
  let service: VacanciesService;
  let categoryVacancyService: CategoryVacancyService;

  const mockCategoryVacancyService = {
    assignCategories: jest.fn(),
    getCategoriesForVacancy: jest.fn(),
    getVacanciesByCategory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VacanciesService,
        {
          provide: 'FIREBASE_ADMIN',
          useValue: mockFirebaseApp,
        },
        {
          provide: CategoryVacancyService,
          useValue: mockCategoryVacancyService,
        },
      ],
    }).compile();

    service = module.get<VacanciesService>(VacanciesService);
    categoryVacancyService = module.get<CategoryVacancyService>(CategoryVacancyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createVacancy with category assignments', () => {
    it('should create vacancy and assign categories when categoryIds are provided', async () => {
      const companyId = 'company-1';
      const branchId = 'branch-1';
      const dto = {
        title: 'Software Developer',
        description: 'Great opportunity',
        categoryIds: ['cat-1', 'cat-2'],
        assignedBy: 'user-123',
        latitude: 40.7128,
        longitude: -74.0060,
      };

      mockCategoryVacancyService.assignCategories.mockResolvedValue(undefined);

      const result = await service.createVacancy(companyId, branchId, dto);

      expect(result).toBeDefined();
      expect(result.title).toBe(dto.title);
      expect(mockCategoryVacancyService.assignCategories).toHaveBeenCalledWith(
        expect.any(String), // vacancy ID
        dto.categoryIds,
        dto.assignedBy
      );
    });

    it('should create vacancy without category assignment when no categoryIds provided', async () => {
      const companyId = 'company-1';
      const branchId = 'branch-1';
      const dto = {
        title: 'Product Manager',
        description: 'Leadership role',
        latitude: 40.7128,
        longitude: -74.0060,
      };

      const result = await service.createVacancy(companyId, branchId, dto);

      expect(result).toBeDefined();
      expect(result.title).toBe(dto.title);
      expect(mockCategoryVacancyService.assignCategories).not.toHaveBeenCalled();
    });

    it('should create vacancy even if category assignment fails', async () => {
      const companyId = 'company-1';
      const branchId = 'branch-1';
      const dto = {
        title: 'Data Scientist',
        description: 'Analytics role',
        categoryIds: ['invalid-cat'],
        latitude: 40.7128,
        longitude: -74.0060,
      };

      mockCategoryVacancyService.assignCategories.mockRejectedValue(
        new Error('Category not found')
      );

      const result = await service.createVacancy(companyId, branchId, dto);

      expect(result).toBeDefined();
      expect(result.title).toBe(dto.title);
      expect(mockCategoryVacancyService.assignCategories).toHaveBeenCalled();
    });
  });

  describe('findOne with category information', () => {
    it('should return vacancy with categories', async () => {
      const vacancyId = 'vacancy-1';
      const mockCategories = [
        { id: 'cat-1', name: 'Technology' },
        { id: 'cat-2', name: 'Software Development' },
      ];

      mockCategoryVacancyService.getCategoriesForVacancy.mockResolvedValue(mockCategories);

      const result = await service.findOne(vacancyId);

      expect(result).toBeDefined();
      expect(result!.categories).toEqual(mockCategories);
      expect(mockCategoryVacancyService.getCategoriesForVacancy).toHaveBeenCalledWith(vacancyId);
    });

    it('should return vacancy with empty categories if category lookup fails', async () => {
      const vacancyId = 'vacancy-1';

      mockCategoryVacancyService.getCategoriesForVacancy.mockRejectedValue(
        new Error('Category service error')
      );

      const result = await service.findOne(vacancyId);

      expect(result).toBeDefined();
      expect(result!.categories).toEqual([]);
    });

    it('should return null for non-existent vacancy', async () => {
      const mockDoc = {
        get: jest.fn().mockResolvedValue({
          exists: false,
        }),
      };
      
      const mockCollection = {
        doc: jest.fn().mockReturnValue(mockDoc),
      };
      
      mockFirestore.collection.mockReturnValue(mockCollection);

      const result = await service.findOne('non-existent');

      expect(result).toBeNull();
      expect(mockCategoryVacancyService.getCategoriesForVacancy).not.toHaveBeenCalled();
    });
  });

  describe('buscarCercanas with category filtering', () => {
    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
      
      // Mock candidate data
      const mockCandidateDoc = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            location: { latitude: 40.7128, longitude: -74.0060 },
            radioKm: 10,
          }),
        }),
      };
      
      // Mock vacancy data
      const mockVacancyQuery = {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          forEach: jest.fn((callback) => {
            // Mock vacancy documents
            const mockVacancies = [
              {
                id: 'vacancy-1',
                data: () => ({
                  title: 'Software Developer',
                  company: 'Tech Corp',
                  branchName: 'Main Branch',
                  location: { latitude: 40.7128, longitude: -74.0060 },
                  matchScore: 85,
                }),
              },
              {
                id: 'vacancy-2',
                data: () => ({
                  title: 'Product Manager',
                  company: 'Business Inc',
                  branchName: 'Downtown',
                  location: { latitude: 40.7589, longitude: -73.9851 },
                  matchScore: 75,
                }),
              },
            ];
            
            mockVacancies.forEach(callback);
          }),
        }),
      };
      
      mockFirestore.collection.mockImplementation((collectionName) => {
        if (collectionName === 'candidates') {
          return { doc: () => mockCandidateDoc };
        } else if (collectionName === 'vacancies') {
          return mockVacancyQuery;
        }
        return mockVacancyQuery;
      });
    });

    it('should return nearby vacancies without category filter', async () => {
      const uid = 'candidate-1';

      const result = await service.buscarCercanas(uid);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockCategoryVacancyService.getCategoriesForVacancy).not.toHaveBeenCalled();
    });

    it('should filter vacancies by categories when categoryIds provided', async () => {
      const uid = 'candidate-1';
      const categoryIds = ['cat-1', 'cat-2'];
      const mockCategories = [{ id: 'cat-1', name: 'Technology' }];

      mockCategoryVacancyService.getCategoriesForVacancy.mockResolvedValue(mockCategories);

      const result = await service.buscarCercanas(uid, undefined, categoryIds);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Should call getCategoriesForVacancy for each nearby vacancy
      expect(mockCategoryVacancyService.getCategoriesForVacancy).toHaveBeenCalled();
    });

    it('should handle category lookup failures gracefully', async () => {
      const uid = 'candidate-1';
      const categoryIds = ['cat-1'];

      mockCategoryVacancyService.getCategoriesForVacancy.mockRejectedValue(
        new Error('Category service error')
      );

      const result = await service.buscarCercanas(uid, undefined, categoryIds);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array for candidate without location', async () => {
      // Mock candidate without location
      const mockCandidateDoc = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({}), // No location
        }),
      };
      
      mockFirestore.collection.mockImplementation((collectionName) => {
        if (collectionName === 'candidates') {
          return { doc: () => mockCandidateDoc };
        }
        return { where: jest.fn().mockReturnThis(), get: jest.fn() };
      });

      const result = await service.buscarCercanas('candidate-no-location');

      expect(result).toEqual([]);
    });
  });

  describe('searchByCategories', () => {
    it('should search vacancies by categories', async () => {
      const categoryIds = ['cat-1', 'cat-2'];
      const mockVacancies = [
        { id: 'vacancy-1', title: 'Developer', active: true },
        { id: 'vacancy-2', title: 'Designer', active: true },
      ];
      const mockCategories = [{ id: 'cat-1', name: 'Technology' }];

      mockCategoryVacancyService.getVacanciesByCategory
        .mockResolvedValueOnce([mockVacancies[0]])
        .mockResolvedValueOnce([mockVacancies[1]]);
      
      mockCategoryVacancyService.getCategoriesForVacancy.mockResolvedValue(mockCategories);

      const result = await service.searchByCategories(categoryIds);

      expect(result).toBeDefined();
      expect(result.vacancies).toBeDefined();
      expect(result.total).toBe(2);
      expect(mockCategoryVacancyService.getVacanciesByCategory).toHaveBeenCalledTimes(2);
    });

    it('should handle includeDescendants option', async () => {
      const categoryIds = ['cat-1'];
      const options = { includeDescendants: true };

      mockCategoryVacancyService.getVacanciesByCategory.mockResolvedValue([]);
      
      await service.searchByCategories(categoryIds, options);

      expect(mockCategoryVacancyService.getVacanciesByCategory).toHaveBeenCalledWith(
        'cat-1',
        true
      );
    });

    it('should apply pagination correctly', async () => {
      const categoryIds = ['cat-1'];
      const mockVacancies = Array.from({ length: 10 }, (_, i) => ({
        id: `vacancy-${i}`,
        title: `Job ${i}`,
        active: true,
      }));
      const options = { limit: 5, offset: 2 };

      mockCategoryVacancyService.getVacanciesByCategory.mockResolvedValue(mockVacancies);
      mockCategoryVacancyService.getCategoriesForVacancy.mockResolvedValue([]);

      const result = await service.searchByCategories(categoryIds, options);

      expect(result.vacancies).toHaveLength(5);
      expect(result.offset).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.total).toBe(10);
    });

    it('should remove duplicate vacancies from multiple categories', async () => {
      const categoryIds = ['cat-1', 'cat-2'];
      const duplicateVacancy = { id: 'vacancy-1', title: 'Developer', active: true };

      mockCategoryVacancyService.getVacanciesByCategory
        .mockResolvedValueOnce([duplicateVacancy])
        .mockResolvedValueOnce([duplicateVacancy]); // Same vacancy in both categories
      
      mockCategoryVacancyService.getCategoriesForVacancy.mockResolvedValue([]);

      const result = await service.searchByCategories(categoryIds);

      expect(result.vacancies).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('searchVacancies with advanced filters', () => {
    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
      
      // Mock advanced search query
      const mockAdvancedQuery = {
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: 'vacancy-1',
              data: () => ({
                title: 'Software Developer',
                companyId: 'company-1',
                branchId: 'branch-1',
                active: true,
                salaryMin: 50000,
                salaryMax: 80000,
                jornada: 'full-time',
                tipoContrato: 'permanent',
                location: { latitude: 40.7128, longitude: -74.0060 },
                createdAt: { seconds: 1234567890 },
              }),
            },
          ],
        }),
      };
      
      mockFirestore.collection.mockReturnValue(mockAdvancedQuery);
    });

    it('should search with category filters', async () => {
      const filters = {
        categoryIds: ['cat-1'],
        activeOnly: true,
      };
      const mockCategories = [{ id: 'cat-1', name: 'Technology' }];

      mockCategoryVacancyService.getCategoriesForVacancy.mockResolvedValue(mockCategories);

      const result = await service.searchVacancies(filters);

      expect(result).toBeDefined();
      expect(result.vacancies).toBeDefined();
      expect(mockCategoryVacancyService.getCategoriesForVacancy).toHaveBeenCalled();
    });

    it('should apply salary filters', async () => {
      const filters = {
        salaryMin: 60000,
        salaryMax: 100000,
      };

      mockCategoryVacancyService.getCategoriesForVacancy.mockResolvedValue([]);

      const result = await service.searchVacancies(filters);

      expect(result).toBeDefined();
      // The mock vacancy has salaryMin: 50000, so it should be filtered out
      expect(result.vacancies).toHaveLength(0);
    });

    it('should apply location filters', async () => {
      const filters = {
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          radiusKm: 5,
        },
      };

      mockCategoryVacancyService.getCategoriesForVacancy.mockResolvedValue([]);

      const result = await service.searchVacancies(filters);

      expect(result).toBeDefined();
      expect(result.vacancies).toHaveLength(1); // Should include the nearby vacancy
    });

    it('should apply sorting', async () => {
      const filters = {
        sortBy: 'salary' as const,
        sortOrder: 'desc' as const,
      };

      mockCategoryVacancyService.getCategoriesForVacancy.mockResolvedValue([]);

      const result = await service.searchVacancies(filters);

      expect(result).toBeDefined();
      expect(result.vacancies).toBeDefined();
    });

    it('should apply pagination', async () => {
      const filters = {
        limit: 10,
        offset: 5,
      };

      mockCategoryVacancyService.getCategoriesForVacancy.mockResolvedValue([]);

      const result = await service.searchVacancies(filters);

      expect(result.offset).toBe(5);
      expect(result.limit).toBe(10);
    });
  });
});