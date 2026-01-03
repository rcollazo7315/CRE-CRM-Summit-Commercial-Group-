
import { 
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, serverTimestamp, Timestamp, writeBatch, arrayUnion, arrayRemove,
  DocumentSnapshot, QuerySnapshot
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
import { db, auth, storage } from '../firebase/config.ts';
import { UserAccount, Deal, Task, LeadGenLog, MortgageCalculation, DocumentFile, Contact, ContactInteraction } from '../types.ts';

const convertTimestamps = (data: any): any => {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(item => convertTimestamps(item));
  if (data instanceof Timestamp) return data.toDate().toISOString();
  if (typeof data === 'object' && data !== null) {
    const result: any = {};
    for (const key in data) result[key] = convertTimestamps(data[key]);
    return result;
  }
  return data;
};

const checkDbConnection = () => {
  if (!db || !auth) throw new Error("Database offline.");
};

// Helper for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Moderate Retry Wrapper
const retryOperation = async <T>(
  operation: () => Promise<T>, 
  maxRetries = 3, 
  baseDelay = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const errorCode = error.code || '';
      
      // Fail fast on permission or precondition errors
      if (errorCode === 'permission-denied' || errorCode === 'failed-precondition') {
        throw error;
      }

      // Retry mostly on network/server errors
      const isRetryable = 
        errorCode === 'auth/network-request-failed' || 
        errorCode === 'unavailable' ||
        errorCode === 'auth/internal-error'; 
        
      if (isRetryable) {
        const waitTime = baseDelay * Math.pow(1.5, i);
        await delay(waitTime);
        continue;
      }
      
      throw error;
    }
  }
  throw lastError;
};

export const api = {
  register: async (userData: any) => {
    checkDbConnection();
    const userCredential = await retryOperation(() => 
      createUserWithEmailAndPassword(auth!, userData.email, userData.passwordHash)
    ) as any;
    
    const uid = userCredential.user.uid;
    await retryOperation(() => 
      updateProfile(userCredential.user, { displayName: `${userData.firstName} ${userData.lastName}` })
    );

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

    await retryOperation(() => 
      setDoc(doc(db!, 'users', uid), { ...newUser, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    );
    return newUser;
  },

  login: async (email: string, password: string) => {
    checkDbConnection();
    await retryOperation(() => signInWithEmailAndPassword(auth!, email, password));
    
    const uid = auth!.currentUser!.uid;
    let userData = await api.getCurrentUser(uid);
    
    // Self-healing
    if (!userData) {
      console.warn(`[Firestore] Profile missing for UID: ${uid}. Healing...`);
      const user = auth!.currentUser;
      const nameParts = user?.displayName?.split(' ') || ['User'];
      const healingProfile: UserAccount = {
        id: uid,
        email: email,
        firstName: nameParts[0] || 'User',
        lastName: nameParts.slice(1).join(' ') || '',
        username: email.split('@')[0],
        passwordHash: 'PROTECTED',
        role: 'agent',
        status: 'pending',
        avatar: `https://ui-avatars.com/api/?name=${nameParts[0]}+${nameParts.slice(1).join(' ')}&background=random`,
        notifications: { email: { dealUpdates: true, taskReminders: true, newMessages: true, systemAlerts: true }, sms: { dealUpdates: false, taskReminders: true, newMessages: false, systemAlerts: false } },
        stats: { totalDeals: 0, totalCommissions: 0, activeDeals: 0, closedDeals: 0, pendingTasks: 0, totalVolume: 0 },
        gmailIntegration: { connected: false },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      try {
         await setDoc(doc(db!, 'users', uid), { ...healingProfile, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
         userData = healingProfile;
      } catch (e) {
         await signOut(auth!);
         throw new Error('Profile recovery failed.');
      }
    }
    
    if (userData.status === 'denied') {
      await signOut(auth!);
      throw new Error('Access denied.');
    }
    
    updateDoc(doc(db!, 'users', uid), { lastLogin: serverTimestamp() }).catch(() => {});
    return userData;
  },

  logout: async () => { if (auth) await signOut(auth); },

  getCurrentUser: async (uid: string) => {
    checkDbConnection();
    let attempts = 0;
    while (attempts < 5) {
      try {
        const userDoc = await getDoc(doc(db!, 'users', uid));
        if (userDoc.exists()) {
          return convertTimestamps({ id: userDoc.id, ...userDoc.data() }) as UserAccount;
        }
      } catch (e) { console.warn("Fetch profile failed", e); }
      await delay(500 * (attempts + 1));
      attempts++;
    }
    return null;
  },

  updateUserProfile: async (userId: string, updates: Partial<UserAccount>) => {
    checkDbConnection();
    const userRef = doc(db!, 'users', userId);
    await retryOperation(() => updateDoc(userRef, { ...updates, updatedAt: serverTimestamp() }));
    const updated = await getDoc(userRef);
    return convertTimestamps({ id: updated.id, ...updated.data() }) as UserAccount;
  },

  updateUserPassword: async (newPassword: string) => {
    checkDbConnection();
    if (!auth!.currentUser) throw new Error("Unauthorized");
    await retryOperation(() => updatePassword(auth!.currentUser!, newPassword));
  },

  getUsers: async () => {
    checkDbConnection();
    try {
      const q = query(collection(db!, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await retryOperation(() => getDocs(q)) as QuerySnapshot;
      return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as UserAccount[];
    } catch (e: any) {
      console.warn("[Firestore] Failed to list users.", e.code);
      return [];
    }
  },

  updateUserStatus: async (userId: string, status: 'active' | 'denied') => {
    checkDbConnection();
    const ref = doc(db!, 'users', userId);
    await retryOperation(() => updateDoc(ref, { status, approvedAt: status === 'active' ? serverTimestamp() : null }));
  },

  deleteUser: async (userId: string) => {
    checkDbConnection();
    await retryOperation(() => deleteDoc(doc(db!, 'users', userId)));
  },

  getDeals: async (userId: string, isAdmin = false) => {
    checkDbConnection();
    
    const runQuery = async (asAdmin: boolean) => {
      const q = asAdmin 
        ? query(collection(db!, 'deals'), orderBy('lastUpdated', 'desc'))
        : query(collection(db!, 'deals'), where('userId', '==', userId));
      
      const snapshot = await retryOperation(() => getDocs(q)) as QuerySnapshot;
      return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as Deal[];
    };

    try {
      if (isAdmin) {
        try {
          return await runQuery(true);
        } catch (e) {
          console.warn("[Firestore] Admin deals query failed, falling back to personal.", e);
          return await runQuery(false);
        }
      }
      return await runQuery(false);
    } catch (error: any) {
      console.warn("[Firestore] getDeals failed gracefully:", error.code);
      return [];
    }
  },

  saveDeal: async (deal: Deal) => {
    checkDbConnection();
    const dealData = { ...deal, lastUpdated: serverTimestamp() };
    await retryOperation(async () => {
        if (deal.id && deal.id.length >= 9) { 
          const ref = doc(db!, 'deals', deal.id);
          const snap = await getDoc(ref);
          if (snap.exists()) await updateDoc(ref, dealData);
          else await setDoc(ref, { ...dealData, createdAt: serverTimestamp() });
        } else {
          const { id, ...rest } = dealData;
          await addDoc(collection(db!, 'deals'), { ...rest, createdAt: serverTimestamp() });
        }
    });
    // Fire & Forget stats update
    api.recalcUserStats(deal.userId).catch(console.warn);
  },

  deleteDeal: async (dealId: string, userId: string) => {
    checkDbConnection();
    await retryOperation(() => deleteDoc(doc(db!, 'deals', dealId)));
    api.recalcUserStats(userId).catch(console.warn);
  },

  getContacts: async (userId: string, isAdmin = false) => {
    checkDbConnection();
    const runQuery = async (asAdmin: boolean) => {
      const q = asAdmin 
        ? query(collection(db!, 'contacts'), orderBy('updatedAt', 'desc'))
        : query(collection(db!, 'contacts'), where('userId', '==', userId));
      const snapshot = await retryOperation(() => getDocs(q)) as QuerySnapshot;
      return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as Contact[];
    };

    try {
      if (isAdmin) {
        try {
          return await runQuery(true);
        } catch (e) {
          console.warn("[Firestore] Admin contacts query failed, falling back.", e);
          return await runQuery(false);
        }
      }
      return await runQuery(false);
    } catch (error: any) {
      console.warn("[Firestore] getContacts failed gracefully:", error.code);
      return [];
    }
  },

  saveContact: async (contact: Contact) => {
    checkDbConnection();
    const contactData = { ...contact, updatedAt: serverTimestamp() };
    await retryOperation(async () => {
        if (contact.id && contact.id.length >= 9) {
          const ref = doc(db!, 'contacts', contact.id);
          const snap = await getDoc(ref);
          if (snap.exists()) await updateDoc(ref, contactData);
          else await setDoc(ref, { ...contactData, createdAt: serverTimestamp() });
        } else {
          const { id, ...rest } = contactData;
          await addDoc(collection(db!, 'contacts'), { ...rest, createdAt: serverTimestamp() });
        }
    });
  },

  deleteContact: async (contactId: string) => {
    checkDbConnection();
    await retryOperation(() => deleteDoc(doc(db!, 'contacts', contactId)));
  },

  addContactInteraction: async (contactId: string, interaction: ContactInteraction) => {
    checkDbConnection();
    const ref = doc(db!, 'contacts', contactId);
    await retryOperation(() => updateDoc(ref, { interactions: arrayUnion(interaction), lastContactedAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  },

  linkContactToDeal: async (contactId: string, dealId: string) => {
    checkDbConnection();
    const ref = doc(db!, 'contacts', contactId);
    await retryOperation(() => updateDoc(ref, { linkedDealIds: arrayUnion(dealId), updatedAt: serverTimestamp() }));
  },

  unlinkContactFromDeal: async (contactId: string, dealId: string) => {
    checkDbConnection();
    const ref = doc(db!, 'contacts', contactId);
    await retryOperation(() => updateDoc(ref, { linkedDealIds: arrayRemove(dealId), updatedAt: serverTimestamp() }));
  },

  adminHardReset: async () => {
    checkDbConnection();
    // Use with caution
    const collections = ['deals', 'contacts', 'tasks', 'leadLogs', 'mortgageCalculations'];
    for (const col of collections) {
      try {
        const snap = await getDocs(collection(db!, col));
        const batch = writeBatch(db!);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      } catch (e) { console.error(`Reset failed for ${col}`, e); }
    }
  },

  saveDocument: async (dealId: string, document: DocumentFile, fileData?: Blob | File) => {
    checkDbConnection();
    if (!storage || !fileData) return;
    const storagePath = `deals/${dealId}/${Date.now()}_${document.name}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, fileData);
    const downloadURL = await getDownloadURL(storageRef);
    const docMetadata = { ...document, url: downloadURL, storagePath, uploadDate: new Date().toISOString() };
    await updateDoc(doc(db!, 'deals', dealId), { documents: arrayUnion(docMetadata), lastUpdated: serverTimestamp() });
  },

  deleteDocument: async (dealId: string, documentId: string) => {
    checkDbConnection();
    const dealRef = doc(db!, 'deals', dealId);
    const dealSnap = await getDoc(dealRef);
    if (!dealSnap.exists()) return;
    const docs = dealSnap.data().documents || [];
    const docToDelete = docs.find((d: any) => d.id === documentId);
    if (docToDelete && docToDelete.storagePath && storage) {
      try { await deleteObject(ref(storage, docToDelete.storagePath)); } catch (e) {}
    }
    await updateDoc(dealRef, { documents: arrayRemove(docToDelete), lastUpdated: serverTimestamp() });
  },

  getTasks: async (userId: string) => {
    checkDbConnection();
    try {
      const q = query(collection(db!, 'tasks'), where('userId', '==', userId));
      const snapshot = await retryOperation(() => getDocs(q)) as QuerySnapshot;
      return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as Task[];
    } catch (e: any) {
      console.warn("[Firestore] getTasks failed gracefully:", e.code);
      return [];
    }
  },

  saveTask: async (task: Task) => {
    checkDbConnection();
    await retryOperation(async () => {
        if (task.id) await setDoc(doc(db!, 'tasks', task.id), task, { merge: true });
        else await addDoc(collection(db!, 'tasks'), task);
    });
    api.recalcUserStats(task.userId).catch(console.warn);
  },

  saveLeadLog: async (log: LeadGenLog) => {
    checkDbConnection();
    const { id, ...rest } = log;
    await retryOperation(async () => {
        if (id) await setDoc(doc(db!, 'leadLogs', id), rest, { merge: true });
        else await addDoc(collection(db!, 'leadLogs'), rest);
    });
  },

  deleteLeadLog: async (logId: string) => {
    checkDbConnection();
    await retryOperation(() => deleteDoc(doc(db!, 'leadLogs', logId)));
  },

  getLeadLogs: async (userId: string) => {
    checkDbConnection();
    try {
      const q = query(collection(db!, 'leadLogs'), where('userId', '==', userId));
      const snapshot = await retryOperation(() => getDocs(q)) as QuerySnapshot;
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as LeadGenLog[];
    } catch (e: any) {
      console.warn("[Firestore] getLeadLogs failed gracefully:", e.code);
      return [];
    }
  },

  saveCalculation: async (calc: MortgageCalculation) => {
    checkDbConnection();
    const { id, ...rest } = calc;
    await retryOperation(() => addDoc(collection(db!, 'mortgageCalculations'), { ...rest, timestamp: serverTimestamp() }));
  },

  getCalculations: async (userId: string) => {
    checkDbConnection();
    try {
      const q = query(collection(db!, 'mortgageCalculations'), where('userId', '==', userId));
      const snapshot = await retryOperation(() => getDocs(q)) as QuerySnapshot;
      return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as MortgageCalculation[];
    } catch (e: any) {
      console.warn("[Firestore] getCalculations failed gracefully:", e.code);
      return [];
    }
  },

  recalcUserStats: async (userId: string) => {
    checkDbConnection();
    try {
        const deals = await api.getDeals(userId); // Will return [] on failure
        const tasks = await api.getTasks(userId); // Will return [] on failure
        const stats = {
          totalDeals: deals.length,
          totalCommissions: deals.filter(d => d.status === 'Completed').reduce((acc, d) => acc + (d.commission || (d.askingPrice * 0.03)), 0),
          activeDeals: deals.filter(d => d.status !== 'Completed' && d.status !== 'Archived').length,
          closedDeals: deals.filter(d => d.status === 'Completed').length,
          pendingTasks: tasks.filter(t => t.status === 'pending').length,
          totalVolume: deals.filter(d => d.status === 'Completed').reduce((acc, d) => acc + d.askingPrice, 0),
        };
        await updateDoc(doc(db!, 'users', userId), { stats });
    } catch (e) {
        console.warn("Stats recalc skipped due to network/permission", e);
    }
  }
};
