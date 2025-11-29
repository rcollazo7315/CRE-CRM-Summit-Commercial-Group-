
import React from 'react';
import { BarChart, TrendingUp, PieChart, Download, ArrowUp } from 'lucide-react';
import { Deal, DealStatus, UserAccount } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsPageProps {
  deals: Deal[];
  users: UserAccount[];
  currentUser: UserAccount | null;
}

const ReportsPage: React.FC<ReportsPageProps> = ({ deals, users, currentUser }) => {
  // --- Dynamic Calculations ---
  
  const closedDeals = deals.filter(d => d.status === DealStatus.COMPLETED);
  const closedCount = closedDeals.length;
  const closedVolume = closedDeals.reduce((acc, d) => acc + d.askingPrice, 0);
  
  const totalVolume = deals.reduce((acc, d) => acc + d.askingPrice, 0);
  const avgPrice = deals.length > 0 ? totalVolume / deals.length : 0;

  const daysToCloseSum = closedDeals.reduce((acc, d) => {
    const start = new Date(d.createdAt).getTime();
    const end = d.closedDate ? new Date(d.closedDate).getTime() : new Date().getTime();
    const days = (end - start) / (1000 * 3600 * 24);
    return acc + days;
  }, 0);
  const avgDaysToClose = closedCount > 0 ? Math.round(daysToCloseSum / closedCount) : 0;

  const statusCounts = deals.reduce((acc, deal) => {
    acc[deal.status] = (acc[deal.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getPercent = (status: DealStatus) => {
    if (deals.length === 0) return 0;
    return Math.round(((statusCounts[status] || 0) / deals.length) * 100);
  };

  const displayAgents = currentUser?.role === 'admin' 
    ? users.filter(u => u.role === 'agent') 
    : users.filter(u => u.id === currentUser?.id);

  const sortedAgents = [...displayAgents].sort((a, b) => (b.stats?.totalVolume || 0) - (a.stats?.totalVolume || 0));

  const handlePrint = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(16, 61, 49);
    doc.text('Summit Commercial Group', 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Agent Performance Report', 105, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${today}`, 105, 38, { align: 'center' });
    
    // Summary Stats
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Executive Summary', 14, 55);
    
    const summaryStats = [
      ['Total Deals', deals.length.toString()],
      ['Active Agents', displayAgents.length.toString()],
      ['Total Volume (Active)', `$${(totalVolume / 1000000).toFixed(2)}M`],
      ['Closed Deals', closedCount.toString()],
    ];
    
    autoTable(doc, {
      startY: 60,
      head: [['Metric', 'Value']],
      body: summaryStats,
      theme: 'grid',
      headStyles: { fillColor: [16, 61, 49] }
    });
    
    // Agent Performance Table
    const finalY = ((doc as any).lastAutoTable?.finalY || 100) as number;
    doc.setFontSize(14);
    doc.text('Agent Performance', 14, finalY + 10);
    
    const agentData = sortedAgents.map(user => {
      // Note: user.stats comes from firestore already calculated
      const volume = user.stats?.totalVolume || 0;
      const closed = user.stats?.closedDeals || 0;
      const comm = user.stats?.totalCommissions || 0;
      
      return [
        `${user.firstName} ${user.lastName}`,
        (user.stats?.totalDeals || 0).toString(),
        closed.toString(),
        `$${(volume / 1000000).toFixed(2)}M`,
        `$${(comm / 1000).toFixed(1)}K`
      ];
    });
    
    autoTable(doc, {
      startY: finalY + 15,
      head: [['Agent', 'Total Deals', 'Closed', 'Volume', 'Commission']],
      body: agentData,
      theme: 'striped',
      headStyles: { fillColor: [16, 61, 49] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      }
    });
    
    // Deal Status Breakdown
    const finalY2 = ((doc as any).lastAutoTable?.finalY || 150) as number;
    
    if (finalY2 < 250) {
      doc.setFontSize(14);
      doc.text('Deal Status Breakdown', 14, finalY2 + 10);
      
      const statusData = Object.entries(statusCounts).map(([status, count]) => [
        status,
        count.toString(),
        `${((count / deals.length) * 100).toFixed(1)}%`
      ]);
      
      autoTable(doc, {
        startY: finalY2 + 15,
        head: [['Status', 'Count', 'Percentage']],
        body: statusData,
        theme: 'grid',
        headStyles: { fillColor: [16, 61, 49] }
      });
    }
    
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount} | Confidential | Summit CRM © ${new Date().getFullYear()}`,
        105,
        285,
        { align: 'center' }
      );
    }
    
    doc.save(`Agent_Report_${today.replace(/\//g, '-')}.pdf`);
  };

  const handleExport = () => {
    const headers = "ID,Address,Type,Status,Asking Price,Offers,Highest Offer,Owner Name\n";
    const rows = deals.map(d => 
      `${d.id},"${d.propertyAddress}",${d.propertyType},${d.status},${d.askingPrice},${d.offersReceived},${d.highestOffer},"${d.owner.name}"`
    ).join("\n");
    
    const csvContent = headers + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Deal_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto pb-10 print:max-w-none print:pb-0 print:w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 print:mb-4 print:border-b-2 print:border-slate-800 print:pb-4">
        <div>
           <div className="hidden print:block text-2xl font-bold text-summit-900 mb-1">Summit Commercial Group</div>
           <h1 className="text-2xl font-bold text-slate-900 print:text-xl">Performance Reports</h1>
           <p className="text-slate-500 print:text-sm">Market analysis and portfolio performance metrics.</p>
           <p className="hidden print:block text-xs text-slate-400 mt-1">Generated on {new Date().toLocaleDateString()}</p>
        </div>
        <div className="flex gap-3 print-hidden">
           <button onClick={handlePrint} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2">
             <Download size={16} /> Download PDF Report
           </button>
           <button onClick={handleExport} className="bg-summit-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-summit-800 flex items-center gap-2 shadow-lg shadow-summit-900/10">
             <Download size={16} /> Export CSV
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 print:grid-cols-4 print:gap-4 print:mb-6">
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:border-slate-300">
            <p className="text-slate-500 text-sm font-semibold uppercase">Total Volume (Active)</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">${(totalVolume / 1000000).toFixed(1)}M</h3>
            {deals.length > 0 && (
              <div className="flex items-center text-green-600 text-xs font-bold mt-2">
                 <ArrowUp size={12} className="mr-1" /> Portfolio Active
              </div>
            )}
         </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:border-slate-300">
            <p className="text-slate-500 text-sm font-semibold uppercase">Avg Deal Size</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">${(avgPrice / 1000000).toFixed(1)}M</h3>
            <div className="flex items-center text-slate-400 text-xs font-bold mt-2">
               Based on {deals.length} deals
            </div>
         </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:border-slate-300">
            <p className="text-slate-500 text-sm font-semibold uppercase">Closed Deals (YTD)</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">{closedCount}</h3>
            {closedCount > 0 ? (
               <div className="flex items-center text-green-600 text-xs font-bold mt-2">
                  <ArrowUp size={12} className="mr-1" /> On track
               </div>
            ) : (
               <div className="flex items-center text-slate-400 text-xs font-bold mt-2">
                  No closed deals yet
               </div>
            )}
         </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:border-slate-300">
            <p className="text-slate-500 text-sm font-semibold uppercase">Avg Days to Close</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">{avgDaysToClose}</h3>
            <div className="flex items-center text-slate-400 text-xs font-bold mt-2">
               Days
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:border-slate-300 break-inside-avoid">
           <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
             <PieChart size={20} className="text-summit-accent print:text-slate-800" /> Deal Pipeline Distribution
           </h3>
           <div className="space-y-4">
              {deals.length > 0 ? [
                { label: 'Active', val: getPercent(DealStatus.ACTIVE), color: 'bg-green-500' },
                { label: 'Under Review', val: getPercent(DealStatus.UNDER_REVIEW), color: 'bg-blue-500' },
                { label: 'Negotiating', val: getPercent(DealStatus.NEGOTIATING), color: 'bg-amber-500' },
                { label: 'Closing', val: getPercent(DealStatus.CLOSING), color: 'bg-purple-500' }
              ].map(item => (
                <div key={item.label}>
                   <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 font-medium">{item.label}</span>
                      <span className="text-slate-900 font-bold">{item.val}%</span>
                   </div>
                   <div className="w-full bg-slate-100 rounded-full h-2.5 print:bg-slate-200">
                      <div className={`h-2.5 rounded-full ${item.color} print:bg-slate-800`} style={{ width: `${item.val}%` }}></div>
                   </div>
                </div>
              )) : (
                <div className="text-center text-slate-400 py-8">
                  No deals in pipeline.
                </div>
              )}
           </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:border-slate-300 break-inside-avoid">
           <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
             <BarChart size={20} className="text-summit-accent print:text-slate-800" /> Revenue Volume
           </h3>
           {closedVolume > 0 || totalVolume > 0 ? (
             <div className="flex items-end justify-between h-48 pt-4 gap-2">
                {[10, 25, 15, 40, 30, 60].map((h, i) => {
                   const val = (totalVolume * (h/100)).toFixed(0);
                   return (
                     <div key={i} className="w-full flex flex-col items-center group">
                        <div className="mb-2 opacity-0 group-hover:opacity-100 text-xs font-bold text-slate-600 transition-opacity print:opacity-100">
                          ${val}
                        </div>
                        <div 
                          className="w-full bg-summit-800 rounded-t-sm hover:bg-summit-accent transition-colors duration-300 print:bg-slate-800" 
                          style={{ height: `${h}%` }}
                        ></div>
                        <div className="mt-2 text-xs text-slate-400 font-medium">
                          M-{i+1}
                        </div>
                     </div>
                   );
                })}
             </div>
           ) : (
             <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
               Not enough data to forecast.
             </div>
           )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden print:col-span-2 print:border-slate-300 break-inside-avoid mt-6 print:mt-0">
           <div className="p-6 border-b border-slate-100 print:border-slate-300 print:bg-slate-50">
              <h3 className="font-bold text-slate-800">Agent Performance</h3>
           </div>
           {sortedAgents.length > 0 ? (
             <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold print:bg-slate-100">
                   <tr>
                      <th className="p-4">Agent Name</th>
                      <th className="p-4">Deals Closed</th>
                      <th className="p-4">Volume</th>
                      <th className="p-4">Commission (Est)</th>
                      <th className="p-4 print-hidden">Trend</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                   {sortedAgents.map((agent) => (
                     <tr key={agent.id} className="hover:bg-slate-50 print:bg-white">
                        <td className="p-4 font-bold text-slate-800">{agent.firstName} {agent.lastName}</td>
                        <td className="p-4 text-slate-600">{agent.stats?.closedDeals || 0}</td>
                        <td className="p-4 text-slate-600">${((agent.stats?.totalVolume || 0) / 1000000).toFixed(1)}M</td>
                        <td className="p-4 font-mono text-green-600 font-medium">${((agent.stats?.totalCommissions || 0) / 1000).toFixed(1)}k</td>
                        <td className="p-4 print-hidden">
                          {(agent.stats?.closedDeals || 0) > 0 ? (
                            <TrendingUp size={16} className="text-green-500" />
                          ) : (
                             <span className="text-slate-300">-</span>
                          )}
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
           ) : (
             <div className="p-8 text-center text-slate-400">
               No agent performance data available.
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
