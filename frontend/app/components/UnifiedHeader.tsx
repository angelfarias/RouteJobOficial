"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { Menu, X, Bell, Sparkles, MapPin, Settings } from "lucide-react";
import type { User } from "firebase/auth";
import AccountSettingsModal from "./AccountSettingsModal";
import { ThemeToggle } from "./ThemeToggle";

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
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 shadow-sm`}>
      <div className="mx-auto max-w-7xl h-full px-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleNavigation(isCompanyMode ? "/company" : "/dashboard")}>
          <div className="relative w-40 h-24">
            <Image
              src="/logo.png"
              alt="RouteJob Logo"
              fill
              className="object-contain object-left dark:invert dark:hue-rotate-180"
              priority
            />
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {items.map((item) => (
            <a
              key={item.key}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                handleNavigation(item.href);
              }}
              className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-500 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right Side Actions */}
        <div className="relative flex items-center gap-3">
          {/* Botón Cuenta Empresa */}
          {!isCompanyMode && (
            <button
              onClick={() => handleNavigation("/company")}
              className="group relative px-4 py-2 text-sm font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-full overflow-hidden transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:shadow-lg hover:shadow-zinc-900/20 active:scale-95"
            >
              <span className="relative z-10">Cuenta empresa</span>
              <div className="absolute inset-0 h-full w-full bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
            </button>
          )}

          {/* Notifications */}
          <button
            type="button"
            className="relative rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Bell className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            {/* Notification badge */}
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
              3
            </span>
          </button>

          <ThemeToggle />

          {/* User Menu */}
          {user && (
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white/60 dark:bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
            >
              <span className="max-w-[140px] truncate">
                {user.displayName || user.email}
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">▼</span>
            </button>
          )}

          {/* User Dropdown Menu */}
          {userMenuOpen && user && (
            <div className="absolute right-0 top-11 z-50 w-64 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl text-zinc-900 dark:text-zinc-100 shadow-xl shadow-zinc-900/10">
              <div className="border-b border-zinc-200 dark:border-zinc-700 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-lg">
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {user.displayName || user.email || 'Usuario'}
                    </p>
                    {user.email && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {!isCompanyMode && (
                <>
                  <button
                    onClick={() => {
                      handleNavigation("/dashboard/perfil/smart");
                      setUserMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-2"
                  >
                    <Sparkles className="w-3 h-3" />
                    Smart CV Assistant
                  </button>
                  <button
                    onClick={() => {
                      handleNavigation("/dashboard/mapa");
                      setUserMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2"
                  >
                    <MapPin className="w-3 h-3" />
                    Smart Match
                  </button>
                  <button
                    onClick={() => {
                      setAccountSettingsOpen(true);
                      setUserMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-2"
                  >
                    <Settings className="w-3 h-3" />
                    Configuración de cuenta
                  </button>
                  <button
                    onClick={() => {
                      handleNavigation("/company");
                      setUserMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
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
                  className="w-full px-4 py-2 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Volver a modo candidato
                </button>
              )}

              <button
                onClick={handleLogout}
                className="w-full border-t border-zinc-200 dark:border-zinc-700 px-4 py-2 text-left text-xs text-red-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Cerrar sesión
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-zinc-600 dark:text-zinc-400"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 p-6 flex flex-col gap-4 shadow-xl md:hidden">
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
                className={`text-left py-2 border-b border-zinc-50 dark:border-zinc-800 flex items-center gap-3 ${isActive
                    ? isSmartFeature
                      ? "text-purple-600 dark:text-purple-400 font-semibold"
                      : "text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "text-zinc-800 dark:text-zinc-200 font-medium"
                  }`}
              >
                {item.icon}
                {item.label}
                {isSmartFeature && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    AI
                  </span>
                )}
              </button>
            );
          })}

          <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            {!isCompanyMode && (
              <button
                onClick={() => {
                  handleNavigation("/company");
                  setMobileMenuOpen(false);
                }}
                className="w-full py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-900 dark:text-zinc-100"
              >
                Cuenta empresa
              </button>
            )}
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full py-3 rounded-xl bg-red-50 dark:bg-red-900/20 font-semibold text-red-600 dark:text-red-400"
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
          onProfileUpdate={onProfileUpdate || (async () => { })}
          onAccountDelete={onAccountDelete || (async () => { })}
        />
      )}
    </header>
  );
}