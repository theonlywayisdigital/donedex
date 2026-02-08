/**
 * Firebase Configuration and Initialization
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { FIREBASE_CONFIG } from '../constants/config';

// Check if Firebase config is available
if (!FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.projectId) {
  console.warn(
    'Firebase credentials not configured. ' +
    'Set Firebase config in constants/config.ts'
  );
}

// Initialize Firebase only once
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (getApps().length === 0) {
  app = initializeApp(FIREBASE_CONFIG);
} else {
  app = getApps()[0];
}

auth = getAuth(app);
db = getFirestore(app);
storage = getStorage(app);

export { app, auth, db, storage };
