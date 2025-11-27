
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// Helper to get env variable or localStorage fallback
const getEnv = (key: string) => {
  // 1. Try Vite Environment Variable
  const viteEnv = (import.meta as any).env?.[key];
  if (viteEnv) return viteEnv;
  
  // 2. Try Local Storage (For manual setup via UI)
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID')
};

let app: FirebaseApp | undefined;
let db: Firestore;
let auth: Auth;

export const isFirebaseInitialized = () => {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
};

try {
  // Only initialize if we have the critical keys
  if (isFirebaseInitialized()) {
    // Prevent double initialization in strict mode
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    
    db = getFirestore(app);
    auth = getAuth(app);
  } else {
    console.warn("Firebase keys missing. App waiting for setup.");
  }
} catch (error) {
  console.error("Firebase Initialization Error:", error);
}

// Export these, but they might be undefined if setup isn't done
export { app, db, auth };
