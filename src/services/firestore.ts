
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
import { db, auth, storage } from '../firebase/config.ts';
import { UserAccount, Deal, Task, LeadGenLog, MortgageCalculation, DocumentFile, Contact, ContactInteraction, LeaseCalculation } from '../types.ts';

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

// Firestore doesn't accept 'undefined', so we convert to 'null' or omit
const sanitizeData = (data: any): any => {
  if (data === undefined) return null;
  if (data === null || typeof data !== 'object') return data;
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) return data.map(sanitizeData);
  
  const result: any = {};
  for (const key in data) {
    const val = data[key];
    if (val === undefined) {
      result[key] = null; // Convert undefined to null for Firestore
    } else {
      result[key] = sanitizeData(val);
    }
  }
  return result;
};

const checkDbConnection = () => {
  if (!db || !auth) throw new Error("Database offline.");
};

export const api = {
  register: async (userData: any) => {
    checkDbConnection();
    const userCredential = await createUserWithEmailAndPassword(auth!, userData.email, userData.passwordHash);
    const uid = userCredential.user.uid;
    await updateProfile(userCredential.user, { displayName: `${userData.firstName} ${userData.lastName}` });

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

    await setDoc(doc(db!, 'users', uid), sanitizeData({ ...newUser, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    return newUser;
  },

  login: async (email: string, password: string) => {
    checkDbConnection();
    const userCredential = await signInWithEmailAndPassword(auth!, email, password);
    const uid = userCredential.user.uid;
    const userDoc = await getDoc(doc(db!, 'users', uid));
    if (!userDoc.exists()) throw new Error('Profile not found.');
    
    const userData = convertTimestamps(userDoc.data()) as UserAccount;
    if (userData.status === 'denied') {
      await signOut(auth!);
      throw new Error('Access denied.');
    }
    await updateDoc(doc(db!, 'users', uid), { lastLogin: serverTimestamp() });
    return userData;
  },

  logout: async () => { if (auth) await signOut(auth); },

  getCurrentUser: async (uid: string) => {
    checkDbConnection();
    const userDoc = await getDoc(doc(db!, 'users', uid));
    if (!userDoc.exists()) return null;
    return convertTimestamps({ id: userDoc.id, ...userDoc.data() }) as UserAccount;
  },

  updateUserProfile: async (userId: string, updates: Partial<UserAccount>) => {
    checkDbConnection();
    const userRef = doc(db!, 'users', userId);
    await updateDoc(userRef, sanitizeData({ ...updates, updatedAt: serverTimestamp() }));
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
    const q = query(collection(db!, 'users'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as UserAccount[];
  },

  updateUserStatus: async (userId: string, status: 'active' | 'denied') => {
    checkDbConnection();
    const ref = doc(db!, 'users', userId);
    await updateDoc(ref, { status, approvedAt: status === 'active' ? serverTimestamp() : null });
  },

  deleteUser: async (userId: string) => {
    checkDbConnection();
    await deleteDoc(doc(db!, 'users', userId));
  },

  getDeals: async (userId: string, isAdmin = false) => {
    checkDbConnection();
    let q;
    if (isAdmin) {
      q = query(collection(db!, 'deals'), orderBy('lastUpdated', 'desc'));
    } else {
      q = query(collection(db!, 'deals'), where('userId', '==', userId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as Deal[];
  },

  saveDeal: async (deal: Deal) => {
    checkDbConnection();
    const dealData = sanitizeData({ ...deal, lastUpdated: serverTimestamp() });
    if (deal.id && deal.id.length >= 9) { 
      const ref = doc(db!, 'deals', deal.id);
      const snap = await getDoc(ref);
      if (snap.exists()) await updateDoc(ref, dealData);
      else await setDoc(ref, { ...dealData, createdAt: serverTimestamp() });
    } else {
      const { id, ...rest } = dealData;
      await addDoc(collection(db!, 'deals'), { ...rest, createdAt: serverTimestamp() });
    }
    await api.recalcUserStats(deal.userId);
  },

  deleteDeal: async (dealId: string, userId: string) => {
    checkDbConnection();
    await deleteDoc(doc(db!, 'deals', dealId));
    await api.recalcUserStats(userId);
  },

  getContacts: async (userId: string, isAdmin = false) => {
    checkDbConnection();
    let q;
    if (isAdmin) q = query(collection(db!, 'contacts'), orderBy('updatedAt', 'desc'));
    else q = query(collection(db!, 'contacts'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as Contact[];
  },

  saveContact: async (contact: Contact) => {
    checkDbConnection();
    const contactData = sanitizeData({ ...contact, updatedAt: serverTimestamp() });
    if (contact.id && contact.id.length >= 9) {
      const ref = doc(db!, 'contacts', contact.id);
      const snap = await getDoc(ref);
      if (snap.exists()) await updateDoc(ref, contactData);
      else await setDoc(ref, { ...contactData, createdAt: serverTimestamp() });
    } else {
      const { id, ...rest } = contactData;
      await addDoc(collection(db!, 'contacts'), { ...rest, createdAt: serverTimestamp() });
    }
  },

  deleteContact: async (contactId: string) => {
    checkDbConnection();
    await deleteDoc(doc(db!, 'contacts', contactId));
  },

  addContactInteraction: async (contactId: string, interaction: ContactInteraction) => {
    checkDbConnection();
    const ref = doc(db!, 'contacts', contactId);
    await updateDoc(ref, sanitizeData({ interactions: arrayUnion(interaction), lastContactedAt: serverTimestamp(), updatedAt: serverTimestamp() }));
  },

  linkContactToDeal: async (contactId: string, dealId: string) => {
    checkDbConnection();
    const ref = doc(db!, 'contacts', contactId);
    await updateDoc(ref, { linkedDealIds: arrayUnion(dealId), updatedAt: serverTimestamp() });
  },

  unlinkContactFromDeal: async (contactId: string, dealId: string) => {
    checkDbConnection();
    const ref = doc(db!, 'contacts', contactId);
    await updateDoc(ref, { linkedDealIds: arrayRemove(dealId), updatedAt: serverTimestamp() });
  },

  adminHardReset: async () => {
    checkDbConnection();
    const collections = ['deals', 'contacts', 'tasks', 'leadLogs', 'mortgageCalculations', 'leaseCalculations'];
    for (const col of collections) {
      const snap = await getDocs(collection(db!, col));
      const batch = writeBatch(db!);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  },

  saveDocument: async (dealId: string, document: DocumentFile, fileData?: Blob | File) => {
    checkDbConnection();
    if (!storage || !fileData) return;
    const storagePath = `deals/${dealId}/${Date.now()}_${document.name}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, fileData);
    const downloadURL = await getDownloadURL(storageRef);
    const docMetadata = sanitizeData({ ...document, url: downloadURL, storagePath, uploadDate: new Date().toISOString() });
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
    const q = query(collection(db!, 'tasks'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as Task[];
  },

  saveTask: async (task: Task) => {
    checkDbConnection();
    const taskData = sanitizeData(task);
    if (task.id) await setDoc(doc(db!, 'tasks', task.id), taskData, { merge: true });
    else await addDoc(collection(db!, 'tasks'), taskData);
    await api.recalcUserStats(task.userId);
  },

  saveLeadLog: async (log: LeadGenLog) => {
    checkDbConnection();
    const { id, ...rest } = sanitizeData(log);
    if (id) await setDoc(doc(db!, 'leadLogs', id), rest, { merge: true });
    else await addDoc(collection(db!, 'leadLogs'), rest);
  },

  deleteLeadLog: async (logId: string) => {
    checkDbConnection();
    await deleteDoc(doc(db!, 'leadLogs', logId));
  },

  getLeadLogs: async (userId: string) => {
    checkDbConnection();
    const q = query(collection(db!, 'leadLogs'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as LeadGenLog[];
  },

  saveCalculation: async (calc: MortgageCalculation) => {
    checkDbConnection();
    const { id, ...rest } = sanitizeData(calc);
    await addDoc(collection(db!, 'mortgageCalculations'), { ...rest, timestamp: serverTimestamp() });
  },

  getCalculations: async (userId: string) => {
    checkDbConnection();
    const q = query(collection(db!, 'mortgageCalculations'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as MortgageCalculation[];
  },

  // LEASE CALCULATIONS
  saveLeaseCalculation: async (calculation: LeaseCalculation) => {
    checkDbConnection();
    const { id, ...rest } = sanitizeData(calculation);
    if (id && id.length >= 8) {
      await setDoc(doc(db!, 'leaseCalculations', id), { ...rest, updatedAt: serverTimestamp() }, { merge: true });
    } else {
      await addDoc(collection(db!, 'leaseCalculations'), { ...rest, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
  },

  getLeaseCalculations: async (userId: string) => {
    checkDbConnection();
    // Removed orderBy to avoid "index required" error on new deployments
    // Sorting is now handled client-side
    const q = query(collection(db!, 'leaseCalculations'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as LeaseCalculation[];
    return results.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
  },

  deleteLeaseCalculation: async (id: string) => {
    checkDbConnection();
    await deleteDoc(doc(db!, 'leaseCalculations', id));
  },

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
    await updateDoc(doc(db!, 'users', userId), { stats });
  }
};
