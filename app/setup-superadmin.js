/**
 * Setup Super Admin in Firebase
 * Run this after creating the user in Firebase Console
 *
 * Usage: node scripts/setup-superadmin.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyCjnvHSOEWABSdhjJfpW-q--B6I2Cllxzk",
  authDomain: "donedex-72116.firebaseapp.com",
  projectId: "donedex-72116",
  storageBucket: "donedex-72116.firebasestorage.app",
  messagingSenderId: "317949580481",
  appId: "1:317949580481:web:11282010bc5ba89d5ff040",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function setupSuperAdmin() {
  const email = 'alex@theonlywayis.digital';
  const password = 'MJfQg5oVB3PflbxdqtNx';

  try {
    // Sign in to get the user ID
    console.log('Signing in...');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;
    console.log('User ID:', userId);

    // Create user profile
    console.log('Creating user profile...');
    await setDoc(doc(db, 'users', userId), {
      id: userId,
      email: email,
      full_name: 'Alex McCormick',
      phone_number: null,
      organisation_id: null,
      role: null,
      is_super_admin: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Create super_admins document
    console.log('Creating super admin record...');
    await setDoc(doc(db, 'super_admins', userId), {
      user_id: userId,
      is_active: true,
      permissions: [
        'view_all_orgs',
        'manage_users',
        'impersonate',
        'manage_billing',
        'edit_all_organisations',
        'impersonate_users',
        'edit_all_users'
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    console.log('✅ Super admin setup complete!');
    console.log('You can now log in at http://localhost:8081');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code === 'auth/user-not-found') {
      console.log('\n⚠️  User not found. Please create the user in Firebase Console first:');
      console.log('1. Go to Firebase Console → Authentication → Users');
      console.log('2. Click "Add user"');
      console.log('3. Email:', email);
      console.log('4. Password:', password);
    }
    process.exit(1);
  }
}

setupSuperAdmin();
