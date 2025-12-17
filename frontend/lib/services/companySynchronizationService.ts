import { User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

// Company profile interface for Firestore documents
export interface CompanyProfile {
  uid: string;
  email: string;
  displayName?: string;
  
  // Company-specific data
  name?: string;
  description?: string;
  industry?: string;
  website?: string;
  phone?: string;
  
  // Profile completion status
  profileCompleted: boolean;
  
  // Company metadata
  companyType: 'company';
  
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

// Main company synchronization service
export class CompanySynchronizationService {
  private static instance: CompanySynchronizationService;
  
  public static getInstance(): CompanySynchronizationService {
    if (!CompanySynchronizationService.instance) {
      CompanySynchronizationService.instance = new CompanySynchronizationService();
    }
    return CompanySynchronizationService.instance;
  }

  /**
   * Synchronize company user on registration - create company profile document
   */
  async syncCompanyOnRegistration(user: FirebaseUser): Promise<CompanyProfile> {
    const correlationId = this.generateCorrelationId();
    
    try {
      this.logSyncStart(user.uid, 'company-registration', correlationId);
      
      const profile = await this.createCompanyProfile(user, 'registration');
      
      this.logSyncSuccess(user.uid, 'company-registration', correlationId);
      return profile;
    } catch (error) {
      this.logSyncFailure(user.uid, error as Error, 'company-registration', correlationId);
      throw error;
    }
  }

  /**
   * Synchronize company user on login - verify company profile exists or create it
   */
  async syncCompanyOnLogin(user: FirebaseUser): Promise<CompanyProfile> {
    const correlationId = this.generateCorrelationId();
    
    try {
      this.logSyncStart(user.uid, 'company-login', correlationId);
      
      // Check if company profile exists
      const profileExists = await this.verifyCompanyExists(user.uid);
      
      let profile: CompanyProfile;
      if (profileExists) {
        profile = await this.getCompanyProfile(user.uid);
      } else {
        // Create company profile for existing auth user
        profile = await this.createCompanyProfile(user, 'login');
      }
      
      this.logSyncSuccess(user.uid, 'company-login', correlationId);
      return profile;
    } catch (error) {
      this.logSyncFailure(user.uid, error as Error, 'company-login', correlationId);
      throw error;
    }
  }

  /**
   * Verify if company profile document exists in Firestore
   */
  async verifyCompanyExists(userId: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'companies', userId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error('Error verifying company existence:', error);
      return false;
    }
  }

  /**
   * Get company profile from Firestore
   */
  async getCompanyProfile(userId: string): Promise<CompanyProfile> {
    const docRef = doc(db, 'companies', userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Company profile not found for user ${userId}`);
    }
    
    return docSnap.data() as CompanyProfile;
  }

  /**
   * Create new company profile document in Firestore
   */
  async createCompanyProfile(
    user: FirebaseUser, 
    creationSource: 'registration' | 'login' | 'manual' = 'registration'
  ): Promise<CompanyProfile> {
    const now = serverTimestamp() as Timestamp;
    
    const profile: CompanyProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      
      // Company-specific initialization
      name: '',
      description: '',
      industry: '',
      website: '',
      phone: '',
      
      // Profile completion status
      profileCompleted: false,
      
      // Company type identifier
      companyType: 'company',
      
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
      const docRef = doc(db, 'companies', user.uid);
      await setDoc(docRef, profile);
      
      console.log(`✅ Company profile created successfully for ${user.uid}`);
      return profile;
    } catch (error: any) {
      console.error('❌ Error creating company profile:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'permission-denied') {
        throw new Error(`Permisos insuficientes para crear el perfil de empresa. Por favor, contacta al soporte técnico.`);
      } else if (error.code === 'unavailable') {
        throw new Error(`Servicio temporalmente no disponible. Intenta de nuevo en unos momentos.`);
      } else if (error.code === 'network-request-failed') {
        throw new Error(`Error de conexión. Verifica tu internet e intenta de nuevo.`);
      } else {
        throw new Error(`Error al crear el perfil de empresa: ${error.message || error}`);
      }
    }
  }

  /**
   * Update company profile with new data
   */
  async updateCompanyProfile(userId: string, updates: Partial<CompanyProfile>): Promise<CompanyProfile> {
    const docRef = doc(db, 'companies', userId);
    
    const updateData = {
      ...updates,
      lastUpdatedAt: serverTimestamp()
    };
    
    await setDoc(docRef, updateData, { merge: true });
    
    // Return updated profile
    return this.getCompanyProfile(userId);
  }

  // Utility methods
  private generateCorrelationId(): string {
    return `company_sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logSyncStart(userId: string, operation: string, correlationId: string): void {
    console.log(`🏢 [${correlationId}] Starting ${operation} sync for company user ${userId}`);
  }

  private logSyncSuccess(userId: string, operation: string, correlationId: string): void {
    console.log(`✅ [${correlationId}] ${operation} sync completed successfully for company user ${userId}`);
  }

  private logSyncFailure(userId: string, error: Error, operation: string, correlationId: string): void {
    console.error(`❌ [${correlationId}] ${operation} sync failed for company user ${userId}:`, error);
  }
}

// Export singleton instance
export const companySyncService = CompanySynchronizationService.getInstance();