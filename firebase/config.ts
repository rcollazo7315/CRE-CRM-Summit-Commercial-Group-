import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

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
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  
  if (app) {
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);
    console.log("🔥 Firebase verified successfully");
  }
} catch (error) {
  console.error("🔥 Firebase Initialization Error:", error);
}

export { app, db, auth, storage };
export const isFirebaseInitialized = () => !!(app && db && auth);