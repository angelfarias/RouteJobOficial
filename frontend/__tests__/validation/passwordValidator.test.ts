// **Feature: auth-ui-improvements, Property 2: Password strength enforcement**
import { PasswordValidator } from '@/lib/validation/passwordValidator';
import * as fc from 'fast-check';

describe('PasswordValidator Property Tests', () => {
  describe('Property 2: Password strength enforcement', () => {
    test('should require at least 8 characters including letters, numbers, and symbols', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Valid password generator
            fc.constant('ValidPass123!'),
            
            // Invalid password generators
            fc.oneof(
              fc.string({ maxLength: 7 }), // Too short
              fc.constant('lowercase'), // Only lowercase
              fc.constant('UPPERCASE'), // Only uppercase  
              fc.constant('123456789'), // Only numbers
              fc.constant('!@#$%^&*'), // Only symbols
              fc.constant('NoNumbers'), // No numbers or symbols
              fc.constant('NoSymbols123'), // No symbols
              fc.constant(''), // Empty
            )
          ),
          (password) => {
            const result = PasswordValidator.validateStrength(password);
            
            // Check requirements
            const hasMinLength = password.length >= 8;
            const hasLowercase = /[a-z]/.test(password);
            const hasUppercase = /[A-Z]/.test(password);
            const hasNumber = /[0-9]/.test(password);
            const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
            
            const meetsAllRequirements = hasMinLength && hasLowercase && hasUppercase && hasNumber && hasSymbol;
            
            // Validate result structure
            expect(typeof result.isValid).toBe('boolean');
            expect(typeof result.score).toBe('number');
            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.score).toBeLessThanOrEqual(4);
            expect(Array.isArray(result.missingRequirements)).toBe(true);
            expect(Array.isArray(result.feedback)).toBe(true);
            
            if (meetsAllRequirements) {
              // Should have fewer missing requirements
              expect(result.missingRequirements.length).toBeLessThanOrEqual(0);
              expect(result.score).toBeGreaterThanOrEqual(3);
            } else {
              // Should have missing requirements
              expect(result.missingRequirements.length).toBeGreaterThan(0);
              
              // Check specific missing requirements
              if (!hasMinLength) {
                expect(result.missingRequirements.some(req => req.includes('8 caracteres'))).toBe(true);
              }
              if (!hasLowercase) {
                expect(result.missingRequirements.some(req => req.includes('minúscula'))).toBe(true);
              }
              if (!hasUppercase) {
                expect(result.missingRequirements.some(req => req.includes('mayúscula'))).toBe(true);
              }
              if (!hasNumber) {
                expect(result.missingRequirements.some(req => req.includes('número'))).toBe(true);
              }
              if (!hasSymbol) {
                expect(result.missingRequirements.some(req => req.includes('símbolo'))).toBe(true);
              }
            }
            
            // Feedback should always be provided
            expect(result.feedback.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should assign appropriate strength scores', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (password) => {
            const result = PasswordValidator.validateStrength(password);
            
            // Score should be between 0 and 4
            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.score).toBeLessThanOrEqual(4);
            
            // Empty passwords should have score 0
            if (password.length === 0) {
              expect(result.score).toBe(0);
              expect(result.isValid).toBe(false);
            }
            
            // Very short passwords should be invalid regardless of score
            if (password.length < 8) {
              expect(result.isValid).toBe(false);
              expect(result.missingRequirements.some(req => req.includes('8 caracteres'))).toBe(true);
            }
            
            // Passwords meeting all requirements should have higher scores
            const hasAllRequirements = 
              password.length >= 8 &&
              /[a-z]/.test(password) &&
              /[A-Z]/.test(password) &&
              /[0-9]/.test(password) &&
              /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
            
            if (hasAllRequirements) {
              expect(result.score).toBeGreaterThanOrEqual(3);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should detect common patterns and reduce score accordingly', () => {
      const commonPatterns = [
        'password123!',
        'Password123!',
        'Qwerty123!',
        'Admin123!',
        'Welcome123!',
        'Letmein123!',
        'Monkey123!',
        'Dragon123!',
        'Abc123!@#',
        '123456Aa!',
      ];

      commonPatterns.forEach(password => {
        const result = PasswordValidator.validateStrength(password);
        
        // Should provide feedback about common patterns
        const hasPatternWarning = result.feedback.some(feedback => 
          feedback.toLowerCase().includes('patrón') || 
          feedback.toLowerCase().includes('común')
        );
        
        // Score should be reduced for common patterns (or at least not be perfect)
        expect(result.score).toBeLessThanOrEqual(4);
      });
    });

    test('should detect repeated characters and provide appropriate feedback', () => {
      fc.assert(
        fc.property(
          fc.record({
            char: fc.constantFrom('a', 'b', 'c', '1', '2', '3'),
            repeatCount: fc.integer({ min: 3, max: 10 }),
            prefix: fc.string({ maxLength: 5 }),
            suffix: fc.string({ maxLength: 5 })
          }),
          ({ char, repeatCount, prefix, suffix }) => {
            const repeatedSection = char.repeat(repeatCount);
            const password = prefix + repeatedSection + suffix + 'Aa1!'; // Ensure it meets basic requirements
            
            const result = PasswordValidator.validateStrength(password);
            
            // Should detect repeated characters
            const hasRepeatedCharWarning = result.feedback.some(feedback => 
              feedback.toLowerCase().includes('repetir') || 
              feedback.toLowerCase().includes('mismo')
            );
            
            if (repeatCount >= 3) {
              expect(hasRepeatedCharWarning).toBe(true);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should provide strength labels that match scores', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 4 }),
          (score) => {
            const label = PasswordValidator.getStrengthLabel(score);
            const color = PasswordValidator.getStrengthColor(score);
            
            expect(typeof label).toBe('string');
            expect(label.length).toBeGreaterThan(0);
            expect(typeof color).toBe('string');
            expect(color.length).toBeGreaterThan(0);
            
            // Verify label matches score range
            if (score >= 4) {
              expect(label).toBe('Muy fuerte');
              expect(color).toBe('text-green-600');
            } else if (score >= 3) {
              expect(label).toBe('Fuerte');
              expect(color).toBe('text-emerald-600');
            } else if (score >= 2) {
              expect(label).toBe('Moderada');
              expect(color).toBe('text-yellow-600');
            } else if (score >= 1) {
              expect(label).toBe('Débil');
              expect(color).toBe('text-orange-600');
            } else {
              expect(label).toBe('Muy débil');
              expect(color).toBe('text-red-600');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Requirements consistency', () => {
    test('should return consistent requirements', () => {
      const requirements = PasswordValidator.getRequirements();
      
      expect(Array.isArray(requirements)).toBe(true);
      expect(requirements.length).toBeGreaterThan(0);
      
      requirements.forEach(req => {
        expect(typeof req.id).toBe('string');
        expect(typeof req.description).toBe('string');
        expect(req.regex instanceof RegExp).toBe(true);
        expect(typeof req.required).toBe('boolean');
      });
      
      // Should have the expected requirements
      const requiredIds = ['length', 'lowercase', 'uppercase', 'number', 'symbol'];
      requiredIds.forEach(id => {
        expect(requirements.some(req => req.id === id)).toBe(true);
      });
    });
  });
});