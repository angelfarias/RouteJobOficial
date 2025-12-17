import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { EmailValidator } from '@/lib/validation/emailValidator';
import { PasswordValidator } from '@/lib/validation/passwordValidator';

describe('Validation Error Messaging Property Tests', () => {
  // **Feature: auth-ui-improvements, Property 3: Validation error messaging**
  it('should provide specific error messages indicating exactly which requirements are not met', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.oneof(
            fc.string().filter(s => !s.includes('@')), // Invalid email
            fc.constantFrom('', 'invalid', '@invalid', 'invalid@', 'test@.com', 'test..test@example.com')
          ),
          password: fc.oneof(
            fc.string({ maxLength: 7 }), // Too short
            fc.string({ minLength: 8, maxLength: 15 }).filter(s => /^[a-z]+$/.test(s)), // Only lowercase letters
            fc.string({ minLength: 8, maxLength: 15 }).filter(s => /^[0-9]+$/.test(s)), // Only numbers
            fc.constantFrom('password', '12345678', 'PASSWORD', '!@#$%^&*')
          )
        }),
        ({ email, password }) => {
          const emailResult = EmailValidator.validateFormat(email);
          const passwordResult = PasswordValidator.validateStrength(password);
          
          // Email validation should provide specific error messages
          if (!emailResult.isValid) {
            expect(emailResult.error).toBeDefined();
            expect(emailResult.error!.length).toBeGreaterThan(0);
            
            // Error messages should be in Spanish and descriptive
            const error = emailResult.error!;
            expect(typeof error).toBe('string');
            expect(
              error.includes('correo') || 
              error.includes('email') || 
              error.includes('formato') || 
              error.includes('válido') ||
              error.includes('requerido') ||
              error.includes('inválido') ||
              error.includes('largo')
            ).toBe(true);
          }
          
          // Password validation should provide specific error messages
          if (!passwordResult.isValid) {
            expect(passwordResult.missingRequirements).toBeDefined();
            expect(passwordResult.missingRequirements.length).toBeGreaterThan(0);
            
            // Each missing requirement should be clearly described
            passwordResult.missingRequirements.forEach(requirement => {
              expect(typeof requirement).toBe('string');
              expect(requirement.length).toBeGreaterThan(0);
              
              // Should mention specific requirements
              const mentionsRequirement = 
                requirement.includes('caracteres') ||
                requirement.includes('minúscula') ||
                requirement.includes('mayúscula') ||
                requirement.includes('número') ||
                requirement.includes('símbolo');
              
              expect(mentionsRequirement).toBe(true);
            });
            
            // Feedback should be constructive
            expect(passwordResult.feedback).toBeDefined();
            expect(Array.isArray(passwordResult.feedback)).toBe(true);
            
            if (passwordResult.feedback.length > 0) {
              passwordResult.feedback.forEach(feedback => {
                expect(typeof feedback).toBe('string');
                expect(feedback.length).toBeGreaterThan(0);
              });
            }
          }
          
          // Error messages should not contain sensitive information
          const allMessages = [
            ...(emailResult.error ? [emailResult.error] : []),
            ...passwordResult.missingRequirements,
            ...passwordResult.feedback
          ];
          
          allMessages.forEach(message => {
            expect(message).not.toContain(password); // Don't echo back the password
            // Only check for email if it's not empty (empty string would always be contained)
            if (email.length > 0) {
              expect(message).not.toContain(email); // Don't echo back the email in error
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});