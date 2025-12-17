"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User } from "firebase/auth";
import { ProfileType } from "../../lib/types/unified-email.types";
import { RoleBasedRoutingService } from "../../lib/services/roleBasedRouting.service";
import { useRoleManager } from "../../lib/hooks/useRoleManager";

interface RoleGuardProps {
  user: User | null;
  children: React.ReactNode;
  requiredRole?: ProfileType;
  allowedRoles?: ProfileType[];
  fallbackPath?: string;
  showLoading?: boolean;
}

export default function RoleGuard({
  user,
  children,
  requiredRole,
  allowedRoles,
  fallbackPath,
  showLoading = true
}: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const {
    roleContext,
    determineLoginRole
  } = useRoleManager(user?.uid);

  const { currentRole, availableRoles, isLoading } = roleContext;

  useEffect(() => {
    const checkAuthorization = async () => {
      // If no user, redirect to login
      if (!user) {
        setRedirecting(true);
        router.push('/login');
        return;
      }

      // Wait for role context to load
      if (isLoading) {
        return;
      }

      try {
        // Check if user has any profiles
        if (availableRoles.length === 0) {
          setRedirecting(true);
          router.push('/register-type');
          return;
        }

        // If no current role, determine one
        if (!currentRole) {
          const loginInfo = await determineLoginRole();
          
          if (loginInfo.requiresSelection && loginInfo.availableRoles.length > 1) {
            // User needs to select a role - this will be handled by parent component
            setIsAuthorized(true);
            return;
          }
        }

        // Check role-based authorization
        let authorized = false;

        if (requiredRole) {
          // Specific role required
          authorized = currentRole === requiredRole || availableRoles.includes(requiredRole);
        } else if (allowedRoles && allowedRoles.length > 0) {
          // Any of the allowed roles
          authorized = allowedRoles.some(role => 
            currentRole === role || availableRoles.includes(role)
          );
        } else {
          // Check against route configuration
          authorized = currentRole ? 
            RoleBasedRoutingService.canAccessPath(pathname, currentRole) : 
            false;
        }

        if (!authorized) {
          // Determine redirect path
          let redirectPath = fallbackPath;
          
          if (!redirectPath && currentRole) {
            redirectPath = RoleBasedRoutingService.getRedirectPath(pathname, currentRole);
          }
          
          if (!redirectPath) {
            redirectPath = currentRole ? 
              RoleBasedRoutingService.getDashboardPath(currentRole) : 
              '/register-type';
          }

          setRedirecting(true);
          router.push(redirectPath);
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('Error checking authorization:', error);
        setIsAuthorized(false);
        
        // Fallback redirect
        const fallback = fallbackPath || (currentRole ? 
          RoleBasedRoutingService.getDashboardPath(currentRole) : 
          '/login'
        );
        
        setRedirecting(true);
        router.push(fallback);
      }
    };

    checkAuthorization();
  }, [
    user,
    currentRole,
    availableRoles,
    isLoading,
    pathname,
    requiredRole,
    allowedRoles,
    fallbackPath,
    router,
    determineLoginRole
  ]);

  // Show loading state
  if (isLoading || isAuthorized === null || redirecting) {
    if (!showLoading) {
      return null;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-zinc-600">
            {redirecting ? 'Redirigiendo...' : 'Verificando permisos...'}
          </p>
        </div>
      </div>
    );
  }

  // Show unauthorized state
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-2">
            Acceso no autorizado
          </h2>
          <p className="text-zinc-600 mb-6">
            No tienes permisos para acceder a esta página con tu rol actual.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-zinc-600 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              Volver
            </button>
            <button
              onClick={() => {
                const dashboardPath = currentRole ? 
                  RoleBasedRoutingService.getDashboardPath(currentRole) : 
                  '/dashboard';
                router.push(dashboardPath);
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Ir al dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render children if authorized
  return <>{children}</>;
}

// Higher-order component for easy route protection
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardConfig: Omit<RoleGuardProps, 'user' | 'children'>
) {
  return function GuardedComponent(props: P & { user: User | null }) {
    const { user, ...componentProps } = props;
    
    return (
      <RoleGuard user={user} {...guardConfig}>
        <Component {...(componentProps as P)} />
      </RoleGuard>
    );
  };
}

// Specific guards for common use cases
export const CandidateGuard = ({ user, children }: { user: User | null; children: React.ReactNode }) => (
  <RoleGuard user={user} requiredRole="candidate">
    {children}
  </RoleGuard>
);

export const CompanyGuard = ({ user, children }: { user: User | null; children: React.ReactNode }) => (
  <RoleGuard user={user} requiredRole="company">
    {children}
  </RoleGuard>
);

export const AuthGuard = ({ user, children }: { user: User | null; children: React.ReactNode }) => (
  <RoleGuard user={user} allowedRoles={['candidate', 'company']}>
    {children}
  </RoleGuard>
);