
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
  if (!db || !auth) throw new Error("Database not connected. Please refresh.");
};

export const api = {
  register: async (userData: any) => {
    checkDbConnection();
    try {
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

      await setDoc(doc(db!, 'users', uid), { ...newUser, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      return newUser;
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        const currentUser = auth!.currentUser;
        if (currentUser) await currentUser.delete();
        throw new Error("Registration unavailable. Permissions locked.");
      }
      throw error;
    }
  },

  login: async (email: string, password: string) => {
    checkDbConnection();
    const userCredential = await signInWithEmailAndPassword(auth!, email, password);
    const uid = userCredential.user.uid;
    const userDoc = await getDoc(doc(db!, 'users', uid));
    if (!userDoc.exists()) throw new Error('User profile not found.');
    
    const userData = convertTimestamps(userDoc.data()) as UserAccount;
    if (userData.status === 'denied') {
      await signOut(auth!);
      throw new Error('Account request denied.');
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
    const ref = doc(db!, 'users', userId);
    await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
    const updated = await getDoc(ref);
    return convertTimestamps({ id: updated.id, ...updated.data() }) as UserAccount;
  },

  updateUserPassword: async (newPassword: string) => {
    checkDbConnection();
    const user = auth!.currentUser;
    if (!user) throw new Error("No authenticated user found");
    try { await updatePassword(user, newPassword); } 
    catch (error: any) { 
        if (error.code === 'auth/requires-recent-login') throw new Error("Re-login required."); 
        throw error; 
    }
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
    const deals = snapshot.docs.map(d => {
      const data = d.data();
      const docs = Array.isArray(data.documents) ? data.documents : [];
      return convertTimestamps({ id: d.id, ...data, documents: docs });
    }) as Deal[];
    return deals.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
  },

  saveDeal: async (deal: Deal) => {
    checkDbConnection();
    const dealData = { ...deal, lastUpdated: serverTimestamp() };
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
    const dealRef = doc(db!, 'deals', dealId);
    const dealSnap = await getDoc(dealRef);
    if (dealSnap.exists()) {
      const dealData = dealSnap.data();
      const documents = dealData.documents || [];
      if (documents.length > 0 && storage) {
        for (const doc of documents) {
          if (doc.storagePath) {
            try { await deleteObject(ref(storage, doc.storagePath)); } catch (e) {}
          }
        }
      }
    }
    await deleteDoc(dealRef);
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
    const contactData = { ...contact, updatedAt: serverTimestamp() };
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
    await updateDoc(ref, { interactions: arrayUnion(interaction), lastContactedAt: serverTimestamp(), updatedAt: serverTimestamp() });
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
    try {
      const dealsSnap = await getDocs(collection(db!, 'deals'));
      for (const d of dealsSnap.docs) {
        const data = d.data();
        if (data.documents && Array.isArray(data.documents) && storage) {
          for (const docFile of data.documents) {
            if (docFile.storagePath) {
              try { await deleteObject(ref(storage, docFile.storagePath)); } catch (e) {}
            }
          }
        }
        await deleteDoc(d.ref);
      }
      
      const collections = ['contacts', 'tasks', 'leadLogs', 'mortgageCalculations'];
      for (const col of collections) {
        const snap = await getDocs(collection(db!, col));
        const batch = writeBatch(db!);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }

      const usersSnap = await getDocs(collection(db!, 'users'));
      const userBatch = writeBatch(db!);
      usersSnap.docs.forEach(d => {
        userBatch.update(d.ref, { stats: { totalDeals: 0, totalCommissions: 0, activeDeals: 0, closedDeals: 0, pendingTasks: 0, totalVolume: 0 } });
      });
      await userBatch.commit();
    } catch (error: any) {
      throw new Error(`Reset failed: ${error.message}`);
    }
  },

  saveDocument: async (dealId: string, document: DocumentFile, fileData?: Blob | File) => {
    checkDbConnection();
    if (!storage) throw new Error("Firebase Storage is not initialized.");
    if (!fileData) throw new Error("No file data.");

    try {
      const dealRef = doc(db!, 'deals', dealId);
      const dealSnap = await getDoc(dealRef);
      if (!dealSnap.exists()) throw new Error(`Deal ${dealId} not found`);
      
      const timestamp = Date.now();
      const sanitizedName = document.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `deals/${dealId}/${timestamp}_${sanitizedName}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, fileData);
      const downloadURL = await getDownloadURL(storageRef);

      const docMetadata = {
        ...document,
        url: downloadURL,
        storagePath: storagePath,
        uploadDate: new Date().toISOString()
      };
      
      await updateDoc(dealRef, { documents: arrayUnion(docMetadata), lastUpdated: serverTimestamp() });
    } catch (error: any) {
      if (error.code === 'storage/unauthorized') throw new Error("Permission denied. Check rules.");
      throw new Error(`Upload failed: ${error.message}`);
    }
  },

  deleteDocument: async (dealId: string, documentId: string) => {
    checkDbConnection();
    try {
      const dealRef = doc(db!, 'deals', dealId);
      const dealSnap = await getDoc(dealRef);
      if (!dealSnap.exists()) throw new Error(`Deal not found`);

      const dealData = dealSnap.data();
      const docs = Array.isArray(dealData.documents) ? dealData.documents : [];
      const docToDelete = docs.find((d: any) => d.id === documentId);
      
      if (docToDelete && docToDelete.storagePath && storage) {
        try { await deleteObject(ref(storage, docToDelete.storagePath)); } catch (e) {}
      }

      await updateDoc(dealRef, { documents: arrayRemove(docToDelete), lastUpdated: serverTimestamp() });
    } catch (error: any) {
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  },

  getTasks: async (userId: string) => {
    checkDbConnection();
    const q = query(collection(db!, 'tasks'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as Task[];
  },

  saveTask: async (task: Task) => {
    checkDbConnection();
    if (task.id) {
       await setDoc(doc(db!, 'tasks', task.id), task, { merge: true });
    } else {
       await addDoc(collection(db!, 'tasks'), task);
    }
    await api.recalcUserStats(task.userId);
  },

  saveLeadLog: async (log: LeadGenLog) => {
    checkDbConnection();
    const { id, ...rest } = log;
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
    const { id, ...rest } = calc;
    await addDoc(collection(db!, 'mortgageCalculations'), { ...rest, timestamp: serverTimestamp() });
  },

  getCalculations: async (userId: string) => {
    checkDbConnection();
    const q = query(collection(db!, 'mortgageCalculations'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const calcs = snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as MortgageCalculation[];
    return calcs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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
