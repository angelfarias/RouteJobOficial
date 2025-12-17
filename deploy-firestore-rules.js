// Script to deploy Firestore rules
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Firestore rules...');

// Check if firestore.rules exists
const rulesPath = path.join(__dirname, 'firestore.rules');
if (!fs.existsSync(rulesPath)) {
  console.error('❌ firestore.rules file not found');
  process.exit(1);
}

console.log('✅ firestore.rules file found');

// Read and display rules
const rules = fs.readFileSync(rulesPath, 'utf8');
console.log('\n📋 Current Firestore Rules:');
console.log('=' .repeat(50));
console.log(rules);
console.log('=' .repeat(50));

console.log('\n🚀 To deploy these rules to Firebase:');
console.log('1. Install Firebase CLI: npm install -g firebase-tools');
console.log('2. Login to Firebase: firebase login');
console.log('3. Initialize project: firebase init firestore');
console.log('4. Deploy rules: firebase deploy --only firestore:rules');

console.log('\n💡 Or use Firebase Console:');
console.log('1. Go to https://console.firebase.google.com/');
console.log('2. Select your project: proyectoroutejob');
console.log('3. Go to Firestore Database > Rules');
console.log('4. Copy and paste the rules above');
console.log('5. Click "Publish"');