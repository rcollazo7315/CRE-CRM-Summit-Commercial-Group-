
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

console.log("[Firebase Config] Module loading...");

// 1. Try LocalStorage (for SetupPage)
// 2. Fallback to hardcoded defaults provided by user
const getConfiguration = () => {
  try {
    const localKey = localStorage.getItem('VITE_FIREBASE_API_KEY');
    if (localKey) {
      return {
        apiKey: localStorage.getItem('VITE_FIREBASE_API_KEY')?.trim(),
        authDomain: localStorage.getItem('VITE_FIREBASE_AUTH_DOMAIN')?.trim(),
        projectId: localStorage.getItem('VITE_FIREBASE_PROJECT_ID')?.trim(),
        storageBucket: localStorage.getItem('VITE_FIREBASE_STORAGE_BUCKET')?.trim(),
        messagingSenderId: localStorage.getItem('VITE_FIREBASE_MESSAGING_SENDER_ID')?.trim(),
        appId: localStorage.getItem('VITE_FIREBASE_APP_ID')?.trim(),
        measurementId: localStorage.getItem('VITE_FIREBASE_MEASUREMENT_ID')?.trim()
      };
    }
  } catch (e) {
    console.warn("Local storage access blocked:", e);
  }

  // Fallback / Default - Updated with user provided values
  return {
    apiKey: "AIzaSyD00EHnA1iFfB20ybdcAXBgZBp4JqaT5gg",
    authDomain: "summit-crm-3c378.firebaseapp.com",
    projectId: "summit-crm-3c378",
    storageBucket: "summit-crm-3c378.firebasestorage.app",
    messagingSenderId: "622709880120",
    appId: "1:622709880120:web:57786312b02d59dccffdcd",
    measurementId: "G-HEM5G77CGH"
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
      try {
        db = getFirestore(app);
      } catch (e: any) {
        console.error("Firestore Init Error:", e);
        throw new Error(`Firestore unavailable: ${e.message}. Check browser console for version conflicts.`);
      }
      
      auth = getAuth(app);
      
      try {
        storage = getStorage(app);
      } catch (e) {
        console.warn("Storage init failed (optional):", e);
      }
      console.log("[Firebase Config] Initialization complete for project:", firebaseConfig.projectId);
    }
  } else {
    console.warn("[Firebase Config] No configuration found.");
  }
} catch (error: any) {
  console.error("[Firebase Config] Critical Error:", error);
  initializationError = error;
}

export { app, db, auth, storage, initializationError };
export const isFirebaseInitialized = () => !!(app && db && auth);
