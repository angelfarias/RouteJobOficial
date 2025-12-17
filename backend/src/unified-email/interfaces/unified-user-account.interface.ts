// backend/src/unified-email/interfaces/unified-user-account.interface.ts
import { Timestamp } from 'firebase-admin/firestore';

export type ProfileType = 'candidate' | 'company';
export type RoleSelectionPreference = 'ask' | 'candidate' | 'company';

export interface UnifiedUserAccount {
  uid: string; // Firebase Auth UID
  email: string;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  profileTypes: ProfileType[];
  defaultRole?: ProfileType;
  preferences: {
    lastUsedRole?: ProfileType;
    roleSelectionPreference: RoleSelectionPreference;
  };
}

export interface ProfileTypes {
  hasCandidate: boolean;
  hasCompany: boolean;
  availableRoles: ProfileType[];
}