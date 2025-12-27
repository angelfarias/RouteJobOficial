"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User } from "firebase/auth";
import { ProfileType } from "../../lib/types/unified-email.types";
import { RoleBasedRoutingService } from "../../lib/services/roleBasedRouting.service";
import { useRoleManager } from "../../lib/hooks/useRoleManager";
import RoleSwitcher from "./RoleSwitcher";
import RoleSelector from "./RoleSelector";
import UnifiedHeader from "./UnifiedHeader";

interface RoleAwareDashboardProps {
  user: User;
  children: React.ReactNode;
  onLogout?: () => void;
  onProfileUpdate?: (data: any) => Promise<void>;
  onAccountDelete?: () => Promise<void>;
}

export default function RoleAwareDashboard({
  user,
  children,
  onLogout,
  onProfileUpdate,
  onAccountDelete
}: RoleAwareDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const {
    roleContext,
    currentSession,
    switchRole,
    determineLoginRole,
    refreshRoleContext
  } = useRoleManager(user.uid);

  const { currentRole, availableRoles, isLoading } = roleContext;

  // Handle initial routing and role determination
  useEffect(() => {
    const handleInitialRouting = async () => {
      if (isLoading || !user) return;

      try {
        // Determine appropriate route after login
        const loginInfo = await determineLoginRole();
        const routeDecision = RoleBasedRoutingService.determinePostLoginRoute(
          loginInfo.availableRoles,
          loginInfo.recommendedRole || undefined,
          pathname
        );

        if (routeDecision.requiresRoleSelection && loginInfo.availableRoles.length > 1) {
          setShowRoleSelector(true);
        } else if (routeDecision.shouldRedirect && pathname !== routeDecision.redirectTo) {
          router.push(routeDecision.redirectTo);
        }
      } catch (error) {
        console.error('Error handling initial routing:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    handleInitialRouting();
  }, [isLoading, user, pathname, router, determineLoginRole]);

  // Validate current path against user's role
  useEffect(() => {
    if (!currentRole || isInitializing || isLoading) return;

    const canAccess = RoleBasedRoutingService.canAccessPath(pathname, currentRole);

    if (!canAccess) {
      const redirectPath = RoleBasedRoutingService.getRedirectPath(pathname, currentRole);
      if (redirectPath && redirectPath !== pathname) {
        console.log(`Redirecting from ${pathname} to ${redirectPath} for role ${currentRole}`);
        router.push(redirectPath);
      }
    }
  }, [currentRole, pathname, router, isInitializing, isLoading]);

  const handleRoleSwitch = async (newRole: ProfileType) => {
    try {
      // Validate if current path is accessible with new role
      const validation = RoleBasedRoutingService.validateRoleTransition(
        currentRole!,
        newRole,
        pathname
      );

      // Switch role
      await switchRole(newRole);

      // Redirect if necessary
      if (!validation.isValid && validation.newPath) {
        router.push(validation.newPath);
      }

      setShowRoleSelector(false);
    } catch (error) {
      console.error('Error switching role:', error);
    }
  };

  const handleRoleSelect = async (role: ProfileType) => {
    try {
      await switchRole(role);

      // Navigate to appropriate dashboard
      const dashboardPath = RoleBasedRoutingService.getDashboardPath(role);
      router.push(dashboardPath);

      setShowRoleSelector(false);
    } catch (error) {
      console.error('Error selecting role:', error);
    }
  };

  // Get role-specific features
  const roleFeatures = currentRole
    ? RoleBasedRoutingService.getRoleFeatures(currentRole)
    : { showSmartFeatures: false, availableFeatures: [], hiddenFeatures: [] };

  // Get navigation items for current role
  const navigationItems = currentRole
    ? RoleBasedRoutingService.getNavigationItems(currentRole)
    : [];

  // Get breadcrumbs for current path
  const breadcrumbs = currentRole
    ? RoleBasedRoutingService.getBreadcrumbs(pathname, currentRole)
    : [];

  // Show loading state
  if (isLoading || isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // Show role selector if needed
  if (showRoleSelector) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <RoleSelector
              availableRoles={availableRoles}
              onRoleSelect={handleRoleSelect}
              title="Selecciona tu rol"
              subtitle="Tienes múltiples perfiles. Elige cómo quieres usar la plataforma."
            />
          </div>
        </div>
      </div>
    );
  }

  // Show error state if no role available
  if (!currentRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            No hay perfiles disponibles
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            Necesitas crear un perfil para acceder al dashboard.
          </p>
          <button
            onClick={() => router.push('/register-type')}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            Crear perfil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-zinc-950">
      {/* Enhanced Header with Role Management */}
      <UnifiedHeader
        currentPage={getCurrentPageFromPath(pathname)}
        user={user}
        showSmartFeatures={roleFeatures.showSmartFeatures}
        onLogout={onLogout}
        onProfileUpdate={onProfileUpdate}
        onAccountDelete={onAccountDelete}
      />

      {/* Role Management Bar */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center">
                {index > 0 && (
                  <span className="mx-2 text-zinc-400">/</span>
                )}
                <button
                  onClick={() => router.push(crumb.href)}
                  className={`${crumb.isActive
                    ? 'text-zinc-900 dark:text-zinc-100 font-medium'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    } transition-colors`}
                >
                  {crumb.label}
                </button>
              </div>
            ))}
          </nav>

          {/* Role Switcher */}
          <div className="flex items-center gap-4">
            <RoleSwitcher
              currentRole={currentRole}
              availableRoles={availableRoles}
              onRoleSwitch={handleRoleSwitch}
              className="text-sm"
            />
          </div>
        </div>
      </div>

      {/* Main Content with Role-Based Styling */}
      <main className={`flex-1 pt-28 ${getRoleBasedStyling(currentRole)}`}>
        {/* Role-specific content wrapper */}
        <div className="role-content-wrapper" data-role={currentRole}>
          {children}
        </div>
      </main>

      {/* Role-specific footer or additional UI elements */}
      {currentRole === 'candidate' && (
        <div className="fixed bottom-4 right-4 z-30">
          <button
            onClick={() => router.push('/dashboard/mapa')}
            className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all"
            title="Smart Match"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      )}

      {/* Development info (only in dev mode) */}
      {process.env.NODE_ENV === 'development' && currentSession && (
        <div className="fixed bottom-4 left-4 bg-black/80 text-white text-xs p-2 rounded z-30">
          <div>Role: {currentRole}</div>
          <div>Session: {new Date(currentSession.lastActivity).toLocaleTimeString()}</div>
          <div>Available: {availableRoles.join(', ')}</div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function getCurrentPageFromPath(pathname: string): 'dashboard' | 'smart-cv' | 'smart-match' | 'company' | 'jobs' | 'profile' {
  if (pathname.includes('/perfil/smart')) return 'smart-cv';
  if (pathname.includes('/mapa')) return 'smart-match';
  if (pathname.includes('/company')) return 'company';
  if (pathname.includes('/jobs')) return 'jobs';
  if (pathname.includes('/perfil')) return 'profile';
  return 'dashboard';
}

function getRoleBasedStyling(role: ProfileType): string {
  if (role === 'candidate') {
    return 'bg-gradient-to-br from-emerald-50/30 to-blue-50/30 dark:from-emerald-900/10 dark:to-blue-900/10';
  } else {
    return 'bg-gradient-to-br from-blue-50/30 to-indigo-50/30 dark:from-blue-900/10 dark:to-indigo-900/10';
  }
}