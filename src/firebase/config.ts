
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// FALLBACK KEYS: Provided by user to fix local environment issues.
// NOTE: In a team environment, these should live in .env.local
const FALLBACK_CONFIG = {
  apiKey: "AIzaSyD00EHnA1iFfB20ybdcAXBgZBp4JqaT5gg",
  authDomain: "summit-crm-3c378.firebaseapp.com",
  projectId: "summit-crm-3c378",
  storageBucket: "summit-crm-3c378.firebasestorage.app",
  messagingSenderId: "622709880120",
  appId: "1:622709880120:web:57786312b02d59dccffdcd"
};

// Helper to get env variable, localStorage, or fallback
const getEnv = (key: string, fallbackKey: keyof typeof FALLBACK_CONFIG) => {
  // 1. Try Vite Environment Variable (from .env.local)
  const viteEnv = (import.meta as any).env?.[key];
  if (viteEnv) return viteEnv;
  
  // 2. Try Local Storage (For manual setup via UI)
  try {
    const local = localStorage.getItem(key);
    if (local && local !== "undefined" && local !== "") return local;
  } catch (e) {
    // ignore
  }

  // 3. Use Hardcoded Fallback
  return FALLBACK_CONFIG[fallbackKey];
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY', 'apiKey'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN', 'authDomain'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID', 'projectId'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET', 'storageBucket'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', 'messagingSenderId'),
  appId: getEnv('VITE_FIREBASE_APP_ID', 'appId')
};

let app: FirebaseApp | undefined;
let db: Firestore;
let auth: Auth;

export const isFirebaseInitialized = () => {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.authDomain);
};

try {
  // Initialize if keys exist
  if (isFirebaseInitialized()) {
    // Prevent double initialization
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("Firebase initialized successfully");
  } else {
    console.warn("Firebase keys missing. App waiting for setup.");
  }
} catch (error) {
  console.error("Firebase Initialization Error:", error);
}

// Export instances
export { app, db, auth };
