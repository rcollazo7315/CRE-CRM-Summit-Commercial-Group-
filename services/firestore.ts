import { 
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, serverTimestamp, Timestamp, writeBatch, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile,
  updatePassword
} from 'firebase/auth';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, auth, storage } from '../firebase/config';
import { UserAccount, Deal, Task, LeadGenLog, MortgageCalculation, DocumentFile } from '../types';

// Helper to convert Firestore timestamps to ISO strings for the frontend
const convertTimestamps = (data: any) => {
  if (!data) return data;
  const result = { ...data };
  for (const key in result) {
    if (result[key] instanceof Timestamp) {
      result[key] = result[key].toDate().toISOString();
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = convertTimestamps(result[key]);
    }
  }
  return result;
};

// Defensive helper
const checkDbConnection = () => {
  if (!db || !auth) {
    throw new Error("Database not connected. Please refresh the page.");
  }
};

export const api = {
  // --- AUTH & USER ---

  register: async (userData: any) => {
    checkDbConnection();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.passwordHash);
      const uid = userCredential.user.uid;

      await updateProfile(userCredential.user, {
        displayName: `${userData.firstName} ${userData.lastName}`
      });

      const newUser: UserAccount = {
        id: uid,
        username: userData.username,
        email: userData.email,
        passwordHash: 'PROTECTED', 
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        role: 'agent',
        status: 'pending',
        avatar: `https://ui-avatars.com/api/?name=${userData.firstName}+${userData.lastName}&background=random`,
        notifications: {
          email: { dealUpdates: true, taskReminders: true, newMessages: true, systemAlerts: true },
          sms: { dealUpdates: false, taskReminders: true, newMessages: false, systemAlerts: false }
        },
        stats: { totalDeals: 0, totalCommissions: 0, activeDeals: 0, closedDeals: 0, pendingTasks: 0, totalVolume: 0 },
        gmailIntegration: { connected: false },
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', uid), {
        ...newUser,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return newUser;
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await currentUser.delete();
        }
        throw new Error("Registration unavailable. Database permissions are locked. Please contact admin.");
      }
      throw error;
    }
  },

  login: async (email: string, password: string) => {
    checkDbConnection();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) throw new Error('User profile not found. Please contact admin.');
    
    const userData = convertTimestamps(userDoc.data()) as UserAccount;
    
    if (userData.status === 'denied') {
      await signOut(auth);
      throw new Error('Account request denied.');
    }
    
    await updateDoc(doc(db, 'users', uid), {
      lastLogin: serverTimestamp()
    });

    return userData;
  },

  logout: async () => {
    if (auth) await signOut(auth);
  },

  getCurrentUser: async (uid: string) => {
    checkDbConnection();
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return null;
    return convertTimestamps({ id: userDoc.id, ...userDoc.data() }) as UserAccount;
  },

  updateUserProfile: async (userId: string, updates: Partial<UserAccount>) => {
    checkDbConnection();
    const ref = doc(db, 'users', userId);
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    const updated = await getDoc(ref);
    return convertTimestamps({ id: updated.id, ...updated.data() }) as UserAccount;
  },

  updateUserPassword: async (newPassword: string) => {
    checkDbConnection();
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user found");
    
    try {
      await updatePassword(user, newPassword);
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        throw new Error("For security, please logout and login again before changing your password.");
      }
      throw error;
    }
  },

  // --- USERS (ADMIN) ---

  getUsers: async () => {
    checkDbConnection();
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as UserAccount[];
  },

  updateUserStatus: async (userId: string, status: 'active' | 'denied') => {
    checkDbConnection();
    const ref = doc(db, 'users', userId);
    await updateDoc(ref, {
      status,
      approvedAt: status === 'active' ? serverTimestamp() : null
    });
  },

  // --- DEALS ---

  getDeals: async (userId: string, isAdmin = false) => {
    checkDbConnection();
    let q;
    if (isAdmin) {
      q = query(collection(db, 'deals'), orderBy('lastUpdated', 'desc'));
    } else {
      q = query(collection(db, 'deals'), where('userId', '==', userId));
    }
    
    const snapshot = await getDocs(q);
    const deals = snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as Deal[];
    return deals.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
  },

  saveDeal: async (deal: Deal) => {
    checkDbConnection();
    const dealData = {
      ...deal,
      lastUpdated: serverTimestamp()
    };

    if (deal.id && deal.id.length >= 9) { 
      const ref = doc(db, 'deals', deal.id);
      const snap = await getDoc(ref);
      
      if (snap.exists()) {
        await updateDoc(ref, dealData);
      } else {
        await setDoc(ref, { ...dealData, createdAt: serverTimestamp() });
      }
    } else {
      const { id, ...rest } = dealData;
      await addDoc(collection(db, 'deals'), {
        ...rest,
        createdAt: serverTimestamp()
      });
    }
    
    await api.recalcUserStats(deal.userId);
  },

  deleteDeal: async (dealId: string, userId: string) => {
    checkDbConnection();
    await deleteDoc(doc(db, 'deals', dealId));
    await api.recalcUserStats(userId);
  },

  // --- DOCUMENTS (With Storage) ---
  
  saveDocument: async (dealId: string, document: DocumentFile, fileData?: Blob | File) => {
    checkDbConnection();
    
    console.log(`💾 saveDocument called for deal ${dealId}`);
    
    // Check if Storage is initialized
    if (!storage) {
      throw new Error("Firebase Storage is not initialized. Check firebase/config.ts");
    }
    
    // Require file data for uploads
    if (!fileData) {
      throw new Error("No file data provided for upload");
    }

    try {
      console.log(`📋 Step 1: Verifying deal exists...`);
      const dealRef = doc(db, 'deals', dealId);
      const dealSnap = await getDoc(dealRef);
      
      if (!dealSnap.exists()) {
        throw new Error(`Deal ${dealId} not found in database`);
      }
      console.log(`✅ Deal verified: ${dealSnap.data().propertyAddress}`);
      
      // 2. Upload file to Firebase Storage
      const timestamp = Date.now();
      const sanitizedName = document.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `deals/${dealId}/${timestamp}_${sanitizedName}`;
      const storageRef = ref(storage, storagePath);

      console.log(`📤 Step 2: Uploading to Storage: ${storagePath}`);
      console.log(`📊 File size: ${fileData.size} bytes (${(fileData.size / 1024 / 1024).toFixed(2)} MB)`);
      
      await uploadBytes(storageRef, fileData);
      console.log(`✅ File uploaded to Storage successfully!`);
      
      // 3. Get download URL
      console.log(`🔗 Step 3: Getting download URL...`);
      const downloadURL = await getDownloadURL(storageRef);
      console.log(`✅ Download URL: ${downloadURL.substring(0, 50)}...`);

      // 4. Save metadata to Firestore
      console.log(`💾 Step 4: Saving metadata to Firestore...`);
      const docMetadata = {
        ...document,
        url: downloadURL,
        storagePath: storagePath, // Store path for deletion
        uploadDate: new Date().toISOString()
      };
      
      await updateDoc(dealRef, {
        documents: arrayUnion(docMetadata),
        lastUpdated: serverTimestamp()
      });
      
      console.log(`✅ Metadata saved to Firestore successfully!`);
      console.log(`🎉 COMPLETE: Document "${document.name}" ready to display in app`);
      
    } catch (error: any) {
      console.error("❌ Storage upload error:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        dealId,
        docName: document.name
      });
      
      if (error.code === 'storage/unauthorized') {
        throw new Error("Permission denied. Check Firebase Storage security rules.");
      } else if (error.message.includes("not found")) {
        throw error;
      } else {
        throw new Error(`Upload failed: ${error.message}`);
      }
    }
  },

  deleteDocument: async (dealId: string, documentId: string) => {
    checkDbConnection();
    
    try {
      console.log(`🗑️ Deleting document ${documentId} from deal ${dealId}`);
      
      const dealRef = doc(db, 'deals', dealId);
      const dealSnap = await getDoc(dealRef);
      
      if (!dealSnap.exists()) {
        throw new Error(`Deal ${dealId} not found`);
      }

      const dealData = dealSnap.data();
      const docs = dealData.documents || [];
      const docToDelete = docs.find((d: any) => d.id === documentId);
      
      if (!docToDelete) {
        throw new Error(`Document ${documentId} not found in deal`);
      }

      console.log(`📄 Found document: ${docToDelete.name}`);

      // 1. Delete from Firebase Storage if path exists
      if (docToDelete.storagePath && storage) {
        try {
          console.log(`🗑️ Deleting from Storage: ${docToDelete.storagePath}`);
          const storageRef = ref(storage, docToDelete.storagePath);
          await deleteObject(storageRef);
          console.log(`✅ Deleted from Storage`);
        } catch (storageError: any) {
          console.warn(`⚠️ Storage deletion warning:`, storageError.message);
          // Don't fail if Storage deletion fails (file may already be gone)
        }
      }

      // 2. Remove metadata from Firestore
      console.log(`💾 Removing metadata from Firestore...`);
      const updatedDocs = docs.filter((d: any) => d.id !== documentId);
      
      await updateDoc(dealRef, {
        documents: updatedDocs,
        lastUpdated: serverTimestamp()
      });
      
      console.log(`✅ Metadata removed from Firestore`);
      console.log(`🎉 Document deletion complete`);
      
    } catch (error: any) {
      console.error("❌ Delete error:", error);
      throw new Error(`Failed to delete: ${error.message}`);
    }
  },

  // --- TASKS ---

  getTasks: async (userId: string) => {
    checkDbConnection();
    const q = query(collection(db, 'tasks'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as Task[];
  },

  saveTask: async (task: Task) => {
    checkDbConnection();
    if (task.id) {
       const ref = doc(db, 'tasks', task.id);
       await setDoc(ref, task, { merge: true });
    } else {
       await addDoc(collection(db, 'tasks'), task);
    }
    await api.recalcUserStats(task.userId);
  },

  // --- LOGS & CALCS ---

  saveLeadLog: async (log: LeadGenLog) => {
    checkDbConnection();
    const { id, ...rest } = log;
    if (id) {
       await setDoc(doc(db, 'leadLogs', id), rest, { merge: true });
    } else {
       await addDoc(collection(db, 'leadLogs'), rest);
    }
  },

  deleteLeadLog: async (logId: string) => {
    checkDbConnection();
    await deleteDoc(doc(db, 'leadLogs', logId));
  },

  getLeadLogs: async (userId: string) => {
    checkDbConnection();
    const q = query(collection(db, 'leadLogs'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as LeadGenLog[];
  },

  saveCalculation: async (calc: MortgageCalculation) => {
    checkDbConnection();
    const { id, ...rest } = calc;
    await addDoc(collection(db, 'mortgageCalculations'), {
      ...rest,
      timestamp: serverTimestamp()
    });
  },

  getCalculations: async (userId: string) => {
    checkDbConnection();
    const q = query(collection(db, 'mortgageCalculations'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const calcs = snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as MortgageCalculation[];
    return calcs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  // --- UTILS ---

  recalcUserStats: async (userId: string) => {
    checkDbConnection();
    const deals = await api.getDeals(userId);
    const tasks = await api.getTasks(userId);
    
    const stats = {
      totalDeals: deals.length,
      totalCommissions: deals.filter(d => d.status === 'Completed').reduce((acc, d) => acc + (d.commission || (d.askingPrice * 0.03)), 0),
      activeDeals: deals.filter(d => d.status !== 'Completed' && d.status !== 'Archived').length,
      closedDeals: deals.filter(d => d.status === 'Completed').length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
      totalVolume: deals.filter(d => d.status === 'Completed').reduce((acc, d) => acc + d.askingPrice, 0),
    };

    await updateDoc(doc(db, 'users', userId), { stats });
  }
};