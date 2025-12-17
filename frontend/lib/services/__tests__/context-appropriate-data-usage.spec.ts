// frontend/lib/services/__tests__/context-appropriate-data-usage.spec.ts
import * as fc from 'fast-check';
import { DataIsolationService } from '../dataIsolation.service';
import { ProfileType } from '../../types/unified-email.types';

/**
 * Property Test 8.1: Context-appropriate data usage
 * Validates: Requirements 5.2, 5.3
 * 
 * Property: Job applications should only use candidate profile data and prevent 
 * company profile information from interfering. Job postings should only use 
 * company profile data and prevent candidate profile information from interfering.
 */

describe('Context-Appropriate Data Usage Properties', () => {
  /**
   * Property 18: Context-appropriate data usage
   */
  it('should only allow candidate data in job application operations', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // userId
        fc.record({
          // Candidate data (should be allowed)
          candidateId: fc.string({ minLength: 1 }),
          personalInfo: fc.record({
            firstName: fc.string({ minLength: 1 }),
            lastName: fc.string({ minLength: 1 }),
            email: fc.emailAddress()
          }),
          professionalInfo: fc.record({
            skills: fc.array(fc.string({ minLength: 1 }), { minLength: 1 }),
            experience: fc.string()
          }),
          // Company data (should be forbidden)
          companyInfo: fc.option(fc.record({
            name: fc.string({ minLength: 1 }),
            industry: fc.string()
          }), { nil: undefined }),
          jobPostings: fc.option(fc.array(fc.string()), { nil: undefined }),
          employerData: fc.option(fc.record({
            companyId: fc.string(),
            role: fc.string()
          }), { nil: undefined })
        }), // applicationData
        (userId, applicationData) => {
          // Test job application validation
          const result = DataIsolationService.validateJobApplication(
            userId,
            'candidate',
            applicationData
          );

          // Property: Should allow candidate-specific data
          if (applicationData.candidateId && applicationData.personalInfo && applicationData.professionalInfo) {
            // If only candidate data is present, validation should pass or have minimal errors
            const hasForbiddenData = applicationData.companyInfo || 
                                   applicationData.jobPostings || 
                                   applicationData.employerData;
            
            if (!hasForbiddenData) {
              // Should be valid or have only minor validation issues
              expect(result.errors.filter(error => 
                !error.includes('Campo requerido') // Allow required field errors
              ).length).toBe(0);
            }
          }

          // Property: Should reject company-specific data
          if (applicationData.companyInfo) {
            expect(result.errors.some(error => 
              error.includes('companyInfo') || error.includes('empresa')
            )).toBe(true);
          }

          if (applicationData.jobPostings) {
            expect(result.errors.some(error => 
              error.includes('jobPostings') || error.includes('empleo')
            )).toBe(true);
          }

          if (applicationData.employerData) {
            expect(result.errors.some(error => 
              error.includes('employerData') || error.includes('empleador')
            )).toBe(true);
          }

          // Property: Sanitized data should not contain forbidden fields
          if (result.sanitizedData) {
            expect(result.sanitizedData.companyInfo).toBeUndefined();
            expect(result.sanitizedData.jobPostings).toBeUndefined();
            expect(result.sanitizedData.employerData).toBeUndefined();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should only allow company data in job posting operations', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // userId
        fc.record({
          // Company data (should be allowed)
          companyId: fc.string({ minLength: 1 }),
          companyInfo: fc.record({
            name: fc.string({ minLength: 1 }),
            industry: fc.string(),
            description: fc.string()
          }),
          jobDetails: fc.record({
            title: fc.string({ minLength: 1 }),
            description: fc.string(),
            requirements: fc.array(fc.string())
          }),
          // Candidate data (should be forbidden)
          personalInfo: fc.option(fc.record({
            firstName: fc.string(),
            lastName: fc.string()
          }), { nil: undefined }),
          candidateApplications: fc.option(fc.array(fc.string()), { nil: undefined }),
          candidateId: fc.option(fc.string(), { nil: undefined })
        }), // postingData
        (userId, postingData) => {
          // Test job posting validation
          const result = DataIsolationService.validateJobPosting(
            userId,
            'company',
            postingData
          );

          // Property: Should allow company-specific data
          if (postingData.companyId && postingData.companyInfo && postingData.jobDetails) {
            const hasForbiddenData = postingData.personalInfo || 
                                   postingData.candidateApplications || 
                                   postingData.candidateId;
            
            if (!hasForbiddenData) {
              // Should be valid or have only minor validation issues
              expect(result.errors.filter(error => 
                !error.includes('Campo requerido') // Allow required field errors
              ).length).toBe(0);
            }
          }

          // Property: Should reject candidate-specific data
          if (postingData.personalInfo) {
            expect(result.errors.some(error => 
              error.includes('personalInfo') || error.includes('personal')
            )).toBe(true);
          }

          if (postingData.candidateApplications) {
            expect(result.errors.some(error => 
              error.includes('candidateApplications') || error.includes('candidato')
            )).toBe(true);
          }

          if (postingData.candidateId) {
            expect(result.errors.some(error => 
              error.includes('candidateId') || error.includes('candidato')
            )).toBe(true);
          }

          // Property: Sanitized data should not contain forbidden fields
          if (result.sanitizedData) {
            expect(result.sanitizedData.personalInfo).toBeUndefined();
            expect(result.sanitizedData.candidateApplications).toBeUndefined();
            expect(result.sanitizedData.candidateId).toBeUndefined();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should prevent cross-role data contamination', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('candidate', 'company'), // activeRole
        fc.constantFrom('candidate', 'company'), // dataSourceRole
        fc.record({
          candidateData: fc.record({
            personalInfo: fc.record({ firstName: fc.string(), lastName: fc.string() }),
            applications: fc.array(fc.string())
          }),
          companyData: fc.record({
            companyInfo: fc.record({ name: fc.string(), industry: fc.string() }),
            jobPostings: fc.array(fc.string())
          })
        }), // mixedData
        (activeRole, dataSourceRole, mixedData) => {
          const userId = 'test-user';
          
          // Create data that mixes both candidate and company information
          const contaminatedData = {
            userId,
            ...mixedData.candidateData,
            ...mixedData.companyData
          };

          // Test validation based on active role
          let result;
          if (activeRole === 'candidate') {
            result = DataIsolationService.validateJobApplication(userId, activeRole, contaminatedData);
          } else {
            result = DataIsolationService.validateJobPosting(userId, activeRole, contaminatedData);
          }

          // Property: Should detect cross-role contamination
          if (activeRole === 'candidate') {
            // Candidate operations should reject company data
            expect(result.errors.some(error => 
              error.includes('companyInfo') || 
              error.includes('jobPostings') ||
              error.includes('empresa')
            )).toBe(true);
          } else {
            // Company operations should reject candidate data
            expect(result.errors.some(error => 
              error.includes('personalInfo') || 
              error.includes('applications') ||
              error.includes('candidato')
            )).toBe(true);
          }

          // Property: Validation should not be valid when contaminated
          expect(result.isValid).toBe(false);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should filter display data based on role context', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('candidate', 'company'), // activeRole
        fc.constantFrom('self', 'public', 'restricted'), // audience
        fc.record({
          // Mixed data that should be filtered
          personalInfo: fc.record({
            firstName: fc.string(),
            lastName: fc.string(),
            email: fc.emailAddress(),
            phone: fc.string()
          }),
          companyInfo: fc.record({
            name: fc.string(),
            industry: fc.string(),
            employeeCount: fc.integer()
          }),
          applications: fc.array(fc.string()),
          jobPostings: fc.array(fc.string()),
          privateNotes: fc.string(),
          internalNotes: fc.string()
        }), // rawData
        (activeRole, audience, rawData) => {
          // Filter data based on role and audience
          const filteredData = DataIsolationService.filterDisplayData(rawData, activeRole, audience);

          // Property: Role-inappropriate data should be removed
          if (activeRole === 'candidate') {
            expect(filteredData.companyInfo).toBeUndefined();
            expect(filteredData.jobPostings).toBeUndefined();
            expect(filteredData.employeeCount).toBeUndefined();
          } else {
            expect(filteredData.personalInfo).toBeUndefined();
            expect(filteredData.applications).toBeUndefined();
          }

          // Property: Audience-inappropriate data should be removed
          if (audience === 'public') {
            expect(filteredData.email).toBeUndefined();
            expect(filteredData.phone).toBeUndefined();
            expect(filteredData.privateNotes).toBeUndefined();
          }

          if (audience === 'restricted') {
            expect(filteredData.internalNotes).toBeUndefined();
          }

          // Property: Appropriate data should be preserved
          if (activeRole === 'candidate' && audience === 'self') {
            expect(filteredData.personalInfo).toBeDefined();
            expect(filteredData.applications).toBeDefined();
          }

          if (activeRole === 'company' && audience === 'self') {
            expect(filteredData.companyInfo).toBeDefined();
            expect(filteredData.jobPostings).toBeDefined();
          }
        }
      ),
      { numRuns: 40 }
    );
  });

  it('should maintain data integrity during role-specific operations', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // userId
        fc.constantFrom('candidate', 'company'), // activeRole
        fc.array(fc.record({
          operation: fc.constantFrom(
            'job-application-create', 'job-application-update', 'job-application-view',
            'job-posting-create', 'job-posting-update', 'job-posting-view',
            'profile-update-candidate', 'profile-update-company'
          ),
          data: fc.record({
            roleSpecificField: fc.string(),
            crossRoleField: fc.string()
          })
        }), { minLength: 1, maxLength: 5 }), // operations
        (userId, activeRole, operations) => {
          let allOperationsValid = true;
          const results: any[] = [];

          operations.forEach(({ operation, data }) => {
            const operationContext = {
              userId,
              activeRole,
              operation,
              targetResource: operation.split('-')[0],
              requestData: data
            };

            const result = DataIsolationService.validateOperation(operationContext);
            results.push({ operation, result });

            // Property: Role-appropriate operations should be allowed
            const isRoleAppropriate = (
              (activeRole === 'candidate' && operation.includes('candidate')) ||
              (activeRole === 'candidate' && operation.includes('job-application')) ||
              (activeRole === 'company' && operation.includes('company')) ||
              (activeRole === 'company' && operation.includes('job-posting'))
            );

            if (isRoleAppropriate) {
              // Should not fail due to role mismatch
              expect(result.errors.some(error => 
                error.includes('no permitida para rol')
              )).toBe(false);
            } else {
              // Should fail due to role mismatch
              expect(result.errors.some(error => 
                error.includes('no permitida para rol')
              )).toBe(true);
              allOperationsValid = false;
            }
          });

          // Property: At least one operation should be valid for the active role
          const validOperations = results.filter(({ result }) => result.isValid);
          if (operations.length > 0) {
            expect(validOperations.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  it('should enforce consistent data access patterns', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('candidate', 'company'), // role
        fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 }), // operationSequence
        (role, operationSequence) => {
          const allowedOperations = DataIsolationService.getAllowedOperations(role);
          
          // Property: All allowed operations should be consistent with role
          allowedOperations.forEach(operation => {
            const isAllowed = DataIsolationService.isOperationAllowed(operation, role, 'any');
            expect(isAllowed).toBe(true);
          });

          // Property: Role-specific operations should be filtered correctly
          if (role === 'candidate') {
            expect(allowedOperations.some(op => op.includes('candidate') || op.includes('job-application'))).toBe(true);
            expect(allowedOperations.some(op => op.includes('job-posting-create'))).toBe(false);
          } else {
            expect(allowedOperations.some(op => op.includes('company') || op.includes('job-posting'))).toBe(true);
            expect(allowedOperations.some(op => op.includes('job-application-create'))).toBe(false);
          }

          // Property: Operation permissions should be deterministic
          operationSequence.forEach(operation => {
            const firstCheck = DataIsolationService.isOperationAllowed(operation, role, 'any');
            const secondCheck = DataIsolationService.isOperationAllowed(operation, role, 'any');
            expect(firstCheck).toBe(secondCheck);
          });
        }
      ),
      { numRuns: 20 }
    );
  });
});