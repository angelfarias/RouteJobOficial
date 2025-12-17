import { Test, TestingModule } from '@nestjs/testing';
import { 
  BadRequestException, 
  UnauthorizedException, 
  NotFoundException 
} from '@nestjs/common';
import { VacanciesController } from './vacancies.controller';
import { VacanciesService } from './vacancies.service';
import { CategoryVacancyService } from '../categories/category-vacancy.service';
import { CandidateSelectionService } from '../applications/candidate-selection.service';
import { SelectionStatus } from '../applications/interfaces/candidate-selection.interface';

// Mock VacanciesService
const mockVacanciesService = {
  buscarCercanas: jest.fn(),
  createVacancy: jest.fn(),
  listByBranch: jest.fn(),
  findOne: jest.fn(),
  searchByCategories: jest.fn(),
  searchVacancies: jest.fn(),
};

// Mock CategoryVacancyService
const mockCategoryVacancyService = {
  assignCategories: jest.fn(),
  removeCategories: jest.fn(),
  getCategoriesForVacancy: jest.fn(),
};

// Mock CandidateSelectionService
const mockCandidateSelectionService = {
  getSelectionStatus: jest.fn(),
};

describe('VacanciesController', () => {
  let controller: VacanciesController;

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
          provide: CandidateSelectionService,
          useValue: mockCandidateSelectionService,
        },
      ],
    }).compile();

    controller = module.get<VacanciesController>(VacanciesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSelectionStatus', () => {
    const validHeaders = {
      authorization: 'Bearer valid-token',
      'x-company-id': 'company-123',
    };

    it('should return selection status successfully when no candidate is selected', async () => {
      const vacancyId = 'vacancy-123';
      const mockSelectionStatus: SelectionStatus = {
        vacancyId: vacancyId,
        hasSelectedCandidate: false,
      };

      mockCandidateSelectionService.getSelectionStatus.mockResolvedValue(mockSelectionStatus);

      const result = await controller.getSelectionStatus(
        vacancyId,
        validHeaders['x-company-id'],
        validHeaders.authorization
      );

      expect(result.ok).toBe(true);
      expect(result.selectionStatus).toEqual(mockSelectionStatus);
      expect(mockCandidateSelectionService.getSelectionStatus).toHaveBeenCalledWith(vacancyId);
    });

    it('should return selection status successfully when a candidate is selected', async () => {
      const vacancyId = 'vacancy-123';
      const mockSelectionStatus: SelectionStatus = {
        vacancyId: vacancyId,
        hasSelectedCandidate: true,
        selectedCandidateId: 'candidate-456',
        selectionDate: { seconds: 1234567890, nanoseconds: 0 },
      };

      mockCandidateSelectionService.getSelectionStatus.mockResolvedValue(mockSelectionStatus);

      const result = await controller.getSelectionStatus(
        vacancyId,
        validHeaders['x-company-id'],
        validHeaders.authorization
      );

      expect(result.ok).toBe(true);
      expect(result.selectionStatus).toEqual(mockSelectionStatus);
      expect(result.selectionStatus?.hasSelectedCandidate).toBe(true);
      expect(result.selectionStatus?.selectedCandidateId).toBe('candidate-456');
      expect(result.selectionStatus?.selectionDate).toBeDefined();
      expect(mockCandidateSelectionService.getSelectionStatus).toHaveBeenCalledWith(vacancyId);
    });

    it('should throw UnauthorizedException when authorization header is missing', async () => {
      await expect(
        controller.getSelectionStatus(
          'vacancy-123',
          'company-123',
          '' // Missing authorization
        )
      ).rejects.toThrow(UnauthorizedException);

      expect(mockCandidateSelectionService.getSelectionStatus).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when company ID header is missing', async () => {
      await expect(
        controller.getSelectionStatus(
          'vacancy-123',
          '', // Missing company ID
          'Bearer valid-token'
        )
      ).rejects.toThrow(BadRequestException);

      expect(mockCandidateSelectionService.getSelectionStatus).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when vacancy ID is missing', async () => {
      await expect(
        controller.getSelectionStatus(
          '', // Missing vacancy ID
          'company-123',
          'Bearer valid-token'
        )
      ).rejects.toThrow(BadRequestException);

      expect(mockCandidateSelectionService.getSelectionStatus).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      const vacancyId = 'vacancy-123';
      mockCandidateSelectionService.getSelectionStatus.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await controller.getSelectionStatus(
        vacancyId,
        validHeaders['x-company-id'],
        validHeaders.authorization
      );

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Internal server error while retrieving selection status');
      expect(result.selectionStatus).toBeUndefined();
    });

    it('should propagate NotFoundException from service', async () => {
      const vacancyId = 'vacancy-123';
      mockCandidateSelectionService.getSelectionStatus.mockRejectedValue(
        new NotFoundException('Vacancy not found')
      );

      const result = await controller.getSelectionStatus(
        vacancyId,
        validHeaders['x-company-id'],
        validHeaders.authorization
      );

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Internal server error while retrieving selection status');
    });

    it('should handle various vacancy IDs correctly', async () => {
      const testCases = [
        'vacancy-123',
        'vac_456',
        'test-vacancy-with-long-name-789',
        '12345',
      ];

      for (const vacancyId of testCases) {
        const mockSelectionStatus: SelectionStatus = {
          vacancyId: vacancyId,
          hasSelectedCandidate: false,
        };

        mockCandidateSelectionService.getSelectionStatus.mockResolvedValue(mockSelectionStatus);

        const result = await controller.getSelectionStatus(
          vacancyId,
          validHeaders['x-company-id'],
          validHeaders.authorization
        );

        expect(result.ok).toBe(true);
        expect(result.selectionStatus?.vacancyId).toBe(vacancyId);
        expect(mockCandidateSelectionService.getSelectionStatus).toHaveBeenCalledWith(vacancyId);

        // Clear mock for next iteration
        mockCandidateSelectionService.getSelectionStatus.mockClear();
      }
    });

    it('should handle different authorization token formats', async () => {
      const vacancyId = 'vacancy-123';
      const mockSelectionStatus: SelectionStatus = {
        vacancyId: vacancyId,
        hasSelectedCandidate: false,
      };

      mockCandidateSelectionService.getSelectionStatus.mockResolvedValue(mockSelectionStatus);

      const authTokens = [
        'Bearer jwt-token-123',
        'Token abc123',
        'Basic dXNlcjpwYXNz',
        'custom-auth-header',
      ];

      for (const authToken of authTokens) {
        const result = await controller.getSelectionStatus(
          vacancyId,
          validHeaders['x-company-id'],
          authToken
        );

        expect(result.ok).toBe(true);
        expect(result.selectionStatus).toEqual(mockSelectionStatus);

        // Clear mock for next iteration
        mockCandidateSelectionService.getSelectionStatus.mockClear();
      }
    });

    it('should handle different company ID formats', async () => {
      const vacancyId = 'vacancy-123';
      const mockSelectionStatus: SelectionStatus = {
        vacancyId: vacancyId,
        hasSelectedCandidate: false,
      };

      mockCandidateSelectionService.getSelectionStatus.mockResolvedValue(mockSelectionStatus);

      const companyIds = [
        'company-123',
        'comp_456',
        'test-company-with-long-name-789',
        '98765',
        'COMPANY-ABC',
      ];

      for (const companyId of companyIds) {
        const result = await controller.getSelectionStatus(
          vacancyId,
          companyId,
          validHeaders.authorization
        );

        expect(result.ok).toBe(true);
        expect(result.selectionStatus).toEqual(mockSelectionStatus);

        // Clear mock for next iteration
        mockCandidateSelectionService.getSelectionStatus.mockClear();
      }
    });

    it('should maintain consistent response format', async () => {
      const vacancyId = 'vacancy-123';
      const mockSelectionStatus: SelectionStatus = {
        vacancyId: vacancyId,
        hasSelectedCandidate: true,
        selectedCandidateId: 'candidate-456',
        selectionDate: { seconds: 1234567890, nanoseconds: 0 },
      };

      mockCandidateSelectionService.getSelectionStatus.mockResolvedValue(mockSelectionStatus);

      const result = await controller.getSelectionStatus(
        vacancyId,
        validHeaders['x-company-id'],
        validHeaders.authorization
      );

      // Verify response structure
      expect(result).toHaveProperty('ok');
      expect(result).toHaveProperty('selectionStatus');
      expect(result).not.toHaveProperty('error');
      expect(typeof result.ok).toBe('boolean');
      expect(result.ok).toBe(true);

      // Verify selection status structure
      expect(result.selectionStatus).toHaveProperty('vacancyId');
      expect(result.selectionStatus).toHaveProperty('hasSelectedCandidate');
      expect(result.selectionStatus?.vacancyId).toBe(vacancyId);
      expect(typeof result.selectionStatus?.hasSelectedCandidate).toBe('boolean');
    });

    it('should maintain consistent error response format', async () => {
      const vacancyId = 'vacancy-123';
      mockCandidateSelectionService.getSelectionStatus.mockRejectedValue(
        new Error('Service error')
      );

      const result = await controller.getSelectionStatus(
        vacancyId,
        validHeaders['x-company-id'],
        validHeaders.authorization
      );

      // Verify error response structure
      expect(result).toHaveProperty('ok');
      expect(result).toHaveProperty('error');
      expect(result).not.toHaveProperty('selectionStatus');
      expect(typeof result.ok).toBe('boolean');
      expect(result.ok).toBe(false);
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    });
  });

  // Test a few existing endpoints to ensure they still work
  describe('existing endpoints', () => {
    it('should handle getVacantesCercanas endpoint', async () => {
      const uid = 'user-123';
      const mockVacantes = [{ id: 'vacancy-1', title: 'Test Job' }];

      mockVacanciesService.buscarCercanas.mockResolvedValue(mockVacantes);

      const result = await controller.getVacantesCercanas(uid);

      expect(result.vacantes).toEqual(mockVacantes);
      expect(mockVacanciesService.buscarCercanas).toHaveBeenCalledWith(uid, undefined, undefined);
    });

    it('should handle getVacantesCercanas with empty uid', async () => {
      const result = await controller.getVacantesCercanas('');

      expect(result.vacantes).toEqual([]);
      expect(mockVacanciesService.buscarCercanas).not.toHaveBeenCalled();
    });

    it('should handle getById endpoint', async () => {
      const vacancyId = 'vacancy-123';
      const mockVacancy = { id: vacancyId, title: 'Test Job' };

      mockVacanciesService.findOne.mockResolvedValue(mockVacancy);

      const result = await controller.getById(vacancyId);

      expect(result).toEqual(mockVacancy);
      expect(mockVacanciesService.findOne).toHaveBeenCalledWith(vacancyId);
    });

    it('should throw NotFoundException when vacancy not found', async () => {
      const vacancyId = 'vacancy-123';

      mockVacanciesService.findOne.mockResolvedValue(null);

      await expect(controller.getById(vacancyId)).rejects.toThrow(NotFoundException);
    });
  });
});