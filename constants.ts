
import { Deal, DealStatus, PropertyType, ActivityLog, EmailMessage, LeadGenLog } from './types';

export const MOCK_DEALS: Deal[] = [
  {
    id: '1',
    propertyAddress: '1200 Market Street, San Francisco, CA',
    propertyType: PropertyType.OFFICE,
    askingPrice: 45000000,
    offersReceived: 3,
    highestOffer: 42500000,
    status: DealStatus.NEGOTIATING,
    daysOnMarket: 45,
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    imageUrl: 'https://picsum.photos/400/300?random=1',
    owner: { name: 'Atlas Holdings LLC', email: 'contact@atlasholdings.com', phone: '(415) 555-0123' },
    description: 'Prime Class A office space in the heart of downtown.',
    documents: [
      { id: 'd1', name: 'Offering_Memorandum.pdf', type: 'PDF', size: '4.2 MB', uploadDate: new Date(Date.now() - 86400000 * 10).toISOString(), dealId: '1' },
      { id: 'd2', name: 'Rent_Roll_Q3.xlsx', type: 'XLSX', size: '1.1 MB', uploadDate: new Date(Date.now() - 86400000 * 5).toISOString(), dealId: '1' }
    ]
  },
  {
    id: '2',
    propertyAddress: '789 Industrial Pkw, Austin, TX',
    propertyType: PropertyType.INDUSTRIAL,
    askingPrice: 12500000,
    offersReceived: 8,
    highestOffer: 13000000,
    status: DealStatus.UNDER_REVIEW,
    daysOnMarket: 12,
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    imageUrl: 'https://picsum.photos/400/300?random=2',
    owner: { name: 'Texas Logistics Partners', email: 'mgmt@txlogistics.com', phone: '(512) 555-0987' },
    description: 'State-of-the-art logistics facility with 30ft clear heights.',
    documents: [
      { id: 'd3', name: 'Phase_1_Environmental.pdf', type: 'PDF', size: '8.5 MB', uploadDate: new Date(Date.now() - 86400000 * 12).toISOString(), dealId: '2' }
    ]
  },
  {
    id: '3',
    propertyAddress: 'The Highland Retail Center, Denver, CO',
    propertyType: PropertyType.RETAIL,
    askingPrice: 8200000,
    offersReceived: 1,
    highestOffer: 7800000,
    status: DealStatus.ACTIVE,
    daysOnMarket: 28,
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    imageUrl: 'https://picsum.photos/400/300?random=3',
    owner: { name: 'Sarah Jenkins', email: 'sarah.j@gmail.com', phone: '(303) 555-1122' },
    description: 'High-traffic retail strip anchored by national tenant.',
    documents: []
  },
  {
    id: '4',
    propertyAddress: '2400 Ocean Blvd, Miami, FL',
    propertyType: PropertyType.MULTIFAMILY,
    askingPrice: 22000000,
    offersReceived: 0,
    highestOffer: 0,
    status: DealStatus.ACTIVE,
    daysOnMarket: 5,
    lastUpdated: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    imageUrl: 'https://picsum.photos/400/300?random=4',
    owner: { name: 'Coastal Capital Group', email: 'invest@coastalcap.com', phone: '(305) 555-4433' },
    description: 'Luxury waterfront multifamily development opportunity.',
    documents: [
      { id: 'd4', name: 'Survey.pdf', type: 'PDF', size: '3.2 MB', uploadDate: new Date(Date.now() - 86400000 * 2).toISOString(), dealId: '4' },
      { id: 'd5', name: 'Architectural_Plans.pdf', type: 'PDF', size: '12.4 MB', uploadDate: new Date(Date.now() - 86400000 * 3).toISOString(), dealId: '4' }
    ]
  }
];

export const MOCK_ACTIVITY: ActivityLog[] = [
  { id: '1', type: 'offer', description: 'New offer received ($13M) for 789 Industrial Pkwy', timestamp: '2 hours ago', dealId: '2' },
  { id: '2', type: 'message', description: 'Message from Sarah Jenkins regarding valuation', timestamp: '5 hours ago', dealId: '3' },
  { id: '3', type: 'document', description: 'Uploaded Q3 Financials for 1200 Market St', timestamp: '1 day ago', dealId: '1' },
  { id: '4', type: 'status', description: 'Status changed to "Negotiating" for 1200 Market St', timestamp: '1 day ago', dealId: '1' },
  { id: '5', type: 'offer', description: 'LOI received for Highland Retail Center', timestamp: '2 days ago', dealId: '3' },
];

export const MOCK_EMAILS: EmailMessage[] = [
  { id: '1', from: 'Raphael (CEO)', subject: 'Q3 Targets', preview: 'Let\'s discuss the pipeline for the next quarter...', date: '10:30 AM', read: false },
  { id: '2', from: 'Atlas Holdings', subject: 'Re: Counter Offer', preview: 'We have reviewed the terms and would like to propose...', date: 'Yesterday', read: true },
  { id: '3', from: 'Title Company', subject: 'Closing Docs - 1200 Market', preview: 'Attached are the preliminary HUD statements...', date: 'Oct 24', read: true },
];

// Generate daily lead gen data for the last 90 days
const generateMockLeadGen = (): LeadGenLog[] => {
  const logs: LeadGenLog[] = [];
  const today = new Date();
  
  // Generate data for 90 days
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    // Skip weekends for realistic data, but keep index logic for array creation
    const day = d.getDay();
    const isWeekend = day === 0 || day === 6;
    
    // Only skip 80% of weekends to simulate some weekend work
    if (isWeekend && Math.random() > 0.2) continue;

    const activityMultiplier = Math.random(); 

    logs.push({
      id: `log-${i}`,
      date: dateStr,
      callsMade: Math.floor(5 + activityMultiplier * 20), // 5-25 calls
      lettersSent: Math.floor(Math.random() * 5),
      socialPosts: Math.floor(Math.random() * 2),
      targetedEmails: Math.floor(10 + activityMultiplier * 30),
      networkingEvents: Math.random() > 0.9 ? 1 : 0,
      clientMeetings: Math.random() > 0.8 ? 1 : 0,
      referralsGenerated: Math.random() > 0.95 ? 1 : 0,
      propertyTours: Math.random() > 0.85 ? 1 : 0,
      bovsSubmitted: Math.random() > 0.9 ? 1 : 0,
      listingsSigned: Math.random() > 0.98 ? 1 : 0,
      offersMade: Math.random() > 0.9 ? 1 : 0,
      underContract: Math.random() > 0.98 ? 1 : 0,
      closedDeals: Math.random() > 0.99 ? 1 : 0,
      closedAmount: Math.random() > 0.99 ? (Math.floor(Math.random() * 50) + 10) * 100000 : 0,
      notes: ''
    });
  }
  return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const MOCK_LEAD_GEN_LOGS = generateMockLeadGen();
