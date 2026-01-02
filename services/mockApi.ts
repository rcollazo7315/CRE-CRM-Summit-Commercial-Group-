import { UserAccount, Deal, Task, LeadGenLog, DealStatus, PropertyType, MortgageCalculation } from '../types.ts';

// Storage Keys
const USERS_KEY = 'summit_users';
const DEALS_KEY = 'summit_deals';
const TASKS_KEY = 'summit_tasks';
const LOGS_KEY = 'summit_lead_logs';
const CALCULATIONS_KEY = 'summit_mortgage_calculations';

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Seed Data ---
// Raphael's Admin Account
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
    localStorage.setItem(USERS_KEY, JSON.stringify([SEED_ADMIN]));
  }
  // Initialize other collections if not present
  if (!localStorage.getItem(DEALS_KEY)) localStorage.setItem(DEALS_KEY, JSON.stringify([]));
  if (!localStorage.getItem(TASKS_KEY)) localStorage.setItem(TASKS_KEY, JSON.stringify([]));
  if (!localStorage.getItem(LOGS_KEY)) localStorage.setItem(LOGS_KEY, JSON.stringify([]));
  if (!localStorage.getItem(CALCULATIONS_KEY)) localStorage.setItem(CALCULATIONS_KEY, JSON.stringify([]));
};

initStorage();

// --- API Service ---

export const mockApi = {
  // Auth & User Management
  register: async (userData: any) => {
    await delay(800);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    
    // Check duplication
    if (users.find((u: UserAccount) => u.email.toLowerCase() === userData.email.toLowerCase())) {
      throw new Error('Email already registered');
    }

    const newUser: UserAccount = {
      id: Math.random().toString(36).substr(2, 9),
      ...userData,
      role: 'agent', // Default role for registration
      status: 'pending', // Pending approval required
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
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return newUser;
  },

  login: async (email: string, password: string): Promise<UserAccount> => {
    await delay(600);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const user = users.find((u: UserAccount) => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === password);
    
    if (!user) throw new Error('Invalid credentials');
    
    // Update last login
    user.lastLogin = new Date().toISOString();
    // Persist last login update
    const updatedUsers = users.map((u: UserAccount) => u.id === user.id ? user : u);
    localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));

    if (user.status === 'pending') throw new Error('Account pending admin approval.');
    if (user.status === 'denied') throw new Error('Account request denied.');

    return user;
  },

  getUsers: async () => {
    // Admin only function typically
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
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  },

  updateUserProfile: async (userId: string, updates: Partial<UserAccount>) => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const idx = users.findIndex((u: UserAccount) => u.id === userId);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updates };
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      return users[idx];
    }
    throw new Error('User not found');
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
    if (idx >= 0) {
      deals[idx] = deal;
    } else {
      deals.unshift(deal);
    }
    localStorage.setItem(DEALS_KEY, JSON.stringify(deals));
    
    // Update User Stats
    await mockApi.recalcUserStats(deal.userId);
  },

  deleteDeal: async (dealId: string, userId: string) => {
    let deals = JSON.parse(localStorage.getItem(DEALS_KEY) || '[]');
    deals = deals.filter((d: Deal) => d.id !== dealId);
    localStorage.setItem(DEALS_KEY, JSON.stringify(deals));
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
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    await mockApi.recalcUserStats(task.userId);
  },

  deleteTask: async (taskId: string, userId: string) => {
    let tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
    tasks = tasks.filter((t: Task) => t.id !== taskId);
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    await mockApi.recalcUserStats(userId);
  },

  // Mortgage Calculator
  saveCalculation: async (calc: MortgageCalculation) => {
    await delay(300);
    const calcs = JSON.parse(localStorage.getItem(CALCULATIONS_KEY) || '[]');
    calcs.push(calc);
    localStorage.setItem(CALCULATIONS_KEY, JSON.stringify(calcs));
    return calc;
  },

  getCalculations: async (userId: string) => {
    await delay(300);
    const calcs = JSON.parse(localStorage.getItem(CALCULATIONS_KEY) || '[]');
    // Filter for this user
    return calcs.filter((c: MortgageCalculation) => c.userId === userId).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  // Internal Logic
  recalcUserStats: async (userId: string) => {
    const deals = await mockApi.getDeals(userId);
    const tasks = await mockApi.getTasks(userId);
    
    const stats = {
      totalDeals: deals.length,
      // Simple logic: 3% comm on closed deals
      totalCommissions: deals.filter((d: Deal) => d.status === DealStatus.COMPLETED).reduce((acc: number, d: Deal) => acc + (d.askingPrice * 0.03), 0),
      activeDeals: deals.filter((d: Deal) => d.status !== DealStatus.COMPLETED && d.status !== DealStatus.ARCHIVED).length,
      closedDeals: deals.filter((d: Deal) => d.status === DealStatus.COMPLETED).length,
      pendingTasks: tasks.filter((t: Task) => t.status === 'pending').length,
      totalVolume: deals.filter((d: Deal) => d.status === DealStatus.COMPLETED).reduce((acc: number, d: Deal) => acc + d.askingPrice, 0),
    };

    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const idx = users.findIndex((u: UserAccount) => u.id === userId);
    if (idx !== -1) {
      users[idx].stats = stats;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  }
};