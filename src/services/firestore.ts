
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

// Helper: Clean undefined values to prevent Firestore errors
const cleanPayload = (data: any): any => {
  if (data === null || data === undefined) return null;
  if (data instanceof Timestamp) return data;
  if (data instanceof Date) return data; 
  
  // Pass through Firestore FieldValues (like serverTimestamp) without traversing
  // We identify them by their specific structure or just check if it's not a plain object
  if (data && typeof data === 'object' && data['_methodName']) return data;

  if (typeof data !== 'object') return data;
  
  if (Array.isArray(data)) return data.map(cleanPayload);
  
  const cleaned: any = {};
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (value !== undefined) {
      cleaned[key] = cleanPayload(value);
    }
  });
  return cleaned;
};

const checkDbConnection = () => {
  if (!db || !auth) throw new Error("Database offline.");
};

// Helper to ensure userId exists
const ensureUserId = (providedId?: string): string => {
  if (providedId && providedId.length > 0) return providedId;
  if (auth?.currentUser?.uid) return auth.currentUser.uid;
  throw new Error("Operation failed: User not authenticated.");
};

export const api = {
  register: async (userData: any) => {
    checkDbConnection();
    const userCredential = await createUserWithEmailAndPassword(auth!, userData.email, userData.passwordHash);
    const uid = userCredential.user.uid;
    await updateProfile(userCredential.user, { displayName: `${userData.firstName} ${userData.lastName}` });

    const isAdminEmail = userData.email.toLowerCase() === 'raphael@sumcg.com';

    const newUser: UserAccount = {
      id: uid,
      username: userData.username,
      email: userData.email,
      passwordHash: 'PROTECTED', 
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      role: isAdminEmail ? 'admin' : 'agent',
      status: isAdminEmail ? 'active' : 'pending',
      avatar: `https://ui-avatars.com/api/?name=${userData.firstName}+${userData.lastName}&background=random`,
      notifications: {
        email: { dealUpdates: true, taskReminders: true, newMessages: true, systemAlerts: true },
        sms: { dealUpdates: false, taskReminders: true, newMessages: false, systemAlerts: false }
      },
      stats: { totalDeals: 0, totalCommissions: 0, activeDeals: 0, closedDeals: 0, pendingTasks: 0, totalVolume: 0 },
      gmailIntegration: { connected: false },
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db!, 'users', uid), { ...cleanPayload(newUser), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
    return newUser;
  },

  login: async (email: string, password: string) => {
    checkDbConnection();
    const userCredential = await signInWithEmailAndPassword(auth!, email, password);
    const uid = userCredential.user.uid;
    
    const userDoc = await getDoc(doc(db!, 'users', uid));
    if (!userDoc.exists()) throw new Error('Profile not found in database.');
    
    const userData = convertTimestamps({ id: userDoc.id, ...userDoc.data() }) as UserAccount;

    if (email.toLowerCase() === 'raphael@sumcg.com') {
      if (userData.role !== 'admin' || userData.status !== 'active') {
        console.log("Restoring admin privileges for system owner...");
        await setDoc(doc(db!, 'users', uid), { role: 'admin', status: 'active' }, { merge: true });
        userData.role = 'admin';
        userData.status = 'active';
      }
    }

    if (userData.status === 'denied') {
      await signOut(auth!);
      throw new Error('Access denied.');
    }
    
    await setDoc(doc(db!, 'users', uid), { lastLogin: serverTimestamp() }, { merge: true });
    return userData;
  },

  logout: async () => { if (auth) await signOut(auth); },

  getCurrentUser: async (uid: string) => {
    checkDbConnection();
    try {
      const userDoc = await getDoc(doc(db!, 'users', uid));
      if (!userDoc.exists()) return null;
      return convertTimestamps({ id: userDoc.id, ...userDoc.data() }) as UserAccount;
    } catch (e) {
      console.warn("getCurrentUser failed", e);
      return null;
    }
  },

  updateUserProfile: async (userId: string, updates: Partial<UserAccount>) => {
    checkDbConnection();
    const userRef = doc(db!, 'users', userId);
    await setDoc(userRef, { ...cleanPayload(updates), updatedAt: serverTimestamp() }, { merge: true });
    const updated = await getDoc(userRef);
    return convertTimestamps({ id: updated.id, ...updated.data() }) as UserAccount;
  },

  updateUserPassword: async (newPassword: string) => {
    checkDbConnection();
    const user = auth!.currentUser;
    if (!user) throw new Error("Unauthorized");
    await updatePassword(user, newPassword);
  },

  getUsers: async () => {
    checkDbConnection();
    try {
        const q = query(collection(db!, 'users'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as UserAccount[];
    } catch (e) {
        console.warn("List users failed", e);
        return [];
    }
  },

  updateUserStatus: async (userId: string, status: 'active' | 'denied') => {
    checkDbConnection();
    const ref = doc(db!, 'users', userId);
    await setDoc(ref, { status, approvedAt: status === 'active' ? serverTimestamp() : null }, { merge: true });
  },

  deleteUser: async (userId: string) => {
    checkDbConnection();
    await deleteDoc(doc(db!, 'users', userId));
  },

  getDeals: async (userId: string, isAdmin = false) => {
    checkDbConnection();
    try {
        let q;
        if (isAdmin) {
          q = query(collection(db!, 'deals'), orderBy('lastUpdated', 'desc'));
        } else {
          q = query(collection(db!, 'deals'), where('userId', '==', userId));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as Deal[];
    } catch (e: any) {
        if (isAdmin && e.code === 'permission-denied') {
            try {
                const q = query(collection(db!, 'deals'), where('userId', '==', userId));
                const snapshot = await getDocs(q);
                return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as Deal[];
            } catch (fallbackError) {
                return [];
            }
        }
        return [];
    }
  },

  saveDeal: async (deal: Deal) => {
    checkDbConnection();
    const validUserId = ensureUserId(deal.userId);
    const { id, userId, createdAt, ...dealRest } = deal;
    const cleanedRest = cleanPayload(dealRest);
    delete (cleanedRest as any).id;

    let ref;
    if (id && id.length > 5) {
        ref = doc(db!, 'deals', id);
    } else {
        ref = doc(collection(db!, 'deals'));
    }

    const dataToSave: any = {
        ...cleanedRest,
        userId: validUserId,
        lastUpdated: serverTimestamp()
    };

    if (createdAt) {
        dataToSave.createdAt = createdAt;
    } else if (!id || id.length <= 5) {
        dataToSave.createdAt = serverTimestamp();
    }

    await setDoc(ref, dataToSave, { merge: true });
    
    setTimeout(() => {
        api.recalcUserStats(validUserId).catch(e => console.warn("Stats recalc failed", e));
    }, 500);
  },

  deleteDeal: async (dealId: string, userId: string) => {
    checkDbConnection();
    await deleteDoc(doc(db!, 'deals', dealId));
    api.recalcUserStats(userId).catch(console.warn);
  },

  getContacts: async (userId: string, isAdmin = false) => {
    checkDbConnection();
    try {
        let q;
        if (isAdmin) {
            q = query(collection(db!, 'contacts'), orderBy('updatedAt', 'desc'));
        } else {
            q = query(collection(db!, 'contacts'), where('userId', '==', userId));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as Contact[];
    } catch (e: any) {
        if (isAdmin && e.code === 'permission-denied') {
            try {
                const q = query(collection(db!, 'contacts'), where('userId', '==', userId));
                const snapshot = await getDocs(q);
                return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as Contact[];
            } catch (fallbackError) {
                return [];
            }
        }
        return [];
    }
  },

  saveContact: async (contact: Contact) => {
    checkDbConnection();
    const currentUser = auth?.currentUser;
    if (!currentUser) throw new Error("User must be authenticated to save contacts.");
    
    const ownerId = contact.userId || currentUser.uid;
    const { id, createdAt, userId, ...contactRest } = contact;
    const cleanedRest = cleanPayload(contactRest);
    delete (cleanedRest as any).id; 

    try {
        if (id && id.length > 5) {
            // UPDATE: Check existing ownership implicitly via rules
            const ref = doc(db!, 'contacts', id);
            await updateDoc(ref, { 
                ...cleanedRest, 
                // Do NOT overwrite userId on update for admin, 
                // but for orphaned records allow claim via rules if needed.
                // We rely on rules to allow the update if user owns it.
                updatedAt: serverTimestamp() 
            });
        } else {
            // CREATE: Explicitly set owner to CURRENT user to satisfy rule: request.resource.data.userId == request.auth.uid
            // Unless the caller is Admin, we shouldn't create contacts for others in this context anyway.
            
            await addDoc(collection(db!, 'contacts'), { 
                ...cleanedRest, 
                userId: currentUser.uid, // Strict enforcement for creation
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp() 
            });
        }
    } catch (error: any) {
        console.error("[Firestore] saveContact error:", error.code || error.message);
        throw error;
    }
  },

  deleteContact: async (contactId: string) => {
    checkDbConnection();
    await deleteDoc(doc(db!, 'contacts', contactId));
  },

  addContactInteraction: async (contactId: string, interaction: ContactInteraction) => {
    checkDbConnection();
    const ref = doc(db!, 'contacts', contactId);
    await setDoc(ref, { 
        interactions: arrayUnion(cleanPayload(interaction)), 
        lastContactedAt: serverTimestamp(), 
        updatedAt: serverTimestamp() 
    }, { merge: true });
  },

  linkContactToDeal: async (contactId: string, dealId: string) => {
    checkDbConnection();
    const ref = doc(db!, 'contacts', contactId);
    await setDoc(ref, { linkedDealIds: arrayUnion(dealId), updatedAt: serverTimestamp() }, { merge: true });
  },

  unlinkContactFromDeal: async (contactId: string, dealId: string) => {
    checkDbConnection();
    const ref = doc(db!, 'contacts', contactId);
    await setDoc(ref, { linkedDealIds: arrayRemove(dealId), updatedAt: serverTimestamp() }, { merge: true });
  },

  adminHardReset: async () => {
    checkDbConnection();
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
    const docMetadata = { ...cleanPayload(document), url: downloadURL, storagePath, uploadDate: new Date().toISOString() };
    
    const dealRef = doc(db!, 'deals', dealId);
    await updateDoc(dealRef, { documents: arrayUnion(docMetadata), lastUpdated: serverTimestamp() });
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
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as Task[];
    } catch (e) { return []; }
  },

  saveTask: async (task: Task) => {
    checkDbConnection();
    const validUserId = ensureUserId(task.userId);
    const { id, userId, ...taskRest } = task;
    const cleaned = cleanPayload(taskRest);
    delete (cleaned as any).id;

    let ref;
    if (id && id.length > 5) ref = doc(db!, 'tasks', id);
    else ref = doc(collection(db!, 'tasks'));

    await setDoc(ref, { ...cleaned, userId: validUserId }, { merge: true });
    
    setTimeout(() => api.recalcUserStats(validUserId).catch(console.warn), 500);
  },

  saveLeadLog: async (log: LeadGenLog) => {
    checkDbConnection();
    const validUserId = ensureUserId(log.userId);
    const { id, userId, ...rest } = log;
    const cleaned = cleanPayload(rest);
    delete (cleaned as any).id;

    let ref;
    if (id && id.length > 5) ref = doc(db!, 'leadLogs', id);
    else ref = doc(collection(db!, 'leadLogs'));

    await setDoc(ref, { ...cleaned, userId: validUserId }, { merge: true });
  },

  deleteLeadLog: async (logId: string) => {
    checkDbConnection();
    await deleteDoc(doc(db!, 'leadLogs', logId));
  },

  getLeadLogs: async (userId: string) => {
    checkDbConnection();
    try {
        const q = query(collection(db!, 'leadLogs'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as LeadGenLog[];
    } catch (e) { return []; }
  },

  saveCalculation: async (calc: MortgageCalculation) => {
    checkDbConnection();
    const validUserId = ensureUserId(calc.userId);
    const { id, ...rest } = calc;
    await addDoc(collection(db!, 'mortgageCalculations'), { ...cleanPayload(rest), userId: validUserId, timestamp: serverTimestamp() });
  },

  getCalculations: async (userId: string) => {
    checkDbConnection();
    try {
        const q = query(collection(db!, 'mortgageCalculations'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as MortgageCalculation[];
    } catch (e) { return []; }
  },

  recalcUserStats: async (userId: string) => {
    checkDbConnection();
    try {
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
        await setDoc(doc(db!, 'users', userId), { stats }, { merge: true });
    } catch (e) {
        console.warn("Stats recalc skipped", e);
    }
  }
};
