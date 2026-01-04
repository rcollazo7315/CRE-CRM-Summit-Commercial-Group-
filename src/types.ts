
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
    conversionRate?: number;
    avgDaysToClose?: number;
    dealsBySource?: Record<string, number>;
    revenueBySource?: Record<string, number>;
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
export type RepresentationType = 'seller' | 'buyer' | 'landlord' | 'tenant';

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

export type LeadSource = 
  | 'cold_call'
  | 'email_campaign'
  | 'social_media'
  | 'direct_mail'
  | 'client_meeting'
  | 'networking_event'
  | 'referral'
  | 'property_tour'
  | 'bov_submission'
  | 'inbound_inquiry'
  | 'existing_relationship'
  | 'other';

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  cold_call: 'Cold Call',
  email_campaign: 'Email Campaign',
  social_media: 'Social Media',
  direct_mail: 'Direct Mail',
  client_meeting: 'Client Meeting',
  networking_event: 'Networking Event',
  referral: 'Referral',
  property_tour: 'Property Tour',
  bov_submission: 'BOV Submission',
  inbound_inquiry: 'Inbound Inquiry',
  existing_relationship: 'Existing Relationship',
  other: 'Other'
};

export const REPRESENTATION_LABELS: Record<RepresentationType, string> = {
  seller: 'Seller Rep (Disposition)',
  buyer: 'Buyer Rep (Acquisition)',
  landlord: 'Landlord Rep (Leasing)',
  tenant: 'Tenant Rep (Leasing)'
};

export type DeadlineStatus = 'pending' | 'waived' | 'completed' | 'expired';

export interface ContractDeadline {
  days: number;
  date?: string; // Calculated deadline date (ISO YYYY-MM-DD)
  status: DeadlineStatus;
  waivedDate?: string;
  completedDate?: string;
}

export interface ContractDates {
  contractDate?: string; // ISO YYYY-MM-DD
  dueDiligence: ContractDeadline;
  financing: ContractDeadline;
  closing: ContractDeadline;
}

export interface Deal {
  id: string;
  userId: string;
  representation: RepresentationType;
  propertyAddress: string;
  city?: string;
  state?: string;
  zipCode?: string;
  propertyType: PropertyType;
  dealType: DealType;
  stage: DealStage;
  status: DealStatus | string;
  
  // Initial / Target Numbers
  askingPrice: number; // Target Budget (Buyer) or Asking Price (Seller)
  minSqFt?: number;
  maxSqFt?: number;
  
  // Final / Executed Numbers
  closingPrice?: number; // Final Sale Price
  closingDate?: string;
  finalLeaseRate?: number; // Final $/sf/yr
  finalLeaseTerm?: number; // Final Term in Years/Months
  finalLeaseType?: string; // NNN, Gross, etc.
  leaseStartDate?: string;
  leaseExecutionDate?: string;
  totalContractValue?: number; // Total value of lease over term
  actualCommission?: number; // Final commission amount

  // Estimates (Legacy/Planning)
  offerPrice?: number;
  squareFootage?: number;
  leaseTerm?: number; 
  leaseType?: string; 
  units?: number;
  capRate?: number;
  noi?: number;
  
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  contactId?: string; // Linked Contact ID
  
  notes?: string;
  description?: string;
  imageUrl?: string;
  owner: { name: string; email: string; phone: string };
  createdAt: string;
  updatedAt?: string;
  lastUpdated: string;
  closedAt?: string;
  closedDate?: string; // Duplicate of closingDate, kept for compatibility
  expectedCloseDate?: string;
  
  documents?: DocumentFile[];
  tasks?: Task[];
  probability?: number;
  commissionRate?: number;
  commission?: number;
  estimatedCommission?: number;
  projectedCommission?: number; // New field
  offersReceived: number;
  highestOffer: number;
  daysOnMarket: number;
  leadSource?: LeadSource;
  leadSourceNotes?: string;
  leadSourceDate?: string;
  
  // Contract Tracking
  contractDates?: ContractDates;
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

export type ContactType = 'owner' | 'strategic_partner' | 'investor' | 'lender' | 'broker' | 'attorney' | 'title_company' | 'property_manager' | 'contractor' | 'appraiser' | 'inspector' | 'tenant' | 'banker' | 'vendor' | 'other' | 'partner' | 'developer' | 'prospect';
export type ContactStatus = 'active' | 'inactive' | 'lead' | 'prospect';
export type RelationshipTier = 'A' | 'B' | 'C' | 'D';

export interface ContactAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  zipCode?: string;
  country?: string;
}

export interface ContactInteraction {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'other';
  date: string;
  subject: string;
  summary?: string;
  notes?: string;
  outcome?: string;
  followUpDate?: string;
  createdBy?: string;
}

export interface Contact {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  contactType: ContactType;
  status: ContactStatus;
  company?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: ContactAddress;
  website?: string;
  linkedin?: string;
  twitter?: string;
  tags: string[];
  notes?: string;
  linkedDealIds: string[];
  interactions: ContactInteraction[];
  tier?: RelationshipTier;
  submarkets?: string[];
  propertyInterests?: PropertyType[];
  createdAt?: string;
  updatedAt?: string;
  lastContactedAt?: string;
  investorCriteria?: {
    is1031Active: boolean;
    targetCapRate?: number;
    capitalAvailable?: number;
  };
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
