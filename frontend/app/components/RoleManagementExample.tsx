"use client";

import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import RoleSwitcher from "./RoleSwitcher";
import RoleSelector from "./RoleSelector";
import RoleIndicator from "./RoleIndicator";
import { useRoleManager } from "../../lib/hooks/useRoleManager";
import { ProfileType } from "../../lib/types/unified-email.types";

interface RoleManagementExampleProps {
  user: User | null;
  onRoleChange?: (newRole: ProfileType) => void;
}

/**
 * Example component showing how to integrate role management components
 * This demonstrates the unified email system's role switching functionality
 */
export default function RoleManagementExample({ 
  user, 
  onRoleChange 
}: RoleManagementExampleProps) {
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  
  const {
    roleContext,
    currentSession,
    switchRole,
    determineLoginRole,
    refreshRoleContext
  } = useRoleManager(user?.uid);

  const { currentRole, availableRoles, isLoading } = roleContext;

  // Check if user needs to select a role on first login
  useEffect(() => {
    const checkRoleSelection = async () => {
      if (!user || isLoading) return;

      try {
        const loginInfo = await determineLoginRole();
        
        // Show role selector if user has multiple roles and requires selection
        if (loginInfo.requiresSelection && loginInfo.availableRoles.length > 1) {
          setShowRoleSelector(true);
        }
      } catch (error) {
        console.error('Error checking role selection:', error);
      }
    };

    checkRoleSelection();
  }, [user, isLoading, determineLoginRole]);

  const handleRoleSwitch = async (newRole: ProfileType) => {
    try {
      await switchRole(newRole);
      onRoleChange?.(newRole);
      setShowRoleSelector(false);
    } catch (error) {
      console.error('Error switching role:', error);
      // You could show a toast notification here
    }
  };

  const handleRoleSelect = async (role: ProfileType) => {
    try {
      await switchRole(role);
      onRoleChange?.(role);
      setShowRoleSelector(false);
    } catch (error) {
      console.error('Error selecting role:', error);
    }
  };

  // Show role selector modal for first-time selection
  if (showRoleSelector) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <RoleSelector
              availableRoles={availableRoles}
              onRoleSelect={handleRoleSelect}
              title="¡Bienvenido! Selecciona tu rol"
              subtitle="Tienes múltiples perfiles. Elige cómo quieres usar la plataforma ahora."
            />
          </div>
        </div>
      </div>
    );
  }

  // Don't render anything if no user or still loading
  if (!user || isLoading) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      {/* Current Role Indicator */}
      {currentRole && (
        <RoleIndicator 
          currentRole={currentRole} 
          variant="pill"
          size="sm"
        />
      )}

      {/* Role Switcher (only shows if multiple roles available) */}
      <RoleSwitcher
        currentRole={currentRole}
        availableRoles={availableRoles}
        onRoleSwitch={handleRoleSwitch}
        isLoading={isLoading}
      />

      {/* Manual Role Selection Button */}
      {availableRoles.length > 1 && (
        <button
          onClick={() => setShowRoleSelector(true)}
          className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          Cambiar rol
        </button>
      )}

      {/* Session Info (for debugging/admin) */}
      {process.env.NODE_ENV === 'development' && currentSession && (
        <div className="text-xs text-zinc-400 ml-4">
          Sesión: {new Date(currentSession.lastActivity).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}