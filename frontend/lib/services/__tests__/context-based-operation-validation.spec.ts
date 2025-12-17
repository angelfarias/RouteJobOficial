// frontend/lib/services/__tests__/context-based-operation-validation.spec.ts
import * as fc from 'fast-check';
import { DataIsolationService } from '../dataIsolation.service';
import { ContextValidationMiddleware } from '../../middleware/contextValidation.middleware';
import { ProfileType } from '../../types/unified-email.types';

/**
 * Property Test 8.2: Context-based operation validation
 * Validates: Requirements 5.5
 * 
 * Property: The system should validate that actions are appropriate for the 
 * current profile type context and prevent operations that don't match the active role.
 */

describe('Context-Based Operation Validation Properties', () => {
  beforeEach(() => {
    // Clear any existing logs
    ContextValidationMiddleware.clearLogs();
  });

  /**
   * Property 20: Context-based operation validation
   */
  it('should validate operations are appropriate for current profile type context', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // userId
        fc.constantFrom('candidate', 'company'), // activeRole
        fc.constantFrom(
          'job-application-create', 'job-application-update', 'job-application-view',
          'job-posting-create', 'job-posting-update', 'job-posting-view',
          'candidate-review', 'profile-update-candidate', 'profile-update-company'
        ), // operation
        fc.record({
          hasRequiredData: fc.boolean(),
          hasValidUserId: fc.boolean(),
          hasRoleSpecificData: fc.boolean()
        }), // operationContext
        (userId, activeRole, operation, operationContext) => {
          // Create operation data based on context
          const requestData = createOperationData(operation, operationContext, userId);

          // Create operation context
          const context = {
            userId: operationContext.hasValidUserId ? userId : 'invalid-user',
            activeRole,
            operation,
            targetResource: extractResourceType(operation),
            requestData
          };

          // Validate the operation
          const result = DataIsolationService.validateOperation(context);

          // Property: Role-appropriate operations should pass role validation
          const isRoleAppropriate = checkRoleAppropriateness(operation, activeRole);
          
          if (isRoleAppropriate) {
            // Should not fail due to role mismatch
            expect(result.errors.some(error => 
              error.includes('no permitida para rol') || 
              error.includes('not allowed for role')
            )).toBe(false);
          } else {
            // Should fail due to role mismatch
            expect(result.errors.some(error => 
              error.includes('no permitida para rol') || 
              error.includes('not allowed for role')
            )).toBe(true);
          }

          // Property: Operations with invalid user context should fail
          if (!operationContext.hasValidUserId) {
            expect(result.isValid).toBe(false);
          }

          // Property: Operations should validate required data presence
          if (isRoleAppropriate && operationContext.hasValidUserId) {
            const hasRequiredFields = checkRequiredFields(operation, requestData);
            if (!hasRequiredFields) {
              expect(result.errors.some(error => 
                error.includes('requerido') || error.includes('required')
              )).toBe(true);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should prevent cross-profile operation execution', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // userId
        fc.constantFrom('candidate', 'company'), // activeRole
        fc.constantFrom('candidate', 'company'), // targetProfileType
        fc.constantFrom(
          'profile-update', 'data-access', 'operation-execution'
        ), // operationType
        (userId, activeRole, targetProfileType, operationType) => {
          // Skip same-profile operations (these should be allowed)
          fc.pre(activeRole !== targetProfileType);

          // Test cross-profile access validation
          const crossProfileResult = DataIsolationService.validateCrossProfileAccess(
            activeRole,
            targetProfileType,
            `${activeRole}-accessing-${targetProfileType}-${operationType}`
          );

          // Property: Cross-profile access should be blocked
          expect(crossProfileResult.isValid).toBe(false);
          expect(crossProfileResult.errors.length).toBeGreaterThan(0);
          expect(crossProfileResult.errors.some(error => 
            error.includes('cruzado') || error.includes('cross')
          )).toBe(true);

          // Property: Error message should specify the violation
          expect(crossProfileResult.errors.some(error => 
            error.includes(activeRole) && error.includes(targetProfileType)
          )).toBe(true);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should validate operation sequences maintain context consistency', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // userId
        fc.constantFrom('candidate', 'company'), // activeRole
        fc.array(
          fc.record({
            operation: fc.constantFrom(
              'job-application-create', 'job-posting-create', 
              'profile-update-candidate', 'profile-update-company'
            ),
            data: fc.record({
              field1: fc.string(),
              field2: fc.string()
            })
          }),
          { minLength: 2, maxLength: 5 }
        ), // operationSequence
        async (userId, activeRole, operationSequence) => {
          const context = {
            userId,
            activeRole,
            sessionId: 'test-session',
            timestamp: Date.now()
          };

          // Convert to protected operations
          const protectedOperations = operationSequence.map(({ operation, data }) => ({
            operation: {
              name: operation,
              allowedRoles: getRoleForOperation(operation),
              validateData: true,
              logAccess: true
            },
            data
          }));

          // Validate batch operations
          const batchResult = await ContextValidationMiddleware.validateBatch(
            context,
            protectedOperations
          );

          // Property: All role-appropriate operations should be valid
          const appropriateOperations = protectedOperations.filter(({ operation }) => 
            checkRoleAppropriateness(operation.name, activeRole)
          );

          const inappropriateOperations = protectedOperations.filter(({ operation }) => 
            !checkRoleAppropriateness(operation.name, activeRole)
          );

          // Property: Appropriate operations should pass validation
          const appropriateResults = batchResult.results.filter((result, index) => 
            checkRoleAppropriateness(protectedOperations[index].operation.name, activeRole)
          );

          if (appropriateOperations.length > 0) {
            expect(appropriateResults.some(result => result.result.isValid)).toBe(true);
          }

          // Property: Inappropriate operations should fail validation
          const inappropriateResults = batchResult.results.filter((result, index) => 
            !checkRoleAppropriateness(protectedOperations[index].operation.name, activeRole)
          );

          inappropriateResults.forEach(result => {
            expect(result.result.isValid).toBe(false);
          });

          // Property: Batch should not be all valid if there are inappropriate operations
          if (inappropriateOperations.length > 0) {
            expect(batchResult.allValid).toBe(false);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should enforce context-specific data validation rules', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('candidate', 'company'), // activeRole
        fc.record({
          // Data that should be validated differently based on context
          userId: fc.string({ minLength: 1 }),
          profileData: fc.record({
            candidateFields: fc.record({
              personalInfo: fc.record({ name: fc.string() }),
              skills: fc.array(fc.string())
            }),
            companyFields: fc.record({
              companyInfo: fc.record({ name: fc.string() }),
              jobPostings: fc.array(fc.string())
            })
          }),
          operationMetadata: fc.record({
            timestamp: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
            source: fc.constantFrom('web', 'mobile', 'api')
          })
        }), // contextData
        (activeRole, contextData) => {
          // Test profile update validation with context-specific rules
          const profileUpdateResult = DataIsolationService.validateProfileUpdate(
            contextData.userId,
            activeRole,
            contextData.profileData
          );

          // Property: Context should determine which fields are allowed
          if (activeRole === 'candidate') {
            // Candidate context should allow candidate fields
            expect(profileUpdateResult.errors.some(error => 
              error.includes('personalInfo') && error.includes('prohibido')
            )).toBe(false);

            // But should reject company fields
            expect(profileUpdateResult.errors.some(error => 
              error.includes('companyInfo') || error.includes('jobPostings')
            )).toBe(true);
          } else {
            // Company context should allow company fields
            expect(profileUpdateResult.errors.some(error => 
              error.includes('companyInfo') && error.includes('prohibido')
            )).toBe(false);

            // But should reject candidate fields
            expect(profileUpdateResult.errors.some(error => 
              error.includes('personalInfo') || error.includes('skills')
            )).toBe(true);
          }

          // Property: User ID validation should be context-independent
          if (!contextData.userId || contextData.userId.trim() === '') {
            expect(profileUpdateResult.errors.some(error => 
              error.includes('userId') || error.includes('usuario')
            )).toBe(true);
          }
        }
      ),
      { numRuns: 35 }
    );
  });

  it('should maintain validation consistency across role switches', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // userId
        fc.array(fc.constantFrom('candidate', 'company'), { minLength: 2, maxLength: 4 }), // roleSequence
        fc.constantFrom(
          'profile-view', 'data-access', 'operation-check'
        ), // operationType
        (userId, roleSequence, operationType) => {
          const validationResults: Array<{
            role: ProfileType;
            allowedOperations: string[];
            validationConsistent: boolean;
          }> = [];

          // Test validation consistency across role switches
          roleSequence.forEach(role => {
            const allowedOperations = DataIsolationService.getAllowedOperations(role);
            
            // Check if validation is consistent for this role
            const consistencyChecks = allowedOperations.map(operation => {
              const firstCheck = DataIsolationService.isOperationAllowed(operation, role, 'any');
              const secondCheck = DataIsolationService.isOperationAllowed(operation, role, 'any');
              return firstCheck === secondCheck;
            });

            const validationConsistent = consistencyChecks.every(check => check);

            validationResults.push({
              role,
              allowedOperations,
              validationConsistent
            });
          });

          // Property: Validation should be consistent for each role
          validationResults.forEach(result => {
            expect(result.validationConsistent).toBe(true);
          });

          // Property: Role-specific operations should be different between roles
          const candidateResults = validationResults.filter(r => r.role === 'candidate');
          const companyResults = validationResults.filter(r => r.role === 'company');

          if (candidateResults.length > 0 && companyResults.length > 0) {
            const candidateOps = new Set(candidateResults[0].allowedOperations);
            const companyOps = new Set(companyResults[0].allowedOperations);
            
            // Should have some different operations
            const hasUniqueOperations = 
              [...candidateOps].some(op => !companyOps.has(op)) ||
              [...companyOps].some(op => !candidateOps.has(op));
            
            expect(hasUniqueOperations).toBe(true);
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  it('should validate operation authorization with proper error messages', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // userId
        fc.constantFrom('candidate', 'company'), // activeRole
        fc.constantFrom('candidate', 'company'), // requiredRole
        fc.string({ minLength: 1 }), // operationName
        (userId, activeRole, requiredRole, operationName) => {
          // Create a protected operation with specific role requirement
          const protectedOperation = {
            name: operationName,
            requiredRole,
            validateData: false,
            logAccess: true
          };

          const context = {
            userId,
            activeRole,
            sessionId: 'test-session',
            timestamp: Date.now()
          };

          // Test middleware validation
          const middleware = ContextValidationMiddleware.createProtectionMiddleware(protectedOperation);
          
          return middleware(context).then(({ allowed, result }) => {
            // Property: Should allow operation when roles match
            if (activeRole === requiredRole) {
              expect(allowed).toBe(true);
              expect(result.isValid).toBe(true);
            } else {
              // Property: Should block operation when roles don't match
              expect(allowed).toBe(false);
              expect(result.isValid).toBe(false);
              
              // Property: Error message should be informative
              expect(result.errors.some(error => 
                error.includes(operationName) && 
                error.includes(requiredRole) && 
                error.includes(activeRole)
              )).toBe(true);
            }

            // Property: Result should always have proper structure
            expect(result).toHaveProperty('isValid');
            expect(result).toHaveProperty('errors');
            expect(result).toHaveProperty('warnings');
            expect(Array.isArray(result.errors)).toBe(true);
            expect(Array.isArray(result.warnings)).toBe(true);
          });
        }
      ),
      { numRuns: 30 }
    );
  });
});

// Helper functions
function createOperationData(operation: string, context: any, userId: string): any {
  const baseData = context.hasValidUserId ? { userId } : { userId: 'invalid' };
  
  if (operation.includes('job-application')) {
    return {
      ...baseData,
      candidateId: context.hasRequiredData ? userId : undefined,
      jobId: context.hasRequiredData ? 'job-123' : undefined,
      personalInfo: context.hasRoleSpecificData ? { name: 'Test' } : undefined
    };
  }
  
  if (operation.includes('job-posting')) {
    return {
      ...baseData,
      companyId: context.hasRequiredData ? userId : undefined,
      jobDetails: context.hasRequiredData ? { title: 'Test Job' } : undefined,
      companyInfo: context.hasRoleSpecificData ? { name: 'Test Company' } : undefined
    };
  }
  
  return baseData;
}

function extractResourceType(operation: string): string {
  if (operation.includes('job-application')) return 'job-application';
  if (operation.includes('job-posting')) return 'job-posting';
  if (operation.includes('profile')) return 'profile';
  return 'unknown';
}

function checkRoleAppropriateness(operation: string, role: ProfileType): boolean {
  if (role === 'candidate') {
    return operation.includes('candidate') || operation.includes('job-application');
  } else {
    return operation.includes('company') || operation.includes('job-posting');
  }
}

function checkRequiredFields(operation: string, data: any): boolean {
  if (operation.includes('job-application')) {
    return data?.candidateId && data?.jobId;
  }
  if (operation.includes('job-posting')) {
    return data?.companyId && data?.jobDetails;
  }
  return data?.userId;
}

function getRoleForOperation(operation: string): ProfileType[] {
  if (operation.includes('candidate') || operation.includes('job-application')) {
    return ['candidate'];
  }
  if (operation.includes('company') || operation.includes('job-posting')) {
    return ['company'];
  }
  return ['candidate', 'company'];
}