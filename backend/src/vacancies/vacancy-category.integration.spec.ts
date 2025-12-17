import { Test, TestingModule } from '@nestjs/testing';
import { VacanciesController } from './vacancies.controller';
import { VacanciesService } from './vacancies.service';
import { CategoryVacancyService } from '../categories/category-vacancy.service';
import { CategoriesService } from '../categories/categories.service';
import { CandidateSelectionService } from '../applications/candidate-selection.service';

describe('VacanciesController - Category Integration', () => {
  let controller: VacanciesController;
  let vacanciesService: VacanciesService;
  let categoryVacancyService: CategoryVacancyService;

  const mockVacanciesService = {
    findOne: jest.fn(),
  };

  const mockCategoryVacancyService = {
    assignCategories: jest.fn(),
    removeCategories: jest.fn(),
    getCategoriesForVacancy: jest.fn(),
  };

  const mockCategoriesService = {
    findById: jest.fn(),
  };

  const mockCandidateSelectionService = {
    getApplicationsForVacancy: jest.fn(),
    getCandidateDetails: jest.fn(),
    selectCandidate: jest.fn(),
    getSelectionStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VacanciesController],
      providers: [
        {
          provide: VacanciesService,
          useValue: mockVacanciesService,
        },
        {
          provide: CategoryVacancyService,
          useValue: mockCategoryVacancyService,
        },
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
        {
          provide: CandidateSelectionService,
          useValue: mockCandidateSelectionService,
        },
      ],
    }).compile();

    controller = module.get<VacanciesController>(VacanciesController);
    vacanciesService = module.get<VacanciesService>(VacanciesService);
    categoryVacancyService = module.get<CategoryVacancyService>(CategoryVacancyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assignCategoriesToVacancy', () => {
    it('should assign categories to a vacancy', async () => {
      const vacancyId = 'vacancy-123';
      const categoryIds = ['cat-1', 'cat-2'];
      const assignedBy = 'user-123';

      mockCategoryVacancyService.assignCategories.mockResolvedValue(undefined);

      await controller.assignCategoriesToVacancy(vacancyId, {
        categoryIds,
        assignedBy,
      });

      expect(mockCategoryVacancyService.assignCategories).toHaveBeenCalledWith(
        vacancyId,
        categoryIds,
        assignedBy,
      );
    });
  });

  describe('removeCategoriesFromVacancy', () => {
    it('should remove categories from a vacancy', async () => {
      const vacancyId = 'vacancy-123';
      const categoryIds = ['cat-1', 'cat-2'];

      mockCategoryVacancyService.removeCategories.mockResolvedValue(undefined);

      await controller.removeCategoriesFromVacancy(vacancyId, {
        categoryIds,
      });

      expect(mockCategoryVacancyService.removeCategories).toHaveBeenCalledWith(
        vacancyId,
        categoryIds,
      );
    });
  });

  describe('getCategoriesForVacancy', () => {
    it('should get categories for a vacancy', async () => {
      const vacancyId = 'vacancy-123';
      const mockCategories = [
        { id: 'cat-1', name: 'Technology' },
        { id: 'cat-2', name: 'Software Development' },
      ];

      mockCategoryVacancyService.getCategoriesForVacancy.mockResolvedValue(mockCategories);

      const result = await controller.getCategoriesForVacancy(vacancyId);

      expect(result).toEqual(mockCategories);
      expect(mockCategoryVacancyService.getCategoriesForVacancy).toHaveBeenCalledWith(vacancyId);
    });
  });
});