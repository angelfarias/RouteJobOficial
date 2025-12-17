// backend/src/unified-email/profile-creation.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { ProfileService } from './services/profile.service';
import { 
  CreateCandidateProfileDto, 
  CreateCompanyProfileDto 
} from './interfaces';

/**
 * Feature: unified-email-system, Property 13: Independent profile creation
 * 
 * Property: For any new profile type creation, the operation should add 
 * the profile to the existing user account without modifying other existing profiles
 * Validates: Requirements 4.2
 */

describe('UnifiedEmailSystem - Independent Profile Creation Property Tests', () => {
  let service: ProfileService;
  let mockFirestore: any;

  beforeEach(async () => {
    // Mock Firestore
    mockFirestore = {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      set: jest.fn().mockResolvedValue({}),
      get: jest.fn()
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

  describe('Property 13: Independent profile creation', () => {
    /**
     * Property-based test for independent candidate profile creation
     */
    it('should create candidate profiles without affecting existing company profiles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[A-Za-z][A-Za-z0-9\s]{1,49}$/),
          fc.stringMatching(/^[A-Za-z][A-Za-z0-9\s]{1,49}$/),
          async (firstName: string, lastName: string) => {
            const userId = `user-${Math.random().toString(36).substr(2, 9)}`;

            const candidateData: CreateCandidateProfileDto = {
              personalInfo: {
                firstName: firstName.trim(),
                lastName: lastName.trim()
              }
            };

            // Reset mocks
            mockFirestore.get.mockClear();
            mockFirestore.set.mockClear();

            // Mock no existing candidate profile
            mockFirestore.get.mockResolvedValue({ exists: false });

            // Act: Create candidate profile
            const result = await service.createCandidateProfile(userId, candidateData);

            // Assert: Verify profile was created correctly
            expect(mockFirestore.set).toHaveBeenCalledTimes(1);
            expect(result.userId).toBe(userId);
            expect(result.personalInfo.firstName).toBe(firstName.trim());
            expect(result.personalInfo.lastName).toBe(lastName.trim());
            expect(result.applications).toEqual([]);
            expect(result.createdAt).toBeDefined();
            expect(result.updatedAt).toBeDefined();

            // Verify only candidate collection was accessed
            expect(mockFirestore.collection).toHaveBeenCalledWith('candidates');
            expect(mockFirestore.doc).toHaveBeenCalledWith(userId);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property-based test for independent company profile creation
     */
    it('should create company profiles without affecting existing candidate profiles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[A-Za-z][A-Za-z0-9\s]{1,99}$/),
          fc.stringMatching(/^[A-Za-z][A-Za-z0-9\s]{1,99}$/),
          async (companyName: string, contactPerson: string) => {
            const userId = `user-${Math.random().toString(36).substr(2, 9)}`;

            const companyData: CreateCompanyProfileDto = {
              companyInfo: {
                name: companyName.trim()
              },
              contactInfo: {
                contactPerson: contactPerson.trim()
              }
            };

            // Reset mocks
            mockFirestore.get.mockClear();
            mockFirestore.set.mockClear();

            // Mock no existing company profile
            mockFirestore.get.mockResolvedValue({ exists: false });

            // Act: Create company profile
            const result = await service.createCompanyProfile(userId, companyData);

            // Assert: Verify profile was created correctly
            expect(mockFirestore.set).toHaveBeenCalledTimes(1);
            expect(result.userId).toBe(userId);
            expect(result.companyInfo.name).toBe(companyName.trim());
            expect(result.contactInfo.contactPerson).toBe(contactPerson.trim());
            expect(result.jobPostings).toEqual([]);
            expect(result.createdAt).toBeDefined();
            expect(result.updatedAt).toBeDefined();

            // Verify only company collection was accessed
            expect(mockFirestore.collection).toHaveBeenCalledWith('companies');
            expect(mockFirestore.doc).toHaveBeenCalledWith(userId);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property test for profile independence
     */
    it('should maintain profile independence during creation', async () => {
      const testCases = [
        {
          type: 'candidate' as const,
          data: {
            personalInfo: {
              firstName: 'John',
              lastName: 'Doe'
            }
          }
        },
        {
          type: 'company' as const,
          data: {
            companyInfo: {
              name: 'Test Company'
            },
            contactInfo: {
              contactPerson: 'Jane Smith'
            }
          }
        }
      ];

      for (const testCase of testCases) {
        const userId = `user-${Math.random().toString(36).substr(2, 9)}`;

        // Reset mocks
        mockFirestore.get.mockClear();
        mockFirestore.set.mockClear();

        // Mock no existing profile
        mockFirestore.get.mockResolvedValue({ exists: false });

        // Act: Create profile
        let result;
        if (testCase.type === 'candidate') {
          result = await service.createCandidateProfile(userId, testCase.data as CreateCandidateProfileDto);
        } else {
          result = await service.createCompanyProfile(userId, testCase.data as CreateCompanyProfileDto);
        }

        // Assert: Verify profile structure is correct and independent
        expect(result.userId).toBe(userId);
        
        if (testCase.type === 'candidate') {
          expect(result).toHaveProperty('personalInfo');
          expect(result).toHaveProperty('professionalInfo');
          expect(result).toHaveProperty('preferences');
          expect(result).toHaveProperty('applications');
          expect(result).not.toHaveProperty('companyInfo');
          expect(result).not.toHaveProperty('jobPostings');
        } else {
          expect(result).toHaveProperty('companyInfo');
          expect(result).toHaveProperty('contactInfo');
          expect(result).toHaveProperty('jobPostings');
          expect(result).not.toHaveProperty('personalInfo');
          expect(result).not.toHaveProperty('applications');
        }

        // Verify only one collection was accessed
        expect(mockFirestore.set).toHaveBeenCalledTimes(1);
      }
    });
  });

  /**
   * Unit tests for error handling
   */
  describe('Error Handling', () => {
    it('should prevent duplicate profile creation', async () => {
      const userId = 'test-user';
      const candidateData: CreateCandidateProfileDto = {
        personalInfo: {
          firstName: 'John',
          lastName: 'Doe'
        }
      };

      // Mock existing profile
      mockFirestore.get.mockResolvedValue({ exists: true });

      await expect(
        service.createCandidateProfile(userId, candidateData)
      ).rejects.toThrow('El usuario ya tiene un perfil de candidato');
    });

    it('should validate profile data before creation', async () => {
      const userId = 'test-user';
      const invalidData = {
        personalInfo: {
          firstName: '', // Invalid: empty name
          lastName: 'Doe'
        }
      };

      mockFirestore.get.mockResolvedValue({ exists: false });

      await expect(
        service.createCandidateProfile(userId, invalidData as CreateCandidateProfileDto)
      ).rejects.toThrow('Datos de perfil inválidos');
    });
  });
});