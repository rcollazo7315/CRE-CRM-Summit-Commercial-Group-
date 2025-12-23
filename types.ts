
export interface UserAccount {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'admin' | 'agent' | 'user';
  status: 'active' | 'pending' | 'inactive' | 'denied';
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
  avatar?: string;
  profileImage?: string;
  company?: string;
  // Fix: Add missing properties for authentication and user profile management
  username?: string;
  passwordHash?: string;
  bio?: string;
  notifications: {
    email: { dealUpdates: boolean; taskReminders: boolean; newMessages: boolean; systemAlerts: boolean };
    sms: { dealUpdates: boolean; taskReminders: boolean; newMessages: boolean; systemAlerts: boolean };
  };
  stats?: {
    totalDeals: number;
    totalCommissions: number;
    activeDeals: number;
    closedDeals: number;
    pendingTasks: number;
    totalVolume: number;
  };
  gmailIntegration?: { connected: boolean; connectedAt?: string };
}

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
  LAND = 'Land',
  OTHER = 'Other'
}

export interface Deal {
  id: string;
  userId: string;
  propertyAddress: string;
  propertyType: PropertyType;
  status: DealStatus | string;
  askingPrice: number;
  highestOffer: number;
  offersReceived: number;
  description?: string;
  notes?: string;
  imageUrl?: string;
  owner: { name: string; email: string; phone: string };
  lastUpdated: string;
  createdAt: string;
  documents?: DocumentFile[];
  // Fix: Add missing financial and tracking fields
  commission?: number;
  daysOnMarket?: number;
  closedDate?: string;
}

// Fix: Export TaskPriority and TaskType for use in TaskModal
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = 'call' | 'email' | 'follow-up' | 'meeting' | 'proposal' | 'site-visit' | 'document' | 'other';

export interface Task {
  id: string;
  userId: string;
  dealId?: string;
  dealAddress?: string;
  title: string;
  description?: string;
  type: TaskType | string;
  dueDate: string;
  dueTime?: string;
  status: 'pending' | 'completed';
  priority: TaskPriority;
}

export interface DocumentFile {
  id: string;
  name: string;
  type: string;
  size: string | number;
  url: string;
  storagePath?: string;
  uploadDate: string;
  dealId?: string;
}

export type ContactType = 'owner' | 'tenant' | 'investor' | 'developer' | 'partner' | 'prospect';
export type ContactStatus = 'active' | 'inactive' | 'do_not_contact' | 'archived';
export type RelationshipTier = 'A' | 'B' | 'C' | 'D';

export interface ContactInteraction {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'tour';
  date: string;
  subject: string;
  notes?: string;
}

export interface Contact {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  company?: string;
  jobTitle?: string;
  contactType: ContactType;
  status: ContactStatus;
  tier: RelationshipTier;
  email?: string;
  phone?: string;
  mobile?: string;
  submarkets: string[];
  propertyInterests: PropertyType[];
  tags: string[];
  notes?: string;
  linkedDealIds: string[];
  interactions: ContactInteraction[];
  lastContactedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  investorCriteria?: {
    is1031Active: boolean;
    targetCapRate?: number;
    capitalAvailable?: number;
  };
  tenantCriteria?: {
    leaseExpiration?: string;
    sfOccupied?: number;
  };
}

export interface LeadGenLog {
  id: string;
  userId: string;
  date: string;
  callsMade: number;
  // Fix: Add missing performance metrics used in LeadGenPage
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
  purchasePrice: number;
  loanAmount: number;
  interestRate: number;
  loanTermYears: number;
  // Fix: Add missing calculation and asset properties
  loanTerm?: number;
  monthlyPayment: number;
  totalCostOfLoan: number;
  downPaymentValue?: number;
  downPaymentMode?: 'percent' | 'amount';
  annualTax: number;
  annualInsurance: number;
  annualHOA: number;
  propertyValue: number;
  annualNOI: number;
}

// Fix: Add missing ActivityLog export for constants.ts
export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
}

// Fix: Add missing EmailMessage export for constants.ts and CommunicationsPage.tsx
export interface EmailMessage {
  id: string;
  userId: string;
  from: string;
  subject: string;
  preview: string;
  date: string;
  read: boolean;
}
