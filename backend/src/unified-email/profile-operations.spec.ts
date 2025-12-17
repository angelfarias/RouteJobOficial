// backend/src/unified-email/profile-operations.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { ProfileService } from './services/profile.service';
import { 
  CandidateProfile, 
  CompanyProfile, 
  UpdateCandidateProfileDto, 
  UpdateCompanyProfileDto 
} from './interfaces';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Feature: unified-email-system, Multiple Properties:
 * - Property 14: Profile update isolation (Requirements 4.3)
 * - Property 15: Selective profile deletion (Requirements 4.4) 
 * - Property 17: Separate document storage (Requirements 5.1)
 */

describe('UnifiedEmailSystem - Profile Operations Property Tests', () => {
  let service: ProfileService;
  let mockFirestore: any;

  beforeEach(async () => {
    // Mock Firestore
    mockFirestore = {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      set: jest.fn().mockResolvedValue({}),
      get: jest.fn(),
      delete: jest.fn().mockResolvedValue({})
    };

    // Mock Firebase Admin
    const mockFirebaseAdmin = {
      firestore: () => mockFirestore
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: 'FIREBASE_ADMIN',
          useValue: mockFirebaseAdmin
        }
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  describe('Property 14: Profile update isolation', () => {
    /**
     * Property test for update isolation
     */
    it('should update profiles in isolation without affecting other profile types', async () => {
      const testCases = [
        {
          type: 'candidate' as const,
          update: { professionalInfo: { title: 'Senior Developer' } },
          expectedCollection: 'candidates'
        },
        {
          type: 'company' as const,
          update: { companyInfo: { industry: 'Technology' } },
          expectedCollection: 'companies'
        }
      ];

      for (const testCase of testCases) {
        const userId = `user-${Math.random().toString(36).substr(2, 9)}`;
        const now = Timestamp.now();

        // Create existing profile
        const existingProfile = testCase.type === 'candidate' 
          ? {
              userId,
              personalInfo: { firstName: 'John', lastName: 'Doe' },
              professionalInfo: { skills: [] },
              preferences: { jobTypes: [], locations: [] },
              applications: [],
              createdAt: now,
              updatedAt: now
            }
          : {
              userId,
              companyInfo: { name: 'Test Company' },
              contactInfo: { contactPerson: 'Jane Smith' },
              jobPostings: [],
              createdAt: now,
              updatedAt: now
            };

        // Reset mocks
        mockFirestore.get.mockClear();
        mockFirestore.set.mockClear();

        mockFirestore.get.mockResolvedValue({
          exists: true,
          data: () => existingProfile
        });

        // Act: Update profile
        if (testCase.type === 'candidate') {
          await service.updateCandidateProfile(userId, testCase.update as UpdateCandidateProfileDto);
        } else {
          await service.updateCompanyProfile(userId, testCase.update as UpdateCompanyProfileDto);
        }

        // Assert: Verify correct collection was accessed
        expect(mockFirestore.collection).toHaveBeenCalledWith(testCase.expectedCollection);
        expect(mockFirestore.set).toHaveBeenCalledTimes(1);
        
        const updatedProfile = mockFirestore.set.mock.calls[0][0];
        expect(updatedProfile.userId).toBe(userId);
        expect(updatedProfile.updatedAt).toBeDefined();
      }
    });
  });

  describe('Property 15: Selective profile deletion', () => {
    /**
     * Property test for selective deletion
     */
    it('should delete profiles selectively without affecting other profile types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(fc.constant('candidate'), fc.constant('company')),
          async (profileType) => {
            const userId = `user-${Math.random().toString(36).substr(2, 9)}`;

            // Reset mocks
            mockFirestore.get.mockClear();
            mockFirestore.delete.mockClear();

            // Mock existing profile
            mockFirestore.get.mockResolvedValue({
              exists: true,
              data: () => ({ userId })
            });

            // Act: Delete profile
            await service.deleteProfile(userId, profileType);

            // Assert: Verify correct collection was accessed for deletion
            const expectedCollection = profileType === 'candidate' ? 'candidates' : 'companies';
            expect(mockFirestore.collection).toHaveBeenCalledWith(expectedCollection);
            expect(mockFirestore.delete).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Unit test for deletion error handling
     */
    it('should handle deletion of non-existent profiles', async () => {
      const userId = 'test-user';

      mockFirestore.get.mockResolvedValue({ exists: false });

      await expect(
        service.deleteCandidateProfile(userId)
      ).rejects.toThrow('Perfil de candidato no encontrado');

      await expect(
        service.deleteCompanyProfile(userId)
      ).rejects.toThrow('Perfil de empresa no encontrado');
    });
  });

  describe('Property 17: Separate document storage', () => {
    /**
     * Property test for document separation
     */
    it('should store profiles in separate collections linked by user ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(fc.constant('candidate'), fc.constant('company')),
          async (profileType) => {
            const userId = `user-${Math.random().toString(36).substr(2, 9)}`;

            // Reset mocks
            mockFirestore.get.mockClear();

            // Mock profile existence check
            mockFirestore.get.mockResolvedValue({
              exists: true,
              data: () => ({ userId })
            });

            // Act: Get profile
            let result;
            if (profileType === 'candidate') {
              result = await service.getCandidateProfile(userId);
            } else {
              result = await service.getCompanyProfile(userId);
            }

            // Assert: Verify correct collection was accessed
            const expectedCollection = profileType === 'candidate' ? 'candidates' : 'companies';
            expect(mockFirestore.collection).toHaveBeenCalledWith(expectedCollection);
            expect(mockFirestore.doc).toHaveBeenCalledWith(userId);
            
            if (result) {
              expect(result.userId).toBe(userId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property test for profile existence checking
     */
    it('should check profile existence in correct collections', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(fc.constant('candidate'), fc.constant('company')),
          fc.boolean(),
          async (profileType, exists) => {
            const userId = `user-${Math.random().toString(36).substr(2, 9)}`;

            // Reset mocks
            mockFirestore.get.mockClear();

            mockFirestore.get.mockResolvedValue({ exists });

            // Act: Check if profile exists
            const result = await service.profileExists(userId, profileType);

            // Assert: Verify correct collection was checked
            const expectedCollection = profileType === 'candidate' ? 'candidates' : 'companies';
            expect(mockFirestore.collection).toHaveBeenCalledWith(expectedCollection);
            expect(mockFirestore.doc).toHaveBeenCalledWith(userId);
            expect(result).toBe(exists);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Unit test for collection structure validation
     */
    it('should maintain consistent collection structure', async () => {
      const userId = 'test-user';
      const collections = ['candidates', 'companies'];

      for (const collection of collections) {
        mockFirestore.get.mockClear();
        mockFirestore.get.mockResolvedValue({
          exists: true,
          data: () => ({ userId })
        });

        const profileType = collection === 'candidates' ? 'candidate' : 'company';
        
        if (profileType === 'candidate') {
          await service.getCandidateProfile(userId);
        } else {
          await service.getCompanyProfile(userId);
        }

        expect(mockFirestore.collection).toHaveBeenCalledWith(collection);
        expect(mockFirestore.doc).toHaveBeenCalledWith(userId);
      }
    });
  });

  /**
   * Integration tests for combined operations
   */
  describe('Combined Operations', () => {
    it('should handle multiple profile operations independently', async () => {
      const userId = 'test-user';
      const now = Timestamp.now();

      // Mock profiles
      const candidateProfile = {
        userId,
        personalInfo: { firstName: 'John', lastName: 'Doe' },
        professionalInfo: { skills: [] },
        preferences: { jobTypes: [], locations: [] },
        applications: [],
        createdAt: now,
        updatedAt: now
      };

      const companyProfile = {
        userId,
        companyInfo: { name: 'Test Company' },
        contactInfo: { contactPerson: 'Jane Smith' },
        jobPostings: [],
        createdAt: now,
        updatedAt: now
      };

      // Reset mocks
      mockFirestore.get.mockClear();
      mockFirestore.set.mockClear();

      // Test sequence: check existence, update, check again
      mockFirestore.get
        .mockResolvedValueOnce({ exists: true }) // candidateExists1
        .mockResolvedValueOnce({ exists: true }) // companyExists1
        .mockResolvedValueOnce({ exists: true, data: () => candidateProfile }) // update candidate
        .mockResolvedValueOnce({ exists: true, data: () => companyProfile }) // update company
        .mockResolvedValueOnce({ exists: true }) // candidateExists2
        .mockResolvedValueOnce({ exists: true }); // companyExists2

      // Act: Perform operations
      const candidateExists1 = await service.profileExists(userId, 'candidate');
      const companyExists1 = await service.profileExists(userId, 'company');
      
      await service.updateCandidateProfile(userId, { professionalInfo: { title: 'Developer' } });
      await service.updateCompanyProfile(userId, { companyInfo: { industry: 'Tech' } });

      const candidateExists2 = await service.profileExists(userId, 'candidate');
      const companyExists2 = await service.profileExists(userId, 'company');

      // Assert: All operations should succeed independently
      expect(candidateExists1).toBe(true);
      expect(companyExists1).toBe(true);
      expect(candidateExists2).toBe(true);
      expect(companyExists2).toBe(true);
      
      // Verify both collections were accessed
      expect(mockFirestore.collection).toHaveBeenCalledWith('candidates');
      expect(mockFirestore.collection).toHaveBeenCalledWith('companies');
    });
  });
});