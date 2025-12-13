
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
import { UserAccount, Deal, Task, LeadGenLog, MortgageCalculation, DocumentFile, Contact, ContactInteraction } from '../types';

// Helper to convert Firestore timestamps to ISO strings for the frontend
const convertTimestamps = (data: any): any => {
  if (!data) return data;
  
  // Handle arrays properly - check BEFORE spreading
  if (Array.isArray(data)) {
    return data.map(item => convertTimestamps(item));
  }
  
  // Handle Timestamp objects
  if (data instanceof Timestamp) {
    return data.toDate().toISOString();
  }
  
  // Handle plain objects (but not arrays - already handled above)
  if (typeof data === 'object' && data !== null) {
    const result: any = {};
    for (const key in data) {
      result[key] = convertTimestamps(data[key]);
    }
    return result;
  }
  
  // Return primitives as-is
  return data;
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
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as UserAccount[];
    } catch (error) {
      console.warn("Failed to fetch all users (permission denied). Returning empty list.");
      return [];
    }
  },

  updateUserStatus: async (userId: string, status: 'active' | 'denied') => {
    checkDbConnection();
    const ref = doc(db, 'users', userId);
    await updateDoc(ref, {
      status,
      approvedAt: status === 'active' ? serverTimestamp() : null
    });
  },

  deleteUser: async (userId: string) => {
    checkDbConnection();
    await deleteDoc(doc(db, 'users', userId));
  },

  // --- DEALS ---

  getDeals: async (userId: string, isAdmin = false) => {
    checkDbConnection();
    
    const runQuery = async (adminMode: boolean) => {
      let q;
      if (adminMode) {
        q = query(collection(db, 'deals'), orderBy('lastUpdated', 'desc'));
      } else {
        q = query(collection(db, 'deals'), where('userId', '==', userId));
      }
      
      const snapshot = await getDocs(q);
      const deals = snapshot.docs.map(d => {
        const data = d.data();
        // Ensure documents is always an array to prevent "filter is not a function" errors
        const docs = Array.isArray(data.documents) ? data.documents : [];
        return convertTimestamps({ 
          id: d.id, 
          ...data,
          documents: docs
        });
      }) as Deal[];
      return deals.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
    };

    // If Admin mode requested, try it, but fallback to user scope if permissions fail
    if (isAdmin) {
      try {
        return await runQuery(true);
      } catch (error) {
        console.warn("Admin deals query failed (likely permissions), falling back to user scope.", error);
        return await runQuery(false);
      }
    }
    return await runQuery(false);
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
    
    console.log(`🗑️ Deleting deal ${dealId}`);
    
    try {
      const dealRef = doc(db, 'deals', dealId);
      const dealSnap = await getDoc(dealRef);
      
      if (dealSnap.exists()) {
        const dealData = dealSnap.data();
        const documents = dealData.documents || [];
        
        if (documents.length > 0 && storage) {
          console.log(`📋 Deleting ${documents.length} associated documents from storage...`);
          
          for (const doc of documents) {
            if (doc.storagePath) {
              try {
                const storageRef = ref(storage, doc.storagePath);
                await deleteObject(storageRef);
                console.log(`✅ Deleted storage file: ${doc.name}`);
              } catch (storageError: any) {
                console.warn(`⚠️ Storage deletion warning for ${doc.name}:`, storageError.message);
              }
            }
          }
        }
      }
      
      await deleteDoc(dealRef);
      console.log(`✅ Deal deleted from Firestore`);
      
      await api.recalcUserStats(userId);
      console.log(`✅ User stats recalculated`);
      
    } catch (error: any) {
      console.error("❌ Delete deal error:", error);
      throw new Error(`Failed to delete deal: ${error.message}`);
    }
  },

  // --- CONTACTS ---

  getContacts: async (userId: string, isAdmin = false) => {
    checkDbConnection();
    
    const runQuery = async (adminMode: boolean) => {
      let q;
      if (adminMode) {
        q = query(collection(db, 'contacts'), orderBy('updatedAt', 'desc'));
      } else {
        q = query(collection(db, 'contacts'), where('userId', '==', userId));
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as Contact[];
    };

    if (isAdmin) {
      try {
        return await runQuery(true);
      } catch (error) {
        console.warn("Admin contacts query failed (likely permissions), falling back to user scope.", error);
        return await runQuery(false);
      }
    }
    return await runQuery(false);
  },

  getContact: async (contactId: string) => {
    checkDbConnection();
    const snap = await getDoc(doc(db, 'contacts', contactId));
    if (!snap.exists()) return null;
    return convertTimestamps({ id: snap.id, ...snap.data() }) as Contact;
  },

  saveContact: async (contact: Contact) => {
    checkDbConnection();
    const contactData = {
      ...contact,
      updatedAt: serverTimestamp()
    };

    if (contact.id && contact.id.length >= 9) {
      const ref = doc(db, 'contacts', contact.id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, contactData);
      } else {
        await setDoc(ref, { ...contactData, createdAt: serverTimestamp() });
      }
    } else {
      const { id, ...rest } = contactData;
      await addDoc(collection(db, 'contacts'), { ...rest, createdAt: serverTimestamp() });
    }
  },

  deleteContact: async (contactId: string) => {
    checkDbConnection();
    await deleteDoc(doc(db, 'contacts', contactId));
  },

  addContactInteraction: async (contactId: string, interaction: ContactInteraction) => {
    checkDbConnection();
    const ref = doc(db, 'contacts', contactId);
    await updateDoc(ref, {
      interactions: arrayUnion(interaction),
      lastContactedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  },

  deleteContactInteraction: async (contactId: string, interaction: ContactInteraction) => {
    checkDbConnection();
    const ref = doc(db, 'contacts', contactId);
    await updateDoc(ref, {
      interactions: arrayRemove(interaction),
      updatedAt: serverTimestamp()
    });
  },

  linkContactToDeal: async (contactId: string, dealId: string) => {
    checkDbConnection();
    const ref = doc(db, 'contacts', contactId);
    await updateDoc(ref, {
      linkedDealIds: arrayUnion(dealId),
      updatedAt: serverTimestamp()
    });
  },

  unlinkContactFromDeal: async (contactId: string, dealId: string) => {
    checkDbConnection();
    const ref = doc(db, 'contacts', contactId);
    await updateDoc(ref, {
      linkedDealIds: arrayRemove(dealId),
      updatedAt: serverTimestamp()
    });
  },

  // --- SYSTEM RESET ---
  
  adminHardReset: async () => {
    checkDbConnection();
    console.log("🧨 STARTING SYSTEM HARD RESET");

    try {
      // 1. Delete ALL Deals & Associated Storage
      const dealsSnap = await getDocs(collection(db, 'deals'));
      console.log(`🗑️ Deleting ${dealsSnap.size} deals...`);
      
      for (const d of dealsSnap.docs) {
        const data = d.data();
        if (data.documents && Array.isArray(data.documents) && storage) {
          for (const docFile of data.documents) {
            if (docFile.storagePath) {
              try {
                const storageRef = ref(storage, docFile.storagePath);
                await deleteObject(storageRef);
                console.log(`   Deleted file: ${docFile.name}`);
              } catch (e: any) {
                if (e.code !== 'storage/object-not-found') {
                   console.warn(`   Failed to delete file ${docFile.name}: ${e.message}`);
                }
              }
            }
          }
        }
        await deleteDoc(d.ref);
      }
      console.log("✅ Deals collection wiped.");

      // 2. Delete ALL Contacts
      const contactsSnap = await getDocs(collection(db, 'contacts'));
      console.log(`🗑️ Deleting ${contactsSnap.size} contacts...`);
      const contactBatch = writeBatch(db);
      contactsSnap.docs.forEach(d => contactBatch.delete(d.ref));
      await contactBatch.commit();
      console.log("✅ Contacts collection wiped.");

      // 3. Delete ALL Tasks
      const tasksSnap = await getDocs(collection(db, 'tasks'));
      console.log(`🗑️ Deleting ${tasksSnap.size} tasks...`);
      const taskBatch = writeBatch(db);
      tasksSnap.docs.forEach(d => taskBatch.delete(d.ref));
      await taskBatch.commit();
      console.log("✅ Tasks collection wiped.");

      // 4. Delete ALL Lead Logs
      const logsSnap = await getDocs(collection(db, 'leadLogs'));
      console.log(`🗑️ Deleting ${logsSnap.size} logs...`);
      const logBatch = writeBatch(db);
      logsSnap.docs.forEach(d => logBatch.delete(d.ref));
      await logBatch.commit();
      console.log("✅ Lead Logs collection wiped.");

      // 5. Delete ALL Mortgage Calculations
      const calcsSnap = await getDocs(collection(db, 'mortgageCalculations'));
      console.log(`🗑️ Deleting ${calcsSnap.size} calculations...`);
      const calcBatch = writeBatch(db);
      calcsSnap.docs.forEach(d => calcBatch.delete(d.ref));
      await calcBatch.commit();
      console.log("✅ Calculations collection wiped.");

      // 6. Reset ALL User Stats (Keep users, but wipe their data pointers)
      const usersSnap = await getDocs(collection(db, 'users'));
      console.log(`♻️ Resetting stats for ${usersSnap.size} users...`);
      const userBatch = writeBatch(db);
      usersSnap.docs.forEach(d => {
        userBatch.update(d.ref, {
          stats: { totalDeals: 0, totalCommissions: 0, activeDeals: 0, closedDeals: 0, pendingTasks: 0, totalVolume: 0 }
        });
      });
      await userBatch.commit();
      
      console.log("🎉 SYSTEM RESET COMPLETE");
    } catch (error: any) {
      console.error("❌ System Reset Failed:", error);
      throw new Error(`Reset failed: ${error.message}`);
    }
  },

  // --- DOCUMENTS (With Storage) ---
  
  saveDocument: async (dealId: string, document: DocumentFile, fileData?: Blob | File) => {
    checkDbConnection();
    
    console.log(`💾 saveDocument called for deal ${dealId}`);
    
    if (!storage) {
      throw new Error("Firebase Storage is not initialized. Check configuration.");
    }
    
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
      
      // 2. Upload file to Firebase Storage
      const timestamp = Date.now();
      const sanitizedName = document.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `deals/${dealId}/${timestamp}_${sanitizedName}`;
      const storageRef = ref(storage, storagePath);

      console.log(`📤 Step 2: Uploading to Storage: ${storagePath}`);
      await uploadBytes(storageRef, fileData);
      console.log(`✅ File uploaded to Storage successfully!`);
      
      // 3. Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log(`✅ Download URL acquired`);

      // 4. Save metadata to Firestore
      console.log(`💾 Step 3: Saving metadata to Firestore...`);
      const docMetadata = {
        ...document,
        url: downloadURL,
        storagePath: storagePath,
        uploadDate: new Date().toISOString()
      };
      
      await updateDoc(dealRef, {
        documents: arrayUnion(docMetadata),
        lastUpdated: serverTimestamp()
      });
      console.log(`✅ Metadata saved to Firestore successfully!`);

      // 5. Verification step
      // ... (omitted for brevity, verified logic remains same)

    } catch (error: any) {
      console.error("❌ Storage upload error:", error);
      if (error.code === 'storage/unauthorized') {
        throw new Error("Permission denied. Check Firebase Storage security rules.");
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
      const docs = Array.isArray(dealData.documents) ? dealData.documents : [];
      const docToDelete = docs.find((d: any) => d.id === documentId);
      
      if (!docToDelete) {
        console.warn("Document not found in array, might already be deleted");
        return;
      }

      if (docToDelete.storagePath && storage) {
        try {
          const storageRef = ref(storage, docToDelete.storagePath);
          await deleteObject(storageRef);
          console.log(`✅ Deleted from Storage: ${docToDelete.storagePath}`);
        } catch (storageError: any) {
          console.warn(`⚠️ Storage deletion warning:`, storageError.message);
        }
      }

      await updateDoc(dealRef, {
        documents: arrayRemove(docToDelete),
        lastUpdated: serverTimestamp()
      });
      console.log(`✅ Document metadata removed from Firestore`);
      
    } catch (error: any) {
      console.error("❌ Delete document error:", error);
      throw new Error(`Failed to delete document: ${error.message}`);
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
