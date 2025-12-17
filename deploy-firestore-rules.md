# Deploy Firestore Security Rules

## Option 1: Using Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Rules**
4. Copy and paste the rules from `firestore.rules` file
5. Click **Publish**

## Option 2: Using Firebase CLI

If you have Firebase CLI installed:

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not already done)
firebase init firestore

# Deploy the rules
firebase deploy --only firestore:rules
```

## Current Rules Content

Copy this content to your Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Candidates collection - candidates can read and write their own profile
    match /candidates/{candidateId} {
      allow read, write, create, update: if request.auth != null && request.auth.uid == candidateId;
    }
    
    // Users collection - users can read and write their own profile (for backward compatibility)
    match /users/{userId} {
      allow read, write, create, update: if request.auth != null && request.auth.uid == userId;
    }
    
    // Companies collection - company users can manage their company data
    match /companies/{companyId} {
      allow read, write: if request.auth != null;
    }
    
    // Vacancies collection - read access for all authenticated users
    match /vacancies/{vacancyId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Applications collection - users can manage their own applications
    match /applications/{applicationId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == resource.data.candidateId || 
         request.auth.uid == resource.data.companyId);
    }
    
    // Categories collection - read access for all authenticated users
    match /categories/{categoryId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    
    // Default rule - deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Testing the Rules

After deploying, test the registration flow again. The error should be resolved and users should be able to create their profiles in Firestore.