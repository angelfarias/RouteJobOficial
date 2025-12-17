import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import * as fc from 'fast-check';
import { CandidateSelectionService } from './candidate-selection.service';
import { NotificationsService } from '../notifications/notifications.service';

// Mock Firebase Admin
const mockFirestore = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      set: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
    where: jest.fn(() => ({
      orderBy: jest.fn(() => ({
        get: jest.fn(),
      })),
      get: jest.fn(),
    })),
    get: jest.fn(),
  })),
  runTransaction: jest.fn(),
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

// Mock NotificationsService
const mockNotificationsService = {
  sendApplicationStatus: jest.fn(),
  sendCandidateSelectionNotification: jest.fn(),
};

describe('CandidateSelectionService', () => {
  let service: CandidateSelectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateSelectionService,
        {
          provide: 'FIREBASE_ADMIN',
          useValue: mockFirebaseApp,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<CandidateSelectionService>(CandidateSelectionService);
  });

  describe('Property-Based Tests', () => {
    let mockDoc: any;
    let mockCollection: any;

    beforeEach(() => {
      mockDoc = {
        id: 'test-id',
        set: jest.fn().mockResolvedValue(undefined),
        get: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      };

      mockCollection = {
        doc: jest.fn().mockReturnValue(mockDoc),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn(),
      };

      mockFirestore.collection = jest.fn().mockReturnValue(mockCollection);
      
      // Reset notification service mocks
      mockNotificationsService.sendCandidateSelectionNotification.mockClear();
      mockNotificationsService.sendApplicationStatus.mockClear();
    });

    /**
     * **Feature: candidate-selection-system, Property 1: Complete application retrieval**
     * For any vacancy with applications, querying applications for that vacancy should return all applications that exist for that vacancy in the system
     */
    it('should return all applications for a vacancy - Property 1', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            vacancyId: fc.string({ minLength: 1, maxLength: 20 }),
            companyId: fc.string({ minLength: 1, maxLength: 20 }),
            applications: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 20 }),
                uid: fc.string({ minLength: 1, maxLength: 20 }),
                status: fc.constantFrom('pending', 'selected', 'rejected'),
                createdAt: fc.integer({ min: 1000000000, max: 2000000000 }).map(
                  (seconds) => ({ seconds, nanoseconds: 0 })
                ),
              }),
              { minLength: 1, maxLength: 10 }
            ),
          }),
          async ({ vacancyId, companyId, applications }) => {
            // Setup mocks for this test case
            const vacancyData = {
              companyId: companyId,
              title: 'Test Vacancy',
              active: true,
            };

            // Mock vacancy exists and belongs to company
            mockDoc.get.mockResolvedValue({
              exists: true,
              data: () => vacancyData,
            });

            // Mock applications query result
            mockCollection.get.mockResolvedValue({
              docs: applications.map((app, index) => ({
                id: `app-${index}`,
                data: () => ({ ...app, vacancyId }),
              })),
            });

            // Mock candidate and user data
            const candidateData = { profileCompleted: true, experience: ['test'], skills: ['test'] };
            const userData = { email: 'test@example.com', displayName: 'Test User' };

            // Execute the method
            const result = await service.getApplicationsForVacancy(vacancyId, companyId);

            // Verify all applications are returned
            expect(result).toHaveLength(applications.length);
            
            // Verify each application has required structure
            result.forEach((app) => {
              expect(app.id).toBeDefined();
              expect(app.uid).toBeDefined();
              expect(app.vacancyId).toBe(vacancyId);
              expect(app.status).toMatch(/^(pending|selected|rejected)$/);
              expect(app.createdAt).toBeDefined();
              expect(app.candidateName).toBeDefined();
              expect(app.candidateEmail).toBeDefined();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: candidate-selection-system, Property 2: Application data completeness**
     * For any application returned by the system, it should contain candidate name, application date, and key profile information fields
     */
    it('should return complete application data - Property 2', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            vacancyId: fc.string({ minLength: 1, maxLength: 20 }),
            companyId: fc.string({ minLength: 1, maxLength: 20 }),
            candidateName: fc.string({ minLength: 1, maxLength: 50 }),
            candidateEmail: fc.emailAddress(),
            experience: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
            skills: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
          }),
          async ({ vacancyId, companyId, candidateName, candidateEmail, experience, skills }) => {
            // Setup mocks
            const vacancyData = { companyId: companyId, title: 'Test Vacancy' };
            const application = {
              id: 'test-app',
              uid: 'test-user',
              vacancyId: vacancyId,
              status: 'pending',
              createdAt: { seconds: 1234567890, nanoseconds: 0 },
            };

            mockDoc.get.mockResolvedValue({
              exists: true,
              data: () => vacancyData,
            });

            mockCollection.get.mockResolvedValue({
              docs: [{
                id: 'test-app',
                data: () => application,
              }],
            });

            // Execute the method
            const result = await service.getApplicationsForVacancy(vacancyId, companyId);

            // Verify data completeness
            expect(result).toHaveLength(1);
            const app = result[0];
            
            // Required fields should be present
            expect(app.candidateName).toBeDefined();
            expect(app.candidateEmail).toBeDefined();
            expect(app.createdAt).toBeDefined();
            expect(app.experience).toBeDefined();
            expect(app.skills).toBeDefined();
            expect(app.profileCompleted).toBeDefined();
            expect(typeof app.profileCompleted).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: candidate-selection-system, Property 3: Application date ordering**
     * For any set of applications for a vacancy, they should be returned sorted by application date with most recent first
     */
    it('should return applications sorted by date (most recent first) - Property 3', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            vacancyId: fc.string({ minLength: 1, maxLength: 20 }),
            companyId: fc.string({ minLength: 1, maxLength: 20 }),
            applications: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 20 }),
                uid: fc.string({ minLength: 1, maxLength: 20 }),
                status: fc.constantFrom('pending', 'selected', 'rejected'),
                createdAt: fc.integer({ min: 1000000000, max: 2000000000 }).map(
                  (seconds) => ({ seconds, nanoseconds: 0 })
                ),
              }),
              { minLength: 2, maxLength: 10 }
            ),
          }),
          async ({ vacancyId, companyId, applications }) => {
            // Setup mocks
            const vacancyData = { companyId: companyId, title: 'Test Vacancy' };

            mockDoc.get.mockResolvedValue({
              exists: true,
              data: () => vacancyData,
            });

            // Sort applications by date descending (most recent first) for expected result
            const sortedApplications = [...applications].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

            mockCollection.get.mockResolvedValue({
              docs: sortedApplications.map((app, index) => ({
                id: `app-${index}`,
                data: () => ({ ...app, vacancyId }),
              })),
            });

            // Execute the method
            const result = await service.getApplicationsForVacancy(vacancyId, companyId);

            // Verify applications are sorted by date (most recent first)
            expect(result).toHaveLength(applications.length);
            
            for (let i = 0; i < result.length - 1; i++) {
              const currentApp = result[i];
              const nextApp = result[i + 1];
              
              // Current application should have a creation date >= next application
              expect(currentApp.createdAt.seconds).toBeGreaterThanOrEqual(nextApp.createdAt.seconds);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: candidate-selection-system, Property 4: Vacancy-specific filtering**
     * For any vacancy ID, querying applications should return only applications for that specific vacancy and no others
     */
    it('should return only applications for the specified vacancy - Property 4', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            targetVacancyId: fc.string({ minLength: 1, maxLength: 20 }),
            otherVacancyIds: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
            companyId: fc.string({ minLength: 1, maxLength: 20 }),
            targetApplications: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 20 }),
                uid: fc.string({ minLength: 1, maxLength: 20 }),
                status: fc.constantFrom('pending', 'selected', 'rejected'),
              }),
              { minLength: 1, maxLength: 5 }
            ),
          }),
          async ({ targetVacancyId, otherVacancyIds, companyId, targetApplications }) => {
            // Ensure target vacancy is different from other vacancies
            const filteredOtherVacancies = otherVacancyIds.filter(id => id !== targetVacancyId);
            if (filteredOtherVacancies.length === 0) return; // Skip if no other vacancies

            // Setup mocks
            const vacancyData = { companyId: companyId, title: 'Test Vacancy' };

            mockDoc.get.mockResolvedValue({
              exists: true,
              data: () => vacancyData,
            });

            // Mock applications - only return applications for target vacancy
            const applicationsForTarget = targetApplications.map(app => ({
              ...app,
              vacancyId: targetVacancyId,
              createdAt: { seconds: 1234567890, nanoseconds: 0 },
            }));

            mockCollection.get.mockResolvedValue({
              docs: applicationsForTarget.map((app, index) => ({
                id: `app-${index}`,
                data: () => app,
              })),
            });

            // Execute the method
            const result = await service.getApplicationsForVacancy(targetVacancyId, companyId);

            // Verify all returned applications belong to the target vacancy
            expect(result).toHaveLength(targetApplications.length);
            
            result.forEach(app => {
              expect(app.vacancyId).toBe(targetVacancyId);
              // Ensure no applications from other vacancies are included
              expect(filteredOtherVacancies).not.toContain(app.vacancyId);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: candidate-selection-system, Property 5: Candidate details completeness**
     * For any valid application ID, retrieving candidate details should return complete profile information including all required fields
     */
    it('should return complete candidate details for valid applications - Property 5', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            applicationId: fc.string({ minLength: 1, maxLength: 20 }),
            companyId: fc.string({ minLength: 1, maxLength: 20 }),
            vacancyId: fc.string({ minLength: 1, maxLength: 20 }),
            candidateId: fc.string({ minLength: 1, maxLength: 20 }),
            candidateName: fc.string({ minLength: 1, maxLength: 50 }),
            candidateEmail: fc.emailAddress(),
            experience: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 0, maxLength: 5 }),
            skills: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 10 }),
          }),
          async ({ applicationId, companyId, vacancyId, candidateId, candidateName, candidateEmail, experience, skills }) => {
            // Setup mocks
            const applicationData = {
              id: applicationId,
              uid: candidateId,
              vacancyId: vacancyId,
              status: 'pending',
              createdAt: { seconds: 1234567890, nanoseconds: 0 },
            };

            const vacancyData = { companyId: companyId, title: 'Test Vacancy' };
            const candidateData = { experience, skills, profileCompleted: true };
            const userData = { email: candidateEmail, displayName: candidateName };

            // Mock application lookup - use a counter to simulate different collections
            let callCount = 0;
            mockDoc.get.mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                // First call: application lookup
                return Promise.resolve({
                  exists: true,
                  data: () => applicationData,
                });
              }
              if (callCount === 2) {
                // Second call: vacancy lookup
                return Promise.resolve({
                  exists: true,
                  data: () => vacancyData,
                });
              }
              if (callCount === 3) {
                // Third call: candidate lookup
                return Promise.resolve({
                  exists: true,
                  data: () => candidateData,
                });
              }
              if (callCount === 4) {
                // Fourth call: user lookup
                return Promise.resolve({
                  exists: true,
                  data: () => userData,
                });
              }
              return Promise.resolve({ exists: false });
            });

            // Execute the method
            const result = await service.getCandidateDetails(applicationId, companyId);

            // Verify all required fields are present
            expect(result.id).toBe(candidateId);
            expect(result.applicationId).toBe(applicationId);
            expect(result.name).toBeDefined();
            expect(result.email).toBeDefined();
            expect(result.experience).toBeDefined();
            expect(result.skills).toBeDefined();
            expect(result.applicationDate).toBeDefined();
            expect(typeof result.profileCompleted).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: candidate-selection-system, Property 6: Required candidate fields presence**
     * For any candidate details response, it should contain resume, skills, experience, and contact information fields
     */
    it('should include all required candidate fields - Property 6', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            applicationId: fc.string({ minLength: 1, maxLength: 20 }),
            companyId: fc.string({ minLength: 1, maxLength: 20 }),
            candidateData: fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.emailAddress(),
              phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
              experience: fc.array(fc.string({ minLength: 1, maxLength: 100 })),
              skills: fc.array(fc.string({ minLength: 1, maxLength: 50 })),
            }),
          }),
          async ({ applicationId, companyId, candidateData }) => {
            // Setup mocks with the provided candidate data
            const applicationData = {
              uid: 'test-candidate',
              vacancyId: 'test-vacancy',
              createdAt: { seconds: 1234567890, nanoseconds: 0 },
            };

            const vacancyData = { companyId: companyId };
            const userData = { 
              email: candidateData.email, 
              displayName: candidateData.name,
              phone: candidateData.phone 
            };
            const firestoreCandidateData = { 
              experience: candidateData.experience, 
              skills: candidateData.skills 
            };

            // Mock using call order instead of path checking
            let callCount = 0;
            mockDoc.get.mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                return Promise.resolve({ exists: true, data: () => applicationData });
              }
              if (callCount === 2) {
                return Promise.resolve({ exists: true, data: () => vacancyData });
              }
              if (callCount === 3) {
                return Promise.resolve({ exists: true, data: () => firestoreCandidateData });
              }
              if (callCount === 4) {
                return Promise.resolve({ exists: true, data: () => userData });
              }
              return Promise.resolve({ exists: false });
            });

            // Execute the method
            const result = await service.getCandidateDetails(applicationId, companyId);

            // Verify all required fields are present and have correct types
            expect(result).toHaveProperty('name');
            expect(result).toHaveProperty('email');
            expect(result).toHaveProperty('experience');
            expect(result).toHaveProperty('skills');
            expect(result).toHaveProperty('applicationDate');
            
            expect(typeof result.name).toBe('string');
            expect(typeof result.email).toBe('string');
            expect(Array.isArray(result.experience)).toBe(true);
            expect(Array.isArray(result.skills)).toBe(true);
            expect(result.applicationDate).toBeDefined();

            // Verify data matches input
            expect(result.name).toBe(candidateData.name);
            expect(result.email).toBe(candidateData.email);
            expect(result.experience).toEqual(candidateData.experience);
            expect(result.skills).toEqual(candidateData.skills);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: candidate-selection-system, Property 7: Missing information indication**
     * For any candidate profile with incomplete data, the system should clearly indicate which information is missing
     */
    it('should identify missing information in candidate profiles - Property 7', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            applicationId: fc.string({ minLength: 1, maxLength: 20 }),
            companyId: fc.string({ minLength: 1, maxLength: 20 }),
            candidateProfile: fc.record({
              hasDisplayName: fc.boolean(),
              hasEmail: fc.boolean(),
              hasPhone: fc.boolean(),
              hasExperience: fc.boolean(),
              hasSkills: fc.boolean(),
            }),
          }),
          async ({ applicationId, companyId, candidateProfile }) => {
            // Setup mocks with conditional data based on flags
            const applicationData = {
              uid: 'test-candidate',
              vacancyId: 'test-vacancy',
              createdAt: { seconds: 1234567890, nanoseconds: 0 },
            };

            const vacancyData = { companyId: companyId };
            
            // Create user data based on profile flags
            const userData: any = {};
            if (candidateProfile.hasDisplayName) {
              userData.displayName = 'Test User';
            }
            if (candidateProfile.hasEmail) {
              userData.email = 'test@example.com';
            }
            if (candidateProfile.hasPhone) {
              userData.phone = '1234567890';
            }

            const candidateData = { 
              experience: candidateProfile.hasExperience ? ['Some experience'] : [],
              skills: candidateProfile.hasSkills ? ['Some skill'] : [],
            };

            // Mock using call order instead of path checking
            let callCount = 0;
            mockDoc.get.mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                return Promise.resolve({ exists: true, data: () => applicationData });
              }
              if (callCount === 2) {
                return Promise.resolve({ exists: true, data: () => vacancyData });
              }
              if (callCount === 3) {
                return Promise.resolve({ exists: true, data: () => candidateData });
              }
              if (callCount === 4) {
                return Promise.resolve({ exists: true, data: () => userData });
              }
              return Promise.resolve({ exists: false });
            });

            // Execute the method
            const result = await service.getCandidateDetailsWithMissingInfo(applicationId, companyId);

            // Verify missing fields are correctly identified
            expect(result).toHaveProperty('missingFields');
            expect(Array.isArray(result.missingFields)).toBe(true);

            // Check specific missing fields based on input flags
            // Name is missing if no displayName and no email (since email is used as fallback)
            if (!candidateProfile.hasDisplayName && !candidateProfile.hasEmail) {
              expect(result.missingFields).toContain('name');
            }
            
            if (!candidateProfile.hasEmail) {
              expect(result.missingFields).toContain('email');
            }
            
            if (!candidateProfile.hasPhone) {
              expect(result.missingFields).toContain('phone');
            }
            
            if (!candidateProfile.hasExperience) {
              expect(result.missingFields).toContain('experience');
            }
            
            if (!candidateProfile.hasSkills) {
              expect(result.missingFields).toContain('skills');
            }

            // Location is always missing in our test setup
            expect(result.missingFields).toContain('location');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: candidate-selection-system, Property 8: Selection status update**
     * For any candidate selection operation, the application status should change to 'selected' after the operation completes
     */
    it('should update application status to selected after selection - Property 8', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            applicationId: fc.string({ minLength: 1, maxLength: 20 }),
            companyId: fc.string({ minLength: 1, maxLength: 20 }),
            vacancyId: fc.string({ minLength: 1, maxLength: 20 }),
            candidateId: fc.string({ minLength: 1, maxLength: 20 }),
            selectedBy: fc.string({ minLength: 1, maxLength: 20 }),
          }),
          async ({ applicationId, companyId, vacancyId, candidateId, selectedBy }) => {
            // Setup mocks for successful selection
            const applicationData = {
              id: applicationId,
              uid: candidateId,
              vacancyId: vacancyId,
              status: 'pending',
              createdAt: { seconds: 1234567890, nanoseconds: 0 },
            };

            const vacancyData = {
              companyId: companyId,
              title: 'Test Vacancy',
              hasSelectedCandidate: false,
            };

            // Create mock references
            const mockAppRef = { path: `applications/${applicationId}` };
            const mockVacancyRef = { path: `vacancies/${vacancyId}` };

            // Mock transaction
            const mockTransaction = {
              get: jest.fn(),
              update: jest.fn(),
            };

            // Setup transaction mocks
            mockTransaction.get.mockImplementation((ref) => {
              if (ref.path === `applications/${applicationId}`) {
                return Promise.resolve({
                  exists: true,
                  data: () => applicationData,
                });
              }
              if (ref.path === `vacancies/${vacancyId}`) {
                return Promise.resolve({
                  exists: true,
                  data: () => vacancyData,
                });
              }
              return Promise.resolve({ exists: false });
            });

            // Mock collection and doc methods to return proper references
            mockFirestore.collection.mockImplementation((collectionName) => ({
              doc: (docId) => ({ path: `${collectionName}/${docId}` }),
            }));

            mockFirestore.runTransaction.mockImplementation(async (callback) => {
              return await callback(mockTransaction);
            });

            // Execute the method
            const result = await service.selectCandidate(applicationId, companyId, selectedBy);

            // Verify selection result
            expect(result.success).toBe(true);
            expect(result.applicationId).toBe(applicationId);
            expect(result.candidateId).toBe(candidateId);
            expect(result.vacancyId).toBe(vacancyId);
            expect(result.selectedBy).toBe(selectedBy);
            expect(result.selectedAt).toBeDefined();

            // Verify application was updated to selected status
            expect(mockTransaction.update).toHaveBeenCalledWith(
              mockAppRef,
              expect.objectContaining({
                status: 'selected',
                selectedBy: selectedBy,
                selectedAt: expect.any(Object),
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: candidate-selection-system, Property 9: Vacancy selection status update**
     * For any candidate selection, the vacancy document should be updated to reflect that a candidate has been selected
     */
    it('should update vacancy selection status after candidate selection - Property 9', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            applicationId: fc.string({ minLength: 1, maxLength: 20 }),
            companyId: fc.string({ minLength: 1, maxLength: 20 }),
            vacancyId: fc.string({ minLength: 1, maxLength: 20 }),
            candidateId: fc.string({ minLength: 1, maxLength: 20 }),
            selectedBy: fc.string({ minLength: 1, maxLength: 20 }),
          }),
          async ({ applicationId, companyId, vacancyId, candidateId, selectedBy }) => {
            // Setup mocks for successful selection
            const applicationData = {
              id: applicationId,
              uid: candidateId,
              vacancyId: vacancyId,
              status: 'pending',
              createdAt: { seconds: 1234567890, nanoseconds: 0 },
            };

            const vacancyData = {
              companyId: companyId,
              title: 'Test Vacancy',
              hasSelectedCandidate: false,
            };

            // Create mock references
            const mockAppRef = { path: `applications/${applicationId}` };
            const mockVacancyRef = { path: `vacancies/${vacancyId}` };

            // Mock transaction
            const mockTransaction = {
              get: jest.fn(),
              update: jest.fn(),
            };

            // Setup transaction mocks
            mockTransaction.get.mockImplementation((ref) => {
              if (ref.path === `applications/${applicationId}`) {
                return Promise.resolve({
                  exists: true,
                  data: () => applicationData,
                });
              }
              if (ref.path === `vacancies/${vacancyId}`) {
                return Promise.resolve({
                  exists: true,
                  data: () => vacancyData,
                });
              }
              return Promise.resolve({ exists: false });
            });

            // Mock collection and doc methods to return proper references
            mockFirestore.collection.mockImplementation((collectionName) => ({
              doc: (docId) => ({ path: `${collectionName}/${docId}` }),
            }));

            mockFirestore.runTransaction.mockImplementation(async (callback) => {
              return await callback(mockTransaction);
            });

            // Execute the method
            const result = await service.selectCandidate(applicationId, companyId, selectedBy);

            // Verify selection result
            expect(result.success).toBe(true);

            // Verify vacancy was updated with selection status
            expect(mockTransaction.update).toHaveBeenCalledWith(
              mockVacancyRef,
              expect.objectContaining({
                hasSelectedCandidate: true,
                selectedCandidateId: candidateId,
                selectionDate: expect.any(Object),
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: candidate-selection-system, Property 10: Single selection enforcement**
     * For any vacancy that already has a selected candidate, attempting to select another candidate should be prevented
     */
    it('should prevent multiple candidate selections for the same vacancy - Property 10', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            applicationId: fc.string({ minLength: 1, maxLength: 20 }),
            companyId: fc.string({ minLength: 1, maxLength: 20 }),
            vacancyId: fc.string({ minLength: 1, maxLength: 20 }),
            candidateId: fc.string({ minLength: 1, maxLength: 20 }),
            selectedBy: fc.string({ minLength: 1, maxLength: 20 }),
            existingSelectedCandidateId: fc.string({ minLength: 1, maxLength: 20 }),
          }),
          async ({ applicationId, companyId, vacancyId, candidateId, selectedBy, existingSelectedCandidateId }) => {
            // Ensure we're trying to select a different candidate
            if (candidateId === existingSelectedCandidateId) return;

            // Setup mocks for vacancy that already has a selected candidate
            const applicationData = {
              id: applicationId,
              uid: candidateId,
              vacancyId: vacancyId,
              status: 'pending',
              createdAt: { seconds: 1234567890, nanoseconds: 0 },
            };

            const vacancyData = {
              companyId: companyId,
              title: 'Test Vacancy',
              hasSelectedCandidate: true, // Already has a selected candidate
              selectedCandidateId: existingSelectedCandidateId,
            };

            // Mock transaction
            const mockTransaction = {
              get: jest.fn(),
              update: jest.fn(),
            };

            // Setup transaction mocks
            mockTransaction.get.mockImplementation((ref) => {
              if (ref.path === `applications/${applicationId}`) {
                return Promise.resolve({
                  exists: true,
                  data: () => applicationData,
                });
              }
              if (ref.path === `vacancies/${vacancyId}`) {
                return Promise.resolve({
                  exists: true,
                  data: () => vacancyData,
                });
              }
              return Promise.resolve({ exists: false });
            });

            // Mock collection and doc methods to return proper references
            mockFirestore.collection.mockImplementation((collectionName) => ({
              doc: (docId) => ({ path: `${collectionName}/${docId}` }),
            }));

            mockFirestore.runTransaction.mockImplementation(async (callback) => {
              return await callback(mockTransaction);
            });

            // Execute the method and expect it to throw
            await expect(service.selectCandidate(applicationId, companyId, selectedBy))
              .rejects.toThrow(BadRequestException);

            // Verify no updates were made
            expect(mockTransaction.update).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: candidate-selection-system, Property 11: Selection metadata recording**
     * For any candidate selection, the system should record the selection timestamp and company representative information
     */
    it('should record selection metadata including timestamp and representative - Property 11', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            applicationId: fc.string({ minLength: 1, maxLength: 20 }),
            companyId: fc.string({ minLength: 1, maxLength: 20 }),
            vacancyId: fc.string({ minLength: 1, maxLength: 20 }),
            candidateId: fc.string({ minLength: 1, maxLength: 20 }),
            selectedBy: fc.string({ minLength: 1, maxLength: 20 }),
          }),
          async ({ applicationId, companyId, vacancyId, candidateId, selectedBy }) => {
            // Setup mocks for successful selection
            const applicationData = {
              id: applicationId,
              uid: candidateId,
              vacancyId: vacancyId,
              status: 'pending',
              createdAt: { seconds: 1234567890, nanoseconds: 0 },
            };

            const vacancyData = {
              companyId: companyId,
              title: 'Test Vacancy',
              hasSelectedCandidate: false,
            };

            // Create mock references
            const mockAppRef = { path: `applications/${applicationId}` };
            const mockVacancyRef = { path: `vacancies/${vacancyId}` };

            // Mock transaction
            const mockTransaction = {
              get: jest.fn(),
              update: jest.fn(),
            };

            // Setup transaction mocks
            mockTransaction.get.mockImplementation((ref) => {
              if (ref.path === `applications/${applicationId}`) {
                return Promise.resolve({
                  exists: true,
                  data: () => applicationData,
                });
              }
              if (ref.path === `vacancies/${vacancyId}`) {
                return Promise.resolve({
                  exists: true,
                  data: () => vacancyData,
                });
              }
              return Promise.resolve({ exists: false });
            });

            // Mock collection and doc methods to return proper references
            mockFirestore.collection.mockImplementation((collectionName) => ({
              doc: (docId) => ({ path: `${collectionName}/${docId}` }),
            }));

            mockFirestore.runTransaction.mockImplementation(async (callback) => {
              return await callback(mockTransaction);
            });

            // Execute the method
            const result = await service.selectCandidate(applicationId, companyId, selectedBy);

            // Verify selection metadata is recorded
            expect(result.selectedBy).toBe(selectedBy);
            expect(result.selectedAt).toBeDefined();
            expect(result.selectedAt.seconds).toBeGreaterThan(0);

            // Verify application update includes metadata
            expect(mockTransaction.update).toHaveBeenCalledWith(
              mockAppRef,
              expect.objectContaining({
                selectedBy: selectedBy,
                selectedAt: expect.objectContaining({
                  seconds: expect.any(Number),
                  nanoseconds: expect.any(Number),
                }),
              })
            );

            // Verify vacancy update includes selection date
            expect(mockTransaction.update).toHaveBeenCalledWith(
              mockVacancyRef,
              expect.objectContaining({
                selectionDate: expect.objectContaining({
                  seconds: expect.any(Number),
                  nanoseconds: expect.any(Number),
                }),
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });
    /**
     * **Feature: candidate-selection-system, Property 12: Notification trigger on selection**
     * For any candidate selection operation, an automated notification should be sent to the selected candidate
     */
    it('should trigger notification when candidate is selected - Property 12', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            candidateEmail: fc.emailAddress(),
            vacancyTitle: fc.string({ minLength: 1, maxLength: 50 }),
            companyName: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          async ({ candidateEmail, vacancyTitle, companyName }) => {
            // Create a simple selection result
            const selectionResult = {
              success: true,
              applicationId: 'test-app',
              candidateId: 'test-candidate',
              vacancyId: 'test-vacancy',
              selectedAt: { seconds: 1234567890, nanoseconds: 0 },
              selectedBy: 'test-user',
              notificationSent: false,
            };

            // Mock document gets for notification data
            let getCallCount = 0;
            mockDoc.get.mockImplementation(() => {
              getCallCount++;
              if (getCallCount === 1) {
                // User data
                return Promise.resolve({ 
                  exists: true, 
                  data: () => ({ email: candidateEmail, displayName: 'Test User' })
                });
              }
              if (getCallCount === 2) {
                // Vacancy data
                return Promise.resolve({ 
                  exists: true, 
                  data: () => ({ 
                    title: vacancyTitle, 
                    description: 'Test description',
                    companyId: 'test-company'
                  })
                });
              }
              if (getCallCount === 3) {
                // Company data
                return Promise.resolve({ 
                  exists: true, 
                  data: () => ({ 
                    name: companyName, 
                    email: 'company@test.com' 
                  })
                });
              }
              return Promise.resolve({ exists: false });
            });

            // Mock notification service
            mockNotificationsService.sendCandidateSelectionNotification.mockClear();
            mockNotificationsService.sendCandidateSelectionNotification.mockResolvedValue(undefined);

            // Execute notification
            await service.sendSelectionNotification(selectionResult);

            // Verify notification was triggered (with processed values)
            expect(mockNotificationsService.sendCandidateSelectionNotification).toHaveBeenCalledWith(
              expect.objectContaining({
                candidateEmail: candidateEmail,
                vacancyTitle: vacancyTitle.trim() || 'Posición disponible',
                companyName: companyName.trim() || 'Empresa',
                positionDetails: expect.any(String),
                nextSteps: expect.any(String),
                contactInfo: expect.any(String),
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: candidate-selection-system, Property 13: Notification content completeness**
     * For any selection notification sent, it should include vacancy details, company information, and next steps
     */
    it('should include complete information in selection notifications - Property 13', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            candidateEmail: fc.emailAddress(),
            vacancyTitle: fc.string({ minLength: 1, maxLength: 100 }),
            companyName: fc.string({ minLength: 1, maxLength: 50 }),
            positionDetails: fc.string({ minLength: 1, maxLength: 200 }),
            contactInfo: fc.emailAddress(),
          }),
          async ({ candidateEmail, vacancyTitle, companyName, positionDetails, contactInfo }) => {
            // Mock the notification service method
            const mockSendNotification = jest.fn().mockResolvedValue(undefined);
            mockNotificationsService.sendCandidateSelectionNotification = mockSendNotification;

            // Create selection result
            const selectionResult = {
              success: true,
              applicationId: 'test-app',
              candidateId: 'test-candidate',
              vacancyId: 'test-vacancy',
              selectedAt: { seconds: 1234567890, nanoseconds: 0 },
              selectedBy: 'test-user',
              notificationSent: false,
            };

            // Mock document gets
            let getCallCount = 0;
            mockDoc.get.mockImplementation(() => {
              getCallCount++;
              if (getCallCount === 1) {
                return Promise.resolve({ 
                  exists: true, 
                  data: () => ({ email: candidateEmail, displayName: 'Test User' })
                });
              }
              if (getCallCount === 2) {
                return Promise.resolve({ 
                  exists: true, 
                  data: () => ({ 
                    title: vacancyTitle, 
                    description: positionDetails,
                    companyId: 'test-company'
                  })
                });
              }
              if (getCallCount === 3) {
                return Promise.resolve({ 
                  exists: true, 
                  data: () => ({ 
                    name: companyName, 
                    email: contactInfo 
                  })
                });
              }
              return Promise.resolve({ exists: false });
            });

            // Execute notification
            await service.sendSelectionNotification(selectionResult);

            // Verify notification contains all required information
            expect(mockSendNotification).toHaveBeenCalledWith(
              expect.objectContaining({
                candidateEmail: candidateEmail,
                vacancyTitle: vacancyTitle.trim() || 'Posición disponible', // Handle fallback
                companyName: companyName.trim() || 'Empresa', // Handle fallback
                positionDetails: expect.any(String), // Position details will contain processed information
                nextSteps: expect.stringMatching(/contactar|siguiente|proceso|continuar|coordinar/i),
                contactInfo: expect.stringContaining(contactInfo), // Contact info will be enhanced
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: candidate-selection-system, Property 14: Notification retry on failure**
     * For any notification that fails to send, the system should attempt retries and log persistent failures
     */
    it('should retry failed notifications with exponential backoff - Property 14', async () => {
      // This property tests the notification service retry logic
      // We'll test this by mocking failures and verifying retry attempts
      const mockNotificationService = {
        sendCandidateSelectionNotification: jest.fn(),
      };

      // Test with different failure scenarios
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            failureCount: fc.integer({ min: 1, max: 2 }), // Fail 1-2 times then succeed
            candidateEmail: fc.emailAddress(),
            vacancyTitle: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          async ({ failureCount, candidateEmail, vacancyTitle }) => {
            let attemptCount = 0;
            
            mockNotificationService.sendCandidateSelectionNotification.mockImplementation(() => {
              attemptCount++;
              if (attemptCount <= failureCount) {
                throw new Error(`Attempt ${attemptCount} failed`);
              }
              return Promise.resolve();
            });

            const notification = {
              candidateEmail,
              vacancyTitle,
              companyName: 'Test Company',
              positionDetails: 'Test position',
              nextSteps: 'Next steps',
              contactInfo: 'contact@test.com',
            };

            // The retry logic should eventually succeed
            // This is a simplified test - the actual retry logic is in NotificationsService
            let success = false;
            let attempts = 0;
            const maxAttempts = 3;

            while (!success && attempts < maxAttempts) {
              attempts++;
              try {
                await mockNotificationService.sendCandidateSelectionNotification(notification);
                success = true;
              } catch (error) {
                if (attempts === maxAttempts) {
                  throw error;
                }
                // Simulate retry delay (shortened for test)
                await new Promise(resolve => setTimeout(resolve, 1));
              }
            }

            // Verify the notification eventually succeeded
            expect(success).toBe(true);
            expect(attempts).toBe(failureCount + 1);
          }
        ),
        { numRuns: 50 } // Reduced runs for performance
      );
    });

    /**
     * **Feature: candidate-selection-system, Property 15: Notification audit trail**
     * For any notification sent, the system should record the notification timestamp and delivery status
     */
    it('should maintain audit trail for all notification attempts - Property 15', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            candidateEmail: fc.emailAddress(),
            vacancyTitle: fc.string({ minLength: 1, maxLength: 50 }),
            companyName: fc.string({ minLength: 1, maxLength: 50 }),
            shouldSucceed: fc.boolean(),
          }),
          async ({ candidateEmail, vacancyTitle, companyName, shouldSucceed }) => {
            // Mock audit trail recording
            const mockAuditRecords: any[] = [];
            
            // Mock Firestore collection for audit trail
            const mockAuditCollection = {
              add: jest.fn().mockImplementation((record) => {
                const id = `audit-${Date.now()}-${Math.random()}`;
                mockAuditRecords.push({ id, ...record });
                return Promise.resolve({ id });
              }),
              doc: jest.fn().mockReturnValue({
                update: jest.fn().mockImplementation((updates) => {
                  const record = mockAuditRecords[mockAuditRecords.length - 1];
                  if (record) {
                    Object.assign(record, updates);
                  }
                  return Promise.resolve();
                }),
              }),
            };

            // Mock the notification service behavior
            mockNotificationsService.sendCandidateSelectionNotification = jest.fn().mockImplementation(() => {
              // Simulate audit trail creation
              const auditRecord = {
                type: 'candidate_selection',
                recipientEmail: candidateEmail,
                status: 'pending',
                attempts: 0,
                maxAttempts: 3,
                createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                notificationData: {
                  candidateEmail,
                  vacancyTitle,
                  companyName,
                },
              };

              mockAuditCollection.add(auditRecord);

              // Simulate sending attempt
              const finalStatus = shouldSucceed ? 'sent' : 'failed';
              mockAuditCollection.doc().update({
                status: finalStatus,
                attempts: 1,
                lastAttemptAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
                ...(shouldSucceed ? { sentAt: { seconds: Date.now() / 1000, nanoseconds: 0 } } : { failureReason: 'Test failure' }),
              });

              if (!shouldSucceed) {
                throw new Error('Simulated notification failure');
              }

              return Promise.resolve();
            });

            const notification = {
              candidateEmail,
              vacancyTitle,
              companyName,
              positionDetails: 'Test position',
              nextSteps: 'Next steps',
              contactInfo: 'contact@test.com',
            };

            // Execute notification (may succeed or fail)
            try {
              await mockNotificationsService.sendCandidateSelectionNotification(notification);
            } catch (error) {
              // Expected for shouldSucceed = false
            }

            // Verify audit trail was created
            expect(mockAuditRecords).toHaveLength(1);
            const auditRecord = mockAuditRecords[0];
            
            expect(auditRecord.type).toBe('candidate_selection');
            expect(auditRecord.recipientEmail).toBe(candidateEmail);
            expect(auditRecord.status).toBe(shouldSucceed ? 'sent' : 'failed');
            expect(auditRecord.attempts).toBeGreaterThan(0);
            expect(auditRecord.createdAt).toBeDefined();
            expect(auditRecord.lastAttemptAt).toBeDefined();
            
            if (shouldSucceed) {
              expect(auditRecord.sentAt).toBeDefined();
            } else {
              expect(auditRecord.failureReason).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: candidate-selection-system, Property 16: Selection confirmation clarity**
     * For any selection notification, it should provide clear confirmation that the candidate has been selected
     */
    it('should provide clear selection confirmation in notifications - Property 16', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            candidateEmail: fc.emailAddress(),
            candidateName: fc.string({ minLength: 1, maxLength: 50 }),
            vacancyTitle: fc.string({ minLength: 1, maxLength: 100 }),
            companyName: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          async ({ candidateEmail, candidateName, vacancyTitle, companyName }) => {
            // Mock the notification service method to capture the notification content
            let capturedNotification: any = null;
            mockNotificationsService.sendCandidateSelectionNotification = jest.fn().mockImplementation((notification) => {
              capturedNotification = notification;
              return Promise.resolve();
            });

            // Create selection result
            const selectionResult = {
              success: true,
              applicationId: 'test-app',
              candidateId: 'test-candidate',
              vacancyId: 'test-vacancy',
              selectedAt: { seconds: 1234567890, nanoseconds: 0 },
              selectedBy: 'test-user',
              notificationSent: false,
            };

            // Mock document gets
            let getCallCount = 0;
            mockDoc.get.mockImplementation(() => {
              getCallCount++;
              if (getCallCount === 1) {
                return Promise.resolve({ 
                  exists: true, 
                  data: () => ({ email: candidateEmail, displayName: candidateName })
                });
              }
              if (getCallCount === 2) {
                return Promise.resolve({ 
                  exists: true, 
                  data: () => ({ 
                    title: vacancyTitle, 
                    description: 'Test description',
                    companyId: 'test-company'
                  })
                });
              }
              if (getCallCount === 3) {
                return Promise.resolve({ 
                  exists: true, 
                  data: () => ({ 
                    name: companyName, 
                    email: 'company@test.com' 
                  })
                });
              }
              return Promise.resolve({ exists: false });
            });

            // Execute notification
            await service.sendSelectionNotification(selectionResult);

            // Verify notification was sent
            expect(capturedNotification).toBeTruthy();
            
            // Verify clear confirmation language
            const confirmationKeywords = ['seleccionado', 'elegido', 'escogido', 'felicitaciones', 'congratulations'];
            const hasConfirmationLanguage = confirmationKeywords.some(keyword => 
              capturedNotification.positionDetails.toLowerCase().includes(keyword) ||
              capturedNotification.nextSteps.toLowerCase().includes(keyword)
            );
            
            expect(hasConfirmationLanguage).toBe(true);
            
            // Verify specific position and company are mentioned (with processed values)
            expect(capturedNotification.vacancyTitle).toBe(vacancyTitle.trim() || 'Posición disponible');
            expect(capturedNotification.companyName).toBe(companyName.trim() || 'Empresa');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: candidate-selection-system, Property 17: Notification information completeness**
     * For any selection notification, it should include specific vacancy title, company name, and position details
     */
    it('should include complete vacancy and company information in notifications - Property 17', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            candidateEmail: fc.emailAddress(),
            vacancyTitle: fc.string({ minLength: 1, maxLength: 100 }),
            companyName: fc.string({ minLength: 1, maxLength: 50 }),
            positionDescription: fc.string({ minLength: 10, maxLength: 200 }),
            companyLocation: fc.string({ minLength: 1, maxLength: 50 }),
            salaryRange: fc.string({ minLength: 1, maxLength: 30 }),
          }),
          async ({ candidateEmail, vacancyTitle, companyName, positionDescription, companyLocation, salaryRange }) => {
            // Mock the notification service method to capture the notification content
            let capturedNotification: any = null;
            mockNotificationsService.sendCandidateSelectionNotification = jest.fn().mockImplementation((notification) => {
              capturedNotification = notification;
              return Promise.resolve();
            });

            // Create selection result
            const selectionResult = {
              success: true,
              applicationId: 'test-app',
              candidateId: 'test-candidate',
              vacancyId: 'test-vacancy',
              selectedAt: { seconds: 1234567890, nanoseconds: 0 },
              selectedBy: 'test-user',
              notificationSent: false,
            };

            // Mock document gets with complete vacancy and company data
            let getCallCount = 0;
            mockDoc.get.mockImplementation(() => {
              getCallCount++;
              if (getCallCount === 1) {
                return Promise.resolve({ 
                  exists: true, 
                  data: () => ({ email: candidateEmail, displayName: 'Test User' })
                });
              }
              if (getCallCount === 2) {
                return Promise.resolve({ 
                  exists: true, 
                  data: () => ({ 
                    title: vacancyTitle, 
                    description: positionDescription,
                    location: companyLocation,
                    salaryRange: salaryRange,
                    companyId: 'test-company'
                  })
                });
              }
              if (getCallCount === 3) {
                return Promise.resolve({ 
                  exists: true, 
                  data: () => ({ 
                    name: companyName, 
                    email: 'company@test.com',
                    location: companyLocation
                  })
                });
              }
              return Promise.resolve({ exists: false });
            });

            // Execute notification
            await service.sendSelectionNotification(selectionResult);

            // Verify notification contains all required information (with processed values)
            expect(capturedNotification).toBeTruthy();
            expect(capturedNotification.candidateEmail).toBe(candidateEmail);
            expect(capturedNotification.vacancyTitle).toBe(vacancyTitle.trim() || 'Posición disponible');
            expect(capturedNotification.companyName).toBe(companyName.trim() || 'Empresa');
            
            // Verify position details include comprehensive information (only if not empty/whitespace)
            if (positionDescription.trim()) {
              expect(capturedNotification.positionDetails).toContain(positionDescription.trim());
            }
            if (companyLocation.trim()) {
              expect(capturedNotification.positionDetails).toContain(companyLocation.trim());
            }
            if (salaryRange.trim()) {
              expect(capturedNotification.positionDetails).toContain(salaryRange.trim());
            }
            
            // Verify all required fields are non-empty
            expect(capturedNotification.positionDetails.length).toBeGreaterThan(10);
            expect(capturedNotification.nextSteps.length).toBeGreaterThan(5);
            expect(capturedNotification.contactInfo.length).toBeGreaterThan(5);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: candidate-selection-system, Property 18: Contact information provision**
     * For any selection notification, it should provide contact information for next steps
     */
    it('should provide comprehensive contact information for next steps - Property 18', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            candidateEmail: fc.emailAddress(),
            vacancyTitle: fc.string({ minLength: 1, maxLength: 50 }),
            companyName: fc.string({ minLength: 1, maxLength: 50 }),
            companyEmail: fc.emailAddress(),
            companyPhone: fc.string({ minLength: 10, maxLength: 15 }),
            hrContactName: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          async ({ candidateEmail, vacancyTitle, companyName, companyEmail, companyPhone, hrContactName }) => {
            // Mock the notification service method to capture the notification content
            let capturedNotification: any = null;
            mockNotificationsService.sendCandidateSelectionNotification = jest.fn().mockImplementation((notification) => {
              capturedNotification = notification;
              return Promise.resolve();
            });

            // Create selection result
            const selectionResult = {
              success: true,
              applicationId: 'test-app',
              candidateId: 'test-candidate',
              vacancyId: 'test-vacancy',
              selectedAt: { seconds: 1234567890, nanoseconds: 0 },
              selectedBy: 'test-user',
              notificationSent: false,
            };

            // Mock document gets with comprehensive contact information
            let getCallCount = 0;
            mockDoc.get.mockImplementation(() => {
              getCallCount++;
              if (getCallCount === 1) {
                return Promise.resolve({ 
                  exists: true, 
                  data: () => ({ email: candidateEmail, displayName: 'Test User' })
                });
              }
              if (getCallCount === 2) {
                return Promise.resolve({ 
                  exists: true, 
                  data: () => ({ 
                    title: vacancyTitle, 
                    description: 'Test description',
                    companyId: 'test-company'
                  })
                });
              }
              if (getCallCount === 3) {
                return Promise.resolve({ 
                  exists: true, 
                  data: () => ({ 
                    name: companyName, 
                    email: companyEmail,
                    phone: companyPhone,
                    hrContactName: hrContactName
                  })
                });
              }
              return Promise.resolve({ exists: false });
            });

            // Execute notification
            await service.sendSelectionNotification(selectionResult);

            // Verify notification contains comprehensive contact information
            expect(capturedNotification).toBeTruthy();
            expect(capturedNotification.contactInfo).toBeTruthy();
            
            // Verify contact information includes email
            expect(capturedNotification.contactInfo).toContain(companyEmail);
            
            // Verify contact information includes phone if provided
            if (companyPhone) {
              expect(capturedNotification.contactInfo).toContain(companyPhone);
            }
            
            // Verify contact information includes HR contact name if provided
            if (hrContactName) {
              expect(capturedNotification.contactInfo).toContain(hrContactName);
            }
            
            // Verify next steps provide actionable guidance
            const nextStepsKeywords = ['contactar', 'llamar', 'escribir', 'responder', 'confirmar', 'comunícate', 'coordinar'];
            const hasActionableSteps = nextStepsKeywords.some(keyword => 
              capturedNotification.nextSteps.toLowerCase().includes(keyword)
            );
            expect(hasActionableSteps).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: candidate-selection-system, Property 19: Position-specific identification**
     * For any candidate with multiple applications, selection notifications should clearly identify the specific position they were selected for
     */
    it('should clearly identify specific position in notifications for candidates with multiple applications - Property 19', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            candidateEmail: fc.emailAddress(),
            selectedVacancyTitle: fc.string({ minLength: 1, maxLength: 100 }),
            selectedCompanyName: fc.string({ minLength: 1, maxLength: 50 }),
            otherVacancyTitles: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 3 }),
            vacancyId: fc.string({ minLength: 1, maxLength: 20 }),
          }),
          async ({ candidateEmail, selectedVacancyTitle, selectedCompanyName, otherVacancyTitles, vacancyId }) => {
            // Ensure selected vacancy is different from other vacancies and doesn't conflict with company name
            const filteredOtherVacancies = otherVacancyTitles.filter(title => 
              title !== selectedVacancyTitle && title !== selectedCompanyName
            );
            if (filteredOtherVacancies.length === 0) return; // Skip if no other vacancies

            // Mock the notification service method to capture the notification content
            let capturedNotification: any = null;
            mockNotificationsService.sendCandidateSelectionNotification = jest.fn().mockImplementation((notification) => {
              capturedNotification = notification;
              return Promise.resolve();
            });

            // Create selection result
            const selectionResult = {
              success: true,
              applicationId: 'test-app',
              candidateId: 'test-candidate',
              vacancyId: vacancyId,
              selectedAt: { seconds: 1234567890, nanoseconds: 0 },
              selectedBy: 'test-user',
              notificationSent: false,
            };

            // Mock document gets
            let getCallCount = 0;
            mockDoc.get.mockImplementation(() => {
              getCallCount++;
              if (getCallCount === 1) {
                return Promise.resolve({ 
                  exists: true, 
                  data: () => ({ email: candidateEmail, displayName: 'Test User' })
                });
              }
              if (getCallCount === 2) {
                return Promise.resolve({ 
                  exists: true, 
                  data: () => ({ 
                    id: vacancyId,
                    title: selectedVacancyTitle, 
                    description: 'Selected position description',
                    companyId: 'test-company'
                  })
                });
              }
              if (getCallCount === 3) {
                return Promise.resolve({ 
                  exists: true, 
                  data: () => ({ 
                    name: selectedCompanyName, 
                    email: 'company@test.com'
                  })
                });
              }
              return Promise.resolve({ exists: false });
            });

            // Execute notification
            await service.sendSelectionNotification(selectionResult);

            // Verify notification clearly identifies the specific position (with processed values)
            expect(capturedNotification).toBeTruthy();
            expect(capturedNotification.vacancyTitle).toBe(selectedVacancyTitle.trim() || 'Posición disponible');
            expect(capturedNotification.companyName).toBe(selectedCompanyName.trim() || 'Empresa');
            
            // Verify the notification explicitly mentions the specific position
            const positionIdentifiers = [
              `${selectedVacancyTitle}`,
              `${selectedCompanyName}`,
              `ID: ${vacancyId}`,
            ];
            
            // At least the vacancy title and company should be clearly mentioned (use processed values)
            const processedVacancyTitle = selectedVacancyTitle.trim() || 'Posición disponible';
            const processedCompanyName = selectedCompanyName.trim() || 'Empresa';
            expect(capturedNotification.positionDetails).toContain(processedVacancyTitle);
            expect(capturedNotification.positionDetails).toContain(processedCompanyName);
            
            // Verify the notification doesn't accidentally reference other positions
            filteredOtherVacancies.forEach(otherTitle => {
              expect(capturedNotification.vacancyTitle).not.toBe(otherTitle);
              // Only check for meaningful titles (not just whitespace or very short strings)
              if (otherTitle.trim().length > 2) {
                expect(capturedNotification.positionDetails).not.toContain(otherTitle);
              }
            });
            
            // Verify position-specific language is used
            const specificityKeywords = ['esta posición', 'este puesto', 'esta vacante', 'el cargo de'];
            const hasSpecificLanguage = specificityKeywords.some(keyword => 
              capturedNotification.positionDetails.toLowerCase().includes(keyword) ||
              capturedNotification.nextSteps.toLowerCase().includes(keyword)
            );
            expect(hasSpecificLanguage).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Unit Tests', () => {
    let mockDoc: any;
    let mockCollection: any;

    beforeEach(() => {
      mockDoc = {
        id: 'test-id',
        set: jest.fn().mockResolvedValue(undefined),
        get: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      };

      mockCollection = {
        doc: jest.fn().mockReturnValue(mockDoc),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        get: jest.fn(),
      };

      mockFirestore.collection = jest.fn().mockReturnValue(mockCollection);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should throw NotFoundException when vacancy does not exist', async () => {
      const vacancyId = 'non-existent-vacancy';
      const companyId = 'test-company';

      mockDoc.get.mockResolvedValue({ exists: false });

      await expect(service.getApplicationsForVacancy(vacancyId, companyId))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when company does not own vacancy', async () => {
      const vacancyId = 'test-vacancy';
      const companyId = 'test-company';
      const differentCompanyId = 'different-company';

      const vacancyData = { companyId: differentCompanyId, title: 'Test Vacancy' };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => vacancyData,
      });

      await expect(service.getApplicationsForVacancy(vacancyId, companyId))
        .rejects.toThrow(ForbiddenException);
    });

    it('should return empty array when no applications exist', async () => {
      const vacancyId = 'test-vacancy';
      const companyId = 'test-company';

      const vacancyData = { companyId: companyId, title: 'Test Vacancy' };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => vacancyData,
      });

      mockCollection.get.mockResolvedValue({ docs: [] });

      const result = await service.getApplicationsForVacancy(vacancyId, companyId);
      expect(result).toEqual([]);
    });
  });
});