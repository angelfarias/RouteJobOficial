"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { Menu, X, Bell, Sparkles, MapPin, Settings } from "lucide-react";
import type { User } from "firebase/auth";
import AccountSettingsModal from "./AccountSettingsModal";

interface ProfileUpdateData {
  displayName?: string;
  email?: string;
  phoneNumber?: string;
}

interface UnifiedHeaderProps {
  currentPage?: 'dashboard' | 'smart-cv' | 'smart-match' | 'company' | 'jobs' | 'profile' | 'map';
  user: User | null;
  showSmartFeatures?: boolean;
  onLogout?: () => void;
  onNavigate?: (path: string) => void;
  onProfileUpdate?: (data: ProfileUpdateData) => Promise<void>;
  onAccountDelete?: () => Promise<void>;
}

export default function UnifiedHeader({ 
  currentPage = 'dashboard', 
  user, 
  showSmartFeatures = true,
  onLogout,
  onNavigate,
  onProfileUpdate,
  onAccountDelete
}: UnifiedHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Determine current page from pathname if not explicitly provided
  const getCurrentPage = (): string => {
    if (pathname?.includes('/perfil/smart')) return 'smart-cv';
    if (pathname?.includes('/mapa')) return 'smart-match';
    if (pathname?.includes('/company')) return 'company';
    if (pathname?.includes('/jobs')) return 'jobs';
    if (pathname?.includes('/perfil')) return 'profile';
    return currentPage;
  };

  const activePage = getCurrentPage();

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
    }
    router.push("/");
  };

  const handleNavigation = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      router.push(path);
    }
  };

  const navigationItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
      icon: null,
      isSmartFeature: false,
    },
    {
      key: 'jobs',
      label: 'Buscar empleos',
      href: '/dashboard/jobs',
      icon: null,
      isSmartFeature: false,
    },
    {
      key: 'smart-match',
      label: 'Smart Match',
      href: '/dashboard/mapa',
      icon: <MapPin className="w-4 h-4" />,
      isSmartFeature: true,
    },
    {
      key: 'smart-cv',
      label: 'Smart CV',
      href: '/dashboard/perfil/smart',
      icon: <Sparkles className="w-4 h-4" />,
      isSmartFeature: true,
    },
  ];

  const companyNavigationItems = [
    {
      key: 'company',
      label: 'Panel empresa',
      href: '/company',
      icon: null,
      isSmartFeature: false,
    },
    {
      key: 'dashboard',
      label: 'Modo candidato',
      href: '/dashboard',
      icon: null,
      isSmartFeature: false,
    },
  ];

  const isCompanyMode = activePage === 'company';
  const items = isCompanyMode ? companyNavigationItems : navigationItems;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 backdrop-blur-xl border-b border-zinc-200/60 shadow-sm">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <div
          className="flex cursor-pointer items-center gap-3"
          onClick={() => handleNavigation(isCompanyMode ? "/company" : "/dashboard")}
        >
          <div className="relative w-32 h-10">
            <Image
              src="/logo.png"
              alt="RouteJob"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 md:flex text-sm">
          {items.map((item) => {
            const isActive = activePage === item.key;
            const isSmartFeature = item.isSmartFeature && showSmartFeatures;
            
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNavigation(item.href)}
                className={`font-semibold transition-all relative flex items-center gap-2 ${
                  isActive
                    ? isSmartFeature
                      ? "text-purple-600 after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-full after:bg-gradient-to-r after:from-purple-500 after:to-blue-500 after:rounded-full"
                      : "text-emerald-600 after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-full after:bg-emerald-500 after:rounded-full"
                    : "text-zinc-600 hover:text-zinc-900 after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-emerald-500 after:rounded-full hover:after:w-full after:transition-all after:duration-300"
                } ${isSmartFeature ? "hover:text-purple-600" : ""}`}
              >
                {item.icon}
                {item.label}
                {isSmartFeature && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 border border-purple-200">
                    AI
                  </span>
                )}
              </button>
            );
          })}
          
          {!isCompanyMode && (
            <button
              type="button"
              onClick={() => handleNavigation("/company")}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-zinc-900/15 hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all"
            >
              Cuenta empresa
            </button>
          )}
        </nav>

        {/* Right Side Actions */}
        <div className="relative flex items-center gap-3">
          {/* Notifications */}
          <button
            type="button"
            className="relative rounded-full p-2 hover:bg-zinc-100 transition-colors"
          >
            <Bell className="h-5 w-5 text-zinc-600" />
            {/* Notification badge */}
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
              3
            </span>
          </button>

          {/* User Menu */}
          {user && (
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white/60 px-3 py-1.5 text-xs text-zinc-800 hover:bg-zinc-50 transition-all"
            >
              <span className="max-w-[140px] truncate">
                {user.displayName || user.email}
              </span>
              <span className="text-[10px] text-zinc-500">▼</span>
            </button>
          )}

          {/* User Dropdown Menu */}
          {userMenuOpen && user && (
            <div className="absolute right-0 top-11 z-50 w-64 rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-xl text-zinc-900 shadow-xl shadow-zinc-900/10">
              <div className="border-b border-zinc-200 px-4 py-3">
                <p className="text-sm font-semibold">
                  {user.displayName || "Usuario"}
                </p>
                <p className="text-xs text-zinc-500">{user.email}</p>
              </div>
              
              {!isCompanyMode && (
                <>
                  <button
                    onClick={() => {
                      handleNavigation("/dashboard/perfil/smart");
                      setUserMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-purple-700 hover:bg-purple-50 flex items-center gap-2"
                  >
                    <Sparkles className="w-3 h-3" />
                    Smart CV Assistant
                  </button>
                  <button
                    onClick={() => {
                      handleNavigation("/dashboard/mapa");
                      setUserMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-blue-700 hover:bg-blue-50 flex items-center gap-2"
                  >
                    <MapPin className="w-3 h-3" />
                    Smart Match
                  </button>
                  <button
                    onClick={() => {
                      setAccountSettingsOpen(true);
                      setUserMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                  >
                    <Settings className="w-3 h-3" />
                    Configuración de cuenta
                  </button>
                  <button
                    onClick={() => {
                      handleNavigation("/company");
                      setUserMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50"
                  >
                    Panel empresa
                  </button>
                </>
              )}
              
              {isCompanyMode && (
                <button
                  onClick={() => {
                    handleNavigation("/dashboard");
                    setUserMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50"
                >
                  Volver a modo candidato
                </button>
              )}
              
              <button
                onClick={handleLogout}
                className="w-full border-t border-zinc-200 px-4 py-2 text-left text-xs text-red-500 hover:bg-zinc-50"
              >
                Cerrar sesión
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-zinc-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-zinc-100 p-6 flex flex-col gap-4 shadow-xl md:hidden">
          {items.map((item) => {
            const isActive = activePage === item.key;
            const isSmartFeature = item.isSmartFeature && showSmartFeatures;
            
            return (
              <button
                key={item.key}
                onClick={() => {
                  handleNavigation(item.href);
                  setMobileMenuOpen(false);
                }}
                className={`text-left py-2 border-b border-zinc-50 flex items-center gap-3 ${
                  isActive
                    ? isSmartFeature
                      ? "text-purple-600 font-semibold"
                      : "text-emerald-600 font-semibold"
                    : "text-zinc-800 font-medium"
                }`}
              >
                {item.icon}
                {item.label}
                {isSmartFeature && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 border border-purple-200">
                    AI
                  </span>
                )}
              </button>
            );
          })}
          
          <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-zinc-100">
            {!isCompanyMode && (
              <button
                onClick={() => {
                  handleNavigation("/company");
                  setMobileMenuOpen(false);
                }}
                className="w-full py-3 rounded-xl bg-zinc-100 font-semibold text-zinc-900"
              >
                Cuenta empresa
              </button>
            )}
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full py-3 rounded-xl bg-red-50 font-semibold text-red-600"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {/* Account Settings Modal */}
      {user && (
        <AccountSettingsModal
          isOpen={accountSettingsOpen}
          onClose={() => setAccountSettingsOpen(false)}
          user={user}
          onProfileUpdate={onProfileUpdate || (async () => {})}
          onAccountDelete={onAccountDelete || (async () => {})}
        />
      )}
    </header>
  );
}