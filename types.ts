
export enum DealStatus {
  ACTIVE = 'Active',
  UNDER_REVIEW = 'Under Review',
  NEGOTIATING = 'Negotiating',
  CLOSING = 'Closing',
  COMPLETED = 'Completed',
  ARCHIVED = 'Archived'
}

export enum PropertyType {
  OFFICE = 'Office',
  RETAIL = 'Retail',
  INDUSTRIAL = 'Industrial',
  MULTIFAMILY = 'Multifamily',
  LAND = 'Land'
}

export type AccountStatus = 'pending' | 'active' | 'denied';
export type UserRole = 'admin' | 'agent';

export interface NotificationPreferences {
  dealUpdates: boolean;
  taskReminders: boolean;
  newMessages: boolean;
  systemAlerts: boolean;
}

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  status: AccountStatus;
  avatar: string;
  bio?: string;
  position?: string;
  company?: string;
  experience?: number;
  licenseNumber?: string;
  specialties?: string[];
  gmailIntegration?: {
    connected: boolean;
    connectedAt?: string;
    accessToken?: string;
    refreshToken?: string;
  };
  notifications: {
    email: NotificationPreferences;
    sms: NotificationPreferences;
  };
  stats?: {
    totalDeals: number;
    totalCommissions: number;
    activeDeals: number;
    closedDeals: number;
    pendingTasks: number;
    totalVolume: number;
  };
  createdAt: string;
  approvedAt?: string;
  lastLogin?: string;
}

export interface OwnerInfo {
  name: string;
  email: string;
  phone: string;
  notes?: string;
}

export interface DocumentFile {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  dealId?: string;
  url?: string;
}

export interface Deal {
  id: string;
  userId: string; // Associated Agent
  propertyAddress: string;
  propertyType: PropertyType;
  askingPrice: number;
  offersReceived: number;
  highestOffer: number;
  status: DealStatus;
  daysOnMarket: number;
  lastUpdated: string;
  imageUrl: string;
  owner: OwnerInfo;
  description: string;
  documents: DocumentFile[];
  notes?: string;
  commission?: number;
  closedDate?: string;
  createdAt: string;
}

export type TaskType = 'call' | 'email' | 'follow-up' | 'meeting' | 'proposal' | 'site-visit' | 'document' | 'other';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  userId: string;
  dealId?: string; // Optional linkage to a deal
  dealAddress?: string; // Denormalized for easy display
  title: string;
  description?: string;
  type: TaskType;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:MM
  priority: TaskPriority;
  status: 'pending' | 'completed' | 'cancelled' | 'overdue';
  completedAt?: string;
  notes?: string;
  reminderSent?: boolean;
  reminderTime?: number; // minutes before
}

export interface ActivityLog {
  id: string;
  type: 'offer' | 'status' | 'document' | 'message';
  description: string;
  timestamp: string;
  dealId?: string;
  userId: string;
}

export interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  preview: string;
  date: string;
  read: boolean;
  userId: string;
}

export interface LeadGenLog {
  id: string;
  userId: string;
  date: string;
  callsMade: number;
  lettersSent: number;
  socialPosts: number;
  targetedEmails: number;
  networkingEvents: number;
  clientMeetings: number;
  referralsGenerated: number;
  propertyTours: number;
  bovsSubmitted: number;
  listingsSigned: number;
  offersMade: number;
  underContract: number;
  closedDeals: number;
  closedAmount: number;
  notes?: string;
}

export interface MortgageCalculation {
  id: string;
  userId: string;
  timestamp: string;
  loanAmount: number;
  interestRate: number;
  loanTermYears: number;
  annualTax: number;
  annualInsurance: number;
  annualHOA: number;
  monthlyPayment: number;
  totalCostOfLoan: number;
  propertyValue?: number;
  annualNOI?: number;
  notes?: string;
}
