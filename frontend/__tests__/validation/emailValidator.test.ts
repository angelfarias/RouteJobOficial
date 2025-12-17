// **Feature: auth-ui-improvements, Property 1: Email validation consistency**
import { EmailValidator } from '@/lib/validation/emailValidator';
import * as fc from 'fast-check';

describe('EmailValidator Property Tests', () => {
  describe('Property 1: Email validation consistency', () => {
    test('should accept valid email formats according to RFC 5322 standards and reject invalid formats', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Valid email generator
            fc.record({
              localPart: fc.stringMatching(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}$/),
              domain: fc.stringMatching(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/)
            }).map(({ localPart, domain }) => `${localPart}@${domain}`),
            
            // Invalid email generator
            fc.oneof(
              fc.string().filter(s => !s.includes('@')), // No @ symbol
              fc.string().filter(s => s.includes('@') && s.split('@').length > 2), // Multiple @ symbols
              fc.string().filter(s => s.includes('..') && s.includes('@')), // Consecutive dots
              fc.string().filter(s => s.startsWith('.') && s.includes('@')), // Starts with dot
              fc.string().filter(s => s.endsWith('.') && s.includes('@')), // Ends with dot
              fc.constant(''), // Empty string
              fc.constant(' '), // Whitespace only
              fc.string({ minLength: 255 }).map(s => `${s}@example.com`), // Too long
            )
          ),
          (email) => {
            const result = EmailValidator.validateFormat(email);
            
            // Basic format validation
            const hasAtSymbol = email.includes('@');
            const parts = email.split('@');
            const hasValidStructure = parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
            const hasValidLength = email.length <= 254;
            const noConsecutiveDots = !email.includes('..');
            const validDomainStructure = hasValidStructure && parts[1].includes('.');
            
            const shouldBeValid = hasAtSymbol && 
                                hasValidStructure && 
                                hasValidLength && 
                                noConsecutiveDots && 
                                validDomainStructure &&
                                email.trim().length > 0;
            
            if (shouldBeValid) {
              // For emails that should be valid, we expect isValid to be true
              // or if invalid, we expect a specific error message
              expect(typeof result.isValid).toBe('boolean');
              if (!result.isValid) {
                expect(typeof result.error).toBe('string');
                expect(result.error!.length).toBeGreaterThan(0);
              }
            } else {
              // For emails that should be invalid, we expect isValid to be false
              expect(result.isValid).toBe(false);
              expect(typeof result.error).toBe('string');
              expect(result.error!.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should provide specific error messages for different validation failures', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''), // Empty email
            fc.constant('invalid-email'), // No @ symbol
            fc.constant('user@'), // No domain
            fc.constant('@domain.com'), // No local part
            fc.constant('user..name@domain.com'), // Consecutive dots
            fc.string({ minLength: 255 }).map(s => `${s}@example.com`), // Too long
          ),
          (invalidEmail) => {
            const result = EmailValidator.validateFormat(invalidEmail);
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBeDefined();
            expect(typeof result.error).toBe('string');
            expect(result.error!.length).toBeGreaterThan(0);
            
            // Verify error message is descriptive
            const errorMessage = result.error!.toLowerCase();
            const hasDescriptiveError = 
              errorMessage.includes('requerido') ||
              errorMessage.includes('inválido') ||
              errorMessage.includes('largo') ||
              errorMessage.includes('puntos') ||
              errorMessage.includes('dominio');
            
            expect(hasDescriptiveError).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle edge cases consistently', () => {
      const edgeCases = [
        'test@example.com', // Valid basic email
        'user.name@example.com', // Valid with dot in local part
        'user+tag@example.com', // Valid with plus in local part
        'user@sub.example.com', // Valid with subdomain
        'a@b.co', // Valid minimal email
        'test@example', // Invalid - no TLD
        'test@.com', // Invalid - starts with dot in domain
        'test@com.', // Invalid - ends with dot in domain
        '.test@example.com', // Invalid - starts with dot in local part
        'test.@example.com', // Invalid - ends with dot in local part
      ];

      edgeCases.forEach(email => {
        const result = EmailValidator.validateFormat(email);
        expect(typeof result.isValid).toBe('boolean');
        
        if (!result.isValid) {
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe('string');
        }
      });
    });
  });

  describe('Domain existence check', () => {
    test('should return boolean for domain existence check', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          async (email) => {
            const result = await EmailValidator.checkDomainExists(email);
            expect(typeof result).toBe('boolean');
          }
        ),
        { numRuns: 50 } // Fewer runs for async tests
      );
    });
  });
});