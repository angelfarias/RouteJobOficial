// backend/src/unified-email/profile-type-detection.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { UnifiedAuthService } from './services/unified-auth.service';
import { ProfileTypes, ProfileType } from './interfaces';

/**
 * Feature: unified-email-system, Property 8: Profile type detection on login
 * 
 * Property: For any user login, the system should check for and identify 
 * all profile types (candidate, company, or both) associated with the user account
 * Validates: Requirements 3.1
 */

describe('UnifiedEmailSystem - Profile Type Detection Property Tests', () => {
  let service: UnifiedAuthService;
  let mockFirestore: any;
  let mockAuth: any;

  beforeEach(async () => {
    // Mock Firestore
    mockFirestore = {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      get: jest.fn()
    };

    // Mock Firebase Auth
    mockAuth = {
      getUserByEmail: jest.fn()
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

  describe('Property 8: Profile type detection on login', () => {
    /**
     * Property-based test for profile type detection accuracy
     */
    it('should correctly detect all profile types for any user configuration', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate different profile configurations
          fc.record({
            hasCandidate: fc.boolean(),
            hasCompany: fc.boolean(),
            candidateData: fc.option(fc.record({
              personalInfo: fc.record({
                firstName: fc.stringMatching(/^[A-Za-z][A-Za-z0-9\s]{1,49}$/),
                lastName: fc.stringMatching(/^[A-Za-z][A-Za-z0-9\s]{1,49}$/)
              })
            })),
            companyData: fc.option(fc.record({
              companyInfo: fc.record({
                name: fc.stringMatching(/^[A-Za-z][A-Za-z0-9\s]{1,99}$/)
              }),
              contactInfo: fc.record({
                contactPerson: fc.stringMatching(/^[A-Za-z][A-Za-z0-9\s]{1,99}$/)
              })
            }))
          }),
          async (profileConfig) => {
            const userId = `user-${Math.random().toString(36).substr(2, 9)}`;

            // Reset mocks
            mockFirestore.get.mockClear();

            // Setup mocks based on profile configuration
            const candidateExists = profileConfig.hasCandidate && profileConfig.candidateData;
            const companyExists = profileConfig.hasCompany && profileConfig.companyData;

            // Mock candidate profile check
            mockFirestore.get
              .mockResolvedValueOnce({
                exists: candidateExists,
                data: candidateExists ? () => profileConfig.candidateData : undefined
              })
              // Mock company profile check
              .mockResolvedValueOnce({
                exists: companyExists,
                data: companyExists ? () => profileConfig.companyData : undefined
              });

            // Act: Check user profiles
            const result: ProfileTypes = await service.checkUserProfiles(userId);

            // Assert: Verify detection accuracy
            expect(result.hasCandidate).toBe(candidateExists);
            expect(result.hasCompany).toBe(companyExists);

            // Verify available roles array
            const expectedRoles: ProfileType[] = [];
            if (candidateExists) expectedRoles.push('candidate');
            if (companyExists) expectedRoles.push('company');

            expect(result.availableRoles).toEqual(expectedRoles);
            expect(result.availableRoles.length).toBe(
              (candidateExists ? 1 : 0) + (companyExists ? 1 : 0)
            );

            // Verify Firestore was called correctly
            expect(mockFirestore.collection).toHaveBeenCalledWith('candidates');
            expect(mockFirestore.collection).toHaveBeenCalledWith('companies');
            expect(mockFirestore.doc).toHaveBeenCalledWith(userId);
            expect(mockFirestore.get).toHaveBeenCalledTimes(2);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property test for consistent detection behavior
     */
    it('should provide consistent results for repeated calls with same user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // hasCandidate
          fc.boolean(), // hasCompany
          async (hasCandidate: boolean, hasCompany: boolean) => {
            const userId = `user-${Math.random().toString(36).substr(2, 9)}`;

            // Setup consistent mock responses
            const setupMocks = () => {
              mockFirestore.get.mockClear();
              mockFirestore.get
                .mockResolvedValueOnce({
                  exists: hasCandidate,
                  data: hasCandidate ? () => ({ personalInfo: { firstName: 'Test', lastName: 'User' } }) : undefined
                })
                .mockResolvedValueOnce({
                  exists: hasCompany,
                  data: hasCompany ? () => ({ companyInfo: { name: 'Test Company' } }) : undefined
                });
            };

            // Act: Call detection multiple times
            setupMocks();
            const result1 = await service.checkUserProfiles(userId);
            
            setupMocks();
            const result2 = await service.checkUserProfiles(userId);

            setupMocks();
            const result3 = await service.checkUserProfiles(userId);

            // Assert: Results should be identical
            expect(result1).toEqual(result2);
            expect(result2).toEqual(result3);
            expect(result1.hasCandidate).toBe(hasCandidate);
            expect(result1.hasCompany).toBe(hasCompany);
            expect(result1.availableRoles.length).toBe(
              (hasCandidate ? 1 : 0) + (hasCompany ? 1 : 0)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property test for edge case handling
     */
    it('should handle all possible profile combinations correctly', async () => {
      const testCases = [
        { hasCandidate: false, hasCompany: false, expectedRoles: [] },
        { hasCandidate: true, hasCompany: false, expectedRoles: ['candidate'] },
        { hasCandidate: false, hasCompany: true, expectedRoles: ['company'] },
        { hasCandidate: true, hasCompany: true, expectedRoles: ['candidate', 'company'] }
      ];

      for (const testCase of testCases) {
        const userId = `user-${Math.random().toString(36).substr(2, 9)}`;

        mockFirestore.get.mockClear();
        mockFirestore.get
          .mockResolvedValueOnce({
            exists: testCase.hasCandidate,
            data: testCase.hasCandidate ? () => ({ personalInfo: { firstName: 'Test', lastName: 'User' } }) : undefined
          })
          .mockResolvedValueOnce({
            exists: testCase.hasCompany,
            data: testCase.hasCompany ? () => ({ companyInfo: { name: 'Test Company' } }) : undefined
          });

        const result = await service.checkUserProfiles(userId);

        expect(result.hasCandidate).toBe(testCase.hasCandidate);
        expect(result.hasCompany).toBe(testCase.hasCompany);
        expect(result.availableRoles).toEqual(testCase.expectedRoles);
      }
    });
  });

  /**
   * Unit tests for error handling
   */
  describe('Error Handling', () => {
    it('should handle Firestore errors gracefully', async () => {
      const userId = 'test-user';
      
      mockFirestore.get.mockRejectedValue(new Error('Firestore connection error'));

      await expect(service.checkUserProfiles(userId)).rejects.toThrow('Error al verificar los perfiles del usuario');
    });

    it('should handle missing documents correctly', async () => {
      const userId = 'test-user';
      
      mockFirestore.get
        .mockResolvedValueOnce({ exists: false })
        .mockResolvedValueOnce({ exists: false });

      const result = await service.checkUserProfiles(userId);

      expect(result.hasCandidate).toBe(false);
      expect(result.hasCompany).toBe(false);
      expect(result.availableRoles).toEqual([]);
    });
  });
});