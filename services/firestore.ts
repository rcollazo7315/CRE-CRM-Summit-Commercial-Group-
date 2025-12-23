import { 
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, serverTimestamp, Timestamp, writeBatch, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, updateProfile, updatePassword
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
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

const checkDb = () => { if (!db || !auth) throw new Error("Database disconnected."); };

export const api = {
  login: async (email: string, password: string) => {
    checkDb();
    const cred = await signInWithEmailAndPassword(auth!, email, password);
    const snap = await getDoc(doc(db!, 'users', cred.user.uid));
    const data = convertTimestamps(snap.data()) as UserAccount;
    if (data.status === 'denied') { await signOut(auth!); throw new Error('Access denied.'); }
    await updateDoc(doc(db!, 'users', cred.user.uid), { lastLogin: serverTimestamp() });
    return { ...data, id: cred.user.uid };
  },

  register: async (userData: any) => {
    checkDb();
    const cred = await createUserWithEmailAndPassword(auth!, userData.email, userData.passwordHash);
    await updateProfile(cred.user, { displayName: `${userData.firstName} ${userData.lastName}` });
    const newUser = {
      email: userData.email, firstName: userData.firstName, lastName: userData.lastName, phone: userData.phone,
      role: 'agent', status: 'pending', avatar: `https://ui-avatars.com/api/?name=${userData.firstName}+${userData.lastName}&background=random`,
      notifications: {
        email: { dealUpdates: true, taskReminders: true, newMessages: true, systemAlerts: true },
        sms: { dealUpdates: false, taskReminders: false, newMessages: false, systemAlerts: false }
      },
      stats: { totalDeals: 0, totalCommissions: 0, activeDeals: 0, closedDeals: 0, pendingTasks: 0, totalVolume: 0 },
      createdAt: serverTimestamp()
    };
    await setDoc(doc(db!, 'users', cred.user.uid), newUser);
    return { ...newUser, id: cred.user.uid };
  },

  logout: () => auth && signOut(auth),

  getCurrentUser: async (uid: string) => {
    checkDb();
    const snap = await getDoc(doc(db!, 'users', uid));
    return snap.exists() ? convertTimestamps({ id: snap.id, ...snap.data() }) : null;
  },

  updateUserProfile: async (userId: string, updates: Partial<UserAccount>) => {
    checkDb();
    const userRef = doc(db!, 'users', userId);
    await updateDoc(userRef, { ...updates, updatedAt: serverTimestamp() });
    const snap = await getDoc(userRef);
    return convertTimestamps({ id: snap.id, ...snap.data() }) as UserAccount;
  },

  updateUserPassword: async (newPassword: string) => {
    checkDb();
    if (auth?.currentUser) await updatePassword(auth.currentUser, newPassword);
  },

  getDeals: async (userId: string, isAdmin = false) => {
    checkDb();
    const q = isAdmin ? query(collection(db!, 'deals'), orderBy('lastUpdated', 'desc')) : query(collection(db!, 'deals'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as Deal[];
  },

  saveDeal: async (deal: Deal) => {
    checkDb();
    const data = { ...deal, lastUpdated: serverTimestamp() };
    if (deal.id && deal.id.length > 5) await updateDoc(doc(db!, 'deals', deal.id), data);
    else await addDoc(collection(db!, 'deals'), { ...data, createdAt: serverTimestamp() });
    await api.recalcUserStats(deal.userId);
  },

  deleteDeal: async (dealId: string, userId: string) => {
    checkDb();
    try {
      const dealRef = doc(db!, 'deals', dealId);
      const snap = await getDoc(dealRef);
      if (!snap.exists()) return;

      const dealData = snap.data();

      // 1. Delete associated tasks
      const tasksQuery = query(collection(db!, 'tasks'), where('dealId', '==', dealId));
      const tasksSnap = await getDocs(tasksQuery);
      if (!tasksSnap.empty) {
        const batch = writeBatch(db!);
        tasksSnap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }

      // 2. Delete associated documents from Storage
      const docs = dealData.documents || [];
      if (docs.length > 0 && storage) {
        for (const d of docs) {
          if (d.storagePath) {
            try { 
              await deleteObject(ref(storage, d.storagePath)); 
            } catch (e) {
              console.error(`Failed to delete storage item ${d.storagePath}:`, e);
            }
          }
        }
      }

      // 3. Delete deal document
      await deleteDoc(dealRef);

      // 4. Refresh totals
      await api.recalcUserStats(userId);
    } catch (error: any) {
      console.error("Critical error in deleteDeal:", error);
      throw new Error(`Deletion failed: ${error.message}`);
    }
  },

  adminHardReset: async () => {
    checkDb();
    const deals = await getDocs(collection(db!, 'deals'));
    for (const d of deals.docs) {
      const data = d.data();
      if (storage && data.documents) {
        for (const f of data.documents) if (f.storagePath) try { await deleteObject(ref(storage, f.storagePath)); } catch (e) {}
      }
      await deleteDoc(d.ref);
    }
    const collections = ['contacts', 'tasks', 'leadLogs', 'mortgageCalculations'];
    for (const c of collections) {
      const snap = await getDocs(collection(db!, c));
      const batch = writeBatch(db!);
      snap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    const users = await getDocs(collection(db!, 'users'));
    const userBatch = writeBatch(db!);
    users.docs.forEach(u => userBatch.update(u.ref, { stats: { totalDeals: 0, totalCommissions: 0, activeDeals: 0, closedDeals: 0, pendingTasks: 0, totalVolume: 0 } }));
    await userBatch.commit();
  },

  recalcUserStats: async (userId: string) => {
    const deals = await api.getDeals(userId);
    const tasks = await api.getTasks(userId);
    const stats = {
      totalDeals: deals.length,
      totalCommissions: deals.filter(d => d.status === 'Completed').reduce((acc, d) => acc + (d.commission || (d.askingPrice * 0.03)), 0),
      activeDeals: deals.filter(d => d.status !== 'Completed' && d.status !== 'Archived').length,
      closedDeals: deals.filter(d => d.status === 'Completed').length,
      totalVolume: deals.filter(d => d.status === 'Completed').reduce((acc, d) => acc + d.askingPrice, 0),
      pendingTasks: tasks.filter(t => t.status === 'pending').length 
    };
    await updateDoc(doc(db!, 'users', userId), { stats });
  },

  getUsers: async () => {
    checkDb();
    const snap = await getDocs(query(collection(db!, 'users'), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as UserAccount[];
  },

  updateUserStatus: async (userId: string, status: string) => {
    checkDb();
    await updateDoc(doc(db!, 'users', userId), { status });
  },

  deleteUser: async (userId: string) => {
    checkDb();
    await deleteDoc(doc(db!, 'users', userId));
  },

  getTasks: async (userId: string) => {
    checkDb();
    const snap = await getDocs(query(collection(db!, 'tasks'), where('userId', '==', userId)));
    return snap.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as Task[];
  },

  saveTask: async (task: Task) => {
    checkDb();
    if (task.id) await setDoc(doc(db!, 'tasks', task.id), task, { merge: true });
    else await addDoc(collection(db!, 'tasks'), task);
    await api.recalcUserStats(task.userId);
  },

  getLeadLogs: async (userId: string) => {
    checkDb();
    const snap = await getDocs(query(collection(db!, 'leadLogs'), where('userId', '==', userId)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as LeadGenLog[];
  },

  saveLeadLog: async (log: LeadGenLog) => {
    checkDb();
    if (log.id) await setDoc(doc(db!, 'leadLogs', log.id), log, { merge: true });
    else await addDoc(collection(db!, 'leadLogs'), log);
  },

  deleteLeadLog: async (id: string) => {
    checkDb();
    await deleteDoc(doc(db!, 'leadLogs', id));
  },

  getCalculations: async (userId: string) => {
    checkDb();
    const snap = await getDocs(query(collection(db!, 'mortgageCalculations'), where('userId', '==', userId)));
    return snap.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as MortgageCalculation[];
  },

  saveCalculation: async (calc: MortgageCalculation) => {
    checkDb();
    await addDoc(collection(db!, 'mortgageCalculations'), { ...calc, timestamp: serverTimestamp() });
  },

  saveDocument: async (dealId: string, document: DocumentFile, fileData?: Blob | File) => {
    checkDb();
    if (!storage || !fileData) throw new Error("Storage missing.");
    const path = `deals/${dealId}/${Date.now()}_${document.name}`;
    const sRef = ref(storage, path);
    await uploadBytes(sRef, fileData);
    const url = await getDownloadURL(sRef);
    await updateDoc(doc(db!, 'deals', dealId), { 
      documents: arrayUnion({ ...document, url, storagePath: path, uploadDate: new Date().toISOString() }), 
      lastUpdated: serverTimestamp() 
    });
  },

  deleteDocument: async (dealId: string, documentId: string) => {
    checkDb();
    const dealRef = doc(db!, 'deals', dealId);
    const snap = await getDoc(dealRef);
    if (!snap.exists()) return;
    const docToDelete = (snap.data().documents || []).find((d: any) => d.id === documentId);
    if (docToDelete?.storagePath && storage) try { await deleteObject(ref(storage, docToDelete.storagePath)); } catch (e) {}
    await updateDoc(dealRef, { documents: arrayRemove(docToDelete), lastUpdated: serverTimestamp() });
  },

  getContacts: async (userId: string, isAdmin = false) => {
    checkDb();
    const q = isAdmin ? collection(db!, 'contacts') : query(collection(db!, 'contacts'), where('userId', '==', userId));
    const snap = await getDocs(q as any);
    return snap.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as Contact[];
  },

  saveContact: async (contact: Contact) => {
    checkDb();
    if (contact.id) await setDoc(doc(db!, 'contacts', contact.id), contact, { merge: true });
    else await addDoc(collection(db!, 'contacts'), contact);
  },

  deleteContact: async (id: string) => {
    checkDb();
    await deleteDoc(doc(db!, 'contacts', id));
  },

  addContactInteraction: async (contactId: string, interaction: ContactInteraction) => {
    checkDb();
    await updateDoc(doc(db!, 'contacts', contactId), { interactions: arrayUnion(interaction), lastContactedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  },

  linkContactToDeal: async (contactId: string, dealId: string) => {
    checkDb();
    await updateDoc(doc(db!, 'contacts', contactId), { linkedDealIds: arrayUnion(dealId), updatedAt: serverTimestamp() });
  },

  unlinkContactFromDeal: async (contactId: string, dealId: string) => {
    checkDb();
    await updateDoc(doc(db!, 'contacts', contactId), { linkedDealIds: arrayRemove(dealId), updatedAt: serverTimestamp() });
  },
};