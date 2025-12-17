// Diagnostic utility for login issues
import { auth, db } from '@/lib/firebaseClient';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export class LoginDiagnostic {
  static async diagnoseLoginIssue(email: string, password: string): Promise<void> {
    console.log('🔍 Starting comprehensive login diagnostic...');
    console.log('Email:', email);
    console.log('Password length:', password.length);
    
    // Step 1: Test Firebase configuration
    console.log('\n1. Testing Firebase configuration...');
    console.log('API Key:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Set' : 'Missing');
    console.log('Auth Domain:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
    console.log('Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
    
    // Step 2: Test authentication
    console.log('\n2. Testing Firebase Authentication...');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Authentication successful!');
      console.log('User ID:', userCredential.user.uid);
      console.log('User Email:', userCredential.user.email);
      console.log('Email Verified:', userCredential.user.emailVerified);
      
      // Step 3: Test Firestore access
      console.log('\n3. Testing Firestore access...');
      try {
        const docRef = doc(db, 'candidates', userCredential.user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          console.log('✅ User profile exists in Firestore');
          console.log('Profile data:', docSnap.data());
        } else {
          console.log('⚠️ User profile does not exist in Firestore');
          console.log('Attempting to create profile...');
          
          const profileData = {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: userCredential.user.displayName || '',
            profileCompleted: false,
            experience: [],
            skills: [],
            preferredCategories: [],
            createdAt: new Date(),
            lastUpdatedAt: new Date()
          };
          
          await setDoc(docRef, profileData);
          console.log('✅ Profile created successfully');
        }
      } catch (firestoreError: any) {
        console.error('❌ Firestore error:', firestoreError);
        console.error('Error code:', firestoreError.code);
        console.error('Error message:', firestoreError.message);
      }
      
    } catch (authError: any) {
      console.error('❌ Authentication failed:', authError);
      console.error('Error code:', authError.code);
      console.error('Error message:', authError.message);
      
      // Provide specific guidance based on error
      switch (authError.code) {
        case 'auth/user-not-found':
          console.log('💡 Solution: The user does not exist. Try creating an account first.');
          break;
        case 'auth/wrong-password':
          console.log('💡 Solution: The password is incorrect. Try resetting the password.');
          break;
        case 'auth/invalid-email':
          console.log('💡 Solution: The email format is invalid.');
          break;
        case 'auth/network-request-failed':
          console.log('💡 Solution: Check your internet connection.');
          break;
        default:
          console.log('💡 Solution: Unknown error. Check Firebase configuration.');
      }
    }
  }
  
  static async createTestUser(email: string, password: string): Promise<void> {
    console.log('🔍 Creating test user...');
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ Test user created successfully!');
      console.log('User ID:', userCredential.user.uid);
      
      // Create Firestore profile
      const docRef = doc(db, 'candidates', userCredential.user.uid);
      const profileData = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName || '',
        profileCompleted: false,
        experience: [],
        skills: [],
        preferredCategories: [],
        createdAt: new Date(),
        lastUpdatedAt: new Date()
      };
      
      await setDoc(docRef, profileData);
      console.log('✅ Test user profile created in Firestore');
      
    } catch (error: any) {
      console.error('❌ Failed to create test user:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
    }
  }
}

// Make available in browser console for debugging
if (typeof window !== 'undefined') {
  (window as any).LoginDiagnostic = LoginDiagnostic;
}