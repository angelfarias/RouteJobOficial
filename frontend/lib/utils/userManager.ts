// User management utility for handling login/registration issues
import { auth, db } from '@/lib/firebaseClient';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export class UserManager {
  /**
   * Try to login, if user doesn't exist, create the account
   */
  static async loginOrRegister(email: string, password: string): Promise<{ success: boolean; message: string; action: 'login' | 'register' }> {
    try {
      // First, try to login
      console.log('🔍 Attempting login...');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Login successful:', userCredential.user.uid);

      // CRITICAL FIX: Ensure profile exists even on login
      // This handles cases where user exists in Auth but missing in Firestore
      await this.ensureUserProfile(userCredential.user.uid, email);

      return {
        success: true,
        message: 'Login exitoso',
        action: 'login'
      };

    } catch (loginError: any) {
      console.log('❌ Login failed:', loginError.code);

      // Strict Login: Do NOT attempt to register if user is not found
      return {
        success: false,
        message: `Error de login: ${this.getErrorMessage(loginError)}`,
        action: 'login'
      };
    }
  }

  /**
   * Ensure user profile exists in Firestore (Idempotent)
   */
  static async ensureUserProfile(uid: string, email: string): Promise<void> {
    try {
      const docRef = doc(db, 'candidates', uid);
      const docSnap = await import('firebase/firestore').then(m => m.getDoc(docRef));

      if (!docSnap.exists()) {
        console.log('⚠️ Profile missing for existing user, creating now...');
        await this.createUserProfile(uid, email);
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
      // Don't block login if this check fails, but log it
    }
  }

  /**
   * Create user profile in Firestore
   */
  static async createUserProfile(uid: string, email: string): Promise<void> {
    try {
      const nowIso = new Date().toISOString();
      const profileData = {
        uid,
        email,
        name: '', // Added name field
        displayName: '',
        profileCompleted: false,
        experience: [],
        skills: [],
        preferredCategories: [],
        matchWeights: {
          location: 0.3,
          category: 0.4,
          experience: 0.2,
          skills: 0.1
        },
        createdAt: nowIso, // ISO String
        updatedAt: nowIso, // ISO String
        lastUpdatedAt: new Date(), // Keep Timestamp for compatibility (Firestore converts Date to Timestamp)
        syncMetadata: {
          syncVersion: '1.0.0',
          creationSource: 'auto-registration',
          retryCount: 0
        }
      };

      const docRef = doc(db, 'candidates', uid);
      const userDocRef = doc(db, 'users', uid); // Dual-write target

      // Write to both collections
      await Promise.all([
        setDoc(docRef, profileData),
        setDoc(userDocRef, profileData)
      ]);

      console.log('✅ User profile created in Firestore (users + candidates)');

    } catch (error) {
      console.error('❌ Failed to create user profile:', error);
      throw error;
    }
  }

  /**
   * Reset password for existing user
   */
  static async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      await sendPasswordResetEmail(auth, email);
      return {
        success: true,
        message: 'Email de recuperación enviado'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error: ${this.getErrorMessage(error)}`
      };
    }
  }

  /**
   * Get user-friendly error message
   */
  static getErrorMessage(error: any): string {
    if (!error.code) return error.message || 'Error desconocido';

    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'Este correo ya está registrado';
      case 'auth/weak-password':
        return 'La contraseña es muy débil';
      case 'auth/invalid-email':
        return 'Email inválido';
      case 'auth/user-not-found':
        return 'Usuario no encontrado';
      case 'auth/wrong-password':
        return 'Contraseña incorrecta';
      case 'auth/invalid-credential':
        return 'Credenciales inválidas';
      case 'auth/network-request-failed':
        return 'Error de conexión';
      case 'auth/too-many-requests':
        return 'Demasiados intentos, espera un momento';
      case 'permission-denied':
        return 'Permisos insuficientes';
      default:
        return error.message || 'Error desconocido';
    }
  }

  /**
   * Check if user exists (for debugging)
   */
  static async checkUserExists(email: string): Promise<boolean> {
    try {
      // Try to send password reset email - if user doesn't exist, it will fail
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return false;
      }
      // If it's another error, assume user exists
      return true;
    }
  }
}

// Make available in browser console for debugging
if (typeof window !== 'undefined') {
  (window as any).UserManager = UserManager;
}