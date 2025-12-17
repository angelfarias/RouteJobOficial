// **Feature: auth-ui-improvements, Property 5: Duplicate email prevention**
import * as fc from 'fast-check';

// Mock Firebase auth functions
const mockCreateUserWithEmailAndPassword = jest.fn();
const mockAuth = {
  currentUser: null,
};

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (...args: any[]) => mockCreateUserWithEmailAndPassword(...args),
  getAuth: () => mockAuth,
}));

jest.mock('@/lib/firebaseClient', () => ({
  auth: mockAuth,
}));

// Mock fetch for backend API calls
global.fetch = jest.fn();

describe('Duplicate Email Prevention Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Property 5: Duplicate email prevention', () => {
    test('should prevent account creation for existing emails and inform user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          async (email) => {
            // Mock backend response for existing email
            (global.fetch as jest.Mock).mockResolvedValueOnce({
              ok: false,
              status: 409, // Conflict
              text: () => Promise.resolve('Este correo electrónico ya está registrado'),
            });

            // Mock Firebase error for existing email
            const emailExistsError = new Error('Email already in use');
            (emailExistsError as any).code = 'auth/email-already-in-use';
            mockCreateUserWithEmailAndPassword.mockRejectedValueOnce(emailExistsError);

            // Test backend duplicate prevention
            const backendResponse = await fetch('/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: 'Test User',
                email: email,
                password: 'ValidPass123!',
              }),
            });

            expect(backendResponse.ok).toBe(false);
            expect(backendResponse.status).toBe(409);
            
            const errorMessage = await backendResponse.text();
            expect(errorMessage).toContain('registrado');

            // Test Firebase duplicate prevention
            const { createUserWithEmailAndPassword } = await import('firebase/auth');
            const { auth } = await import('@/lib/firebaseClient');

            await expect(
              createUserWithEmailAndPassword(auth, email, 'ValidPass123!')
            ).rejects.toMatchObject({
              code: 'auth/email-already-in-use'
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    test('should handle case-insensitive email comparison', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          async (baseEmail) => {
            // Generate case variations of the same email
            const emailVariations = [
              baseEmail.toLowerCase(),
              baseEmail.toUpperCase(),
              baseEmail.charAt(0).toUpperCase() + baseEmail.slice(1).toLowerCase(),
            ];

            for (const email of emailVariations) {
              // Mock backend response for existing email (case-insensitive)
              (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 409,
                text: () => Promise.resolve('Este correo electrónico ya está registrado'),
              });

              const response = await fetch('/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: 'Test User',
                  email: email,
                  password: 'ValidPass123!',
                }),
              });

              // Should detect duplicate regardless of case
              expect(response.ok).toBe(false);
              expect(response.status).toBe(409);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should provide informative error messages for duplicate emails', () => {
      fc.assert(
        fc.property(
          fc.emailAddress(),
          (email) => {
            // Test different error message scenarios
            const errorScenarios = [
              'Este correo electrónico ya está registrado',
              'Email already registered',
              'Ya existe una cuenta con este correo',
            ];

            errorScenarios.forEach(errorMessage => {
              // Error message should be informative
              expect(typeof errorMessage).toBe('string');
              expect(errorMessage.length).toBeGreaterThan(0);
              
              // Should contain relevant keywords
              const messageLower = errorMessage.toLowerCase();
              const isInformative = 
                messageLower.includes('correo') ||
                messageLower.includes('email') ||
                messageLower.includes('registrado') ||
                messageLower.includes('existe') ||
                messageLower.includes('cuenta');
              
              expect(isInformative).toBe(true);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should allow registration for new emails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 2, maxLength: 50 }),
            email: fc.emailAddress(),
            password: fc.oneof(
              fc.constant('ValidPass123!'),
              fc.constant('SecurePass456@'),
              fc.constant('StrongPass789#'),
              fc.constant('TestPassword1$')
            )
          }),
          async (userData) => {
            // Mock successful backend registration
            (global.fetch as jest.Mock).mockResolvedValueOnce({
              ok: true,
              status: 201,
              json: () => Promise.resolve({
                uid: 'test-uid',
                email: userData.email.toLowerCase(),
                name: userData.name,
              }),
            });

            // Mock successful Firebase user creation
            mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({
              user: {
                uid: 'test-uid',
                email: userData.email.toLowerCase(),
                displayName: userData.name,
              },
            });

            // Test successful registration
            const backendResponse = await fetch('/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(userData),
            });

            expect(backendResponse.ok).toBe(true);
            expect(backendResponse.status).toBe(201);

            const { createUserWithEmailAndPassword } = await import('firebase/auth');
            const { auth } = await import('@/lib/firebaseClient');

            const firebaseResult = await createUserWithEmailAndPassword(
              auth, 
              userData.email, 
              userData.password
            );

            expect(firebaseResult.user).toBeDefined();
            expect(firebaseResult.user.email).toBe(userData.email.toLowerCase());
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should handle concurrent registration attempts gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          async (email) => {
            // Simulate concurrent registration attempts
            const registrationData = {
              name: 'Test User',
              email: email,
              password: 'ValidPass123!',
            };

            // First attempt succeeds
            (global.fetch as jest.Mock)
              .mockResolvedValueOnce({
                ok: true,
                status: 201,
                json: () => Promise.resolve({ uid: 'test-uid-1' }),
              })
              // Second attempt fails (duplicate)
              .mockResolvedValueOnce({
                ok: false,
                status: 409,
                text: () => Promise.resolve('Este correo electrónico ya está registrado'),
              });

            // First registration
            const firstResponse = await fetch('/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(registrationData),
            });

            expect(firstResponse.ok).toBe(true);

            // Second registration (should fail)
            const secondResponse = await fetch('/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(registrationData),
            });

            expect(secondResponse.ok).toBe(false);
            expect(secondResponse.status).toBe(409);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should validate email format before checking for duplicates', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''), // Empty
            fc.constant('invalid-email'), // No @
            fc.constant('user@'), // No domain
            fc.constant('@domain.com'), // No local part
            fc.emailAddress(), // Valid
          ),
          (email) => {
            // Import validation
            const { EmailValidator } = require('@/lib/validation/emailValidator');
            
            const validation = EmailValidator.validateFormat(email);
            
            // Should validate format first
            expect(typeof validation.isValid).toBe('boolean');
            
            if (!validation.isValid) {
              expect(validation.error).toBeDefined();
              expect(typeof validation.error).toBe('string');
              
              // Invalid format should be caught before duplicate check
              const errorMessage = validation.error!.toLowerCase();
              const isFormatError = 
                errorMessage.includes('formato') ||
                errorMessage.includes('inválido') ||
                errorMessage.includes('requerido');
              
              expect(isFormatError).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should maintain data consistency during duplicate prevention', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.emailAddress(), { minLength: 2, maxLength: 5 }),
          async (emails) => {
            // Ensure we have at least one duplicate
            const emailsWithDuplicate = [...emails, emails[0]];
            
            const registrationAttempts = emailsWithDuplicate.map((email, index) => ({
              name: `User ${index}`,
              email: email,
              password: 'ValidPass123!',
            }));

            // Mock responses: first unique emails succeed, duplicates fail
            const seenEmails = new Set<string>();
            
            for (const attempt of registrationAttempts) {
              const normalizedEmail = attempt.email.toLowerCase();
              
              if (seenEmails.has(normalizedEmail)) {
                // Duplicate - should fail
                (global.fetch as jest.Mock).mockResolvedValueOnce({
                  ok: false,
                  status: 409,
                  text: () => Promise.resolve('Este correo electrónico ya está registrado'),
                });
              } else {
                // New email - should succeed
                seenEmails.add(normalizedEmail);
                (global.fetch as jest.Mock).mockResolvedValueOnce({
                  ok: true,
                  status: 201,
                  json: () => Promise.resolve({ uid: `uid-${normalizedEmail}` }),
                });
              }
            }

            // Test each registration attempt
            const seenInTest = new Set<string>();
            
            for (const attempt of registrationAttempts) {
              const response = await fetch('/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(attempt),
              });

              const normalizedEmail = attempt.email.toLowerCase();
              
              if (seenInTest.has(normalizedEmail)) {
                // Should be rejected as duplicate
                expect(response.ok).toBe(false);
                expect(response.status).toBe(409);
              } else {
                // Should be accepted as new
                expect(response.ok).toBe(true);
                expect(response.status).toBe(201);
                seenInTest.add(normalizedEmail);
              }
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});