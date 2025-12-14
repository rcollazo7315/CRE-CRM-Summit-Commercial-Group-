
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// DIRECTLY HARDCODED KEYS
const firebaseConfig = {
  apiKey: "AIzaSyD00EHnA1iFfB20ybdcAXBgZBp4JqaT5gg",
  authDomain: "summit-crm-3c378.firebaseapp.com",
  projectId: "summit-crm-3c378",
  storageBucket: "summit-crm-3c378.firebasestorage.app",
  messagingSenderId: "622709880120",
  appId: "1:622709880120:web:57786312b02d59dccffdcd"
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;

try {
  // Prevent double initialization in hot-reload environments
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  
  if (app) {
    db = getFirestore(app);
    auth = getAuth(app);
    try {
      storage = getStorage(app);
    } catch (e) {
      console.warn("Storage failed to init (optional)", e);
    }
    console.log("🔥 Firebase initialized successfully");
  }
} catch (error) {
  console.error("🔥 Firebase Initialization Critical Error:", error);
  // We swallow the error so imports don't crash the app. 
  // Services remain null, which we handle in AuthContext.
}

// Export instances (can be null)
export { app, db, auth, storage };

// Helper to check if we are good to go
export const isFirebaseInitialized = () => {
  return !!app && !!db && !!auth;
};
