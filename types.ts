
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
  url?: string; // For mock downloads
}

export interface Deal {
  id: string;
  propertyAddress: string;
  propertyType: PropertyType;
  askingPrice: number;
  offersReceived: number;
  highestOffer: number;
  status: DealStatus;
  daysOnMarket: number;
  lastUpdated: string; // ISO date string
  imageUrl: string;
  owner: OwnerInfo;
  description: string;
  documents: DocumentFile[];
  notes?: string;
}

export interface ActivityLog {
  id: string;
  type: 'offer' | 'status' | 'document' | 'message';
  description: string;
  timestamp: string;
  dealId?: string;
}

export interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  preview: string;
  date: string;
  read: boolean;
}

export interface AgentMetric {
  label: string;
  value: number;
  change: number; // percentage
  trend: 'up' | 'down' | 'neutral';
}

export interface LeadGenMetrics {
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
}

export interface LeadGenLog extends LeadGenMetrics {
  id: string;
  date: string; // YYYY-MM-DD
  notes?: string;
}
