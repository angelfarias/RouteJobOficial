// **Feature: auth-ui-improvements, Property 3: Validation error messaging**
import { FormValidator, EmailValidator } from '@/lib/validation';
import * as fc from 'fast-check';

describe('FormValidator Property Tests', () => {
  describe('Property 3: Validation error messaging', () => {
    test('should provide specific error messages for registration form validation failures', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.oneof(
              fc.constant(''), // Empty name
              fc.constant(' '), // Whitespace only
              fc.string({ minLength: 1, maxLength: 1 }), // Too short
              fc.string({ minLength: 101 }), // Too long
              fc.string({ minLength: 2, maxLength: 100 }) // Valid name
            ),
            email: fc.oneof(
              fc.constant(''), // Empty email
              fc.constant('invalid-email'), // Invalid format
              fc.constant('user@'), // Incomplete
              fc.emailAddress() // Valid email
            ),
            password: fc.oneof(
              fc.constant(''), // Empty password
              fc.string({ maxLength: 7 }), // Too short
              fc.string({ minLength: 8 }).filter(s => /^[a-z]+$/.test(s)), // Missing requirements
              fc.constant('ValidPass123!') // Valid password
            )
          }),
          (formData) => {
            const result = FormValidator.validateRegistrationForm(formData);
            
            // Result should have proper structure
            expect(typeof result.isValid).toBe('boolean');
            expect(typeof result.errors).toBe('object');
            expect(result.errors).not.toBeNull();
            
            // Check name validation errors
            if (!formData.name || formData.name.trim().length === 0) {
              expect(result.errors.name).toBeDefined();
              expect(result.errors.name).toContain('requerido');
              expect(result.isValid).toBe(false);
            } else if (formData.name.trim().length < 2) {
              expect(result.errors.name).toBeDefined();
              expect(result.errors.name).toContain('2 caracteres');
              expect(result.isValid).toBe(false);
            } else if (formData.name.trim().length > 100) {
              expect(result.errors.name).toBeDefined();
              expect(result.errors.name).toContain('largo');
              expect(result.isValid).toBe(false);
            }
            
            // Check email validation errors
            if (!formData.email || formData.email.trim().length === 0) {
              expect(result.errors.email).toBeDefined();
              expect(result.errors.email).toContain('requerido');
              expect(result.isValid).toBe(false);
            } else if (!formData.email.includes('@') || !formData.email.includes('.')) {
              expect(result.errors.email).toBeDefined();
              expect(result.errors.email.toLowerCase()).toMatch(/inválido|formato/);
              expect(result.isValid).toBe(false);
            }
            
            // Check password validation errors
            if (!formData.password || formData.password.length === 0) {
              expect(result.errors.password).toBeDefined();
              expect(result.errors.password).toContain('requerida');
              expect(result.isValid).toBe(false);
            } else if (formData.password.length < 8 || 
                      !/[a-z]/.test(formData.password) ||
                      !/[A-Z]/.test(formData.password) ||
                      !/[0-9]/.test(formData.password) ||
                      !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) {
              expect(result.errors.password).toBeDefined();
              expect(typeof result.errors.password).toBe('string');
              expect(result.errors.password.length).toBeGreaterThan(0);
              expect(result.isValid).toBe(false);
            }
            
            // If all fields are valid, result should be valid
            const nameValid = formData.name && formData.name.trim().length >= 2 && formData.name.trim().length <= 100;
            const emailValid = formData.email && formData.email.includes('@') && formData.email.includes('.');
            const passwordValid = formData.password && 
                                formData.password.length >= 8 &&
                                /[a-z]/.test(formData.password) &&
                                /[A-Z]/.test(formData.password) &&
                                /[0-9]/.test(formData.password) &&
                                /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password);
            
            if (nameValid && emailValid && passwordValid) {
              expect(Object.keys(result.errors)).toHaveLength(0);
              expect(result.isValid).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should provide specific error messages for login form validation failures', () => {
      fc.assert(
        fc.property(
          fc.record({
            email: fc.oneof(
              fc.constant(''), // Empty email
              fc.constant('invalid-email'), // Invalid format
              fc.emailAddress() // Valid email
            ),
            password: fc.oneof(
              fc.constant(''), // Empty password
              fc.string({ minLength: 1 }) // Non-empty password
            )
          }),
          (formData) => {
            const result = FormValidator.validateLoginForm(formData);
            
            // Result should have proper structure
            expect(typeof result.isValid).toBe('boolean');
            expect(typeof result.errors).toBe('object');
            expect(result.errors).not.toBeNull();
            
            // Check email validation
            if (!formData.email || formData.email.trim().length === 0) {
              expect(result.errors.email).toBeDefined();
              expect(result.errors.email).toContain('requerido');
              expect(result.isValid).toBe(false);
            } else if (!formData.email.includes('@')) {
              expect(result.errors.email).toBeDefined();
              expect(result.errors.email.toLowerCase()).toMatch(/inválido|formato/);
              expect(result.isValid).toBe(false);
            }
            
            // Check password validation
            if (!formData.password || formData.password.length === 0) {
              expect(result.errors.password).toBeDefined();
              expect(result.errors.password).toContain('requerida');
              expect(result.isValid).toBe(false);
            }
            
            // If both fields are valid, result should be valid
            const emailValid = formData.email && formData.email.includes('@');
            const passwordValid = formData.password && formData.password.length > 0;
            
            if (emailValid && passwordValid) {
              expect(Object.keys(result.errors)).toHaveLength(0);
              expect(result.isValid).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should provide descriptive and actionable error messages', () => {
      const invalidInputs = [
        { name: '', email: '', password: '' },
        { name: 'A', email: 'invalid', password: '123' },
        { name: 'Valid Name', email: 'user@', password: 'password' },
        { name: 'Valid Name', email: 'user@domain.com', password: 'NoSymbols123' },
      ];

      invalidInputs.forEach(input => {
        const result = FormValidator.validateRegistrationForm(input);
        
        expect(result.isValid).toBe(false);
        
        // All error messages should be strings
        Object.values(result.errors).forEach(error => {
          expect(typeof error).toBe('string');
          expect(error.length).toBeGreaterThan(0);
          
          // Error messages should be descriptive (contain helpful words)
          const errorLower = error.toLowerCase();
          const isDescriptive = 
            errorLower.includes('requerido') ||
            errorLower.includes('requerida') ||
            errorLower.includes('caracteres') ||
            errorLower.includes('formato') ||
            errorLower.includes('inválido') ||
            errorLower.includes('largo') ||
            errorLower.includes('mayúscula') ||
            errorLower.includes('minúscula') ||
            errorLower.includes('número') ||
            errorLower.includes('símbolo') ||
            errorLower.includes('menos') ||
            errorLower.includes('debe') ||
            errorLower.includes('tener');
          
          expect(isDescriptive).toBe(true);
        });
      });
    });

    test('should not produce errors for valid inputs', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            password: fc.constant('ValidPass123!')
          }),
          (validInput) => {
            const result = FormValidator.validateRegistrationForm(validInput);
            
            expect(result.isValid).toBe(true);
            expect(Object.keys(result.errors)).toHaveLength(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should handle edge cases gracefully', () => {
      const edgeCases = [
        { name: null as any, email: null as any, password: null as any },
        { name: undefined as any, email: undefined as any, password: undefined as any },
        { name: '  ', email: '  ', password: '  ' }, // Whitespace
        { name: 'A'.repeat(101), email: 'test@example.com', password: 'ValidPass123!' }, // Very long name
      ];

      edgeCases.forEach(input => {
        expect(() => {
          const result = FormValidator.validateRegistrationForm(input);
          expect(typeof result.isValid).toBe('boolean');
          expect(typeof result.errors).toBe('object');
        }).not.toThrow();
      });
    });
  });
});