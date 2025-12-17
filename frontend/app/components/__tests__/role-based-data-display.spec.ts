// frontend/app/components/__tests__/role-based-data-display.spec.ts
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { RoleBasedRoutingService } from '../../../lib/services/roleBasedRouting.service';
import RoleBasedNavigation from '../RoleBasedNavigation';
import RoleAwareDashboard from '../RoleAwareDashboard';
import { ProfileType } from '../../../lib/types/unified-email.types';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}));

// Mock the role manager hook
jest.mock('../../../lib/hooks/useRoleManager', () => ({
  useRoleManager: () => ({
    roleContext: {
      currentRole: 'candidate',
      availableRoles: ['candidate'],
      isLoading: false
    },
    currentSession: null,
    switchRole: jest.fn(),
    determineLoginRole: jest.fn().mockResolvedValue({
      recommendedRole: 'candidate',
      availableRoles: ['candidate'],
      requiresSelection: false
    }),
    refreshRoleContext: jest.fn()
  })
}));

/**
 * Property Test 6.1: Role-based data display
 * Validates: Requirements 5.4
 * 
 * Property: The system should display only data relevant to the current active 
 * profile type and hide information that belongs to other roles.
 */

describe('Role-Based Data Display Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 19: Role-based data display
   */
  it('should display only role-appropriate navigation items', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('candidate', 'company'), // currentRole
        fc.array(fc.constantFrom('candidate', 'company'), { minLength: 1, maxLength: 2 }), // availableRoles
        (currentRole, availableRoles) => {
          const uniqueRoles = Array.from(new Set(availableRoles)) as ProfileType[];
          fc.pre(uniqueRoles.includes(currentRole as ProfileType));

          render(
            <RoleBasedNavigation
              currentRole={currentRole as ProfileType}
              availableRoles={uniqueRoles}
            />
          );

          const navigationItems = RoleBasedRoutingService.getNavigationItems(currentRole as ProfileType);
          
          // Should show navigation items for current role
          navigationItems.forEach(item => {
            if (item.roles.includes(currentRole as ProfileType)) {
              expect(screen.getByText(item.label)).toBeInTheDocument();
            }
          });

          // Should not show role-specific items for other roles
          if (currentRole === 'candidate') {
            // Should not show company-specific items
            expect(screen.queryByText(/Panel empresa/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/Gestionar empleos/i)).not.toBeInTheDocument();
            
            // Should show candidate-specific items
            expect(screen.queryByText(/Dashboard/i) || screen.queryByText(/Buscar empleos/i)).toBeInTheDocument();
          } else {
            // Should not show candidate-specific items
            expect(screen.queryByText(/Smart CV/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/Smart Match/i)).not.toBeInTheDocument();
            
            // Should show company-specific items
            expect(screen.queryByText(/Panel empresa/i) || screen.queryByText(/Gestionar empleos/i)).toBeInTheDocument();
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should show correct role-specific features', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('candidate', 'company'), // role
        (role) => {
          const features = RoleBasedRoutingService.getRoleFeatures(role as ProfileType);
          
          if (role === 'candidate') {
            // Candidate should have smart features enabled
            expect(features.showSmartFeatures).toBe(true);
            
            // Should include candidate-specific features
            expect(features.availableFeatures).toContain('job-search');
            expect(features.availableFeatures).toContain('smart-cv');
            expect(features.availableFeatures).toContain('smart-match');
            expect(features.availableFeatures).toContain('applications');
            
            // Should hide company-specific features
            expect(features.hiddenFeatures).toContain('job-posting');
            expect(features.hiddenFeatures).toContain('candidate-management');
            expect(features.hiddenFeatures).toContain('company-analytics');
          } else {
            // Company should not have smart features enabled
            expect(features.showSmartFeatures).toBe(false);
            
            // Should include company-specific features
            expect(features.availableFeatures).toContain('job-posting');
            expect(features.availableFeatures).toContain('candidate-management');
            expect(features.availableFeatures).toContain('company-analytics');
            expect(features.availableFeatures).toContain('branch-management');
            
            // Should hide candidate-specific features
            expect(features.hiddenFeatures).toContain('job-search');
            expect(features.hiddenFeatures).toContain('smart-cv');
            expect(features.hiddenFeatures).toContain('smart-match');
            expect(features.hiddenFeatures).toContain('applications');
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should provide correct dashboard paths for each role', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('candidate', 'company'), // role
        (role) => {
          const dashboardPath = RoleBasedRoutingService.getDashboardPath(role as ProfileType);
          
          if (role === 'candidate') {
            expect(dashboardPath).toBe('/dashboard');
          } else {
            expect(dashboardPath).toBe('/company');
          }
          
          // Path should be accessible for the role
          expect(RoleBasedRoutingService.canAccessPath(dashboardPath, role as ProfileType)).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should enforce role-based path restrictions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('candidate', 'company'), // userRole
        fc.constantFrom(
          '/dashboard', '/dashboard/jobs', '/dashboard/perfil', '/dashboard/mapa',
          '/company', '/company/branches', '/jobs/post', '/jobs/manage',
          '/candidates', '/applications', '/settings'
        ), // testPath
        (userRole, testPath) => {
          const canAccess = RoleBasedRoutingService.canAccessPath(testPath, userRole as ProfileType);
          
          // Candidate-only paths
          const candidatePaths = ['/dashboard', '/dashboard/jobs', '/dashboard/perfil', '/dashboard/mapa', '/applications'];
          // Company-only paths  
          const companyPaths = ['/company', '/jobs/post', '/jobs/manage', '/candidates'];
          // Shared paths
          const sharedPaths = ['/settings'];
          
          if (candidatePaths.some(path => testPath.startsWith(path))) {
            if (userRole === 'candidate') {
              expect(canAccess).toBe(true);
            } else {
              expect(canAccess).toBe(false);
            }
          } else if (companyPaths.some(path => testPath.startsWith(path))) {
            if (userRole === 'company') {
              expect(canAccess).toBe(true);
            } else {
              expect(canAccess).toBe(false);
            }
          } else if (sharedPaths.some(path => testPath.startsWith(path))) {
            expect(canAccess).toBe(true);
          }
        }
      ),
      { numRuns: 40 }
    );
  });

  it('should provide appropriate redirects for unauthorized paths', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('candidate', 'company'), // userRole
        fc.constantFrom('/dashboard', '/company', '/dashboard/jobs', '/jobs/post'), // unauthorizedPath
        (userRole, unauthorizedPath) => {
          const canAccess = RoleBasedRoutingService.canAccessPath(unauthorizedPath, userRole as ProfileType);
          
          if (!canAccess) {
            const redirectPath = RoleBasedRoutingService.getRedirectPath(unauthorizedPath, userRole as ProfileType);
            
            // Should provide a redirect path
            expect(redirectPath).toBeTruthy();
            
            // Redirect path should be accessible for the user's role
            if (redirectPath) {
              expect(RoleBasedRoutingService.canAccessPath(redirectPath, userRole as ProfileType)).toBe(true);
            }
            
            // Should redirect to appropriate dashboard
            const expectedDashboard = RoleBasedRoutingService.getDashboardPath(userRole as ProfileType);
            expect(redirectPath).toBe(expectedDashboard);
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  it('should maintain data isolation between roles', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('candidate', 'company'), // fromRole
        fc.constantFrom('candidate', 'company'), // toRole
        fc.string({ minLength: 1 }), // currentPath
        (fromRole, toRole, currentPath) => {
          fc.pre(fromRole !== toRole);
          
          // Simulate role transition validation
          const validation = RoleBasedRoutingService.validateRoleTransition(
            fromRole as ProfileType,
            toRole as ProfileType,
            `/${currentPath}`
          );
          
          // Should always provide validation result
          expect(typeof validation.isValid).toBe('boolean');
          
          if (!validation.isValid) {
            // Should provide new path if current path is invalid
            expect(validation.newPath).toBeTruthy();
            expect(validation.reason).toBeTruthy();
            
            // New path should be accessible for target role
            if (validation.newPath) {
              expect(RoleBasedRoutingService.canAccessPath(validation.newPath, toRole as ProfileType)).toBe(true);
            }
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should generate role-appropriate breadcrumbs', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('candidate', 'company'), // role
        fc.constantFrom('/dashboard', '/dashboard/jobs', '/company', '/company/branches'), // path
        (role, path) => {
          const breadcrumbs = RoleBasedRoutingService.getBreadcrumbs(path, role as ProfileType);
          
          // Should always have at least one breadcrumb (home/dashboard)
          expect(breadcrumbs.length).toBeGreaterThan(0);
          
          // First breadcrumb should be role-appropriate
          const firstBreadcrumb = breadcrumbs[0];
          if (role === 'candidate') {
            expect(firstBreadcrumb.label).toBe('Dashboard');
            expect(firstBreadcrumb.href).toBe('/dashboard');
          } else {
            expect(firstBreadcrumb.label).toBe('Panel Empresa');
            expect(firstBreadcrumb.href).toBe('/company');
          }
          
          // All breadcrumb paths should be accessible for the role
          breadcrumbs.forEach(breadcrumb => {
            expect(RoleBasedRoutingService.canAccessPath(breadcrumb.href, role as ProfileType)).toBe(true);
          });
        }
      ),
      { numRuns: 25 }
    );
  });
});