import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

/**
 * Debug utility to check Firestore candidate documents
 */
export class FirestoreDebug {
  
  /**
   * Check if a candidate document exists in Firestore
   */
  static async checkCandidateExists(userId: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'candidates', userId);
      const docSnap = await getDoc(docRef);
      
      console.log(`🔍 Candidate ${userId} exists in Firestore:`, docSnap.exists());
      
      if (docSnap.exists()) {
        console.log('📄 Candidate data:', docSnap.data());
      }
      
      return docSnap.exists();
    } catch (error) {
      console.error('❌ Error checking candidate existence:', error);
      return false;
    }
  }

  /**
   * Check if a user document exists in Firestore (legacy)
   */
  static async checkUserExists(userId: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      
      console.log(`🔍 User ${userId} exists in Firestore:`, docSnap.exists());
      
      if (docSnap.exists()) {
        console.log('📄 User data:', docSnap.data());
      }
      
      return docSnap.exists();
    } catch (error) {
      console.error('❌ Error checking user existence:', error);
      return false;
    }
  }

  /**
   * List all candidates in Firestore (for debugging)
   */
  static async listAllCandidates(): Promise<void> {
    try {
      const querySnapshot = await getDocs(collection(db, 'candidates'));
      
      console.log(`📊 Total candidates in Firestore: ${querySnapshot.size}`);
      
      querySnapshot.forEach((doc) => {
        console.log(`👤 Candidate ${doc.id}:`, doc.data());
      });
    } catch (error) {
      console.error('❌ Error listing candidates:', error);
    }
  }

  /**
   * List all users in Firestore (for debugging - legacy)
   */
  static async listAllUsers(): Promise<void> {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      
      console.log(`📊 Total users in Firestore: ${querySnapshot.size}`);
      
      querySnapshot.forEach((doc) => {
        console.log(`👤 User ${doc.id}:`, doc.data());
      });
    } catch (error) {
      console.error('❌ Error listing users:', error);
    }
  }

  /**
   * Get candidate profile data
   */
  static async getCandidateProfile(userId: string): Promise<any> {
    try {
      const docRef = doc(db, 'candidates', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log(`📋 Candidate profile for ${userId}:`, data);
        return data;
      } else {
        console.log(`❌ No candidate profile found for user ${userId}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting candidate profile:', error);
      return null;
    }
  }

  /**
   * Get user profile data (legacy)
   */
  static async getUserProfile(userId: string): Promise<any> {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log(`📋 Profile for ${userId}:`, data);
        return data;
      } else {
        console.log(`❌ No profile found for user ${userId}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting user profile:', error);
      return null;
    }
  }
}

// Make it available globally for debugging in browser console
if (typeof window !== 'undefined') {
  (window as any).FirestoreDebug = FirestoreDebug;
}