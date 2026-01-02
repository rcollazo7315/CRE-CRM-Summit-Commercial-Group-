
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Deal, Task, DealStatus, LeadGenLog, UserAccount } from '../types.ts';

// Helper to format currency
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
};

// Helper to load image for PDF
const getDataUrl = (url: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg'));
    };
    img.onerror = () => {
      resolve(''); // Fallback if image fails
    };
  });
};

/**
 * GENERATE OWNER MARKETING REPORT
 * Used to update clients on the status of their listing.
 */
export const generateOwnerReport = async (deal: Deal, tasks: Task[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const today = new Date().toLocaleDateString();

  // --- HEADER ---
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text("Marketing Status Report", 14, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${today}`, 14, 28);
  doc.text("Summit Commercial Group", pageWidth - 14, 20, { align: 'right' });

  // --- PROPERTY OVERVIEW ---
  let currentY = 50;
  
  // Try to add property image
  if (deal.imageUrl) {
    try {
        const imgData = await getDataUrl(deal.imageUrl);
        if (imgData) {
            doc.addImage(imgData, 'JPEG', 14, currentY, 60, 40);
        }
    } catch (e) { console.error(e); }
  }

  // Property Details Text (Right of image)
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(deal.propertyAddress, 80, currentY + 5);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(`${deal.propertyType} • ${deal.representation.toUpperCase()} Rep`, 80, currentY + 12);
  
  doc.text(`List Price: ${formatCurrency(deal.askingPrice)}`, 80, currentY + 20);
  doc.text(`Days on Market: ${deal.daysOnMarket || 0}`, 80, currentY + 26);
  doc.text(`Current Status: ${deal.status}`, 80, currentY + 32);

  currentY += 50;

  // --- TRACTION SUMMARY (Grid) ---
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text("Campaign Traction", 14, currentY);
  
  currentY += 5;

  const relevantTasks = tasks.filter(t => t.dealId === deal.id);
  const tours = relevantTasks.filter(t => t.type.includes('tour') || t.type.includes('visit')).length;
  const inquiries = relevantTasks.filter(t => t.type === 'call' || t.type === 'email').length;
  
  const statsData = [
    ['Inquiries/Calls', inquiries.toString(), 'Offers Received', deal.offersReceived.toString()],
    ['Property Tours', tours.toString(), 'Highest Offer', formatCurrency(deal.highestOffer)]
  ];

  (doc as any).autoTable({
    startY: currentY,
    head: [],
    body: statsData,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
        0: { fontStyle: 'bold', fillColor: [241, 245, 249] },
        2: { fontStyle: 'bold', fillColor: [241, 245, 249] }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;

  // --- ACTIVITY LOG ---
  doc.setFontSize(12);
  doc.text("Recent Activity Log", 14, currentY);
  
  const activityRows = relevantTasks
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
    .slice(0, 15) // Limit to last 15
    .map(t => [
        new Date(t.dueDate).toLocaleDateString(),
        t.type.toUpperCase(),
        t.title,
        t.status
    ]);

  if (activityRows.length > 0) {
      (doc as any).autoTable({
        startY: currentY + 5,
        head: [['Date', 'Type', 'Activity Detail', 'Status']],
        body: activityRows,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 9 },
      });
  } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text("No specific activity logged for this period.", 14, currentY + 10);
  }

  // --- FOOTER ---
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Confidential • Prepared for ${deal.owner.name}`, 14, 285);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, 285);
  }

  doc.save(`Owner_Report_${deal.propertyAddress.replace(/\s+/g, '_')}.pdf`);
};

/**
 * GENERATE PIPELINE REPORT
 * Internal report for brokers to track projected revenue.
 */
export const generatePipelineReport = (deals: Deal[]) => {
  const doc = new jsPDF('l'); // Landscape
  const pageWidth = doc.internal.pageSize.width;
  const today = new Date().toLocaleDateString();

  // Active deals only
  const activeDeals = deals.filter(d => d.status !== DealStatus.COMPLETED && d.status !== DealStatus.ARCHIVED);
  const totalVolume = activeDeals.reduce((acc, d) => acc + d.askingPrice, 0);
  const totalPotentialComm = activeDeals.reduce((acc, d) => acc + (d.estimatedCommission || (d.askingPrice * 0.03)), 0);

  // --- HEADER ---
  doc.setFillColor(16, 185, 129); // Summit Accent Green
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("Commercial Pipeline Forecast", 14, 18);
  doc.setFontSize(10);
  doc.text(`Active Deal Volume: ${formatCurrency(totalVolume)}  |  Proj. Gross Commission: ${formatCurrency(totalPotentialComm)}`, 14, 26);

  // --- PIPELINE TABLE ---
  const tableData = activeDeals.map(d => {
    // Basic probability logic based on status
    let prob = 0;
    if (d.status === DealStatus.ACTIVE) prob = 10;
    if (d.status === DealStatus.NEGOTIATING) prob = 50;
    if (d.status === DealStatus.CLOSING) prob = 90;
    
    return [
      d.propertyAddress,
      d.clientName || d.owner.name,
      d.representation === 'seller' ? 'List' : 'Buy',
      d.status,
      formatCurrency(d.askingPrice),
      `${prob}%`,
      formatCurrency((d.estimatedCommission || (d.askingPrice * 0.03)) * (prob/100)) // Weighted Forecast
    ];
  });

  (doc as any).autoTable({
    startY: 45,
    head: [['Property / Requirement', 'Client', 'Side', 'Status', 'Volume', 'Prob.', 'Weighted Comm.']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: {
        4: { halign: 'right' },
        5: { halign: 'center' },
        6: { halign: 'right', fontStyle: 'bold' }
    }
  });

  doc.save(`Pipeline_Forecast_${today.replace(/\//g, '-')}.pdf`);
};

/**
 * GENERATE CLOSED PRODUCTION REPORT
 * Historical record of success.
 */
export const generateProductionReport = (deals: Deal[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const closedDeals = deals.filter(d => d.status === DealStatus.COMPLETED);
  
  const totalClosed = closedDeals.reduce((acc, d) => acc + (d.closingPrice || d.askingPrice), 0);
  const totalComm = closedDeals.reduce((acc, d) => acc + (d.actualCommission || 0), 0);

  // Header
  doc.setFontSize(18);
  doc.text("Closed Production Report", 14, 20);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Total Volume: ${formatCurrency(totalClosed)}`, 14, 28);
  doc.text(`Total GCI: ${formatCurrency(totalComm)}`, 14, 34);

  const tableData = closedDeals.map(d => [
    d.closedDate ? new Date(d.closedDate).toLocaleDateString() : '-',
    d.propertyAddress,
    d.representation,
    formatCurrency(d.closingPrice || d.askingPrice),
    formatCurrency(d.actualCommission || 0)
  ]);

  (doc as any).autoTable({
    startY: 45,
    head: [['Close Date', 'Property', 'Rep', 'Final Price', 'Commission']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' }
    }
  });

  doc.save("Closed_Production_Report.pdf");
};

/**
 * GENERATE EXECUTIVE KPI AUDIT
 * Analyzing Win rates, Activity Volume, and Conversion.
 */
export const generateKPIReport = (user: UserAccount | null, deals: Deal[], logs: LeadGenLog[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const today = new Date().toLocaleDateString();

  // Calculations
  const totalDeals = deals.length;
  const closedDeals = deals.filter(d => d.status === DealStatus.COMPLETED).length;
  const lostDeals = deals.filter(d => d.status === DealStatus.CLOSED_LOST).length;
  const winRate = (closedDeals + lostDeals) > 0 ? (closedDeals / (closedDeals + lostDeals)) * 100 : 0;
  
  const totalCalls = logs.reduce((acc, l) => acc + (l.callsMade || 0), 0);
  const totalMeetings = logs.reduce((acc, l) => acc + (l.clientMeetings || 0), 0);
  const totalTours = logs.reduce((acc, l) => acc + (l.propertyTours || 0), 0);
  const totalOffers = logs.reduce((acc, l) => acc + (l.offersMade || 0), 0);

  // --- HEADER ---
  doc.setFillColor(30, 41, 59); // Summit 800
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text("Executive Performance Audit", 14, 20);
  
  doc.setFontSize(11);
  doc.text(`Agent: ${user ? `${user.firstName} ${user.lastName}` : 'All Agents'}`, 14, 30);
  doc.text(`Report Date: ${today}`, 14, 37);

  // --- EXECUTIVE SUMMARY GRID ---
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Key Performance Indicators", 14, 60);

  const kpiData = [
    ['Win Rate (Closed/Lost)', `${winRate.toFixed(1)}%`, 'Total Volume Closed', formatCurrency(user?.stats?.totalVolume || 0)],
    ['Pipeline Conversion', `${((closedDeals / totalDeals) * 100).toFixed(1)}%`, 'Gross Commission Income', formatCurrency(user?.stats?.totalCommissions || 0)],
    ['Avg Deal Size', formatCurrency(user?.stats?.totalVolume && closedDeals ? user.stats.totalVolume / closedDeals : 0), 'Days to Close (Avg)', `${user?.stats?.avgDaysToClose || 0} Days`]
  ];

  (doc as any).autoTable({
    startY: 65,
    head: [],
    body: kpiData,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 5 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [241, 245, 249] },
      2: { fontStyle: 'bold', fillColor: [241, 245, 249] }
    }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 15;

  // --- ACTIVITY FUNNEL ---
  doc.text("Activity Funnel Analysis", 14, currentY);
  
  const funnelData = [
    ['1. Outreach (Calls)', totalCalls.toLocaleString(), '-'],
    ['2. Engagement (Meetings)', totalMeetings.toLocaleString(), `${totalCalls > 0 ? ((totalMeetings/totalCalls)*100).toFixed(1) : 0}% conv`],
    ['3. Pipeline (Tours)', totalTours.toLocaleString(), `${totalMeetings > 0 ? ((totalTours/totalMeetings)*100).toFixed(1) : 0}% conv`],
    ['4. Negotiation (Offers)', totalOffers.toLocaleString(), `${totalTours > 0 ? ((totalOffers/totalTours)*100).toFixed(1) : 0}% conv`],
    ['5. Closing (Deals)', closedDeals.toLocaleString(), `${totalOffers > 0 ? ((closedDeals/totalOffers)*100).toFixed(1) : 0}% conv`],
  ];

  (doc as any).autoTable({
    startY: currentY + 5,
    head: [['Stage', 'Volume', 'Conversion Rate']],
    body: funnelData,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59] },
    columnStyles: { 0: { fontStyle: 'bold' } }
  });

  doc.save(`Executive_KPI_Audit_${today}.pdf`);
};

/**
 * GENERATE LEASE SCHEDULE REPORT
 * For Landlord/Tenant Reps to track expirations.
 */
export const generateLeaseReport = (deals: Deal[]) => {
  const doc = new jsPDF('l'); // Landscape for more columns
  const pageWidth = doc.internal.pageSize.width;
  const today = new Date().toLocaleDateString();

  // Filter for lease deals (Landlord or Tenant rep, or DealType lease)
  const leaseDeals = deals.filter(d => 
    d.dealType === 'lease' || 
    d.representation === 'landlord' || 
    d.representation === 'tenant'
  );

  // --- HEADER ---
  doc.setFillColor(59, 130, 246); // Blue
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("Lease Schedule & Critical Dates", 14, 18);
  doc.setFontSize(10);
  doc.text(`Tracking ${leaseDeals.length} Lease Agreements`, 14, 26);

  // --- LEASE TABLE ---
  const tableData = leaseDeals.map(d => {
    const startDate = d.leaseStartDate ? new Date(d.leaseStartDate) : null;
    let expDate = '-';
    
    // Calculate Expiration
    if (startDate && (d.finalLeaseTerm || d.leaseTerm)) {
        const termMonths = (d.finalLeaseTerm || d.leaseTerm) || 0; 
        // If term is likely years (e.g. < 20), multiply by 12, else assume months
        const monthsToAdd = termMonths < 20 ? termMonths * 12 : termMonths;
        const exp = new Date(startDate);
        exp.setMonth(exp.getMonth() + Number(monthsToAdd));
        expDate = exp.toLocaleDateString();
    }

    return [
      d.propertyAddress,
      d.representation === 'landlord' ? (d.clientName || 'Owner') : (d.clientName || 'Tenant'),
      d.representation === 'landlord' ? 'LL Rep' : 'Tenant Rep',
      `${d.minSqFt || d.squareFootage || '-'} sf`,
      d.finalLeaseRate ? `$${d.finalLeaseRate}/sf` : '-',
      d.leaseStartDate ? new Date(d.leaseStartDate).toLocaleDateString() : 'TBD',
      expDate,
      d.status
    ];
  });

  (doc as any).autoTable({
    startY: 45,
    head: [['Property', 'Client', 'Role', 'Size', 'Rate', 'Commence', 'Expiration', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59] },
    styles: { fontSize: 9 }
  });

  doc.save(`Lease_Schedule_${today}.pdf`);
};

/**
 * GENERATE FIRM PERFORMANCE REPORT (Admin Only)
 * Consolidated view of all agent performance.
 */
export const generateFirmPerformanceReport = (users: UserAccount[]) => {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString();
  const agents = users.filter(u => u.role === 'agent').sort((a, b) => (b.stats?.totalVolume || 0) - (a.stats?.totalVolume || 0));

  // --- HEADER ---
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text("Firm-Wide Performance Report", 14, 20);
  
  doc.setFontSize(10);
  doc.text(`Generated: ${today}`, 14, 28);
  doc.text("Confidential Executive Brief", 196, 20, { align: 'right' });

  // --- SUMMARY STATS ---
  const totalVolume = agents.reduce((acc, u) => acc + (u.stats?.totalVolume || 0), 0);
  const totalDeals = agents.reduce((acc, u) => acc + (u.stats?.closedDeals || 0), 0);
  const totalGCI = agents.reduce((acc, u) => acc + (u.stats?.totalCommissions || 0), 0);

  doc.setFontSize(14);
  doc.setTextColor(0,0,0);
  doc.text("Firm Totals", 14, 55);

  const statsData = [
    ['Total Closed Volume', formatCurrency(totalVolume)],
    ['Total Transactions', totalDeals.toString()],
    ['Gross Commission Income', formatCurrency(totalGCI)],
    ['Active Agents', agents.length.toString()]
  ];

  (doc as any).autoTable({
    startY: 60,
    head: [],
    body: statsData,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: [241, 245, 249] } }
  });

  // --- LEAGUE TABLE ---
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.text("Agent League Table", 14, finalY);

  const agentRows = agents.map(agent => [
    `${agent.firstName} ${agent.lastName}`,
    agent.stats?.activeDeals || 0,
    agent.stats?.closedDeals || 0,
    formatCurrency(agent.stats?.totalVolume || 0),
    formatCurrency(agent.stats?.totalCommissions || 0),
  ]);

  (doc as any).autoTable({
    startY: finalY + 5,
    head: [['Agent Name', 'Active', 'Closed', 'Volume', 'GCI']],
    body: agentRows,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: { 
        3: { halign: 'right' }, 
        4: { halign: 'right', fontStyle: 'bold' } 
    }
  });

  doc.save(`Firm_Performance_${today.replace(/\//g, '-')}.pdf`);
};
