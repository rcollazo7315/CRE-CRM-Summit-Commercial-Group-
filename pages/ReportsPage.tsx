import React from 'react';
import { BarChart, TrendingUp, PieChart, Calendar, Download, Printer, ArrowUp, ArrowDown } from 'lucide-react';
import { Deal, DealStatus } from '../types';

interface ReportsPageProps {
  deals: Deal[];
}

const ReportsPage: React.FC<ReportsPageProps> = ({ deals }) => {
  // Mock aggregations
  const totalVolume = deals.reduce((acc, d) => acc + d.askingPrice, 0);
  const avgPrice = totalVolume / (deals.length || 1);
  const activeCount = deals.filter(d => d.status !== DealStatus.ARCHIVED).length;

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // CSV Generation Logic
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
    <div className="max-w-7xl mx-auto pb-10 print:max-w-none print:pb-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 print:hidden">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Performance Reports</h1>
           <p className="text-slate-500">Market analysis and portfolio performance metrics.</p>
        </div>
        <div className="flex gap-3">
           <button onClick={handlePrint} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2">
             <Printer size={16} /> Print
           </button>
           <button onClick={handleExport} className="bg-summit-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-summit-800 flex items-center gap-2 shadow-lg shadow-summit-900/10">
             <Download size={16} /> Export CSV
           </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 print:grid-cols-4 print:gap-4">
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:border-slate-300">
            <p className="text-slate-500 text-sm font-semibold uppercase">Total Volume</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">${(totalVolume / 1000000).toFixed(1)}M</h3>
            <div className="flex items-center text-green-600 text-xs font-bold mt-2">
               <ArrowUp size={12} className="mr-1" /> 12% vs last quarter
            </div>
         </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:border-slate-300">
            <p className="text-slate-500 text-sm font-semibold uppercase">Avg Deal Size</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">${(avgPrice / 1000000).toFixed(1)}M</h3>
            <div className="flex items-center text-red-500 text-xs font-bold mt-2">
               <ArrowDown size={12} className="mr-1" /> 2% vs last quarter
            </div>
         </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:border-slate-300">
            <p className="text-slate-500 text-sm font-semibold uppercase">Closed Deals (YTD)</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">14</h3>
            <div className="flex items-center text-green-600 text-xs font-bold mt-2">
               <ArrowUp size={12} className="mr-1" /> 3 more than goal
            </div>
         </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:border-slate-300">
            <p className="text-slate-500 text-sm font-semibold uppercase">Avg Days to Close</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">92</h3>
            <div className="flex items-center text-slate-400 text-xs font-bold mt-2">
               No change
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
        
        {/* CSS Chart Mockup 1: Deal Status Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:border-slate-300 break-inside-avoid">
           <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
             <PieChart size={20} className="text-summit-accent" /> Deal Pipeline Distribution
           </h3>
           <div className="space-y-4">
              {[
                { label: 'Active', val: 45, color: 'bg-green-500' },
                { label: 'Under Review', val: 30, color: 'bg-blue-500' },
                { label: 'Negotiating', val: 15, color: 'bg-amber-500' },
                { label: 'Closing', val: 10, color: 'bg-purple-500' }
              ].map(item => (
                <div key={item.label}>
                   <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 font-medium">{item.label}</span>
                      <span className="text-slate-900 font-bold">{item.val}%</span>
                   </div>
                   <div className="w-full bg-slate-100 rounded-full h-2.5 print:bg-slate-200">
                      <div className={`h-2.5 rounded-full ${item.color} print:bg-slate-600`} style={{ width: `${item.val}%` }}></div>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* CSS Chart Mockup 2: Monthly Revenue */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print:border-slate-300 break-inside-avoid">
           <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
             <BarChart size={20} className="text-summit-accent" /> Revenue Forecast (6 Months)
           </h3>
           <div className="flex items-end justify-between h-48 pt-4 gap-2">
              {[35, 55, 40, 70, 60, 85].map((h, i) => (
                 <div key={i} className="w-full flex flex-col items-center group">
                    <div className="mb-2 opacity-0 group-hover:opacity-100 text-xs font-bold text-slate-600 transition-opacity">
                      ${h}k
                    </div>
                    <div 
                      className="w-full bg-summit-800 rounded-t-sm hover:bg-summit-accent transition-colors duration-300 print:bg-slate-800" 
                      style={{ height: `${h}%` }}
                    ></div>
                    <div className="mt-2 text-xs text-slate-400 font-medium">
                      {['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'][i]}
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* Agent Performance Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden print:col-span-2 print:border-slate-300 break-inside-avoid mt-6">
           <div className="p-6 border-b border-slate-100 print:border-slate-300">
              <h3 className="font-bold text-slate-800">Top Agent Performance</h3>
           </div>
           <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold print:bg-slate-100">
                 <tr>
                    <th className="p-4">Agent Name</th>
                    <th className="p-4">Deals Closed</th>
                    <th className="p-4">Volume</th>
                    <th className="p-4">Commission (Est)</th>
                    <th className="p-4">Trend</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                 {[
                   { name: 'Alex Mercer', closed: 14, vol: '$125M', comm: '$3.1M', trend: 'up' },
                   { name: 'Sarah Connor', closed: 11, vol: '$98M', comm: '$2.4M', trend: 'up' },
                   { name: 'James Wright', closed: 9, vol: '$82M', comm: '$2.0M', trend: 'down' },
                 ].map((agent, i) => (
                   <tr key={i} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-800">{agent.name}</td>
                      <td className="p-4 text-slate-600">{agent.closed}</td>
                      <td className="p-4 text-slate-600">{agent.vol}</td>
                      <td className="p-4 font-mono text-green-600 font-medium">{agent.comm}</td>
                      <td className="p-4">
                        {agent.trend === 'up' 
                          ? <TrendingUp size={16} className="text-green-500" /> 
                          : <TrendingUp size={16} className="text-red-400 rotate-180" />}
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
