
import React, { useState } from 'react';
import { BarChart, TrendingUp, PieChart, Download, ArrowUp, Activity, FileText, Briefcase, CalendarClock, Target, Users } from 'lucide-react';
import { Deal, DealStatus, UserAccount, LeadGenLog } from '../types.ts';
import KpiDashboard from '../components/KpiDashboard.tsx';
import { generatePipelineReport, generateProductionReport, generateKPIReport, generateLeaseReport, generateFirmPerformanceReport } from '../utils/pdfGenerator.ts';

interface ReportsPageProps {
  deals: Deal[];
  users: UserAccount[];
  currentUser: UserAccount | null;
  logs?: LeadGenLog[];
}

const ReportsPage: React.FC<ReportsPageProps> = ({ deals, users, currentUser, logs = [] }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'kpis'>('overview');

  // --- Dynamic Calculations ---
  const closedDeals = deals.filter(d => d.status === DealStatus.COMPLETED);
  const closedCount = closedDeals.length;
  const closedVolume = closedDeals.reduce((acc: number, d) => acc + (d.closingPrice || d.askingPrice), 0);
  
  const totalVolume = deals.reduce((acc: number, d) => acc + d.askingPrice, 0);
  const avgPrice = deals.length > 0 ? totalVolume / deals.length : 0;

  const daysToCloseSum = closedDeals.reduce((acc: number, d) => {
    const start = new Date(d.createdAt).getTime();
    const end = d.closedDate ? new Date(d.closedDate).getTime() : new Date().getTime();
    const days = (Number(end) - Number(start)) / (1000 * 3600 * 24);
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

  const sortedAgents = [...displayAgents].sort((a, b) => Number(b.stats?.totalVolume || 0) - Number(a.stats?.totalVolume || 0));

  return (
    <div className="max-w-7xl mx-auto pb-10 print:max-w-none print:pb-0 print:w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 print:mb-4 print:border-b-2 print:border-slate-800 print:pb-4">
        <div>
           <div className="hidden print:block text-2xl font-bold text-summit-900 mb-1">Summit Commercial Group</div>
           <h1 className="text-2xl font-bold text-slate-900 print:text-xl">Performance Reports</h1>
           <p className="text-slate-500 print:text-sm">Consolidated market analysis and portfolio metrics.</p>
        </div>
        {currentUser?.role === 'admin' && (
            <button 
                onClick={() => generateFirmPerformanceReport(users)}
                className="bg-summit-900 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-summit-800 shadow-lg shadow-summit-900/10 transition-all"
            >
                <Users size={18} /> Download Firm-Wide Audit
            </button>
        )}
      </div>

      {/* Report Generation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-5 rounded-xl shadow-lg flex flex-col justify-between group cursor-pointer hover:shadow-xl transition-all h-full" onClick={() => generatePipelineReport(deals)}>
           <div>
              <div className="p-2 bg-white/10 w-fit rounded-lg mb-3">
                 <Briefcase size={20} className="text-emerald-400" />
              </div>
              <h3 className="font-bold text-base">Pipeline & Forecast</h3>
              <p className="text-slate-400 text-xs mt-1">Weighted commission projections.</p>
           </div>
           <div className="mt-4 flex justify-end"><Download size={20} className="opacity-50 group-hover:opacity-100 transition-opacity" /></div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col justify-between group cursor-pointer hover:border-summit-accent transition-all h-full" onClick={() => generateProductionReport(deals)}>
           <div>
              <div className="p-2 bg-slate-100 w-fit rounded-lg mb-3">
                 <FileText size={20} className="text-slate-600" />
              </div>
              <h3 className="font-bold text-base text-slate-800">Closed Production</h3>
              <p className="text-slate-500 text-xs mt-1">Historical transaction record.</p>
           </div>
           <div className="mt-4 flex justify-end"><Download size={20} className="text-slate-300 group-hover:text-summit-accent transition-colors" /></div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col justify-between group cursor-pointer hover:border-summit-accent transition-all h-full" onClick={() => generateKPIReport(currentUser, deals, logs)}>
           <div>
              <div className="p-2 bg-blue-50 w-fit rounded-lg mb-3">
                 <Target size={20} className="text-blue-600" />
              </div>
              <h3 className="font-bold text-base text-slate-800">Executive KPI Audit</h3>
              <p className="text-slate-500 text-xs mt-1">Activity funnel & win rates.</p>
           </div>
           <div className="mt-4 flex justify-end"><Download size={20} className="text-slate-300 group-hover:text-summit-accent transition-colors" /></div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col justify-between group cursor-pointer hover:border-summit-accent transition-all h-full" onClick={() => generateLeaseReport(deals)}>
           <div>
              <div className="p-2 bg-purple-50 w-fit rounded-lg mb-3">
                 <CalendarClock size={20} className="text-purple-600" />
              </div>
              <h3 className="font-bold text-base text-slate-800">Lease Schedule</h3>
              <p className="text-slate-500 text-xs mt-1">Expirations & critical dates.</p>
           </div>
           <div className="mt-4 flex justify-end"><Download size={20} className="text-slate-300 group-hover:text-summit-accent transition-colors" /></div>
        </div>
      </div>

      <div className="flex gap-6 mb-8 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`pb-4 px-2 font-medium text-sm transition-all border-b-2 ${activeTab === 'overview' ? 'border-summit-accent text-summit-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Overview & Pipeline
        </button>
        <button 
          onClick={() => setActiveTab('kpis')}
          className={`pb-4 px-2 font-medium text-sm transition-all border-b-2 flex items-center gap-2 ${activeTab === 'kpis' ? 'border-summit-accent text-summit-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Activity size={16} /> Attribution & KPIs
        </button>
      </div>

      {activeTab === 'kpis' ? (
        <KpiDashboard deals={deals} logs={logs} />
      ) : (
        <>
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
                  <h3 className="font-bold text-slate-800">Agent Performance League Table</h3>
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
        </>
      )}
    </div>
  );
};

export default ReportsPage;
