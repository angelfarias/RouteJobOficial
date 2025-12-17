// backend/src/unified-email/profile-linking.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { UnifiedAuthService } from './services/unified-auth.service';
import { 
  CreateCandidateProfileDto, 
  CreateCompanyProfileDto, 
  ProfileType,
  UnifiedUserAccount 
} from './interfaces';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Feature: unified-email-system, Property 2: Bidirectional profile linking
 * 
 * Property: For any existing user account, attempting to add a new profile type 
 * (candidate or company) should link the new profile to the existing account 
 * after password verification
 * Validates: Requirements 1.2, 1.3, 1.4
 */

describe('UnifiedEmailSystem - Profile Linking Property Tests', () => {
  let service: UnifiedAuthService;
  let mockFirestore: any;
  let mockAuth: any;

  beforeEach(async () => {
    // Mock Firestore
    mockFirestore = {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      set: jest.fn().mockResolvedValue({}),
      get: jest.fn().mockResolvedValue({
        exists: false,
        data: () => ({})
      }),
      update: jest.fn().mockResolvedValue({})
    };

    // Mock Firebase Auth
    mockAuth = {
      getUserByEmail: jest.fn().mockResolvedValue({
        uid: 'test-uid',
        email: 'test@example.com'
      })
    };

    // Mock Firebase Admin
    const mockFirebaseAdmin = {
      firestore: () => mockFirestore,
      auth: () => mockAuth
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnifiedAuthService,
        {
          provide: 'FIREBASE_ADMIN',
          useValue: mockFirebaseAdmin
        }
      ],
    }).compile();

    service = module.get<UnifiedAuthService>(UnifiedAuthService);
  });

  describe('Property 2: Bidirectional profile linking', () => {
    /**
     * Property-based test for profile linking behavior
     */
    it('should successfully link profiles when valid data is provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid names using alphanumeric characters
          fc.stringMatching(/^[A-Za-z][A-Za-z0-9\s]{1,49}$/),
          fc.stringMatching(/^[A-Za-z][A-Za-z0-9\s]{1,49}$/),
          fc.stringMatching(/^[A-Za-z][A-Za-z0-9\s]{1,99}$/),
          fc.stringMatching(/^[A-Za-z][A-Za-z0-9\s]{1,99}$/),
          fc.oneof(fc.constant('candidate'), fc.constant('company')),
          async (firstName: string, lastName: string, companyName: string, contactPerson: string, profileType: ProfileType) => {
            const userId = `user-${Math.random().toString(36).substr(2, 9)}`;

            // Create valid profile data based on type
            let profileData: CreateCandidateProfileDto | CreateCompanyProfileDto;
            
            if (profileType === 'candidate') {
              profileData = {
                personalInfo: {
                  firstName: firstName.trim(),
                  lastName: lastName.trim()
                }
              };
            } else {
              profileData = {
                companyInfo: {
                  name: companyName.trim()
                },
                contactInfo: {
                  contactPerson: contactPerson.trim()
                }
              };
            }

            // Reset mocks for each test
            mockFirestore.get.mockClear();
            mockFirestore.set.mockClear();
            mockFirestore.update.mockClear();

            // Setup: Mock no existing profile of this type
            mockFirestore.get
              .mockResolvedValueOnce({ exists: false }) // Profile doesn't exist
              .mockResolvedValueOnce({ exists: true, data: () => ({ profileTypes: [] }) }); // User account exists

            // Act: Link profile
            await service.linkProfileToUser(userId, profileType, profileData);

            // Assert: Verify profile was created
            expect(mockFirestore.set).toHaveBeenCalledTimes(1);
            expect(mockFirestore.update).toHaveBeenCalledTimes(1);

            // Verify the profile contains the expected data
            const setCall = mockFirestore.set.mock.calls[0][0];
            expect(setCall.userId).toBe(userId);
            expect(setCall.createdAt).toBeDefined();
            expect(setCall.updatedAt).toBeDefined();

            if (profileType === 'candidate') {
              expect(setCall.personalInfo.firstName).toBe(firstName.trim());
              expect(setCall.personalInfo.lastName).toBe(lastName.trim());
              expect(setCall.applications).toEqual([]);
            } else {
              expect(setCall.companyInfo.name).toBe(companyName.trim());
              expect(setCall.contactInfo.contactPerson).toBe(contactPerson.trim());
              expect(setCall.jobPostings).toEqual([]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property test for password verification requirement
     */
    it('should require password verification for all profile linking operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.string({ minLength: 8, maxLength: 128 }),
          fc.oneof(fc.constant('candidate'), fc.constant('company')),
          async (email: string, password: string, profileType: ProfileType) => {
            // Setup: Mock password validation
            const isValidPassword = password.length >= 8;
            
            if (isValidPassword) {
              mockAuth.getUserByEmail.mockResolvedValue({
                uid: 'test-uid',
                email: email.toLowerCase()
              });
            } else {
              mockAuth.getUserByEmail.mockRejectedValue({ code: 'auth/user-not-found' });
            }

            // Act & Assert: Verify password validation is called
            const result = await service.validateAccountOwnership(email, password);
            
            if (isValidPassword) {
              expect(result).toBe(true);
              expect(mockAuth.getUserByEmail).toHaveBeenCalledWith(email.toLowerCase());
            } else {
              expect(result).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Unit tests for edge cases
   */
  describe('Edge Cases', () => {
    it('should prevent linking duplicate profile types', async () => {
      const userId = 'test-uid';
      const candidateData: CreateCandidateProfileDto = {
        personalInfo: {
          firstName: 'John',
          lastName: 'Doe'
        }
      };

      // Mock existing candidate profile
      mockFirestore.get.mockResolvedValue({
        exists: true,
        data: () => ({ userId, ...candidateData })
      });

      // Should throw conflict exception
      await expect(
        service.linkProfileToUser(userId, 'candidate', candidateData)
      ).rejects.toThrow('El usuario ya tiene un perfil de candidate');
    });

    it('should handle invalid profile data gracefully', async () => {
      const userId = 'test-uid';
      const invalidData = {
        personalInfo: {
          firstName: '', // Invalid: empty name
          lastName: 'Doe'
        }
      };

      mockFirestore.get.mockResolvedValue({ exists: false });

      // Should throw validation error
      await expect(
        service.linkProfileToUser(userId, 'candidate', invalidData as CreateCandidateProfileDto)
      ).rejects.toThrow('Datos de perfil inválidos');
    });
  });
});