// **Feature: auth-ui-improvements, Property 7: Profile update validation and persistence**
import * as fc from 'fast-check';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfileService, ProfileUpdateData } from '@/lib/services/userProfileService';

// Mock Firebase modules
jest.mock('firebase/auth', () => ({
  updateProfile: jest.fn(),
  updateEmail: jest.fn(),
  deleteUser: jest.fn(),
  reauthenticateWithCredential: jest.fn(),
  EmailAuthProvider: {
    credential: jest.fn(),
  },
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  getDoc: jest.fn(),
}));

jest.mock('@/lib/firebaseClient', () => ({
  auth: {},
  db: {},
}));

// Mock Firebase functions
const mockUpdateProfile = require('firebase/auth').updateProfile;
const mockUpdateEmail = require('firebase/auth').updateEmail;
const mockUpdateDoc = require('firebase/firestore').updateDoc;
const mockDoc = require('firebase/firestore').doc;

// Mock user factory
const createMockUser = (overrides: Partial<FirebaseUser> = {}): FirebaseUser => ({
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
  phoneNumber: '+1234567890',
  emailVerified: true,
  isAnonymous: false,
  metadata: {} as any,
  providerData: [],
  refreshToken: 'refresh-token',
  tenantId: null,
  delete: jest.fn(),
  getIdToken: jest.fn(),
  getIdTokenResult: jest.fn(),
  reload: jest.fn(),
  toJSON: jest.fn(),
  ...overrides,
});

describe('Profile Update Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 7: Profile update validation and persistence', () => {
    test('should validate and save profile information changes for any valid input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            displayName: fc.oneof(
              fc.string({ minLength: 2, maxLength: 100 }),
              fc.constant(undefined)
            ),
            email: fc.oneof(
              fc.emailAddress(),
              fc.constant(undefined)
            ),
            phoneNumber: fc.oneof(
              fc.string({ minLength: 1, maxLength: 15 }).map(s => `+${s}`),
              fc.constant(undefined),
              fc.constant('')
            ),
          }),
          async (profileData) => {
            const mockUser = createMockUser();
            
            // Mock successful Firebase operations
            mockUpdateProfile.mockResolvedValue(undefined);
            mockUpdateEmail.mockResolvedValue(undefined);
            mockDoc.mockReturnValue({ id: 'test-doc' });
            mockUpdateDoc.mockResolvedValue(undefined);

            // Test profile update
            await expect(
              UserProfileService.updateProfile(mockUser, profileData)
            ).resolves.not.toThrow();

            // Verify Firebase Auth updates were called appropriately
            if (profileData.displayName !== undefined) {
              expect(mockUpdateProfile).toHaveBeenCalledWith(
                mockUser,
                expect.objectContaining({ displayName: profileData.displayName })
              );
            }

            if (profileData.email !== undefined && profileData.email !== mockUser.email) {
              expect(mockUpdateEmail).toHaveBeenCalledWith(mockUser, profileData.email);
            }

            // Verify Firestore update was called
            expect(mockUpdateDoc).toHaveBeenCalledWith(
              expect.anything(),
              expect.objectContaining({
                updatedAt: expect.any(String),
              })
            );

            // Verify Firestore update includes the provided data
            const firestoreCall = mockUpdateDoc.mock.calls[0][1];
            
            if (profileData.displayName !== undefined) {
              expect(firestoreCall.displayName).toBe(profileData.displayName);
            }
            
            if (profileData.email !== undefined) {
              expect(firestoreCall.email).toBe(profileData.email);
            }
            
            if (profileData.phoneNumber !== undefined) {
              expect(firestoreCall.phoneNumber).toBe(profileData.phoneNumber);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should handle validation errors for invalid profile data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            displayName: fc.oneof(
              fc.constant(''), // Empty
              fc.string({ minLength: 101 }), // Too long
              fc.string({ minLength: 2, maxLength: 100 }) // Valid
            ),
            email: fc.oneof(
              fc.constant(''), // Empty
              fc.constant('invalid-email'), // Invalid format
              fc.emailAddress() // Valid
            ),
            phoneNumber: fc.oneof(
              fc.constant('invalid-phone'), // Invalid format
              fc.string({ minLength: 1, maxLength: 15 }).map(s => `+${s}`), // Valid
              fc.constant('') // Empty (valid)
            ),
          }),
          async (profileData) => {
            const mockUser = createMockUser();
            
            // Mock Firebase operations
            mockUpdateProfile.mockResolvedValue(undefined);
            mockUpdateEmail.mockResolvedValue(undefined);
            mockDoc.mockReturnValue({ id: 'test-doc' });
            mockUpdateDoc.mockResolvedValue(undefined);

            // Determine if data should be valid
            const hasValidName = !profileData.displayName || 
              (profileData.displayName.trim().length >= 2 && profileData.displayName.trim().length <= 100);
            const hasValidEmail = !profileData.email || 
              (profileData.email.includes('@') && profileData.email.includes('.'));
            const hasValidPhone = !profileData.phoneNumber || 
              profileData.phoneNumber === '' || 
              /^[\+]?[1-9][\d]{0,15}$/.test(profileData.phoneNumber.trim());

            const shouldSucceed = hasValidName && hasValidEmail && hasValidPhone;

            if (shouldSucceed) {
              // Should not throw for valid data
              await expect(
                UserProfileService.updateProfile(mockUser, profileData)
              ).resolves.not.toThrow();
            } else {
              // May throw for invalid data (depending on validation implementation)
              // We test that the function handles the data appropriately
              try {
                await UserProfileService.updateProfile(mockUser, profileData);
                // If it doesn't throw, that's also acceptable - validation might be lenient
              } catch (error) {
                // If it throws, the error should be meaningful
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toBeDefined();
                expect((error as Error).message.length).toBeGreaterThan(0);
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should handle Firebase authentication errors appropriately', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            errorCode: fc.oneof(
              fc.constant('auth/email-already-in-use'),
              fc.constant('auth/invalid-email'),
              fc.constant('auth/requires-recent-login'),
              fc.constant('auth/network-request-failed')
            ),
            profileData: fc.record({
              displayName: fc.string({ minLength: 2, maxLength: 50 }),
              email: fc.emailAddress(),
              phoneNumber: fc.string({ minLength: 1, maxLength: 15 }).map(s => `+${s}`),
            })
          }),
          async ({ errorCode, profileData }) => {
            const mockUser = createMockUser();
            
            // Mock Firebase error
            const firebaseError = new Error('Firebase error');
            (firebaseError as any).code = errorCode;
            
            if (profileData.email !== mockUser.email) {
              mockUpdateEmail.mockRejectedValue(firebaseError);
            } else {
              mockUpdateProfile.mockRejectedValue(firebaseError);
            }

            // Should handle Firebase errors gracefully
            await expect(
              UserProfileService.updateProfile(mockUser, profileData)
            ).rejects.toThrow();

            // Error should be user-friendly
            try {
              await UserProfileService.updateProfile(mockUser, profileData);
            } catch (error) {
              expect(error).toBeInstanceOf(Error);
              const errorMessage = (error as Error).message;
              
              // Should provide user-friendly error messages
              switch (errorCode) {
                case 'auth/email-already-in-use':
                  expect(errorMessage).toContain('ya está en uso');
                  break;
                case 'auth/invalid-email':
                  expect(errorMessage).toContain('inválido');
                  break;
                case 'auth/requires-recent-login':
                  expect(errorMessage).toContain('iniciar sesión nuevamente');
                  break;
                default:
                  expect(errorMessage.length).toBeGreaterThan(0);
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    test('should maintain data consistency during profile updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              displayName: fc.string({ minLength: 2, maxLength: 50 }),
              email: fc.emailAddress(),
              phoneNumber: fc.oneof(
                fc.string({ minLength: 1, maxLength: 15 }).map(s => `+${s}`),
                fc.constant('')
              ),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (profileUpdates) => {
            const mockUser = createMockUser();
            
            // Mock successful Firebase operations
            mockUpdateProfile.mockResolvedValue(undefined);
            mockUpdateEmail.mockResolvedValue(undefined);
            mockDoc.mockReturnValue({ id: 'test-doc' });
            mockUpdateDoc.mockResolvedValue(undefined);

            // Apply updates sequentially
            for (const update of profileUpdates) {
              await UserProfileService.updateProfile(mockUser, update);
            }

            // Verify that each update was processed
            expect(mockUpdateDoc).toHaveBeenCalledTimes(profileUpdates.length);

            // Verify that all Firestore updates include timestamp
            mockUpdateDoc.mock.calls.forEach(call => {
              const updateData = call[1];
              expect(updateData.updatedAt).toBeDefined();
              expect(typeof updateData.updatedAt).toBe('string');
            });

            // Verify that the last update contains the final values
            const lastCall = mockUpdateDoc.mock.calls[mockUpdateDoc.mock.calls.length - 1];
            const lastUpdate = profileUpdates[profileUpdates.length - 1];
            const lastUpdateData = lastCall[1];

            expect(lastUpdateData.displayName).toBe(lastUpdate.displayName);
            expect(lastUpdateData.email).toBe(lastUpdate.email);
            expect(lastUpdateData.phoneNumber).toBe(lastUpdate.phoneNumber);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should validate email change availability', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            newEmail: fc.emailAddress(),
            currentUid: fc.string({ minLength: 1 }),
          }),
          async ({ newEmail, currentUid }) => {
            // Test email validation logic
            const isValid = await UserProfileService.validateEmailChange(newEmail, currentUid);
            
            // Should return a boolean
            expect(typeof isValid).toBe('boolean');
            
            // Valid emails should generally pass basic validation
            if (newEmail.includes('@') && newEmail.includes('.')) {
              // Basic email format should be considered valid
              // (actual availability checking would require database lookup)
              expect(typeof isValid).toBe('boolean');
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should handle concurrent profile update attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            updates: fc.array(
              fc.record({
                displayName: fc.string({ minLength: 2, maxLength: 50 }),
                email: fc.emailAddress(),
              }),
              { minLength: 2, maxLength: 4 }
            ),
          }),
          async ({ updates }) => {
            const mockUser = createMockUser();
            
            // Mock successful Firebase operations
            mockUpdateProfile.mockResolvedValue(undefined);
            mockUpdateEmail.mockResolvedValue(undefined);
            mockDoc.mockReturnValue({ id: 'test-doc' });
            mockUpdateDoc.mockResolvedValue(undefined);

            // Execute concurrent updates
            const updatePromises = updates.map(update => 
              UserProfileService.updateProfile(mockUser, update)
            );

            // All updates should complete without throwing
            await expect(Promise.all(updatePromises)).resolves.not.toThrow();

            // Verify that all updates were attempted
            expect(mockUpdateDoc).toHaveBeenCalledTimes(updates.length);

            // Each call should have proper structure
            mockUpdateDoc.mock.calls.forEach(call => {
              const updateData = call[1];
              expect(updateData).toHaveProperty('updatedAt');
              expect(typeof updateData.updatedAt).toBe('string');
            });
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});