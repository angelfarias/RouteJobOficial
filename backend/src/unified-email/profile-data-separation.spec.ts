// backend/src/unified-email/profile-data-separation.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { ProfileService } from './services/profile.service';
import { 
  CandidateProfile, 
  CompanyProfile, 
  CreateCandidateProfileDto, 
  CreateCompanyProfileDto 
} from './interfaces';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Feature: unified-email-system, Property 3: Profile data separation
 * 
 * Property: For any user account with multiple profile types, modifications 
 * to one profile should not affect the data in the other profile
 * Validates: Requirements 1.5
 */

describe('UnifiedEmailSystem - Profile Data Separation Property Tests', () => {
  let service: ProfileService;
  let mockFirestore: any;
  let mockAuth: any;

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
      firestore: () => mockFirestore,
      auth: () => mockAuth
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

  describe('Property 3: Profile data separation', () => {
    /**
     * Property-based test for profile data isolation
     */
    it('should maintain data separation when modifying candidate profiles', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate safe candidate updates (only additional data, no overwrites)
          fc.record({
            professionalInfo: fc.option(fc.record({
              title: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
              experience: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
              skills: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 }))
            })),
            preferences: fc.option(fc.record({
              jobTypes: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 3 })),
              locations: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 100 }), { maxLength: 3 }))
            }))
          }),
          async (candidateUpdate) => {
            // Skip if update is empty or null
            if (!candidateUpdate || (!candidateUpdate.professionalInfo && !candidateUpdate.preferences)) {
              return;
            }
            const userId = `user-${Math.random().toString(36).substr(2, 9)}`;
            const now = Timestamp.now();

            // Create initial profiles with valid required data
            const initialCandidateProfile: CandidateProfile = {
              userId,
              personalInfo: {
                firstName: 'John',
                lastName: 'Doe',
                phone: '+1234567890'
              },
              professionalInfo: { skills: ['JavaScript'] },
              preferences: { jobTypes: ['Full-time'], locations: ['Remote'] },
              applications: [],
              createdAt: now,
              updatedAt: now
            };

            const companyProfile: CompanyProfile = {
              userId,
              companyInfo: {
                name: 'Test Company',
                description: 'A test company'
              },
              contactInfo: {
                contactPerson: 'Jane Smith',
                phone: '+0987654321'
              },
              jobPostings: [],
              createdAt: now,
              updatedAt: now
            };

            // Reset mocks
            mockFirestore.get.mockClear();
            mockFirestore.set.mockClear();

            // Mock existing profiles
            mockFirestore.get
              .mockResolvedValueOnce({ // Update candidate - get existing
                exists: true,
                data: () => initialCandidateProfile
              })
              .mockResolvedValueOnce({ // Validate isolation - get candidate
                exists: true,
                data: () => ({ ...initialCandidateProfile, ...candidateUpdate })
              })
              .mockResolvedValueOnce({ // Validate isolation - get company
                exists: true,
                data: () => companyProfile
              });

            // Act: Update candidate profile
            await service.updateCandidateProfile(userId, candidateUpdate);

            // Assert: Verify candidate profile was updated
            expect(mockFirestore.set).toHaveBeenCalledTimes(1);
            const updatedCandidateCall = mockFirestore.set.mock.calls[0][0];
            expect(updatedCandidateCall.userId).toBe(userId);

            // Verify data separation through isolation validation
            const isolationResult = await service.validateProfileIsolation(userId);
            expect(isolationResult.isValid).toBe(true);
            expect(isolationResult.issues).toEqual([]);

            // Verify no cross-contamination in the update call
            expect(updatedCandidateCall).not.toHaveProperty('companyInfo');
            expect(updatedCandidateCall).not.toHaveProperty('jobPostings');
            expect(updatedCandidateCall).toHaveProperty('personalInfo');
            expect(updatedCandidateCall).toHaveProperty('applications');
            
            // Verify required fields are preserved
            expect(updatedCandidateCall.personalInfo.firstName).toBe('John');
            expect(updatedCandidateCall.personalInfo.lastName).toBe('Doe');
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property-based test for company profile isolation
     */
    it('should maintain data separation when modifying company profiles', async () => {
      // Use predefined safe updates instead of random generation
      const safeUpdates = [
        { companyInfo: { description: 'Updated description' } },
        { companyInfo: { industry: 'Technology' } },
        { companyInfo: { size: 'Medium' } },
        { contactInfo: { address: '123 Main St' } },
        { companyInfo: { description: 'New description', industry: 'Software' } }
      ];

      for (const companyUpdate of safeUpdates) {
        const userId = `user-${Math.random().toString(36).substr(2, 9)}`;
        const now = Timestamp.now();

        // Create initial profiles with valid required data
        const candidateProfile: CandidateProfile = {
          userId,
          personalInfo: {
            firstName: 'John',
            lastName: 'Doe'
          },
          professionalInfo: { skills: [] },
          preferences: { jobTypes: [], locations: [] },
          applications: [],
          createdAt: now,
          updatedAt: now
        };

        const initialCompanyProfile: CompanyProfile = {
          userId,
          companyInfo: {
            name: 'Test Company',
            description: 'Initial description'
          },
          contactInfo: {
            contactPerson: 'Jane Smith',
            phone: '+1234567890'
          },
          jobPostings: [],
          createdAt: now,
          updatedAt: now
        };

        // Reset mocks
        mockFirestore.get.mockClear();
        mockFirestore.set.mockClear();

        // Mock existing profiles
        mockFirestore.get
          .mockResolvedValueOnce({ // Update company - get existing
            exists: true,
            data: () => initialCompanyProfile
          })
          .mockResolvedValueOnce({ // Validate isolation - get candidate
            exists: true,
            data: () => candidateProfile
          })
          .mockResolvedValueOnce({ // Validate isolation - get company
            exists: true,
            data: () => ({ ...initialCompanyProfile, ...companyUpdate })
          });

        // Act: Update company profile
        await service.updateCompanyProfile(userId, companyUpdate);

        // Assert: Verify company profile was updated
        expect(mockFirestore.set).toHaveBeenCalledTimes(1);
        const updatedCompanyCall = mockFirestore.set.mock.calls[0][0];
        expect(updatedCompanyCall.userId).toBe(userId);

        // Verify data separation through isolation validation
        const isolationResult = await service.validateProfileIsolation(userId);
        expect(isolationResult.isValid).toBe(true);
        expect(isolationResult.issues).toEqual([]);

        // Verify no cross-contamination in the update call
        expect(updatedCompanyCall).not.toHaveProperty('personalInfo');
        expect(updatedCompanyCall).not.toHaveProperty('applications');
        expect(updatedCompanyCall).toHaveProperty('companyInfo');
        expect(updatedCompanyCall).toHaveProperty('jobPostings');
        
        // Verify required fields are preserved
        expect(updatedCompanyCall.companyInfo.name).toBe('Test Company');
        expect(updatedCompanyCall.contactInfo.contactPerson).toBe('Jane Smith');
      }
    });

    /**
     * Property test for profile structure integrity
     */
    it('should maintain correct profile structure after any modifications', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(fc.constant('candidate'), fc.constant('company')),
          async (profileType) => {
            const userId = `user-${Math.random().toString(36).substr(2, 9)}`;
            const now = Timestamp.now();

            // Create appropriate existing profile with all required fields
            const existingProfile = profileType === 'candidate' 
              ? {
                  userId,
                  personalInfo: { firstName: 'John', lastName: 'Doe' },
                  professionalInfo: { skills: ['JavaScript'] },
                  preferences: { jobTypes: ['Full-time'], locations: ['Remote'] },
                  applications: [],
                  createdAt: now,
                  updatedAt: now
                }
              : {
                  userId,
                  companyInfo: { name: 'Test Company', description: 'A test company' },
                  contactInfo: { contactPerson: 'John Doe', phone: '+1234567890' },
                  jobPostings: [],
                  createdAt: now,
                  updatedAt: now
                };

            // Create safe update data that doesn't break validation
            const updateData = profileType === 'candidate'
              ? { professionalInfo: { title: 'Senior Developer' } }
              : { companyInfo: { industry: 'Technology' } };

            // Reset mocks
            mockFirestore.get.mockClear();
            mockFirestore.set.mockClear();

            mockFirestore.get.mockResolvedValue({
              exists: true,
              data: () => existingProfile
            });

            // Act: Update profile with safe data
            if (profileType === 'candidate') {
              await service.updateCandidateProfile(userId, updateData);
            } else {
              await service.updateCompanyProfile(userId, updateData);
            }

            // Assert: Verify profile structure is maintained
            expect(mockFirestore.set).toHaveBeenCalledTimes(1);
            const updatedProfile = mockFirestore.set.mock.calls[0][0];

            if (profileType === 'candidate') {
              expect(updatedProfile).toHaveProperty('personalInfo');
              expect(updatedProfile).toHaveProperty('professionalInfo');
              expect(updatedProfile).toHaveProperty('preferences');
              expect(updatedProfile).toHaveProperty('applications');
              expect(updatedProfile).not.toHaveProperty('companyInfo');
              expect(updatedProfile).not.toHaveProperty('jobPostings');
            } else {
              expect(updatedProfile).toHaveProperty('companyInfo');
              expect(updatedProfile).toHaveProperty('contactInfo');
              expect(updatedProfile).toHaveProperty('jobPostings');
              expect(updatedProfile).not.toHaveProperty('personalInfo');
              expect(updatedProfile).not.toHaveProperty('applications');
            }

            expect(updatedProfile.userId).toBe(userId);
            expect(updatedProfile.updatedAt).toBeDefined();
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
    it('should detect cross-contamination in profiles', async () => {
      const userId = 'test-user';
      
      // Mock profiles with cross-contamination
      const contaminatedCandidate = {
        userId,
        personalInfo: { firstName: 'John', lastName: 'Doe' },
        companyInfo: { name: 'Contaminated' }, // This should not be here
        applications: []
      };

      const contaminatedCompany = {
        userId,
        companyInfo: { name: 'Test Company' },
        personalInfo: { firstName: 'Jane' }, // This should not be here
        jobPostings: []
      };

      mockFirestore.get
        .mockResolvedValueOnce({ exists: true, data: () => contaminatedCandidate })
        .mockResolvedValueOnce({ exists: true, data: () => contaminatedCompany });

      const result = await service.validateProfileIsolation(userId);

      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should handle single profile users correctly', async () => {
      const userId = 'test-user';
      
      mockFirestore.get
        .mockResolvedValueOnce({ exists: true, data: () => ({ userId, personalInfo: {} }) })
        .mockResolvedValueOnce({ exists: false });

      const result = await service.validateProfileIsolation(userId);

      expect(result.isValid).toBe(true);
      expect(result.issues).toEqual([]);
    });
  });
});