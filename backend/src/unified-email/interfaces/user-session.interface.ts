// backend/src/unified-email/interfaces/user-session.interface.ts
import { Timestamp } from 'firebase-admin/firestore';
import { ProfileType } from './unified-user-account.interface';

export interface RoleHistoryEntry {
  role: ProfileType;
  timestamp: Timestamp;
  duration?: number; // in milliseconds
}

export interface SessionData {
  roleHistory: RoleHistoryEntry[];
  preferences: Record<string, any>;
  navigationState: Record<string, any>;
}

export interface UserSession {
  userId: string;
  activeRole: ProfileType;
  previousRole?: ProfileType;
  createdAt: Timestamp;
  lastActivity: Timestamp;
  roleChangedAt: Timestamp;
  sessionData: SessionData;
}

