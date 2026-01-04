
import { UserAccount, Deal, Task, LeadGenLog, DealStatus, PropertyType, MortgageCalculation, Contact, ContactInteraction, DocumentFile } from '../types.ts';

// Storage Keys
const USERS_KEY = 'summit_users';
const DEALS_KEY = 'summit_deals';
const TASKS_KEY = 'summit_tasks';
const LOGS_KEY = 'summit_lead_logs';
const CALCULATIONS_KEY = 'summit_mortgage_calculations';
const CONTACTS_KEY = 'summit_contacts';
const SESSION_KEY = 'summit_session_uid';

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper for safe JSON stringification (prevents circular reference errors)
const safeStringify = (obj: any) => {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return '[Circular]';
      }
      // Avoid serializing DOM nodes which can cause crashes
      if (typeof Node !== 'undefined' && value instanceof Node) {
        return '[DOM Object]';
      }
      cache.add(value);
    }
    return value;
  });
};

// --- Seed Data ---
const SEED_ADMIN: UserAccount = {
  id: 'admin-1',
  username: 'raphael',
  email: 'raphael@sumcg.com',
  passwordHash: 'sumcg123!!', 
  firstName: 'Raphael',
  lastName: 'Admin',
  phone: '555-0123',
  role: 'admin',
  status: 'active',
  avatar: 'https://ui-avatars.com/api/?name=Raphael+Admin&background=0f172a&color=fff',
  notifications: {
    email: { dealUpdates: true, taskReminders: true, newMessages: true, systemAlerts: true },
    sms: { dealUpdates: false, taskReminders: false, newMessages: false, systemAlerts: true }
  },
  stats: { totalDeals: 0, totalCommissions: 0, activeDeals: 0, closedDeals: 0, pendingTasks: 0, totalVolume: 0 },
  createdAt: new Date().toISOString()
};

// Initialize Storage if empty
const initStorage = () => {
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, safeStringify([SEED_ADMIN]));
  }
  if (!localStorage.getItem(DEALS_KEY)) localStorage.setItem(DEALS_KEY, safeStringify([]));
  if (!localStorage.getItem(TASKS_KEY)) localStorage.setItem(TASKS_KEY, safeStringify([]));
  if (!localStorage.getItem(LOGS_KEY)) localStorage.setItem(LOGS_KEY, safeStringify([]));
  if (!localStorage.getItem(CALCULATIONS_KEY)) localStorage.setItem(CALCULATIONS_KEY, safeStringify([]));
  if (!localStorage.getItem(CONTACTS_KEY)) localStorage.setItem(CONTACTS_KEY, safeStringify([]));
};

initStorage();

export const mockApi = {
  // Auth & User Management
  register: async (userData: any) => {
    await delay(800);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    
    if (users.find((u: UserAccount) => u.email.toLowerCase() === userData.email.toLowerCase())) {
      throw new Error('Email already registered');
    }

    const newUser: UserAccount = {
      id: Math.random().toString(36).substr(2, 9),
      ...userData,
      role: 'agent',
      status: 'active', // Auto-approve in mock mode for ease of use
      avatar: `https://ui-avatars.com/api/?name=${userData.firstName}+${userData.lastName}&background=random`,
      company: 'Summit Commercial Group',
      notifications: {
        email: { dealUpdates: true, taskReminders: true, newMessages: true, systemAlerts: true },
        sms: { dealUpdates: false, taskReminders: true, newMessages: false, systemAlerts: false }
      },
      stats: { totalDeals: 0, totalCommissions: 0, activeDeals: 0, closedDeals: 0, pendingTasks: 0, totalVolume: 0 },
      gmailIntegration: { connected: false },
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem(USERS_KEY, safeStringify(users));
    localStorage.setItem(SESSION_KEY, newUser.id);
    return newUser;
  },

  login: async (email: string, password: string): Promise<UserAccount> => {
    await delay(600);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const user = users.find((u: UserAccount) => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === password);
    
    if (!user) throw new Error('Invalid credentials. (Try raphael@sumcg.com / sumcg123!!)');
    
    user.lastLogin = new Date().toISOString();
    const updatedUsers = users.map((u: UserAccount) => u.id === user.id ? user : u);
    localStorage.setItem(USERS_KEY, safeStringify(updatedUsers));
    localStorage.setItem(SESSION_KEY, user.id);

    if (user.status === 'denied') throw new Error('Account request denied.');

    return user;
  },

  logout: async () => { 
    localStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser: async (uid: string) => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    return users.find((u: UserAccount) => u.id === uid) || null;
  },

  getSession: async () => {
    const uid = localStorage.getItem(SESSION_KEY);
    if(uid) return mockApi.getCurrentUser(uid);
    return null;
  },

  updateUserProfile: async (userId: string, updates: Partial<UserAccount>) => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const idx = users.findIndex((u: UserAccount) => u.id === userId);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updates };
      localStorage.setItem(USERS_KEY, safeStringify(users));
      return users[idx];
    }
    throw new Error('User not found');
  },

  updateUserPassword: async (newPassword: string) => {
    const uid = localStorage.getItem(SESSION_KEY);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const idx = users.findIndex((u: UserAccount) => u.id === uid);
    if (idx !== -1) {
        users[idx].passwordHash = newPassword;
        localStorage.setItem(USERS_KEY, safeStringify(users));
    }
  },

  getUsers: async () => {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  },

  updateUserStatus: async (userId: string, status: 'active' | 'denied') => {
    await delay(400);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const idx = users.findIndex((u: UserAccount) => u.id === userId);
    if (idx !== -1) {
      users[idx].status = status;
      if (status === 'active') {
        users[idx].approvedAt = new Date().toISOString();
      }
      localStorage.setItem(USERS_KEY, safeStringify(users));
    }
  },

  deleteUser: async (userId: string) => {
    let users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    users = users.filter((u: UserAccount) => u.id !== userId);
    localStorage.setItem(USERS_KEY, safeStringify(users));
  },

  // Deals
  getDeals: async (userId: string, isAdmin = false) => {
    const allDeals = JSON.parse(localStorage.getItem(DEALS_KEY) || '[]');
    if (isAdmin) return allDeals;
    return allDeals.filter((d: Deal) => d.userId === userId);
  },

  saveDeal: async (deal: Deal) => {
    const deals = JSON.parse(localStorage.getItem(DEALS_KEY) || '[]');
    const idx = deals.findIndex((d: Deal) => d.id === deal.id);
    const dealWithMeta = { ...deal, lastUpdated: new Date().toISOString(), createdAt: deal.createdAt || new Date().toISOString() };
    
    if (idx >= 0) {
      deals[idx] = dealWithMeta;
    } else {
      deals.unshift(dealWithMeta);
    }
    localStorage.setItem(DEALS_KEY, safeStringify(deals));
    await mockApi.recalcUserStats(deal.userId);
  },

  deleteDeal: async (dealId: string, userId: string) => {
    let deals = JSON.parse(localStorage.getItem(DEALS_KEY) || '[]');
    deals = deals.filter((d: Deal) => d.id !== dealId);
    localStorage.setItem(DEALS_KEY, safeStringify(deals));
    await mockApi.recalcUserStats(userId);
  },

  // Tasks
  getTasks: async (userId: string) => {
    const tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
    return tasks.filter((t: Task) => t.userId === userId);
  },

  saveTask: async (task: Task) => {
    const tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
    const idx = tasks.findIndex((t: Task) => t.id === task.id);
    if (idx >= 0) {
      tasks[idx] = task;
    } else {
      tasks.push(task);
    }
    localStorage.setItem(TASKS_KEY, safeStringify(tasks));
    await mockApi.recalcUserStats(task.userId);
  },

  deleteTask: async (taskId: string, userId: string) => {
    let tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
    tasks = tasks.filter((t: Task) => t.id !== taskId);
    localStorage.setItem(TASKS_KEY, safeStringify(tasks));
    // Assuming tasks have userId, if not, we can't recalc easily
  },

  // Contacts
  getContacts: async (userId: string, isAdmin = false) => {
    const contacts = JSON.parse(localStorage.getItem(CONTACTS_KEY) || '[]');
    if (isAdmin) return contacts;
    return contacts.filter((c: Contact) => c.userId === userId);
  },

  saveContact: async (contact: Contact) => {
    const contacts = JSON.parse(localStorage.getItem(CONTACTS_KEY) || '[]');
    const idx = contacts.findIndex((c: Contact) => c.id === contact.id);
    if (idx >= 0) contacts[idx] = contact;
    else contacts.push(contact);
    localStorage.setItem(CONTACTS_KEY, safeStringify(contacts));
  },

  deleteContact: async (contactId: string) => {
    let contacts = JSON.parse(localStorage.getItem(CONTACTS_KEY) || '[]');
    contacts = contacts.filter((c: Contact) => c.id !== contactId);
    localStorage.setItem(CONTACTS_KEY, safeStringify(contacts));
  },

  addContactInteraction: async (contactId: string, interaction: ContactInteraction) => {
    const contacts = JSON.parse(localStorage.getItem(CONTACTS_KEY) || '[]');
    const idx = contacts.findIndex((c: Contact) => c.id === contactId);
    if (idx >= 0) {
      if(!contacts[idx].interactions) contacts[idx].interactions = [];
      contacts[idx].interactions.push(interaction);
      contacts[idx].lastContactedAt = new Date().toISOString();
      localStorage.setItem(CONTACTS_KEY, safeStringify(contacts));
    }
  },

  linkContactToDeal: async (contactId: string, dealId: string) => {
    const contacts = JSON.parse(localStorage.getItem(CONTACTS_KEY) || '[]');
    const idx = contacts.findIndex((c: Contact) => c.id === contactId);
    if (idx >= 0) {
      if(!contacts[idx].linkedDealIds) contacts[idx].linkedDealIds = [];
      if(!contacts[idx].linkedDealIds.includes(dealId)) {
        contacts[idx].linkedDealIds.push(dealId);
        localStorage.setItem(CONTACTS_KEY, safeStringify(contacts));
      }
    }
  },

  unlinkContactFromDeal: async (contactId: string, dealId: string) => {
    const contacts = JSON.parse(localStorage.getItem(CONTACTS_KEY) || '[]');
    const idx = contacts.findIndex((c: Contact) => c.id === contactId);
    if (idx >= 0 && contacts[idx].linkedDealIds) {
      contacts[idx].linkedDealIds = contacts[idx].linkedDealIds.filter((id: string) => id !== dealId);
      localStorage.setItem(CONTACTS_KEY, safeStringify(contacts));
    }
  },

  // Documents (Mock)
  saveDocument: async (dealId: string, document: DocumentFile, fileData?: Blob | File) => {
    await delay(500);
    const deals = JSON.parse(localStorage.getItem(DEALS_KEY) || '[]');
    const idx = deals.findIndex((d: Deal) => d.id === dealId);
    if (idx >= 0) {
      if(!deals[idx].documents) deals[idx].documents = [];
      const docWithUrl = {
        ...document,
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' // Fake URL
      };
      deals[idx].documents.push(docWithUrl);
      localStorage.setItem(DEALS_KEY, safeStringify(deals));
    }
  },

  deleteDocument: async (dealId: string, documentId: string) => {
    const deals = JSON.parse(localStorage.getItem(DEALS_KEY) || '[]');
    const idx = deals.findIndex((d: Deal) => d.id === dealId);
    if (idx >= 0 && deals[idx].documents) {
      deals[idx].documents = deals[idx].documents.filter((d: DocumentFile) => d.id !== documentId);
      localStorage.setItem(DEALS_KEY, safeStringify(deals));
    }
  },

  // Lead Gen Logs
  getLeadLogs: async (userId: string) => {
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    return logs.filter((l: LeadGenLog) => l.userId === userId);
  },

  saveLeadLog: async (log: LeadGenLog) => {
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    const idx = logs.findIndex((l: LeadGenLog) => l.id === log.id);
    if (idx >= 0) logs[idx] = log;
    else logs.push(log);
    localStorage.setItem(LOGS_KEY, safeStringify(logs));
  },

  deleteLeadLog: async (logId: string) => {
    let logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    logs = logs.filter((l: LeadGenLog) => l.id !== logId);
    localStorage.setItem(LOGS_KEY, safeStringify(logs));
  },

  // Mortgage Calculator
  saveCalculation: async (calc: MortgageCalculation) => {
    await delay(300);
    const calcs = JSON.parse(localStorage.getItem(CALCULATIONS_KEY) || '[]');
    calcs.push(calc);
    localStorage.setItem(CALCULATIONS_KEY, safeStringify(calcs));
    return calc;
  },

  getCalculations: async (userId: string) => {
    await delay(300);
    const calcs = JSON.parse(localStorage.getItem(CALCULATIONS_KEY) || '[]');
    return calcs.filter((c: MortgageCalculation) => c.userId === userId).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  adminHardReset: async () => {
    localStorage.removeItem(DEALS_KEY);
    localStorage.removeItem(TASKS_KEY);
    localStorage.removeItem(LOGS_KEY);
    localStorage.removeItem(CALCULATIONS_KEY);
    localStorage.removeItem(CONTACTS_KEY);
    initStorage();
  },

  recalcUserStats: async (userId: string) => {
    const deals = await mockApi.getDeals(userId);
    const tasks = await mockApi.getTasks(userId);
    
    // Calculate deals by source
    const closedDeals = deals.filter(d => d.status === DealStatus.COMPLETED);
    const dealsBySource: Record<string, number> = {};
    const revenueBySource: Record<string, number> = {};
    
    closedDeals.forEach(deal => {
      const source = deal.leadSource || 'other';
      dealsBySource[source] = (dealsBySource[source] || 0) + 1;
      revenueBySource[source] = (revenueBySource[source] || 0) + (deal.closingPrice || deal.askingPrice);
    });

    const stats = {
      totalDeals: deals.length,
      totalCommissions: closedDeals.reduce((acc, d) => acc + (d.commission || (d.askingPrice * 0.03)), 0),
      activeDeals: deals.filter(d => d.status !== 'Completed' && d.status !== 'Archived').length,
      closedDeals: closedDeals.length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
      totalVolume: closedDeals.reduce((acc, d) => acc + d.askingPrice, 0),
      dealsBySource,
      revenueBySource
    };

    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const idx = users.findIndex((u: UserAccount) => u.id === userId);
    if (idx !== -1) {
      users[idx].stats = stats;
      localStorage.setItem(USERS_KEY, safeStringify(users));
    }
  }
};
