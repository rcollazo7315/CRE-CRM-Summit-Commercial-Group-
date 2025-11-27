
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// DIRECTLY HARDCODED KEYS
// This bypasses .env.local issues entirely.
const firebaseConfig = {
  apiKey: "AIzaSyD00EHnA1iFfB20ybdcAXBgZBp4JqaT5gg",
  authDomain: "summit-crm-3c378.firebaseapp.com",
  projectId: "summit-crm-3c378",
  storageBucket: "summit-crm-3c378.firebasestorage.app",
  messagingSenderId: "622709880120",
  appId: "1:622709880120:web:57786312b02d59dccffdcd"
};

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

try {
  // Prevent double initialization in hot-reload environments
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  
  db = getFirestore(app);
  auth = getAuth(app);
  console.log("Firebase initialized successfully with hardcoded keys");
} catch (error) {
  console.error("Firebase Initialization Critical Error:", error);
}

// Export instances
export { app, db, auth };

// Helper to check if we are good to go
export const isFirebaseInitialized = () => {
  return !!app && !!db && !!auth;
};
