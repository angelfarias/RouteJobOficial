"use client";

import { useState, useEffect, useCallback } from "react";
import { ProfileType, RoleContext } from "../types/unified-email.types";

export interface UserSession {
  userId: string;
  activeRole: ProfileType;
  previousRole?: ProfileType;
  createdAt: string;
  lastActivity: string;
  roleChangedAt: string;
  sessionData: {
    roleHistory: Array<{
      role: ProfileType;
      timestamp: string;
      duration?: number;
    }>;
    preferences: Record<string, any>;
    navigationState: Record<string, any>;
  };
}

export interface RoleManagerHookReturn {
  roleContext: RoleContext;
  currentSession: UserSession | null;
  switchRole: (newRole: ProfileType) => Promise<void>;
  determineLoginRole: () => Promise<{
    recommendedRole: ProfileType | null;
    availableRoles: ProfileType[];
    requiresSelection: boolean;
  }>;
  updateRolePreference: (preference: 'ask' | 'candidate' | 'company') => Promise<void>;
  refreshRoleContext: () => Promise<void>;
}

export function useRoleManager(userId?: string): RoleManagerHookReturn {
  const [roleContext, setRoleContext] = useState<RoleContext>({
    currentRole: null,
    availableRoles: [],
    isLoading: true
  });
  
  const [currentSession, setCurrentSession] = useState<UserSession | null>(null);

  // API base URL - adjust based on your backend configuration
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const makeApiCall = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE}/unified-email/role-manager${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return response.json();
  };

  const refreshRoleContext = useCallback(async () => {
    if (!userId) {
      setRoleContext({
        currentRole: null,
        availableRoles: [],
        isLoading: false
      });
      return;
    }

    try {
      setRoleContext(prev => ({ ...prev, isLoading: true }));

      // Get current session
      const session = await makeApiCall(`/current-session?userId=${userId}`);
      setCurrentSession(session);

      // Determine available roles and current role
      const loginRoleInfo = await makeApiCall(`/determine-login-role?userId=${userId}`);
      
      setRoleContext({
        currentRole: session?.activeRole || loginRoleInfo.recommendedRole,
        availableRoles: loginRoleInfo.availableRoles,
        isLoading: false
      });
    } catch (error) {
      console.error('Error refreshing role context:', error);
      setRoleContext({
        currentRole: null,
        availableRoles: [],
        isLoading: false
      });
    }
  }, [userId]);

  const switchRole = useCallback(async (newRole: ProfileType) => {
    if (!userId) {
      throw new Error('User ID is required to switch roles');
    }

    try {
      const updatedSession = await makeApiCall('/switch-role', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          newRole
        })
      });

      setCurrentSession(updatedSession);
      setRoleContext(prev => ({
        ...prev,
        currentRole: newRole
      }));

      // Update session activity
      await makeApiCall('/update-activity', {
        method: 'POST',
        body: JSON.stringify({ userId })
      });

    } catch (error) {
      console.error('Error switching role:', error);
      throw error;
    }
  }, [userId]);

  const determineLoginRole = useCallback(async () => {
    if (!userId) {
      return {
        recommendedRole: null,
        availableRoles: [],
        requiresSelection: true
      };
    }

    try {
      return await makeApiCall(`/determine-login-role?userId=${userId}`);
    } catch (error) {
      console.error('Error determining login role:', error);
      return {
        recommendedRole: null,
        availableRoles: [],
        requiresSelection: true
      };
    }
  }, [userId]);

  const updateRolePreference = useCallback(async (preference: 'ask' | 'candidate' | 'company') => {
    if (!userId) {
      throw new Error('User ID is required to update role preference');
    }

    try {
      await makeApiCall('/role-preference', {
        method: 'PUT',
        body: JSON.stringify({
          userId,
          preference
        })
      });
    } catch (error) {
      console.error('Error updating role preference:', error);
      throw error;
    }
  }, [userId]);

  // Initialize role context when userId changes
  useEffect(() => {
    refreshRoleContext();
  }, [refreshRoleContext]);

  // Update session activity periodically
  useEffect(() => {
    if (!userId || !currentSession) return;

    const interval = setInterval(async () => {
      try {
        await makeApiCall('/update-activity', {
          method: 'POST',
          body: JSON.stringify({ userId })
        });
      } catch (error) {
        console.warn('Failed to update session activity:', error);
      }
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [userId, currentSession]);

  return {
    roleContext,
    currentSession,
    switchRole,
    determineLoginRole,
    updateRolePreference,
    refreshRoleContext
  };
}