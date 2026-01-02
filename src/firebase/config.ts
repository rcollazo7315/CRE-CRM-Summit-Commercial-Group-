
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// 1. Try LocalStorage (for SetupPage)
// 2. Fallback to hardcoded defaults
const getConfiguration = () => {
  const localKey = localStorage.getItem('VITE_FIREBASE_API_KEY');
  if (localKey) {
    return {
      apiKey: localKey,
      authDomain: localStorage.getItem('VITE_FIREBASE_AUTH_DOMAIN'),
      projectId: localStorage.getItem('VITE_FIREBASE_PROJECT_ID'),
      storageBucket: localStorage.getItem('VITE_FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: localStorage.getItem('VITE_FIREBASE_MESSAGING_SENDER_ID'),
      appId: localStorage.getItem('VITE_FIREBASE_APP_ID')
    };
  }

  // Fallback / Default
  return {
    apiKey: "AIzaSyD00EHnA1iFfB20ybdcAXBgZBp4JqaT5gg",
    authDomain: "summit-crm-3c378.firebaseapp.com",
    projectId: "summit-crm-3c378",
    storageBucket: "summit-crm-3c378.firebasestorage.app",
    messagingSenderId: "622709880120",
    appId: "1:622709880120:web:57786312b02d59dccffdcd"
  };
};

const firebaseConfig = getConfiguration();

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;
let storage: FirebaseStorage | undefined;
let initializationError: Error | null = null;

try {
  // Only initialize if we have an API key
  if (firebaseConfig.apiKey) {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig as any);
    } else {
      app = getApps()[0];
    }

    if (app) {
      db = getFirestore(app);
      auth = getAuth(app);
      try {
        storage = getStorage(app);
      } catch (e) {
        console.warn("Storage init failed (optional):", e);
      }
      console.log("Firebase initialized with project:", firebaseConfig.projectId);
    }
  } else {
    console.warn("No Firebase configuration found.");
  }
} catch (error: any) {
  console.error("Critical Firebase Initialization Error:", error);
  initializationError = error;
}

export { app, db, auth, storage, initializationError };
export const isFirebaseInitialized = () => !!(app && db && auth);
