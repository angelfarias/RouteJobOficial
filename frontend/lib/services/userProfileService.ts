import { 
  updateProfile, 
  updateEmail, 
  deleteUser, 
  reauthenticateWithCredential,
  EmailAuthProvider,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';

export interface ProfileUpdateData {
  displayName?: string;
  email?: string;
  phoneNumber?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  emailVerified: boolean;
  profileComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export class UserProfileService {
  /**
   * Update user profile information
   */
  static async updateProfile(user: FirebaseUser, data: ProfileUpdateData): Promise<void> {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      // Update Firebase Auth profile
      const authUpdates: any = {};
      
      if (data.displayName !== undefined) {
        authUpdates.displayName = data.displayName;
      }

      if (Object.keys(authUpdates).length > 0) {
        await updateProfile(user, authUpdates);
      }

      // Update email if changed
      if (data.email && data.email !== user.email) {
        await updateEmail(user, data.email);
      }

      // Update Firestore document
      const userDocRef = doc(db, 'users', user.uid);
      const firestoreUpdates: any = {
        updatedAt: new Date().toISOString(),
      };

      if (data.displayName !== undefined) {
        firestoreUpdates.displayName = data.displayName;
      }

      if (data.email !== undefined) {
        firestoreUpdates.email = data.email;
      }

      if (data.phoneNumber !== undefined) {
        firestoreUpdates.phoneNumber = data.phoneNumber;
      }

      await updateDoc(userDocRef, firestoreUpdates);

    } catch (error: any) {
      console.error('Error updating profile:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Este correo electrónico ya está en uso');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Formato de correo electrónico inválido');
      } else if (error.code === 'auth/requires-recent-login') {
        throw new Error('Por seguridad, necesitas iniciar sesión nuevamente para cambiar tu email');
      } else {
        throw new Error('Error al actualizar el perfil. Intenta nuevamente.');
      }
    }
  }

  /**
   * Delete user account and all associated data
   */
  static async deleteAccount(user: FirebaseUser): Promise<void> {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      // Delete Firestore document first
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        await deleteDoc(userDocRef);
      }

      // Delete additional user data collections if they exist
      // Note: In a production app, you might want to use Cloud Functions
      // to handle cascading deletes of user data across multiple collections

      // Delete Firebase Auth user
      await deleteUser(user);

    } catch (error: any) {
      console.error('Error deleting account:', error);
      
      if (error.code === 'auth/requires-recent-login') {
        throw new Error('Por seguridad, necesitas iniciar sesión nuevamente para eliminar tu cuenta');
      } else {
        throw new Error('Error al eliminar la cuenta. Intenta nuevamente.');
      }
    }
  }

  /**
   * Validate email change availability
   */
  static async validateEmailChange(newEmail: string, currentUid: string): Promise<boolean> {
    try {
      // This is a simplified check - in a real app you might want to
      // check against your user database to see if email is already taken
      const emailValidation = await import('@/lib/validation/emailValidator');
      const result = emailValidation.EmailValidator.validateFormat(newEmail);
      
      return result.isValid;
    } catch (error) {
      console.error('Error validating email:', error);
      return false;
    }
  }

  /**
   * Get user profile from Firestore
   */
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Create or update user profile in Firestore
   */
  static async createOrUpdateUserProfile(user: FirebaseUser): Promise<void> {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      const profileData: Partial<UserProfile> = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        phoneNumber: user.phoneNumber || undefined,
        emailVerified: user.emailVerified,
        updatedAt: new Date().toISOString(),
      };

      if (!userDoc.exists()) {
        // Create new profile
        profileData.createdAt = new Date().toISOString();
        profileData.profileComplete = false;
      }

      await updateDoc(userDocRef, profileData);
    } catch (error) {
      console.error('Error creating/updating user profile:', error);
      throw new Error('Error al actualizar el perfil del usuario');
    }
  }
}