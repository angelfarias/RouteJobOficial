// backend/src/unified-email/constants/firestore-collections.ts

/**
 * Firestore collection names for the unified email system
 */
export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  CANDIDATES: 'candidates', 
  COMPANIES: 'companies',
  SESSIONS: 'user_sessions'
} as const;

/**
 * Firestore collection structure for unified email system:
 * 
 * users/{userId} - UnifiedUserAccount
 * candidates/{userId} - CandidateProfile  
 * companies/{userId} - CompanyProfile
 * user_sessions/{userId} - UserSession
 */
export type FirestoreCollectionName = typeof FIRESTORE_COLLECTIONS[keyof typeof FIRESTORE_COLLECTIONS];