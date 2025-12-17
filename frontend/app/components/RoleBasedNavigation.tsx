"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  Home, 
  Search, 
  MapPin, 
  Sparkles, 
  User, 
  Building2, 
  FileText, 
  Users, 
  Settings,
  Bell,
  Menu,
  X
} from "lucide-react";
import { ProfileType } from "../../lib/types/unified-email.types";
import { RoleBasedRoutingService, NavigationItem } from "../../lib/services/roleBasedRouting.service";
import RoleIndicator from "./RoleIndicator";

interface RoleBasedNavigationProps {
  currentRole: ProfileType;
  availableRoles: ProfileType[];
  onRoleSwitch?: (newRole: ProfileType) => void;
  className?: string;
  variant?: 'sidebar' | 'header' | 'mobile';
}

const iconMap = {
  Home,
  Search,
  MapPin,
  Sparkles,
  User,
  Building2,
  FileText,
  Users,
  Settings,
  Bell
};

export default function RoleBasedNavigation({
  currentRole,
  availableRoles,
  onRoleSwitch,
  className = "",
  variant = 'header'
}: RoleBasedNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems = RoleBasedRoutingService.getNavigationItems(currentRole);
  const roleFeatures = RoleBasedRoutingService.getRoleFeatures(currentRole);

  const handleNavigation = (href: string) => {
    router.push(href);
    setMobileMenuOpen(false);
  };

  const isActiveRoute = (href: string): boolean => {
    if (href === '/dashboard' && pathname === '/dashboard') return true;
    if (href === '/company' && pathname === '/company') return true;
    if (href !== '/dashboard' && href !== '/company' && pathname.startsWith(href)) return true;
    return false;
  };

  const getIconComponent = (iconName?: string) => {
    if (!iconName || !(iconName in iconMap)) return null;
    const IconComponent = iconMap[iconName as keyof typeof iconMap];
    return <IconComponent className="w-4 h-4" />;
  };

  const renderNavigationItem = (item: NavigationItem, index: number) => {
    const isActive = isActiveRoute(item.href);
    const icon = getIconComponent(item.icon);
    
    const baseClasses = `
      flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
      ${isActive 
        ? (currentRole === 'candidate' 
          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
          : 'bg-blue-100 text-blue-700 border border-blue-200'
        )
        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
      }
    `;

    return (
      <button
        key={item.key}
        onClick={() => handleNavigation(item.href)}
        className={baseClasses}
      >
        {icon}
        <span>{item.label}</span>
        {item.isSmartFeature && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 border border-purple-200">
            AI
          </span>
        )}
      </button>
    );
  };

  if (variant === 'sidebar') {
    return (
      <aside className={`w-64 bg-white border-r border-zinc-200 ${className}`}>
        <div className="p-6">
          {/* Role Indicator */}
          <div className="mb-6">
            <RoleIndicator 
              currentRole={currentRole} 
              variant="pill" 
              size="md"
            />
          </div>

          {/* Navigation Items */}
          <nav className="space-y-2">
            {navigationItems.map(renderNavigationItem)}
          </nav>

          {/* Role Switch Section */}
          {availableRoles.length > 1 && onRoleSwitch && (
            <div className="mt-8 pt-6 border-t border-zinc-200">
              <p className="text-xs font-medium text-zinc-500 mb-3">Cambiar rol</p>
              <div className="space-y-2">
                {availableRoles
                  .filter(role => role !== currentRole)
                  .map(role => (
                    <button
                      key={role}
                      onClick={() => onRoleSwitch(role)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 rounded-lg transition-colors"
                    >
                      {role === 'candidate' ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                      <span>{role === 'candidate' ? 'Modo Candidato' : 'Modo Empresa'}</span>
                    </button>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      </aside>
    );
  }

  if (variant === 'mobile') {
    return (
      <>
        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-zinc-600 hover:text-zinc-900"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed top-0 right-0 bottom-0 w-80 bg-white shadow-xl">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <RoleIndicator currentRole={currentRole} variant="pill" />
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Navigation */}
                <nav className="space-y-2 mb-8">
                  {navigationItems.map(renderNavigationItem)}
                </nav>

                {/* Role Switch */}
                {availableRoles.length > 1 && onRoleSwitch && (
                  <div className="pt-6 border-t border-zinc-200">
                    <p className="text-sm font-medium text-zinc-900 mb-3">Cambiar rol</p>
                    <div className="space-y-2">
                      {availableRoles
                        .filter(role => role !== currentRole)
                        .map(role => (
                          <button
                            key={role}
                            onClick={() => {
                              onRoleSwitch(role);
                              setMobileMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 rounded-lg transition-colors"
                          >
                            <div className={`p-2 rounded-full ${
                              role === 'candidate' ? 'bg-emerald-100' : 'bg-blue-100'
                            }`}>
                              {role === 'candidate' ? 
                                <User className="w-4 h-4 text-emerald-600" /> : 
                                <Building2 className="w-4 h-4 text-blue-600" />
                              }
                            </div>
                            <div>
                              <div className="font-medium">
                                {role === 'candidate' ? 'Candidato' : 'Empresa'}
                              </div>
                              <div className="text-xs text-zinc-500">
                                {role === 'candidate' 
                                  ? 'Buscar empleos y postular' 
                                  : 'Gestionar empleos y candidatos'
                                }
                              </div>
                            </div>
                          </button>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Default header variant
  return (
    <nav className={`hidden md:flex items-center gap-6 ${className}`}>
      {navigationItems.map(renderNavigationItem)}
    </nav>
  );
}

// Specialized navigation components
export function CandidateNavigation(props: Omit<RoleBasedNavigationProps, 'currentRole'>) {
  return <RoleBasedNavigation {...props} currentRole="candidate" />;
}

export function CompanyNavigation(props: Omit<RoleBasedNavigationProps, 'currentRole'>) {
  return <RoleBasedNavigation {...props} currentRole="company" />;
}

// Navigation breadcrumbs component
export function NavigationBreadcrumbs({ 
  currentRole, 
  className = "" 
}: { 
  currentRole: ProfileType; 
  className?: string; 
}) {
  const pathname = usePathname();
  const router = useRouter();
  const breadcrumbs = RoleBasedRoutingService.getBreadcrumbs(pathname, currentRole);

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`}>
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex items-center">
          {index > 0 && (
            <span className="mx-2 text-zinc-400">/</span>
          )}
          <button
            onClick={() => router.push(crumb.href)}
            className={`${
              crumb.isActive 
                ? 'text-zinc-900 font-medium' 
                : 'text-zinc-500 hover:text-zinc-700'
            } transition-colors`}
          >
            {crumb.label}
          </button>
        </div>
      ))}
    </nav>
  );
}