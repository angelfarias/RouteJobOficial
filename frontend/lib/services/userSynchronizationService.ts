import { User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

// Candidate profile interface for Firestore documents (following existing structure)
export interface CandidateProfile {
  uid: string;
  email: string;
  displayName?: string;
  
  // Profile completion status
  profileCompleted: boolean;
  
  // Core candidate data (following existing structure)
  experience?: string[];
  skills?: string[];
  location?: {
    latitude: number;
    longitude: number;
  };
  radioKm?: number;
  
  // Category preferences
  preferredCategories?: string[];
  categoryWeights?: { [categoryId: string]: number };
  
  // Match weights
  matchWeights?: {
    location?: number;
    category?: number;
    experience?: number;
    skills?: number;
  };
  
  // Timestamps
  createdAt?: Timestamp;
  lastUpdatedAt?: Timestamp;
  
  // Sync metadata
  syncMetadata?: {
    syncVersion: string;
    creationSource: 'registration' | 'login' | 'manual';
    retryCount: number;
  };
}

// Error interface for synchronization operations
export interface SyncError {
  code: string;
  message: string;
  userId: string;
  operation: string;
  timestamp: Timestamp;
  correlationId: string;
  retryable: boolean;
  context: any;
}

// Main synchronization service
export class UserSynchronizationService {
  private static instance: UserSynchronizationService;
  
  public static getInstance(): UserSynchronizationService {
    if (!UserSynchronizationService.instance) {
      UserSynchronizationService.instance = new UserSynchronizationService();
    }
    return UserSynchronizationService.instance;
  }

  /**
   * Synchronize user on registration - create candidate profile document
   */
  async syncUserOnRegistration(user: FirebaseUser): Promise<CandidateProfile> {
    const correlationId = this.generateCorrelationId();
    
    try {
      this.logSyncStart(user.uid, 'registration', correlationId);
      
      const profile = await this.createCandidateProfile(user, 'registration');
      
      this.logSyncSuccess(user.uid, 'registration', correlationId);
      return profile;
    } catch (error) {
      this.logSyncFailure(user.uid, error as Error, 'registration', correlationId);
      throw error;
    }
  }

  /**
   * Synchronize user on login - verify candidate profile exists or create it
   */
  async syncUserOnLogin(user: FirebaseUser): Promise<CandidateProfile> {
    const correlationId = this.generateCorrelationId();
    
    try {
      this.logSyncStart(user.uid, 'login', correlationId);
      
      // Check if candidate profile exists
      const profileExists = await this.verifyCandidateExists(user.uid);
      
      let profile: CandidateProfile;
      if (profileExists) {
        profile = await this.getCandidateProfile(user.uid);
      } else {
        // Create candidate profile for existing auth user
        profile = await this.createCandidateProfile(user, 'login');
      }
      
      this.logSyncSuccess(user.uid, 'login', correlationId);
      return profile;
    } catch (error) {
      this.logSyncFailure(user.uid, error as Error, 'login', correlationId);
      throw error;
    }
  }

  /**
   * Verify if candidate profile document exists in Firestore
   */
  async verifyCandidateExists(userId: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'candidates', userId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error('Error verifying candidate existence:', error);
      return false;
    }
  }

  /**
   * Get candidate profile from Firestore
   */
  async getCandidateProfile(userId: string): Promise<CandidateProfile> {
    const docRef = doc(db, 'candidates', userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Candidate profile not found for user ${userId}`);
    }
    
    return docSnap.data() as CandidateProfile;
  }

  /**
   * Create new candidate profile document in Firestore (following existing structure)
   */
  async createCandidateProfile(
    user: FirebaseUser, 
    creationSource: 'registration' | 'login' | 'manual' = 'registration'
  ): Promise<CandidateProfile> {
    const now = serverTimestamp() as Timestamp;
    
    const profile: CandidateProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      
      // Profile completion status (following existing pattern)
      profileCompleted: false,
      
      // Initialize empty arrays for candidate data (following existing structure)
      experience: [],
      skills: [],
      preferredCategories: [],
      categoryWeights: {},
      
      // Default match weights
      matchWeights: {
        location: 0.3,
        category: 0.4,
        experience: 0.2,
        skills: 0.1
      },
      
      // Timestamps
      createdAt: now,
      lastUpdatedAt: now,
      
      // Sync metadata
      syncMetadata: {
        syncVersion: '1.0.0',
        creationSource,
        retryCount: 0
      }
    };

    try {
      const docRef = doc(db, 'candidates', user.uid);
      await setDoc(docRef, profile);
      
      console.log(`✅ Candidate profile created successfully for ${user.uid}`);
      return profile;
    } catch (error: any) {
      console.error('❌ Error creating candidate profile:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'permission-denied') {
        throw new Error(`Permisos insuficientes para crear el perfil. Por favor, contacta al soporte técnico.`);
      } else if (error.code === 'unavailable') {
        throw new Error(`Servicio temporalmente no disponible. Intenta de nuevo en unos momentos.`);
      } else if (error.code === 'network-request-failed') {
        throw new Error(`Error de conexión. Verifica tu internet e intenta de nuevo.`);
      } else {
        throw new Error(`Error al crear el perfil de candidato: ${error.message || error}`);
      }
    }
  }

  /**
   * Update candidate profile with new data
   */
  async updateCandidateProfile(userId: string, updates: Partial<CandidateProfile>): Promise<CandidateProfile> {
    const docRef = doc(db, 'candidates', userId);
    
    const updateData = {
      ...updates,
      lastUpdatedAt: serverTimestamp()
    };
    
    await setDoc(docRef, updateData, { merge: true });
    
    // Return updated profile
    return this.getCandidateProfile(userId);
  }

  /**
   * Retry candidate profile creation with exponential backoff
   */
  async retryCandidateCreation(
    user: FirebaseUser, 
    attempt: number = 1,
    maxAttempts: number = 5
  ): Promise<CandidateProfile> {
    if (attempt > maxAttempts) {
      throw new Error(`Failed to create candidate profile after ${maxAttempts} attempts`);
    }

    try {
      return await this.createCandidateProfile(user, 'manual');
    } catch (error) {
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      
      console.warn(`Candidate profile creation attempt ${attempt} failed, retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryCandidateCreation(user, attempt + 1, maxAttempts);
    }
  }

  // Legacy method names for backward compatibility
  async verifyProfileExists(userId: string): Promise<boolean> {
    return this.verifyCandidateExists(userId);
  }

  async createUserProfile(user: FirebaseUser, creationSource: 'registration' | 'login' | 'manual' = 'registration'): Promise<CandidateProfile> {
    return this.createCandidateProfile(user, creationSource);
  }

  async retryProfileCreation(user: FirebaseUser, attempt: number = 1, maxAttempts: number = 5): Promise<CandidateProfile> {
    return this.retryCandidateCreation(user, attempt, maxAttempts);
  }

  // Utility methods
  private generateCorrelationId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logSyncStart(userId: string, operation: string, correlationId: string): void {
    console.log(`🔄 [${correlationId}] Starting ${operation} sync for user ${userId}`);
  }

  private logSyncSuccess(userId: string, operation: string, correlationId: string): void {
    console.log(`✅ [${correlationId}] ${operation} sync completed successfully for user ${userId}`);
  }

  private logSyncFailure(userId: string, error: Error, operation: string, correlationId: string): void {
    console.error(`❌ [${correlationId}] ${operation} sync failed for user ${userId}:`, error);
  }
}

// Export singleton instance
export const userSyncService = UserSynchronizationService.getInstance();