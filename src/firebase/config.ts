
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

console.log("[Firebase Config] Initializing...");

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
let initializationError: Error | null = null;

try {
  // Initialize using modular API
  // Using explicit app name ensures clean re-initialization if HMR triggers
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log("[Firebase Config] New app instance created");
  } else {
    app = getApp();
    console.log("[Firebase Config] Using existing app instance");
  }

  // Initialize services using the specific app instance
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  console.log("[Firebase Config] ✅ Services initialized");

} catch (error: any) {
  console.error("[Firebase Config] ❌ Initialization Error:", error);
  initializationError = error;
}

export { app, db, auth, storage, initializationError };
export const isFirebaseInitialized = () => !!(app && db && auth && !initializationError);
