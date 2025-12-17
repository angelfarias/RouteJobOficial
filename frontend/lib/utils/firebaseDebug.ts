// Debug utility for Firebase authentication issues
import { auth, db } from '@/lib/firebaseClient';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export class FirebaseDebugger {
  static async testFirebaseConnection(): Promise<void> {
    console.log('🔍 Testing Firebase connection...');
    
    // Test Firebase config
    console.log('Firebase Config:', {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing',
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✅ Set' : '❌ Missing',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing',
    });
    
    // Test Auth instance
    console.log('Auth instance:', auth ? '✅ Initialized' : '❌ Not initialized');
    console.log('Current user:', auth.currentUser ? `✅ ${auth.currentUser.email}` : '❌ No user');
    
    // Test Firestore instance
    console.log('Firestore instance:', db ? '✅ Initialized' : '❌ Not initialized');
  }

  static async testLogin(email: string, password: string): Promise<void> {
    console.log('🔍 Testing login process...');
    
    try {
      console.log('1. Attempting Firebase authentication...');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Firebase authentication successful:', userCredential.user.uid);
      
      console.log('2. Testing Firestore access...');
      const docRef = doc(db, 'candidates', userCredential.user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        console.log('✅ Firestore document exists:', docSnap.data());
      } else {
        console.log('⚠️ Firestore document does not exist, will be created');
      }
      
    } catch (error: any) {
      console.error('❌ Login test failed:', error);
      
      // Detailed error analysis
      if (error.code) {
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        switch (error.code) {
          case 'auth/user-not-found':
            console.error('🔍 User does not exist in Firebase Auth');
            break;
          case 'auth/wrong-password':
            console.error('🔍 Incorrect password');
            break;
          case 'auth/invalid-email':
            console.error('🔍 Invalid email format');
            break;
          case 'auth/network-request-failed':
            console.error('🔍 Network connection issue');
            break;
          case 'permission-denied':
            console.error('🔍 Firestore permission denied');
            break;
          default:
            console.error('🔍 Unknown error:', error.code);
        }
      }
    }
  }

  static async listFirebaseUsers(): Promise<void> {
    console.log('🔍 Current Firebase Auth state:');
    console.log('Current user:', auth.currentUser);
    
    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('✅ User is signed in:', user.email, user.uid);
      } else {
        console.log('❌ No user is signed in');
      }
    });
  }
}

// Export for console debugging
if (typeof window !== 'undefined') {
  (window as any).FirebaseDebugger = FirebaseDebugger;
}