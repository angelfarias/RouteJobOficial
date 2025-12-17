// frontend/lib/services/roleBasedRouting.service.ts
import { ProfileType } from '../types/unified-email.types';

export interface RouteConfig {
  path: string;
  allowedRoles: ProfileType[];
  redirectTo?: string;
  requiresAuth?: boolean;
}

export interface DashboardConfig {
  role: ProfileType;
  defaultPath: string;
  allowedPaths: string[];
  restrictedPaths: string[];
  navigationItems: NavigationItem[];
}

export interface NavigationItem {
  key: string;
  label: string;
  href: string;
  icon?: string;
  roles: ProfileType[];
  isSmartFeature?: boolean;
}

export class RoleBasedRoutingService {
  private static readonly ROUTE_CONFIGS: RouteConfig[] = [
    // Candidate-only routes
    { path: '/dashboard', allowedRoles: ['candidate'], requiresAuth: true },
    { path: '/dashboard/jobs', allowedRoles: ['candidate'], requiresAuth: true },
    { path: '/dashboard/jobs/*', allowedRoles: ['candidate'], requiresAuth: true },
    { path: '/dashboard/perfil', allowedRoles: ['candidate'], requiresAuth: true },
    { path: '/dashboard/perfil/*', allowedRoles: ['candidate'], requiresAuth: true },
    { path: '/dashboard/mapa', allowedRoles: ['candidate'], requiresAuth: true },
    { path: '/dashboard/vacantes', allowedRoles: ['candidate'], requiresAuth: true },
    { path: '/applications/*', allowedRoles: ['candidate'], requiresAuth: true },
    
    // Company-only routes
    { path: '/company', allowedRoles: ['company'], requiresAuth: true },
    { path: '/company/*', allowedRoles: ['company'], requiresAuth: true },
    { path: '/jobs/post', allowedRoles: ['company'], requiresAuth: true },
    { path: '/jobs/manage', allowedRoles: ['company'], requiresAuth: true },
    { path: '/candidates/*', allowedRoles: ['company'], requiresAuth: true },
    
    // Shared routes (both roles can access)
    { path: '/settings', allowedRoles: ['candidate', 'company'], requiresAuth: true },
    { path: '/profile/settings', allowedRoles: ['candidate', 'company'], requiresAuth: true },
    { path: '/notifications', allowedRoles: ['candidate', 'company'], requiresAuth: true },
    
    // Public routes
    { path: '/', allowedRoles: ['candidate', 'company'], requiresAuth: false },
    { path: '/login', allowedRoles: ['candidate', 'company'], requiresAuth: false },
    { path: '/register', allowedRoles: ['candidate', 'company'], requiresAuth: false },
    { path: '/register-type', allowedRoles: ['candidate', 'company'], requiresAuth: false },
  ];

  private static readonly DASHBOARD_CONFIGS: Record<ProfileType, DashboardConfig> = {
    candidate: {
      role: 'candidate',
      defaultPath: '/dashboard',
      allowedPaths: [
        '/dashboard',
        '/dashboard/jobs',
        '/dashboard/jobs/*',
        '/dashboard/perfil',
        '/dashboard/perfil/*',
        '/dashboard/mapa',
        '/dashboard/vacantes',
        '/applications/*',
        '/settings',
        '/profile/settings',
        '/notifications'
      ],
      restrictedPaths: [
        '/company',
        '/company/*',
        '/jobs/post',
        '/jobs/manage',
        '/candidates/*'
      ],
      navigationItems: [
        {
          key: 'dashboard',
          label: 'Dashboard',
          href: '/dashboard',
          roles: ['candidate']
        },
        {
          key: 'jobs',
          label: 'Buscar empleos',
          href: '/dashboard/jobs',
          roles: ['candidate']
        },
        {
          key: 'smart-match',
          label: 'Smart Match',
          href: '/dashboard/mapa',
          icon: 'MapPin',
          roles: ['candidate'],
          isSmartFeature: true
        },
        {
          key: 'smart-cv',
          label: 'Smart CV',
          href: '/dashboard/perfil/smart',
          icon: 'Sparkles',
          roles: ['candidate'],
          isSmartFeature: true
        },
        {
          key: 'profile',
          label: 'Mi perfil',
          href: '/dashboard/perfil',
          roles: ['candidate']
        }
      ]
    },
    company: {
      role: 'company',
      defaultPath: '/company',
      allowedPaths: [
        '/company',
        '/company/*',
        '/jobs/post',
        '/jobs/manage',
        '/candidates/*',
        '/settings',
        '/profile/settings',
        '/notifications'
      ],
      restrictedPaths: [
        '/dashboard',
        '/dashboard/jobs',
        '/dashboard/jobs/*',
        '/dashboard/perfil',
        '/dashboard/perfil/*',
        '/dashboard/mapa',
        '/dashboard/vacantes',
        '/applications/*'
      ],
      navigationItems: [
        {
          key: 'company',
          label: 'Panel empresa',
          href: '/company',
          roles: ['company']
        },
        {
          key: 'jobs-manage',
          label: 'Gestionar empleos',
          href: '/jobs/manage',
          roles: ['company']
        },
        {
          key: 'jobs-post',
          label: 'Publicar empleo',
          href: '/jobs/post',
          roles: ['company']
        },
        {
          key: 'candidates',
          label: 'Candidatos',
          href: '/candidates',
          roles: ['company']
        },
        {
          key: 'branches',
          label: 'Sucursales',
          href: '/company/branches',
          roles: ['company']
        }
      ]
    }
  };

  /**
   * Get the appropriate dashboard path for a user's role
   */
  static getDashboardPath(role: ProfileType): string {
    return this.DASHBOARD_CONFIGS[role].defaultPath;
  }

  /**
   * Check if a user can access a specific path based on their role
   */
  static canAccessPath(path: string, userRole: ProfileType): boolean {
    const config = this.ROUTE_CONFIGS.find(route => 
      this.matchesPath(path, route.path)
    );

    if (!config) {
      // If no specific config found, allow access (default behavior)
      return true;
    }

    return config.allowedRoles.includes(userRole);
  }

  /**
   * Get redirect path if user cannot access the requested path
   */
  static getRedirectPath(path: string, userRole: ProfileType): string | null {
    if (this.canAccessPath(path, userRole)) {
      return null;
    }

    const config = this.ROUTE_CONFIGS.find(route => 
      this.matchesPath(path, route.path)
    );

    if (config?.redirectTo) {
      return config.redirectTo;
    }

    // Default redirect to appropriate dashboard
    return this.getDashboardPath(userRole);
  }

  /**
   * Get navigation items for a specific role
   */
  static getNavigationItems(role: ProfileType): NavigationItem[] {
    return this.DASHBOARD_CONFIGS[role].navigationItems;
  }

  /**
   * Get dashboard configuration for a role
   */
  static getDashboardConfig(role: ProfileType): DashboardConfig {
    return this.DASHBOARD_CONFIGS[role];
  }

  /**
   * Determine the appropriate route after login based on available roles
   */
  static determinePostLoginRoute(
    availableRoles: ProfileType[],
    preferredRole?: ProfileType,
    currentPath?: string
  ): {
    shouldRedirect: boolean;
    redirectTo: string;
    requiresRoleSelection: boolean;
  } {
    // No roles available - redirect to profile creation
    if (availableRoles.length === 0) {
      return {
        shouldRedirect: true,
        redirectTo: '/register-type',
        requiresRoleSelection: false
      };
    }

    // Single role - redirect to appropriate dashboard
    if (availableRoles.length === 1) {
      const role = availableRoles[0];
      return {
        shouldRedirect: true,
        redirectTo: this.getDashboardPath(role),
        requiresRoleSelection: false
      };
    }

    // Multiple roles - check if current path is valid for any role
    if (currentPath && currentPath !== '/' && currentPath !== '/login') {
      const canAccessWithAnyRole = availableRoles.some(role => 
        this.canAccessPath(currentPath, role)
      );

      if (canAccessWithAnyRole) {
        return {
          shouldRedirect: false,
          redirectTo: currentPath,
          requiresRoleSelection: true
        };
      }
    }

    // Use preferred role if available
    if (preferredRole && availableRoles.includes(preferredRole)) {
      return {
        shouldRedirect: true,
        redirectTo: this.getDashboardPath(preferredRole),
        requiresRoleSelection: false
      };
    }

    // Default to first available role
    return {
      shouldRedirect: true,
      redirectTo: this.getDashboardPath(availableRoles[0]),
      requiresRoleSelection: true
    };
  }

  /**
   * Get role-specific features that should be hidden/shown
   */
  static getRoleFeatures(role: ProfileType): {
    showSmartFeatures: boolean;
    availableFeatures: string[];
    hiddenFeatures: string[];
  } {
    if (role === 'candidate') {
      return {
        showSmartFeatures: true,
        availableFeatures: [
          'job-search',
          'smart-cv',
          'smart-match',
          'applications',
          'profile-management',
          'notifications'
        ],
        hiddenFeatures: [
          'job-posting',
          'candidate-management',
          'company-analytics',
          'branch-management'
        ]
      };
    } else {
      return {
        showSmartFeatures: false,
        availableFeatures: [
          'job-posting',
          'candidate-management',
          'company-analytics',
          'branch-management',
          'notifications'
        ],
        hiddenFeatures: [
          'job-search',
          'smart-cv',
          'smart-match',
          'applications'
        ]
      };
    }
  }

  /**
   * Check if current path matches a route pattern (supports wildcards)
   */
  private static matchesPath(currentPath: string, routePattern: string): boolean {
    if (routePattern === currentPath) {
      return true;
    }

    if (routePattern.endsWith('/*')) {
      const basePath = routePattern.slice(0, -2);
      return currentPath.startsWith(basePath);
    }

    return false;
  }

  /**
   * Validate route transition between roles
   */
  static validateRoleTransition(
    fromRole: ProfileType,
    toRole: ProfileType,
    currentPath: string
  ): {
    isValid: boolean;
    newPath?: string;
    reason?: string;
  } {
    // Check if current path is valid for the new role
    if (this.canAccessPath(currentPath, toRole)) {
      return { isValid: true };
    }

    // Find appropriate redirect path
    const newPath = this.getRedirectPath(currentPath, toRole);
    
    return {
      isValid: false,
      newPath: newPath || this.getDashboardPath(toRole),
      reason: `Path ${currentPath} is not accessible for ${toRole} role`
    };
  }

  /**
   * Get breadcrumb navigation for current path and role
   */
  static getBreadcrumbs(path: string, role: ProfileType): Array<{
    label: string;
    href: string;
    isActive: boolean;
  }> {
    const config = this.getDashboardConfig(role);
    const breadcrumbs: Array<{ label: string; href: string; isActive: boolean }> = [];

    // Add home/dashboard
    breadcrumbs.push({
      label: role === 'candidate' ? 'Dashboard' : 'Panel Empresa',
      href: config.defaultPath,
      isActive: path === config.defaultPath
    });

    // Add specific page breadcrumbs based on path
    if (path.startsWith('/dashboard/jobs')) {
      breadcrumbs.push({
        label: 'Empleos',
        href: '/dashboard/jobs',
        isActive: path === '/dashboard/jobs'
      });
    } else if (path.startsWith('/dashboard/perfil')) {
      breadcrumbs.push({
        label: 'Mi Perfil',
        href: '/dashboard/perfil',
        isActive: path === '/dashboard/perfil'
      });
    } else if (path.startsWith('/company/branch')) {
      breadcrumbs.push({
        label: 'Sucursales',
        href: '/company',
        isActive: false
      });
    }

    return breadcrumbs;
  }
}