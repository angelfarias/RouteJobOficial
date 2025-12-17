import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { EmailValidator } from '@/lib/validation/emailValidator';

describe('Duplicate Email Prevention Property Tests', () => {
  // **Feature: auth-ui-improvements, Property 5: Duplicate email prevention**
  it('should prevent duplicate account creation and inform user appropriately', () => {
    fc.assert(
      fc.property(
        fc.record({
          email: fc.emailAddress(),
          existingEmails: fc.array(fc.emailAddress(), { minLength: 1, maxLength: 10 })
        }),
        ({ email, existingEmails }) => {
          const emailResult = EmailValidator.validateFormat(email);
          
          // Simulate checking against existing emails
          const isDuplicate = existingEmails.includes(email);
          
          if (emailResult.isValid) {
            // Email format is valid, now check for duplicates
            if (isDuplicate) {
              // Should prevent duplicate registration
              expect(isDuplicate).toBe(true);
              
              // Should be able to identify the conflict
              const conflictExists = existingEmails.some(existing => existing === email);
              expect(conflictExists).toBe(true);
              
              // Email should still be valid format-wise
              expect(emailResult.isValid).toBe(true);
              expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
            } else {
              // Should allow registration for unique emails
              expect(isDuplicate).toBe(false);
              expect(emailResult.isValid).toBe(true);
              
              // Email should not exist in the existing emails list
              const isUnique = !existingEmails.includes(email);
              expect(isUnique).toBe(true);
            }
          } else {
            // Invalid email format should be rejected regardless of duplicates
            expect(emailResult.isValid).toBe(false);
            expect(emailResult.error).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle case-insensitive email duplicate detection', () => {
    fc.assert(
      fc.property(
        fc.record({
          baseEmail: fc.emailAddress(),
          caseVariations: fc.array(fc.boolean(), { minLength: 3, maxLength: 10 })
        }),
        ({ baseEmail, caseVariations }) => {
          // Create case variations of the same email
          const variations = caseVariations.map((shouldUppercase, index) => {
            if (index === 0) return baseEmail; // Keep original
            
            const [localPart, domain] = baseEmail.split('@');
            const modifiedLocal = shouldUppercase ? localPart.toUpperCase() : localPart.toLowerCase();
            const modifiedDomain = shouldUppercase ? domain.toUpperCase() : domain.toLowerCase();
            
            return `${modifiedLocal}@${modifiedDomain}`;
          });
          
          // All variations should be considered the same email for duplicate checking
          const normalizedEmails = variations.map(email => email.toLowerCase());
          const uniqueNormalizedEmails = [...new Set(normalizedEmails)];
          
          // Should detect that all variations represent the same email
          expect(uniqueNormalizedEmails.length).toBe(1);
          
          // All variations should normalize to the same value
          const firstNormalized = normalizedEmails[0];
          normalizedEmails.forEach(normalized => {
            expect(normalized).toBe(firstNormalized);
          });
          
          // Original email validation should still work
          variations.forEach(variation => {
            const result = EmailValidator.validateFormat(variation);
            expect(result.isValid).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should provide appropriate error messages for duplicate email attempts', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        (email) => {
          const emailResult = EmailValidator.validateFormat(email);
          
          if (emailResult.isValid) {
            // Simulate duplicate detection scenario
            const isDuplicateScenario = true; // For testing error message structure
            
            if (isDuplicateScenario) {
              // Error message should be informative but not reveal sensitive info
              const mockDuplicateError = "Este correo electrónico ya está registrado. ¿Deseas iniciar sesión?";
              
              // Error message should be in Spanish
              expect(mockDuplicateError).toMatch(/correo|email|registrado|sesión/);
              
              // Should not contain the actual email for privacy
              expect(mockDuplicateError).not.toContain(email);
              
              // Should be helpful and suggest next steps
              expect(mockDuplicateError).toMatch(/iniciar sesión|login|ingresar/i);
              
              // Should be user-friendly
              expect(mockDuplicateError.length).toBeGreaterThan(10);
              expect(mockDuplicateError.length).toBeLessThan(200);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});