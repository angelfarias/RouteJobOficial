import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { PasswordValidator } from '@/lib/validation/passwordValidator';

describe('Password Validator Property Tests', () => {
  // **Feature: auth-ui-improvements, Property 2: Password strength enforcement**
  it('should require at least 8 characters including letters, numbers, and symbols', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Strong passwords (should pass)
          fc.constantFrom(
            'Password123!',
            'MySecure@Pass1',
            'Strong#Pass99',
            'Complex$Word7',
            'Secure&Test123'
          ),
          
          // Weak passwords (should fail)
          fc.oneof(
            fc.string({ maxLength: 7 }), // Too short
            fc.constantFrom('password', 'PASSWORD', '12345678', '!@#$%^&*'), // Missing requirements
            fc.string({ minLength: 8, maxLength: 15 }).filter(s => /^[a-z]+$/.test(s)), // Only lowercase
            fc.string({ minLength: 8, maxLength: 15 }).filter(s => /^[A-Z]+$/.test(s)), // Only uppercase
            fc.string({ minLength: 8, maxLength: 15 }).filter(s => /^[0-9]+$/.test(s)), // Only numbers
          )
        ),
        (password) => {
          const result = PasswordValidator.validateStrength(password);
          
          if (isStrongPassword(password)) {
            expect(result.isValid).toBe(true);
            expect(result.score).toBeGreaterThanOrEqual(3);
            expect(result.missingRequirements).toHaveLength(0);
          } else {
            expect(result.isValid).toBe(false);
            expect(result.missingRequirements.length).toBeGreaterThan(0);
            
            // Verify specific missing requirements are reported
            if (password.length < 8) {
              expect(result.missingRequirements.some(req => 
                req.includes('8') || req.includes('caracteres')
              )).toBe(true);
            }
            
            if (!/[a-z]/.test(password)) {
              expect(result.missingRequirements.some(req => 
                req.includes('minúscula')
              )).toBe(true);
            }
            
            if (!/[A-Z]/.test(password)) {
              expect(result.missingRequirements.some(req => 
                req.includes('mayúscula')
              )).toBe(true);
            }
            
            if (!/[0-9]/.test(password)) {
              expect(result.missingRequirements.some(req => 
                req.includes('número')
              )).toBe(true);
            }
            
            if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
              expect(result.missingRequirements.some(req => 
                req.includes('símbolo')
              )).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Helper function to determine if a password meets all strength requirements
function isStrongPassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) return false;
  return true;
}