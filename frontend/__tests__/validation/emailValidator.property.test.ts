import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { EmailValidator } from '@/lib/validation/emailValidator';

describe('Email Validator Property Tests', () => {
  // **Feature: auth-ui-improvements, Property 1: Email validation consistency**
  it('should consistently validate email formats according to RFC 5322 standards', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Valid email patterns
          fc.emailAddress(),
          
          // Invalid email patterns
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('@')), // No @ symbol
            fc.constantFrom('', ' ', '@', '@.', '.@', '@@', 'test@', '@test.com', 'test..test@example.com'),
            fc.string({ minLength: 1, maxLength: 10 }).map(s => `${s}@`), // Missing domain
            fc.string({ minLength: 1, maxLength: 10 }).map(s => `@${s}`), // Missing local part
          )
        ),
        (email) => {
          const result = EmailValidator.validateFormat(email);
          
          // Valid emails should pass validation
          if (isValidEmailPattern(email)) {
            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
          } else {
            // Invalid emails should fail validation with appropriate error messages
            expect(result.isValid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error!.length).toBeGreaterThan(0);
            expect(
              result.error!.includes('formato') || 
              result.error!.includes('válido') || 
              result.error!.includes('correo') ||
              result.error!.includes('requerido') ||
              result.error!.includes('inválido') ||
              result.error!.includes('largo')
            ).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Helper function to determine if an email pattern should be considered valid
function isValidEmailPattern(email: string): boolean {
  if (!email || email.trim().length === 0) {
    return false;
  }

  const trimmedEmail = email.trim();
  
  // Check length constraints
  if (trimmedEmail.length > 254) {
    return false;
  }

  // Basic RFC 5322 compliant email regex (same as in EmailValidator)
  const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return false;
  }

  // Check for consecutive dots
  if (trimmedEmail.includes('..')) {
    return false;
  }

  // Check local part length (before @)
  const [localPart, domain] = trimmedEmail.split('@');
  if (!localPart || localPart.length > 64) {
    return false;
  }

  // Check domain part
  if (!domain || domain.length > 253) {
    return false;
  }

  // Check for valid domain structure
  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return false;
  }

  // Check each domain part
  for (const part of domainParts) {
    if (part.length === 0 || part.length > 63) {
      return false;
    }
  }

  return true;
}