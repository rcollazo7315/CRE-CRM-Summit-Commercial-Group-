
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

console.log("[Firebase Config] Initializing (modular mode)...");

const getConfiguration = () => {
  try {
    const localKey = localStorage.getItem('VITE_FIREBASE_API_KEY');
    if (localKey && localKey.trim()) {
      console.log("[Firebase Config] Using localStorage config");
      return {
        apiKey: localStorage.getItem('VITE_FIREBASE_API_KEY')?.trim(),
        authDomain: localStorage.getItem('VITE_FIREBASE_AUTH_DOMAIN')?.trim(),
        projectId: localStorage.getItem('VITE_FIREBASE_PROJECT_ID')?.trim(),
        storageBucket: localStorage.getItem('VITE_FIREBASE_STORAGE_BUCKET')?.trim(),
        messagingSenderId: localStorage.getItem('VITE_FIREBASE_MESSAGING_SENDER_ID')?.trim(),
        appId: localStorage.getItem('VITE_FIREBASE_APP_ID')?.trim(),
      };
    }
  } catch (e) {
    console.warn("[Firebase Config] localStorage error:", e);
  }

  console.log("[Firebase Config] Using default config");
  return {
    apiKey: "AIzaSyD00EHnA1iFfB20ybdcAXBgZBp4JqaT5gg",
    authDomain: "summit-crm-3c378.firebaseapp.com",
    projectId: "summit-crm-3c378",
    storageBucket: "summit-crm-3c378.firebasestorage.app",
    messagingSenderId: "622709880120",
    appId: "1:622709880120:web:57786312b02d59dccffdcd",
  };
};

const firebaseConfig = getConfiguration();

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let storage: FirebaseStorage;
let initializationError: Error | null = null;

try {
  if (!firebaseConfig.apiKey) {
    throw new Error("Missing Firebase API key");
  }

  // Initialize using modular API
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log("[Firebase Config] New app created");
  } else {
    app = getApp();
    console.log("[Firebase Config] Using existing app");
  }

  auth = getAuth(app);
  console.log("[Firebase Config] Auth ready");

  db = getFirestore(app);
  console.log("[Firebase Config] Firestore ready");

  storage = getStorage(app);
  console.log("[Firebase Config] Storage ready");

  console.log("[Firebase Config] ✅ All services initialized (modular mode)");

} catch (error: any) {
  console.error("[Firebase Config] ❌ Error:", error.message);
  initializationError = error;
}

export { app, db, auth, storage, initializationError };
export const isFirebaseInitialized = () => !!(app && db && auth && !initializationError);
