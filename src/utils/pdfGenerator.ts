
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Deal, Task, DealStatus, LeadGenLog, UserAccount } from '../types.ts';

// Constants
const BRAND_COLOR = [15, 23, 42]; // Slate 900
const ACCENT_COLOR = [16, 185, 129]; // Emerald 500

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

const addBrandedHeader = (doc: jsPDF, title: string, subtitle: string) => {
    const pageWidth = doc.internal.pageSize.width;
    doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 22);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 14, 30);
    
    // Logo text right aligned
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Summit Commercial Group", pageWidth - 14, 22, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString(), pageWidth - 14, 30, { align: 'right' });
    
    doc.setTextColor(0, 0, 0); // Reset
};

const addPageFooters = (doc: jsPDF) => {
    const pageCount = doc.internal.pages.length - 1;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Confidential • Summit Commercial Group`, 14, pageHeight - 10);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
    }
};

/**
 * GENERATE OWNER MARKETING REPORT
 * Used to update clients on the status of their listing.
 */
export const generateOwnerReport = async (deal: Deal, tasks: Task[]) => {
  const doc = new jsPDF();
  
  addBrandedHeader(doc, "Marketing Status Report", `Prepared for: ${deal.owner.name}`);

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
  doc.text(`${deal.propertyType} • ${(deal.representation || 'seller').toUpperCase()} Rep`, 80, currentY + 12);
  
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

  autoTable(doc, {
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
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Date', 'Type', 'Activity Detail', 'Status']],
        body: activityRows,
        theme: 'striped',
        headStyles: { fillColor: BRAND_COLOR },
        styles: { fontSize: 9 },
      });
  } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text("No specific activity logged for this period.", 14, currentY + 10);
  }

  addPageFooters(doc);
  doc.save(`Owner_Report_${deal.propertyAddress.replace(/\s+/g, '_')}.pdf`);
};

/**
 * GENERATE PIPELINE REPORT
 * Internal report for brokers to track projected revenue.
 */
export const generatePipelineReport = (deals: Deal[]) => {
  const doc = new jsPDF('l'); // Landscape
  
  // Active deals only
  const activeDeals = deals.filter(d => d.status !== DealStatus.COMPLETED && d.status !== DealStatus.ARCHIVED && d.status !== DealStatus.CLOSED_LOST);
  const totalVolume = activeDeals.reduce((acc, d) => acc + d.askingPrice, 0);
  
  // Potential commission: Use Projected if available, else Estimated, else 3% of Asking
  const totalPotentialComm = activeDeals.reduce((acc, d) => acc + (d.projectedCommission || d.estimatedCommission || (d.askingPrice * 0.03)), 0);
  
  let totalWeightedComm = 0;

  addBrandedHeader(doc, "Pipeline & Forecast", "Projected Revenue Analysis");

  doc.setFontSize(10);
  doc.setTextColor(50);
  doc.text(`Active Deal Volume: ${formatCurrency(totalVolume)}  |  Proj. Gross Commission: ${formatCurrency(totalPotentialComm)}`, 14, 48);

  // --- PIPELINE TABLE ---
  const tableData = activeDeals.map(d => {
    // Probability logic
    let prob = 10;
    if (d.status === DealStatus.UNDER_REVIEW) prob = 25;
    if (d.status === DealStatus.NEGOTIATING) prob = 50;
    if (d.status === DealStatus.CLOSING) prob = 90;
    
    const potentialComm = d.projectedCommission || d.estimatedCommission || (d.askingPrice * 0.03);
    const weightedComm = potentialComm * (prob/100);
    totalWeightedComm += weightedComm;
    
    return [
      d.propertyAddress,
      d.clientName || d.owner.name,
      d.representation === 'seller' ? 'List' : 'Buy',
      d.status,
      formatCurrency(d.askingPrice),
      `${prob}%`,
      formatCurrency(weightedComm)
    ];
  });

  autoTable(doc, {
    startY: 55,
    head: [['Property / Requirement', 'Client', 'Side', 'Status', 'Volume', 'Prob.', 'Weighted Comm.']],
    body: tableData,
    foot: [['', '', '', 'TOTAL', formatCurrency(totalVolume), '', formatCurrency(totalWeightedComm)]],
    theme: 'grid',
    headStyles: { fillColor: BRAND_COLOR },
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
    columnStyles: {
        4: { halign: 'right' },
        5: { halign: 'center' },
        6: { halign: 'right', fontStyle: 'bold' }
    }
  });

  addPageFooters(doc);
  doc.save(`Pipeline_Forecast_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
};

/**
 * GENERATE CLOSED PRODUCTION REPORT
 * Historical record of success.
 */
export const generateProductionReport = (deals: Deal[]) => {
  const doc = new jsPDF();
  
  addBrandedHeader(doc, "Closed Production Record", "Historical Transaction Performance");

  const closedDeals = deals.filter(d => d.status === DealStatus.COMPLETED);
  const totalClosed = closedDeals.reduce((acc, d) => acc + (d.closingPrice || d.askingPrice), 0);
  
  // For Closed Deals, prioritize Actual Commission, fallback to Projected/Estimated
  const totalComm = closedDeals.reduce((acc, d) => acc + (d.actualCommission || d.projectedCommission || 0), 0);

  doc.setFontSize(11);
  doc.setTextColor(50);
  doc.text(`Total Volume Closed: ${formatCurrency(totalClosed)}`, 14, 50);
  doc.text(`Total GCI Realized: ${formatCurrency(totalComm)}`, 14, 56);

  const tableData = closedDeals.map(d => [
    d.closingDate ? new Date(d.closingDate).toLocaleDateString() : '-',
    d.propertyAddress,
    d.representation,
    formatCurrency(d.closingPrice || d.askingPrice),
    formatCurrency(d.actualCommission || d.projectedCommission || 0)
  ]);

  autoTable(doc, {
    startY: 65,
    head: [['Close Date', 'Property', 'Rep', 'Final Price', 'Commission']],
    body: tableData,
    foot: [['', '', 'TOTAL', formatCurrency(totalClosed), formatCurrency(totalComm)]],
    theme: 'striped',
    headStyles: { fillColor: BRAND_COLOR },
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
    columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' }
    }
  });

  addPageFooters(doc);
  doc.save("Closed_Production_Report.pdf");
};

/**
 * GENERATE EXECUTIVE KPI AUDIT
 * Analyzing Win rates, Activity Volume, and Conversion.
 */
export const generateKPIReport = (user: UserAccount | null, deals: Deal[], logs: LeadGenLog[]) => {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString();

  addBrandedHeader(doc, "Executive KPI Audit", `Performance Analysis for: ${user ? `${user.firstName} ${user.lastName}` : 'All Agents'}`);

  // Calculations
  const totalDeals = deals.length;
  const closedDeals = deals.filter(d => d.status === DealStatus.COMPLETED).length;
  const lostDeals = deals.filter(d => d.status === DealStatus.CLOSED_LOST).length;
  const winRate = (closedDeals + lostDeals) > 0 ? (closedDeals / (closedDeals + lostDeals)) * 100 : 0;
  
  const totalCalls = logs.reduce((acc, l) => acc + (l.callsMade || 0), 0);
  const totalMeetings = logs.reduce((acc, l) => acc + (l.clientMeetings || 0), 0);
  const totalTours = logs.reduce((acc, l) => acc + (l.propertyTours || 0), 0);
  const totalOffers = logs.reduce((acc, l) => acc + (l.offersMade || 0), 0);

  // --- EXECUTIVE SUMMARY GRID ---
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Key Performance Indicators", 14, 55);

  const kpiData = [
    ['Win Rate (Closed/Lost)', `${winRate.toFixed(1)}%`, 'Total Volume Closed', formatCurrency(user?.stats?.totalVolume || 0)],
    ['Pipeline Conversion', `${totalDeals > 0 ? ((closedDeals / totalDeals) * 100).toFixed(1) : 0}%`, 'Gross Commission Income', formatCurrency(user?.stats?.totalCommissions || 0)],
    ['Avg Deal Size', formatCurrency(user?.stats?.totalVolume && closedDeals ? user.stats.totalVolume / closedDeals : 0), 'Days to Close (Avg)', `${user?.stats?.avgDaysToClose || 0} Days`]
  ];

  autoTable(doc, {
    startY: 60,
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

  autoTable(doc, {
    startY: currentY + 5,
    head: [['Stage', 'Volume', 'Conversion Rate']],
    body: funnelData,
    theme: 'striped',
    headStyles: { fillColor: BRAND_COLOR },
    columnStyles: { 0: { fontStyle: 'bold' } }
  });

  addPageFooters(doc);
  doc.save(`Executive_KPI_Audit_${today.replace(/\//g, '-')}.pdf`);
};

/**
 * GENERATE LEASE SCHEDULE REPORT
 * For Landlord/Tenant Reps to track expirations.
 */
export const generateLeaseReport = (deals: Deal[]) => {
  const doc = new jsPDF('l'); // Landscape
  
  addBrandedHeader(doc, "Lease Schedule & Critical Dates", "Portfolio Expiration Analysis");

  // Filter for lease deals
  const leaseDeals = deals.filter(d => 
    d.representation === 'landlord' || 
    d.representation === 'tenant'
  );

  doc.setFontSize(10);
  doc.text(`Tracking ${leaseDeals.length} Lease Agreements`, 14, 48);

  // --- LEASE TABLE ---
  const tableData = leaseDeals.map(d => {
    const startDate = d.leaseStartDate ? new Date(d.leaseStartDate) : null;
    let expDate = '-';
    
    // Calculate Expiration
    if (startDate && (d.finalLeaseTerm || d.leaseTerm)) {
        const termMonths = (d.finalLeaseTerm || d.leaseTerm) || 0; 
        const monthsToAdd = Number(termMonths) < 20 ? Number(termMonths) * 12 : Number(termMonths);
        const exp = new Date(startDate);
        exp.setMonth(exp.getMonth() + monthsToAdd);
        expDate = exp.toLocaleDateString();
    }

    return [
      d.propertyAddress,
      d.representation === 'landlord' ? (d.clientName || 'Owner') : (d.clientName || 'Tenant'),
      d.representation === 'landlord' ? 'LL Rep' : 'Tenant Rep',
      `${d.minSqFt || '-'} sf`,
      d.finalLeaseRate ? `$${d.finalLeaseRate}/sf` : '-',
      d.leaseStartDate ? new Date(d.leaseStartDate).toLocaleDateString() : 'TBD',
      expDate,
      d.status
    ];
  });

  autoTable(doc, {
    startY: 55,
    head: [['Property', 'Client', 'Role', 'Size', 'Rate', 'Commence', 'Expiration', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: BRAND_COLOR },
    styles: { fontSize: 9 }
  });

  addPageFooters(doc);
  doc.save(`Lease_Schedule_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
};

/**
 * GENERATE FIRM PERFORMANCE REPORT (Admin Only)
 * Consolidated view of all agent performance.
 */
export const generateFirmPerformanceReport = (users: UserAccount[]) => {
  const doc = new jsPDF();
  const agents = users.filter(u => u.role === 'agent').sort((a, b) => (b.stats?.totalVolume || 0) - (a.stats?.totalVolume || 0));

  addBrandedHeader(doc, "Firm-Wide Performance Report", "Confidential Executive Brief");

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

  autoTable(doc, {
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

  autoTable(doc, {
    startY: finalY + 5,
    head: [['Agent Name', 'Active', 'Closed', 'Volume', 'GCI']],
    body: agentRows,
    theme: 'striped',
    headStyles: { fillColor: BRAND_COLOR },
    columnStyles: { 
        3: { halign: 'right' }, 
        4: { halign: 'right', fontStyle: 'bold' } 
    }
  });

  addPageFooters(doc);
  doc.save(`Firm_Performance_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
};
