import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

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
let storage: FirebaseStorage;

try {
  // Prevent double initialization in hot-reload environments
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
  console.log("Firebase initialized successfully with Storage");
} catch (error) {
  console.error("Firebase Initialization Critical Error:", error);
}

// Export instances
export { app, db, auth, storage };

// Helper to check if we are good to go
export const isFirebaseInitialized = () => {
  return !!app && !!db && !!auth && !!storage;
};
