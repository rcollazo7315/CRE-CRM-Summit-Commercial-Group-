
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
  approvedAt?: string | null;
  lastLogin?: string;
  profileImage?: string;
  avatar?: string;
  company?: string;
  title?: string;
  bio?: string;
  username?: string;
  passwordHash?: string;
  settings?: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
  };
  notifications?: {
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
  ARCHIVED = 'Archived',
  CLOSED_LOST = 'Closed Lost'
}

export type DealStage = 'prospecting' | 'initial_contact' | 'qualification' | 'proposal' | 'negotiation' | 'due_diligence' | 'closing' | 'closed_won' | 'closed_lost';
export type DealType = 'acquisition' | 'disposition' | 'lease' | 'development' | 'refinance' | 'other';

export enum PropertyType {
  OFFICE = 'Office',
  RETAIL = 'Retail',
  INDUSTRIAL = 'Industrial',
  MULTIFAMILY = 'Multifamily',
  MIXED_USE = 'Mixed Use',
  LAND = 'Land',
  HOSPITALITY = 'Hospitality',
  HEALTHCARE = 'Healthcare',
  OTHER = 'Other'
}

export interface Deal {
  id: string;
  userId: string;
  propertyAddress: string;
  city?: string;
  state?: string;
  zipCode?: string;
  propertyType: PropertyType;
  dealType: DealType;
  stage: DealStage;
  status: DealStatus | string;
  askingPrice: number;
  offerPrice?: number;
  closingPrice?: number;
  squareFootage?: number;
  units?: number;
  capRate?: number;
  noi?: number;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  notes?: string;
  description?: string;
  imageUrl?: string;
  owner: { name: string; email: string; phone: string };
  createdAt: string;
  updatedAt?: string;
  lastUpdated: string;
  closedAt?: string;
  closedDate?: string;
  expectedCloseDate?: string;
  documents?: DocumentFile[];
  tasks?: Task[];
  probability?: number;
  commissionRate?: number;
  commission?: number;
  estimatedCommission?: number;
  offersReceived: number;
  highestOffer: number;
  daysOnMarket: number;
}

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
  completed: boolean;
  status: 'pending' | 'completed';
  priority: TaskPriority;
  reminderTime?: number;
  createdAt?: string;
  completedAt?: string;
}

export interface DocumentFile {
  id: string;
  name: string;
  type: string;
  size: string | number;
  url: string;
  storagePath?: string;
  uploadedAt?: string;
  uploadDate: string;
  uploadedBy?: string;
  dealId?: string;
  category?: 'contract' | 'financial' | 'legal' | 'marketing' | 'inspection' | 'other';
}

export type ContactType = 'owner' | 'tenant' | 'investor' | 'developer' | 'partner' | 'prospect';
export type ContactStatus = 'active' | 'inactive' | 'do_not_contact' | 'archived';
export type RelationshipTier = 'A' | 'B' | 'C' | 'D';
export type EngagementScore = 'hot' | 'warm' | 'cool' | 'cold';

export interface ContactAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface ContactInteraction {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'text' | 'tour' | 'note';
  date: string;
  subject: string;
  notes?: string;
  outcome?: string;
  linkedDealId?: string;
  linkedPropertyId?: string;
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
  engagementScore?: EngagementScore;
  
  // Contact Details
  email?: string;
  phone?: string;
  mobile?: string;
  linkedinUrl?: string;
  address?: ContactAddress;
  preferredContactMethod?: 'phone' | 'email' | 'text' | 'in_person';
  
  // CRE Specific Data
  submarkets: string[]; // e.g. "Downtown/CBD", "East End", "River Ridge"
  propertyInterests: PropertyType[];
  tags: string[];
  industry?: string;
  
  // Type-Specific Fields
  tenantCriteria?: {
    leaseExpiration?: string;
    sfOccupied?: number;
    requirementSF?: string;
  };
  investorCriteria?: {
    is1031Active: boolean;
    deadline1031?: string;
    targetCapRate?: number;
    capitalAvailable?: number;
  };
  
  // Relationships
  notes?: string;
  linkedDealIds: string[];
  interactions: ContactInteraction[];
  lastContactedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadGenLog {
  id: string;
  userId: string;
  date: string;
  activity?: string;
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
  source?: string;
  outcome?: string;
  notes?: string;
  createdAt?: string;
}

export interface MortgageCalculation {
  id: string;
  userId: string;
  timestamp: string;
  purchasePrice?: number;
  propertyPrice?: number;
  downPaymentValue?: number;
  downPayment?: number;
  downPaymentMode?: 'percent' | 'amount';
  loanAmount: number;
  interestRate: number;
  loanTermYears?: number;
  loanTerm: number;
  annualTax?: number;
  annualInsurance?: number;
  annualHOA?: number;
  monthlyPayment: number;
  totalInterest?: number;
  totalPayment?: number;
  totalCostOfLoan?: number;
  propertyValue?: number;
  annualNOI?: number;
  createdAt?: string;
  propertyAddress?: string;
  notes?: string;
}

export interface EmailMessage {
  id: string;
  userId: string;
  from: string;
  subject: string;
  preview: string;
  date: string;
  read: boolean;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
}
