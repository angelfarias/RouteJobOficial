"use client";

import { useState, useEffect } from "react";
import { ChevronDown, User, Building2, Loader2, Check } from "lucide-react";
import { ProfileType } from "../../lib/types/unified-email.types";

export interface RoleSwitcherProps {
  currentRole: ProfileType | null;
  availableRoles: ProfileType[];
  isLoading?: boolean;
  onRoleSwitch: (newRole: ProfileType) => Promise<void>;
  className?: string;
}

export default function RoleSwitcher({
  currentRole,
  availableRoles,
  isLoading = false,
  onRoleSwitch,
  className = ""
}: RoleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-role-switcher]')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  const handleRoleSwitch = async (newRole: ProfileType) => {
    if (newRole === currentRole || switching) return;
    
    setSwitching(true);
    setIsOpen(false);
    
    try {
      await onRoleSwitch(newRole);
    } catch (error) {
      console.error('Error switching role:', error);
      // Optionally show error toast here
    } finally {
      setSwitching(false);
    }
  };

  const getRoleIcon = (role: ProfileType) => {
    return role === 'candidate' ? (
      <User className="w-4 h-4" />
    ) : (
      <Building2 className="w-4 h-4" />
    );
  };

  const getRoleLabel = (role: ProfileType) => {
    return role === 'candidate' ? 'Candidato' : 'Empresa';
  };

  const getRoleColor = (role: ProfileType) => {
    return role === 'candidate' 
      ? 'text-emerald-600 bg-emerald-50 border-emerald-200' 
      : 'text-blue-600 bg-blue-50 border-blue-200';
  };

  // Don't render if no roles available or only one role
  if (!availableRoles.length || availableRoles.length === 1) {
    return null;
  }

  // Show loading state
  if (isLoading || !currentRole) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
        <span className="text-sm text-zinc-500">Cargando...</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} data-role-switcher>
      {/* Current Role Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
          ${getRoleColor(currentRole)}
          ${switching ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm cursor-pointer'}
          ${isOpen ? 'ring-2 ring-offset-1 ring-blue-500/20' : ''}
        `}
      >
        {switching ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          getRoleIcon(currentRole)
        )}
        <span className="text-sm font-medium">
          {getRoleLabel(currentRole)}
        </span>
        <ChevronDown 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg border border-zinc-200 shadow-lg z-50">
          <div className="p-2">
            <div className="text-xs font-medium text-zinc-500 px-2 py-1 mb-1">
              Cambiar rol
            </div>
            
            {availableRoles.map((role) => {
              const isActive = role === currentRole;
              
              return (
                <button
                  key={role}
                  onClick={() => handleRoleSwitch(role)}
                  disabled={isActive || switching}
                  className={`
                    w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors
                    ${isActive 
                      ? 'bg-zinc-100 text-zinc-500 cursor-default' 
                      : 'text-zinc-700 hover:bg-zinc-50 cursor-pointer'
                    }
                  `}
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    role === 'candidate' ? 'bg-emerald-100' : 'bg-blue-100'
                  }`}>
                    {getRoleIcon(role)}
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="font-medium">{getRoleLabel(role)}</div>
                    <div className="text-xs text-zinc-500">
                      {role === 'candidate' 
                        ? 'Buscar empleos y postular' 
                        : 'Publicar empleos y gestionar candidatos'
                      }
                    </div>
                  </div>
                  
                  {isActive && (
                    <Check className="w-4 h-4 text-emerald-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}