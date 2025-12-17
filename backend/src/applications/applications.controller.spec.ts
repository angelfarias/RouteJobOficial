import { Test, TestingModule } from '@nestjs/testing';
import { 
  BadRequestException, 
  UnauthorizedException, 
  NotFoundException, 
  ForbiddenException 
} from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { CandidateSelectionService } from './candidate-selection.service';
import { 
  ApplicationWithCandidate, 
  CandidateDetails, 
  SelectionResult, 
  SelectionStatus 
} from './interfaces/candidate-selection.interface';

// Mock ApplicationsService
const mockApplicationsService = {
  postular: jest.fn(),
  unreadCount: jest.fn(),
};

// Mock CandidateSelectionService
const mockCandidateSelectionService = {
  getApplicationsForVacancy: jest.fn(),
  getApplicationsByStatus: jest.fn(),
  getApplicationsWithPagination: jest.fn(),
  getCandidateDetails: jest.fn(),
  getCandidateDetailsWithMissingInfo: jest.fn(),
  selectCandidate: jest.fn(),
  sendSelectionNotification: jest.fn(),
};

describe('ApplicationsController', () => {
  let controller: ApplicationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationsController],
      providers: [
        {
          provide: ApplicationsService,
          useValue: mockApplicationsService,
        },
        {
          provide: CandidateSelectionService,
          useValue: mockCandidateSelectionService,
        },
      ],
    }).compile();

    controller = module.get<ApplicationsController>(ApplicationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getApplicationsForVacancy', () => {
    const validHeaders = {
      authorization: 'Bearer valid-token',
      'x-company-id': 'company-123',
    };

    it('should return applications for a vacancy successfully', async () => {
      const vacancyId = 'vacancy-123';
      const mockApplications: ApplicationWithCandidate[] = [
        {
          id: 'app-1',
          uid: 'user-1',
          vacancyId: vacancyId,
          status: 'pending',
          createdAt: { seconds: 1234567890, nanoseconds: 0 },
          candidateName: 'John Doe',
          candidateEmail: 'john@example.com',
          profileCompleted: true,
          experience: ['Software Engineer'],
          skills: ['JavaScript', 'Node.js'],
        },
      ];

      mockCandidateSelectionService.getApplicationsForVacancy.mockResolvedValue(mockApplications);

      const result = await controller.getApplicationsForVacancy(
        vacancyId,
        validHeaders['x-company-id'],
        validHeaders.authorization
      );

      expect(result.ok).toBe(true);
      expect(result.applications).toEqual(mockApplications);
      expect(mockCandidateSelectionService.getApplicationsForVacancy).toHaveBeenCalledWith(
        vacancyId,
        validHeaders['x-company-id']
      );
    });

    it('should return applications filtered by status', async () => {
      const vacancyId = 'vacancy-123';
      const status = 'pending';
      const mockApplications: ApplicationWithCandidate[] = [
        {
          id: 'app-1',
          uid: 'user-1',
          vacancyId: vacancyId,
          status: 'pending',
          createdAt: { seconds: 1234567890, nanoseconds: 0 },
          candidateName: 'John Doe',
          candidateEmail: 'john@example.com',
          profileCompleted: true,
          experience: ['Software Engineer'],
          skills: ['JavaScript'],
        },
      ];

      mockCandidateSelectionService.getApplicationsByStatus.mockResolvedValue(mockApplications);

      const result = await controller.getApplicationsForVacancy(
        vacancyId,
        validHeaders['x-company-id'],
        validHeaders.authorization,
        status
      );

      expect(result.ok).toBe(true);
      expect(result.applications).toEqual(mockApplications);
      expect(mockCandidateSelectionService.getApplicationsByStatus).toHaveBeenCalledWith(
        vacancyId,
        validHeaders['x-company-id'],
        status
      );
    });

    it('should return paginated applications', async () => {
      const vacancyId = 'vacancy-123';
      const limit = '10';
      const offset = '0';
      const mockPaginatedResult = {
        applications: [],
        total: 0,
        hasMore: false,
      };

      mockCandidateSelectionService.getApplicationsWithPagination.mockResolvedValue(mockPaginatedResult);

      const result = await controller.getApplicationsForVacancy(
        vacancyId,
        validHeaders['x-company-id'],
        validHeaders.authorization,
        undefined,
        limit,
        offset
      );

      expect(result.ok).toBe(true);
      expect(result.applications).toEqual(mockPaginatedResult.applications);
      expect(result.total).toBe(mockPaginatedResult.total);
      expect(result.hasMore).toBe(mockPaginatedResult.hasMore);
      expect(mockCandidateSelectionService.getApplicationsWithPagination).toHaveBeenCalledWith(
        vacancyId,
        validHeaders['x-company-id'],
        {
          status: undefined,
          limit: 10,
          offset: 0,
        }
      );
    });

    it('should throw UnauthorizedException when authorization header is missing', async () => {
      await expect(
        controller.getApplicationsForVacancy(
          'vacancy-123',
          'company-123',
          '' // Missing authorization
        )
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when company ID header is missing', async () => {
      await expect(
        controller.getApplicationsForVacancy(
          'vacancy-123',
          '', // Missing company ID
          'Bearer valid-token'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when vacancy ID is missing', async () => {
      await expect(
        controller.getApplicationsForVacancy(
          '', // Missing vacancy ID
          'company-123',
          'Bearer valid-token'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate pagination parameters', async () => {
      const vacancyId = 'vacancy-123';

      // Test invalid limit
      await expect(
        controller.getApplicationsForVacancy(
          vacancyId,
          validHeaders['x-company-id'],
          validHeaders.authorization,
          undefined,
          '101' // Limit too high
        )
      ).rejects.toThrow(BadRequestException);

      // Test negative offset
      await expect(
        controller.getApplicationsForVacancy(
          vacancyId,
          validHeaders['x-company-id'],
          validHeaders.authorization,
          undefined,
          '10',
          '-1' // Negative offset
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle service errors gracefully', async () => {
      const vacancyId = 'vacancy-123';
      mockCandidateSelectionService.getApplicationsForVacancy.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await controller.getApplicationsForVacancy(
        vacancyId,
        validHeaders['x-company-id'],
        validHeaders.authorization
      );

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Internal server error while retrieving applications');
    });

    it('should propagate HTTP exceptions from service', async () => {
      const vacancyId = 'vacancy-123';
      mockCandidateSelectionService.getApplicationsForVacancy.mockRejectedValue(
        new NotFoundException('Vacancy not found')
      );

      await expect(
        controller.getApplicationsForVacancy(
          vacancyId,
          validHeaders['x-company-id'],
          validHeaders.authorization
        )
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCandidateDetails', () => {
    const validHeaders = {
      authorization: 'Bearer valid-token',
      'x-company-id': 'company-123',
    };

    it('should return candidate details successfully', async () => {
      const applicationId = 'app-123';
      const mockCandidateDetails: CandidateDetails = {
        id: 'candidate-123',
        applicationId: applicationId,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        experience: ['Software Engineer at ABC Corp'],
        skills: ['JavaScript', 'Node.js', 'React'],
        location: { latitude: 40.7128, longitude: -74.0060 },
        profileCompleted: true,
        applicationDate: { seconds: 1234567890, nanoseconds: 0 },
      };

      mockCandidateSelectionService.getCandidateDetails.mockResolvedValue(mockCandidateDetails);

      const result = await controller.getCandidateDetails(
        applicationId,
        validHeaders['x-company-id'],
        validHeaders.authorization
      );

      expect(result.ok).toBe(true);
      expect(result.candidate).toEqual(mockCandidateDetails);
      expect(mockCandidateSelectionService.getCandidateDetails).toHaveBeenCalledWith(
        applicationId,
        validHeaders['x-company-id']
      );
    });

    it('should return candidate details with missing information analysis', async () => {
      const applicationId = 'app-123';
      const mockCandidateDetailsWithMissing = {
        id: 'candidate-123',
        applicationId: applicationId,
        name: 'John Doe',
        email: 'john@example.com',
        experience: [],
        skills: [],
        profileCompleted: false,
        applicationDate: { seconds: 1234567890, nanoseconds: 0 },
        missingFields: ['phone', 'experience', 'skills', 'location'],
      };

      mockCandidateSelectionService.getCandidateDetailsWithMissingInfo.mockResolvedValue(
        mockCandidateDetailsWithMissing
      );

      const result = await controller.getCandidateDetails(
        applicationId,
        validHeaders['x-company-id'],
        validHeaders.authorization,
        'true' // includeMissingInfo
      );

      expect(result.ok).toBe(true);
      expect(result.candidate).toEqual(mockCandidateDetailsWithMissing);
      expect(mockCandidateSelectionService.getCandidateDetailsWithMissingInfo).toHaveBeenCalledWith(
        applicationId,
        validHeaders['x-company-id']
      );
    });

    it('should throw UnauthorizedException when authorization header is missing', async () => {
      await expect(
        controller.getCandidateDetails(
          'app-123',
          'company-123',
          '' // Missing authorization
        )
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when company ID header is missing', async () => {
      await expect(
        controller.getCandidateDetails(
          'app-123',
          '', // Missing company ID
          'Bearer valid-token'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when application ID is missing', async () => {
      await expect(
        controller.getCandidateDetails(
          '', // Missing application ID
          'company-123',
          'Bearer valid-token'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle service errors gracefully', async () => {
      const applicationId = 'app-123';
      mockCandidateSelectionService.getCandidateDetails.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await controller.getCandidateDetails(
        applicationId,
        validHeaders['x-company-id'],
        validHeaders.authorization
      );

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Internal server error while retrieving candidate details');
    });

    it('should propagate HTTP exceptions from service', async () => {
      const applicationId = 'app-123';
      mockCandidateSelectionService.getCandidateDetails.mockRejectedValue(
        new ForbiddenException('Access denied')
      );

      await expect(
        controller.getCandidateDetails(
          applicationId,
          validHeaders['x-company-id'],
          validHeaders.authorization
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('selectCandidate', () => {
    const validHeaders = {
      authorization: 'Bearer valid-token',
      'x-company-id': 'company-123',
    };

    it('should select candidate successfully', async () => {
      const applicationId = 'app-123';
      const selectedBy = 'hr-manager-123';
      const mockSelectionResult: SelectionResult = {
        success: true,
        applicationId: applicationId,
        candidateId: 'candidate-123',
        vacancyId: 'vacancy-123',
        selectedAt: { seconds: 1234567890, nanoseconds: 0 },
        selectedBy: selectedBy,
        notificationSent: false,
      };

      mockCandidateSelectionService.selectCandidate.mockResolvedValue(mockSelectionResult);
      mockCandidateSelectionService.sendSelectionNotification.mockResolvedValue(undefined);

      const result = await controller.selectCandidate(
        applicationId,
        validHeaders['x-company-id'],
        validHeaders.authorization,
        selectedBy
      );

      expect(result.ok).toBe(true);
      expect(result.selection).toEqual(mockSelectionResult);
      expect(mockCandidateSelectionService.selectCandidate).toHaveBeenCalledWith(
        applicationId,
        validHeaders['x-company-id'],
        selectedBy
      );
      expect(mockCandidateSelectionService.sendSelectionNotification).toHaveBeenCalledWith(
        mockSelectionResult
      );
    });

    it('should throw UnauthorizedException when authorization header is missing', async () => {
      await expect(
        controller.selectCandidate(
          'app-123',
          'company-123',
          '', // Missing authorization
          'hr-manager-123'
        )
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when company ID header is missing', async () => {
      await expect(
        controller.selectCandidate(
          'app-123',
          '', // Missing company ID
          'Bearer valid-token',
          'hr-manager-123'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when application ID is missing', async () => {
      await expect(
        controller.selectCandidate(
          '', // Missing application ID
          'company-123',
          'Bearer valid-token',
          'hr-manager-123'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when selectedBy is missing', async () => {
      await expect(
        controller.selectCandidate(
          'app-123',
          'company-123',
          'Bearer valid-token',
          '' // Missing selectedBy
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle service errors gracefully', async () => {
      const applicationId = 'app-123';
      const selectedBy = 'hr-manager-123';
      mockCandidateSelectionService.selectCandidate.mockRejectedValue(
        new Error('Database transaction failed')
      );

      const result = await controller.selectCandidate(
        applicationId,
        validHeaders['x-company-id'],
        validHeaders.authorization,
        selectedBy
      );

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Internal server error while selecting candidate');
    });

    it('should propagate HTTP exceptions from service', async () => {
      const applicationId = 'app-123';
      const selectedBy = 'hr-manager-123';
      mockCandidateSelectionService.selectCandidate.mockRejectedValue(
        new BadRequestException('Candidate already selected')
      );

      await expect(
        controller.selectCandidate(
          applicationId,
          validHeaders['x-company-id'],
          validHeaders.authorization,
          selectedBy
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should continue even if notification sending fails', async () => {
      const applicationId = 'app-123';
      const selectedBy = 'hr-manager-123';
      const mockSelectionResult: SelectionResult = {
        success: true,
        applicationId: applicationId,
        candidateId: 'candidate-123',
        vacancyId: 'vacancy-123',
        selectedAt: { seconds: 1234567890, nanoseconds: 0 },
        selectedBy: selectedBy,
        notificationSent: false,
      };

      mockCandidateSelectionService.selectCandidate.mockResolvedValue(mockSelectionResult);
      mockCandidateSelectionService.sendSelectionNotification.mockRejectedValue(
        new Error('Email service unavailable')
      );

      const result = await controller.selectCandidate(
        applicationId,
        validHeaders['x-company-id'],
        validHeaders.authorization,
        selectedBy
      );

      // Selection should still succeed even if notification fails
      expect(result.ok).toBe(true);
      expect(result.selection).toEqual(mockSelectionResult);
    });
  });

  describe('existing endpoints', () => {
    it('should handle postular endpoint', async () => {
      const uid = 'user-123';
      const vacancyId = 'vacancy-123';
      const mockResponse = { ok: true };

      mockApplicationsService.postular.mockResolvedValue(mockResponse);

      const result = await controller.postular(uid, vacancyId);

      expect(result).toEqual(mockResponse);
      expect(mockApplicationsService.postular).toHaveBeenCalledWith(uid, vacancyId);
    });

    it('should handle postular endpoint with missing parameters', async () => {
      const result = await controller.postular('', 'vacancy-123');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('uid y vacancyId requeridos');
    });

    it('should handle unread notifications endpoint', async () => {
      const uid = 'user-123';
      const mockResponse = { ok: true, unread: 5 };

      mockApplicationsService.unreadCount.mockResolvedValue(mockResponse);

      const result = await controller.unread(uid);

      expect(result).toEqual(mockResponse);
      expect(mockApplicationsService.unreadCount).toHaveBeenCalledWith(uid);
    });

    it('should handle unread notifications endpoint with missing uid', async () => {
      const result = await controller.unread('');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('uid requerido');
    });
  });
});