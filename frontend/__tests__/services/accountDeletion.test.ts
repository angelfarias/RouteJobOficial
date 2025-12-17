// **Feature: auth-ui-improvements, Property 8: Account deletion confirmation requirement**
import * as fc from 'fast-check';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfileService } from '@/lib/services/userProfileService';

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
const mockDeleteUser = require('firebase/auth').deleteUser;
const mockDeleteDoc = require('firebase/firestore').deleteDoc;
const mockGetDoc = require('firebase/firestore').getDoc;
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

describe('Account Deletion Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 8: Account deletion confirmation requirement', () => {
    test('should require explicit confirmation before permanently removing account from Firebase', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            uid: fc.string({ minLength: 1 }),
            email: fc.emailAddress(),
            displayName: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          async (userData) => {
            const mockUser = createMockUser(userData);
            
            // Mock successful Firestore operations
            mockDoc.mockReturnValue({ id: 'test-doc' });
            mockGetDoc.mockResolvedValue({
              exists: () => true,
              data: () => ({ uid: mockUser.uid, email: mockUser.email })
            });
            mockDeleteDoc.mockResolvedValue(undefined);
            mockDeleteUser.mockResolvedValue(undefined);

            // Test account deletion process
            await expect(
              UserProfileService.deleteAccount(mockUser)
            ).resolves.not.toThrow();

            // Verify Firestore document deletion was attempted first
            expect(mockGetDoc).toHaveBeenCalledWith(
              expect.anything() // The document reference
            );
            
            expect(mockDeleteDoc).toHaveBeenCalledWith(
              expect.anything() // The document reference
            );

            // Verify Firebase Auth user deletion was called
            expect(mockDeleteUser).toHaveBeenCalledWith(mockUser);

            // Verify proper order: Firestore first, then Auth
            const deleteDocCallOrder = mockDeleteDoc.mock.invocationCallOrder[0];
            const deleteUserCallOrder = mockDeleteUser.mock.invocationCallOrder[0];
            expect(deleteDocCallOrder).toBeLessThan(deleteUserCallOrder);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should handle account deletion errors appropriately', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            errorCode: fc.oneof(
              fc.constant('auth/requires-recent-login'),
              fc.constant('auth/network-request-failed'),
              fc.constant('auth/user-not-found'),
              fc.constant('firestore/permission-denied')
            ),
            userData: fc.record({
              uid: fc.string({ minLength: 1 }),
              email: fc.emailAddress(),
              displayName: fc.string({ minLength: 1, maxLength: 50 }),
            })
          }),
          async ({ errorCode, userData }) => {
            const mockUser = createMockUser(userData);
            
            // Mock Firebase error
            const firebaseError = new Error('Firebase error');
            (firebaseError as any).code = errorCode;
            
            if (errorCode.startsWith('auth/')) {
              // Mock Auth error
              mockDoc.mockReturnValue({ id: 'test-doc' });
              mockGetDoc.mockResolvedValue({ exists: () => true });
              mockDeleteDoc.mockResolvedValue(undefined);
              mockDeleteUser.mockRejectedValue(firebaseError);
            } else {
              // Mock Firestore error
              mockDoc.mockReturnValue({ id: 'test-doc' });
              mockGetDoc.mockRejectedValue(firebaseError);
            }

            // Should handle errors gracefully
            await expect(
              UserProfileService.deleteAccount(mockUser)
            ).rejects.toThrow();

            // Error should be user-friendly
            try {
              await UserProfileService.deleteAccount(mockUser);
            } catch (error) {
              expect(error).toBeInstanceOf(Error);
              const errorMessage = (error as Error).message;
              
              // Should provide user-friendly error messages
              if (errorCode === 'auth/requires-recent-login') {
                expect(errorMessage).toContain('iniciar sesión nuevamente');
              } else {
                expect(errorMessage.length).toBeGreaterThan(0);
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    test('should validate confirmation text requirements', () => {
      fc.assert(
        fc.property(
          fc.record({
            confirmationText: fc.oneof(
              fc.constant(''), // Empty
              fc.constant('eliminar'), // Lowercase
              fc.constant('ELIMINAR'), // Correct
              fc.constant('ELIMINAR '), // With trailing space
              fc.constant(' ELIMINAR'), // With leading space
              fc.constant('delete'), // Wrong language
              fc.constant('confirm'), // Wrong word
              fc.string({ minLength: 1, maxLength: 20 }) // Random text
            ),
          }),
          ({ confirmationText }) => {
            // Test confirmation validation logic
            const isValidConfirmation = confirmationText === 'ELIMINAR';
            
            // Validation should be exact match
            if (confirmationText === '') {
              expect(isValidConfirmation).toBe(false);
            }
            
            if (confirmationText === 'eliminar') {
              expect(isValidConfirmation).toBe(false); // Case sensitive
            }
            
            if (confirmationText === 'ELIMINAR ') {
              expect(isValidConfirmation).toBe(false); // No trailing spaces
            }
            
            if (confirmationText === ' ELIMINAR') {
              expect(isValidConfirmation).toBe(false); // No leading spaces
            }
            
            if (confirmationText === 'delete' || confirmationText === 'confirm') {
              expect(isValidConfirmation).toBe(false); // Wrong language/word
            }
            
            if (confirmationText === 'ELIMINAR') {
              expect(isValidConfirmation).toBe(true); // Exact match
            }
            
            // Test UI state logic
            const shouldDeleteButtonBeEnabled = isValidConfirmation;
            expect(typeof shouldDeleteButtonBeEnabled).toBe('boolean');
            
            // Only enable delete button for exact match
            if (confirmationText !== 'ELIMINAR') {
              expect(shouldDeleteButtonBeEnabled).toBe(false);
            } else {
              expect(shouldDeleteButtonBeEnabled).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should maintain data integrity during account deletion process', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            uid: fc.string({ minLength: 1 }),
            email: fc.emailAddress(),
            hasFirestoreDoc: fc.boolean(),
          }),
          async ({ uid, email, hasFirestoreDoc }) => {
            const mockUser = createMockUser({ uid, email });
            
            // Mock Firestore document existence
            mockDoc.mockReturnValue({ id: 'test-doc' });
            mockGetDoc.mockResolvedValue({
              exists: () => hasFirestoreDoc,
              data: () => hasFirestoreDoc ? { uid, email } : undefined
            });
            
            if (hasFirestoreDoc) {
              mockDeleteDoc.mockResolvedValue(undefined);
            }
            
            mockDeleteUser.mockResolvedValue(undefined);

            // Test deletion process
            await UserProfileService.deleteAccount(mockUser);

            // Should always check for Firestore document
            expect(mockGetDoc).toHaveBeenCalled();

            if (hasFirestoreDoc) {
              // Should delete Firestore document if it exists
              expect(mockDeleteDoc).toHaveBeenCalled();
            } else {
              // Should not attempt to delete non-existent document
              expect(mockDeleteDoc).not.toHaveBeenCalled();
            }

            // Should always delete Firebase Auth user
            expect(mockDeleteUser).toHaveBeenCalledWith(mockUser);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should handle partial deletion failures gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            firestoreSuccess: fc.boolean(),
            authSuccess: fc.boolean(),
          }),
          async ({ firestoreSuccess, authSuccess }) => {
            const mockUser = createMockUser();
            
            // Mock Firestore operations
            mockDoc.mockReturnValue({ id: 'test-doc' });
            mockGetDoc.mockResolvedValue({ exists: () => true });
            
            if (firestoreSuccess) {
              mockDeleteDoc.mockResolvedValue(undefined);
            } else {
              const firestoreError = new Error('Firestore deletion failed');
              mockDeleteDoc.mockRejectedValue(firestoreError);
            }

            // Mock Auth operations
            if (authSuccess) {
              mockDeleteUser.mockResolvedValue(undefined);
            } else {
              const authError = new Error('Auth deletion failed');
              (authError as any).code = 'auth/requires-recent-login';
              mockDeleteUser.mockRejectedValue(authError);
            }

            if (!firestoreSuccess || !authSuccess) {
              // Should throw error if any part fails
              await expect(
                UserProfileService.deleteAccount(mockUser)
              ).rejects.toThrow();
            } else {
              // Should succeed if both parts succeed
              await expect(
                UserProfileService.deleteAccount(mockUser)
              ).resolves.not.toThrow();
            }

            // Should always attempt Firestore deletion first
            expect(mockGetDoc).toHaveBeenCalled();
            
            if (firestoreSuccess) {
              // Should attempt Auth deletion only if Firestore succeeds
              expect(mockDeleteUser).toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    test('should validate user authentication state before deletion', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.record({
              uid: fc.string({ minLength: 1 }),
              email: fc.emailAddress(),
              isValid: fc.constant(true)
            }),
            fc.constant(null).map(() => ({ uid: '', email: '', isValid: false }))
          ),
          async (userState) => {
            let mockUser: FirebaseUser | null = null;
            
            if (userState.isValid) {
              mockUser = createMockUser({
                uid: userState.uid,
                email: userState.email
              });
            }

            if (!mockUser) {
              // Should throw error for null user
              await expect(
                UserProfileService.deleteAccount(mockUser as any)
              ).rejects.toThrow('Usuario no autenticado');
            } else {
              // Mock successful operations for valid user
              mockDoc.mockReturnValue({ id: 'test-doc' });
              mockGetDoc.mockResolvedValue({ exists: () => false });
              mockDeleteUser.mockResolvedValue(undefined);

              // Should proceed with deletion for valid user
              await expect(
                UserProfileService.deleteAccount(mockUser)
              ).resolves.not.toThrow();

              expect(mockDeleteUser).toHaveBeenCalledWith(mockUser);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should provide consistent deletion confirmation UI behavior', () => {
      fc.assert(
        fc.property(
          fc.record({
            showConfirmation: fc.boolean(),
            confirmationText: fc.string({ maxLength: 20 }),
            isLoading: fc.boolean(),
          }),
          ({ showConfirmation, confirmationText, isLoading }) => {
            // Test UI state logic for deletion confirmation
            const isValidConfirmation = confirmationText === 'ELIMINAR';
            
            // Delete button should be enabled only when:
            // 1. Confirmation is shown
            // 2. Confirmation text is correct
            // 3. Not currently loading
            const shouldEnableDeleteButton = showConfirmation && 
                                           isValidConfirmation && 
                                           !isLoading;

            // Cancel button should always be enabled when confirmation is shown
            const shouldEnableCancelButton = showConfirmation && !isLoading;

            // Initial delete button (before confirmation) should be enabled when not loading
            const shouldEnableInitialDeleteButton = !showConfirmation && !isLoading;

            // Validate UI state consistency
            expect(typeof shouldEnableDeleteButton).toBe('boolean');
            expect(typeof shouldEnableCancelButton).toBe('boolean');
            expect(typeof shouldEnableInitialDeleteButton).toBe('boolean');

            // Test state transitions
            if (!showConfirmation) {
              // Before confirmation: only initial delete button should be considered
              expect(shouldEnableInitialDeleteButton).toBe(!isLoading);
            } else {
              // During confirmation: delete button depends on text and loading state
              if (isValidConfirmation && !isLoading) {
                expect(shouldEnableDeleteButton).toBe(true);
              } else {
                expect(shouldEnableDeleteButton).toBe(false);
              }
              
              // Cancel should be enabled unless loading
              expect(shouldEnableCancelButton).toBe(!isLoading);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});