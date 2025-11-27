
import { 
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, serverTimestamp, Timestamp, writeBatch 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { db, auth } from '../firebase/config';
import { UserAccount, Deal, Task, LeadGenLog, MortgageCalculation } from '../types';

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
    throw new Error("Database connecting... If this persists, refresh the page.");
  }
};

export const api = {
  // --- AUTH & USER ---

  register: async (userData: any) => {
    checkDbConnection();
    // 1. Create Auth User
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.passwordHash);
    const uid = userCredential.user.uid;

    await updateProfile(userCredential.user, {
      displayName: `${userData.firstName} ${userData.lastName}`
    });

    // 2. Create Firestore User Doc
    const newUser: UserAccount = {
      id: uid,
      username: userData.username,
      email: userData.email,
      passwordHash: 'PROTECTED', // Don't store actual hash in DB if using Firebase Auth
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      role: 'agent',
      status: 'pending', // Requires approval
      avatar: `https://ui-avatars.com/api/?name=${userData.firstName}+${userData.lastName}&background=random`,
      notifications: {
        email: { dealUpdates: true, taskReminders: true, newMessages: true, systemAlerts: true },
        sms: { dealUpdates: false, taskReminders: true, newMessages: false, systemAlerts: false }
      },
      stats: { totalDeals: 0, totalCommissions: 0, activeDeals: 0, closedDeals: 0, pendingTasks: 0, totalVolume: 0 },
      gmailIntegration: { connected: false },
      createdAt: new Date().toISOString()
    };

    // Save using server timestamp for creation
    await setDoc(doc(db, 'users', uid), {
      ...newUser,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return newUser;
  },

  login: async (email: string, password: string) => {
    checkDbConnection();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    // Fetch profile
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) throw new Error('User profile not found. Please contact admin.');
    
    const userData = convertTimestamps(userDoc.data()) as UserAccount;
    
    if (userData.status === 'denied') {
      await signOut(auth);
      throw new Error('Account request denied.');
    }
    
    // Allow login for 'pending' so they can see the pending screen, 
    // but app logic will block access to dashboard.
    
    // Update last login
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

  // --- USERS (ADMIN) ---

  getUsers: async () => {
    checkDbConnection();
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as UserAccount[];
  },

  updateUserStatus: async (userId: string, status: 'active' | 'denied') => {
    checkDbConnection();
    await updateDoc(doc(db, 'users', userId), {
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
      q = query(collection(db, 'deals'), where('userId', '==', userId)); // Client-side sort if index missing
    }
    
    const snapshot = await getDocs(q);
    const deals = snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as Deal[];
    
    // Sort client side to avoid complex index requirements during setup
    return deals.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
  },

  saveDeal: async (deal: Deal) => {
    checkDbConnection();
    const dealData = {
      ...deal,
      lastUpdated: serverTimestamp()
    };

    if (deal.id && deal.id.length > 10) { 
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
    const q = query(collection(db, 'mortgageCalculations'), where('userId', '==', userId), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => convertTimestamps({ id: d.id, ...d.data() })) as MortgageCalculation[];
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
