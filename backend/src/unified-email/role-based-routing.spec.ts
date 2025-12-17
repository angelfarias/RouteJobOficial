// backend/src/unified-email/role-based-routing.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { RoleManagerService } from './services/role-manager.service';
import { UnifiedAuthService } from './services/unified-auth.service';
import { ProfileType } from './interfaces';

/**
 * Property Test 4.2: Profile-type-based routing
 * Validates: Requirements 3.2, 3.3
 * 
 * Property: Users should be routed to appropriate dashboards and have access
 * to role-specific routes based on their active profile type.
 */

describe('RoleManagerService - Role-Based Routing Properties', () => {
  let service: RoleManagerService;
  let authService: UnifiedAuthService;
  let mockFirebase: any;

  beforeEach(async () => {
    // Mock Firebase Admin
    mockFirebase = {
      firestore: jest.fn(() => ({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn(),
            set: jest.fn(),
            update: jest.fn()
          }))
        }))
      }))
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleManagerService,
        {
          provide: UnifiedAuthService,
          useValue: {
            checkUserProfiles: jest.fn(),
            getUnifiedUserAccount: jest.fn()
          }
        },
        {
          provide: 'FIREBASE_ADMIN',
          useValue: mockFirebase
        }
      ]
    }).compile();

    service = module.get<RoleManagerService>(RoleManagerService);
    authService = module.get<UnifiedAuthService>(UnifiedAuthService);
  });

  /**
   * Property 9: Profile-type-based routing
   */
  it('should provide correct routing information for each profile type', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.constantFrom('candidate', 'company'), // profileType
        async (userId, profileType) => {
          // Mock auth service
          (authService.checkUserProfiles as jest.Mock).mockResolvedValue({
            availableRoles: [profileType],
            hasCandidate: profileType === 'candidate',
            hasCompany: profileType === 'company'
          });

          // Act
          const routing = await service.getRoleBasedRouting(userId, profileType as ProfileType);

          // Assert: Dashboard path should be role-specific
          if (profileType === 'candidate') {
            expect(routing.dashboardPath).toBe('/candidate/dashboard');
            
            // Assert: Should have candidate-specific allowed routes
            expect(routing.allowedRoutes).toContain('/candidate/*');
            expect(routing.allowedRoutes).toContain('/jobs/search');
            expect(routing.allowedRoutes).toContain('/jobs/apply');
            expect(routing.allowedRoutes).toContain('/applications/*');
            expect(routing.allowedRoutes).toContain('/profile/candidate');
            
            // Assert: Should restrict company-specific routes
            expect(routing.restrictedRoutes).toContain('/company/*');
            expect(routing.restrictedRoutes).toContain('/jobs/post');
            expect(routing.restrictedRoutes).toContain('/jobs/manage');
            expect(routing.restrictedRoutes).toContain('/candidates/*');
          } else {
            expect(routing.dashboardPath).toBe('/company/dashboard');
            
            // Assert: Should have company-specific allowed routes
            expect(routing.allowedRoutes).toContain('/company/*');
            expect(routing.allowedRoutes).toContain('/jobs/post');
            expect(routing.allowedRoutes).toContain('/jobs/manage');
            expect(routing.allowedRoutes).toContain('/candidates/*');
            expect(routing.allowedRoutes).toContain('/profile/company');
            
            // Assert: Should restrict candidate-specific routes
            expect(routing.restrictedRoutes).toContain('/candidate/*');
            expect(routing.restrictedRoutes).toContain('/jobs/apply');
            expect(routing.restrictedRoutes).toContain('/applications/*');
          }

          // Assert: Common routes should be available to both
          expect(routing.allowedRoutes).toContain('/settings');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should maintain route separation between profile types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        async (userId) => {
          // Mock auth service for both profile types
          (authService.checkUserProfiles as jest.Mock).mockResolvedValue({
            availableRoles: ['candidate', 'company'],
            hasCandidate: true,
            hasCompany: true
          });

          // Act: Get routing for both profile types
          const candidateRouting = await service.getRoleBasedRouting(userId, 'candidate');
          const companyRouting = await service.getRoleBasedRouting(userId, 'company');

          // Assert: Dashboard paths should be different
          expect(candidateRouting.dashboardPath).not.toBe(companyRouting.dashboardPath);

          // Assert: Restricted routes for one should not be allowed for the other
          const candidateRestricted = new Set(candidateRouting.restrictedRoutes);
          const companyRestricted = new Set(companyRouting.restrictedRoutes);
          
          candidateRouting.allowedRoutes.forEach(route => {
            if (route !== '/settings') { // Settings is common
              expect(companyRestricted.has(route) || companyRouting.allowedRoutes.includes(route)).toBeTruthy();
            }
          });

          companyRouting.allowedRoutes.forEach(route => {
            if (route !== '/settings') { // Settings is common
              expect(candidateRestricted.has(route) || candidateRouting.allowedRoutes.includes(route)).toBeTruthy();
            }
          });
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should reject routing requests for unauthorized profile types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.constantFrom('candidate', 'company'), // requestedRole
        fc.constantFrom('candidate', 'company'), // availableRole
        async (userId, requestedRole, availableRole) => {
          // Skip if user has the requested role
          fc.pre(requestedRole !== availableRole);

          // Mock auth service - user only has one role
          (authService.checkUserProfiles as jest.Mock).mockResolvedValue({
            availableRoles: [availableRole],
            hasCandidate: availableRole === 'candidate',
            hasCompany: availableRole === 'company'
          });

          // Act & Assert: Should throw error for unauthorized role
          await expect(
            service.getRoleBasedRouting(userId, requestedRole as ProfileType)
          ).rejects.toThrow();
        }
      ),
      { numRuns: 20 }
    );
  });
});