// backend/src/unified-email/services/role-manager.service.ts
import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import type * as admin from 'firebase-admin';
import {
  ProfileType,
  UnifiedUserAccount,
  UserSession,
  RoleSelectionPreference,
  ProfileTypes
} from '../interfaces';
import { FIRESTORE_COLLECTIONS } from '../constants/firestore-collections';
import { UnifiedAuthService } from './unified-auth.service';

@Injectable()
export class RoleManagerService {
  constructor(
    @Inject('FIREBASE_ADMIN') private readonly fb: typeof import('firebase-admin'),
    private readonly unifiedAuthService: UnifiedAuthService
  ) {}

  /**
   * Switch user's active role
   * Validates: Requirements 2.4 (Session preservation during role switching)
   */
  async switchRole(userId: string, newRole: ProfileType): Promise<UserSession> {
    const firestore = this.fb.firestore();

    try {
      // Verify user has the requested profile type
      const profileTypes = await this.unifiedAuthService.checkUserProfiles(userId);
      
      if (!profileTypes.availableRoles.includes(newRole)) {
        throw new BadRequestException(`El usuario no tiene un perfil de ${newRole}`);
      }

      // Get current session or create new one
      let session = await this.getCurrentSession(userId);
      
      if (!session) {
        session = await this.createSession(userId, newRole);
      } else {
        // Preserve session data while switching role
        const previousRole = session.activeRole;
        const sessionData = { ...session.sessionData };

        session = {
          ...session,
          activeRole: newRole,
          previousRole,
          sessionData: {
            ...sessionData,
            roleHistory: [
              ...(sessionData.roleHistory || []),
              {
                role: previousRole,
                timestamp: session.lastActivity,
                duration: Timestamp.now().toMillis() - session.lastActivity.toMillis()
              }
            ]
          },
          lastActivity: Timestamp.now(),
          roleChangedAt: Timestamp.now()
        };

        // Update session in Firestore
        await firestore
          .collection(FIRESTORE_COLLECTIONS.SESSIONS)
          .doc(userId)
          .set(session, { merge: true });
      }

      return session;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error switching role:', error);
      throw new BadRequestException('Error al cambiar de rol');
    }
  }

  /**
   * Get current user session
   */
  async getCurrentSession(userId: string): Promise<UserSession | null> {
    try {
      const doc = await this.fb.firestore()
        .collection(FIRESTORE_COLLECTIONS.SESSIONS)
        .doc(userId)
        .get();

      if (!doc.exists) {
        return null;
      }

      return doc.data() as UserSession;
    } catch (error) {
      console.error('Error getting current session:', error);
      return null;
    }
  }

  /**
   * Create new user session
   */
  async createSession(userId: string, initialRole: ProfileType): Promise<UserSession> {
    const firestore = this.fb.firestore();
    const now = Timestamp.now();

    try {
      const session: UserSession = {
        userId,
        activeRole: initialRole,
        createdAt: now,
        lastActivity: now,
        roleChangedAt: now,
        sessionData: {
          roleHistory: [],
          preferences: {},
          navigationState: {}
        }
      };

      await firestore
        .collection(FIRESTORE_COLLECTIONS.SESSIONS)
        .doc(userId)
        .set(session);

      return session;
    } catch (error) {
      console.error('Error creating session:', error);
      throw new BadRequestException('Error al crear la sesión');
    }
  }

  /**
   * Determine appropriate role for user login
   * Validates: Requirements 3.2, 3.3, 3.4, 3.5 (Profile-type-based routing)
   */
  async determineLoginRole(userId: string): Promise<{
    recommendedRole: ProfileType | null;
    availableRoles: ProfileType[];
    requiresSelection: boolean;
  }> {
    try {
      // Get user's profile types
      const profileTypes = await this.unifiedAuthService.checkUserProfiles(userId);
      const { availableRoles } = profileTypes;

      // Get user preferences
      const userAccount = await this.unifiedAuthService.getUnifiedUserAccount(userId);
      const preference = userAccount?.preferences?.roleSelectionPreference || 'ask';

      // Handle different scenarios
      if (availableRoles.length === 0) {
        // No profiles - user needs to create one
        return {
          recommendedRole: null,
          availableRoles: [],
          requiresSelection: true
        };
      }

      if (availableRoles.length === 1) {
        // Single profile - auto-select
        return {
          recommendedRole: availableRoles[0],
          availableRoles,
          requiresSelection: false
        };
      }

      // Multiple profiles - check preference
      if (preference === 'candidate' && availableRoles.includes('candidate')) {
        return {
          recommendedRole: 'candidate',
          availableRoles,
          requiresSelection: false
        };
      }

      if (preference === 'company' && availableRoles.includes('company')) {
        return {
          recommendedRole: 'company',
          availableRoles,
          requiresSelection: false
        };
      }

      // Default to asking user to select
      return {
        recommendedRole: availableRoles[0], // Default to first available
        availableRoles,
        requiresSelection: true
      };
    } catch (error) {
      console.error('Error determining login role:', error);
      throw new BadRequestException('Error al determinar el rol de inicio de sesión');
    }
  }

  /**
   * Update user's role selection preference
   */
  async updateRolePreference(
    userId: string, 
    preference: RoleSelectionPreference
  ): Promise<void> {
    try {
      await this.fb.firestore()
        .collection(FIRESTORE_COLLECTIONS.USERS)
        .doc(userId)
        .update({
          'preferences.roleSelectionPreference': preference,
          updatedAt: Timestamp.now()
        });
    } catch (error) {
      console.error('Error updating role preference:', error);
      throw new BadRequestException('Error al actualizar la preferencia de rol');
    }
  }

  /**
   * Get role-based routing information
   * Validates: Requirements 3.2, 3.3 (Profile-type-based routing)
   */
  async getRoleBasedRouting(userId: string, targetRole: ProfileType): Promise<{
    dashboardPath: string;
    allowedRoutes: string[];
    restrictedRoutes: string[];
  }> {
    try {
      // Verify user has the requested role
      const profileTypes = await this.unifiedAuthService.checkUserProfiles(userId);
      
      if (!profileTypes.availableRoles.includes(targetRole)) {
        throw new BadRequestException(`El usuario no tiene acceso al rol de ${targetRole}`);
      }

      if (targetRole === 'candidate') {
        return {
          dashboardPath: '/candidate/dashboard',
          allowedRoutes: [
            '/candidate/*',
            '/jobs/search',
            '/jobs/apply',
            '/applications/*',
            '/profile/candidate',
            '/settings'
          ],
          restrictedRoutes: [
            '/company/*',
            '/jobs/post',
            '/jobs/manage',
            '/candidates/*'
          ]
        };
      } else {
        return {
          dashboardPath: '/company/dashboard',
          allowedRoutes: [
            '/company/*',
            '/jobs/post',
            '/jobs/manage',
            '/candidates/*',
            '/profile/company',
            '/settings'
          ],
          restrictedRoutes: [
            '/candidate/*',
            '/jobs/apply',
            '/applications/*'
          ]
        };
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error getting role-based routing:', error);
      throw new BadRequestException('Error al obtener la información de enrutamiento');
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(userId: string): Promise<void> {
    try {
      await this.fb.firestore()
        .collection(FIRESTORE_COLLECTIONS.SESSIONS)
        .doc(userId)
        .update({
          lastActivity: Timestamp.now()
        });
    } catch (error) {
      // Silently fail - session might not exist yet
      console.warn('Could not update session activity:', error);
    }
  }

  /**
   * End user session
   */
  async endSession(userId: string): Promise<void> {
    try {
      await this.fb.firestore()
        .collection(FIRESTORE_COLLECTIONS.SESSIONS)
        .doc(userId)
        .delete();
    } catch (error) {
      console.error('Error ending session:', error);
      throw new BadRequestException('Error al finalizar la sesión');
    }
  }

  /**
   * Get session statistics for analytics
   */
  async getSessionStats(userId: string): Promise<{
    totalSessions: number;
    averageSessionDuration: number;
    roleUsageStats: Record<ProfileType, number>;
    lastLoginDate: Timestamp | null;
  }> {
    try {
      const session = await this.getCurrentSession(userId);
      
      if (!session) {
        return {
          totalSessions: 0,
          averageSessionDuration: 0,
          roleUsageStats: { candidate: 0, company: 0 },
          lastLoginDate: null
        };
      }

      const roleHistory = session.sessionData?.roleHistory || [];
      const roleUsageStats: Record<ProfileType, number> = { candidate: 0, company: 0 };

      // Calculate role usage from history
      roleHistory.forEach(entry => {
        if (entry.role in roleUsageStats) {
          roleUsageStats[entry.role] += entry.duration || 0;
        }
      });

      // Add current session time
      const currentSessionDuration = Timestamp.now().toMillis() - session.lastActivity.toMillis();
      roleUsageStats[session.activeRole] += currentSessionDuration;

      const totalDuration = Object.values(roleUsageStats).reduce((sum, duration) => sum + duration, 0);
      const averageSessionDuration = roleHistory.length > 0 ? totalDuration / roleHistory.length : currentSessionDuration;

      return {
        totalSessions: roleHistory.length + 1,
        averageSessionDuration,
        roleUsageStats,
        lastLoginDate: session.createdAt
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      return {
        totalSessions: 0,
        averageSessionDuration: 0,
        roleUsageStats: { candidate: 0, company: 0 },
        lastLoginDate: null
      };
    }
  }
}