
import React, { useState, useMemo } from 'react';
import { Plus, TrendingUp, Phone, Users, FileText, ArrowUp, ArrowDown, Download, Save, X, Calendar, Edit } from 'lucide-react';
import { LeadGenLog } from '../types';

interface LeadGenPageProps {
  logs: LeadGenLog[];
  onSaveLog: (log: LeadGenLog) => void;
}

type TimeFrame = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

const LeadGenPage: React.FC<LeadGenPageProps> = ({ logs, onSaveLog }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reportTimeframe, setReportTimeframe] = useState<TimeFrame>('monthly');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<LeadGenLog>>({
    date: new Date().toISOString().split('T')[0],
    callsMade: 0,
    lettersSent: 0,
    socialPosts: 0,
    targetedEmails: 0,
    networkingEvents: 0,
    clientMeetings: 0,
    referralsGenerated: 0,
    propertyTours: 0,
    bovsSubmitted: 0,
    listingsSigned: 0,
    offersMade: 0,
    underContract: 0,
    closedDeals: 0,
    closedAmount: 0,
    notes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      callsMade: 0,
      lettersSent: 0,
      socialPosts: 0,
      targetedEmails: 0,
      networkingEvents: 0,
      clientMeetings: 0,
      referralsGenerated: 0,
      propertyTours: 0,
      bovsSubmitted: 0,
      listingsSigned: 0,
      offersMade: 0,
      underContract: 0,
      closedDeals: 0,
      closedAmount: 0,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (log: LeadGenLog) => {
    setEditingId(log.id);
    setFormData(log);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newLog = {
      ...formData,
      id: editingId || Math.random().toString(36).substr(2, 9),
    } as LeadGenLog;
    
    onSaveLog(newLog);
    setIsModalOpen(false);
    
    // Reset form if we were editing to avoid stale state next time, though handleAddNew handles this mostly
    if (editingId) {
        setEditingId(null);
        setFormData(prev => ({ ...prev, callsMade: 0, lettersSent: 0, socialPosts: 0, targetedEmails: 0, networkingEvents: 0, clientMeetings: 0, referralsGenerated: 0, propertyTours: 0, bovsSubmitted: 0, listingsSigned: 0, offersMade: 0, underContract: 0, closedDeals: 0, closedAmount: 0, notes: '' }));
    } else {
        // Just reset numbers but keep date for convenience if adding sequentially
        setFormData(prev => ({ ...prev, callsMade: 0, lettersSent: 0, socialPosts: 0, targetedEmails: 0, networkingEvents: 0, clientMeetings: 0, referralsGenerated: 0, propertyTours: 0, bovsSubmitted: 0, listingsSigned: 0, offersMade: 0, underContract: 0, closedDeals: 0, closedAmount: 0, notes: '' }));
    }
  };

  // --- Aggregation Engine ---
  
  // Helper to check if a date falls in a specific bucket relative to today
  const isInBucket = (dateStr: string, bucketIndex: number, tf: TimeFrame) => {
    const date = new Date(dateStr);
    const today = new Date();
    
    // Normalize time
    date.setHours(0,0,0,0);
    today.setHours(0,0,0,0);

    const diffTime = today.getTime() - date.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);

    if (tf === 'weekly') {
      const startOfThisWeek = today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1);
      const weekStart = new Date(today);
      weekStart.setDate(startOfThisWeek);
      weekStart.setDate(weekStart.getDate() - (bucketIndex * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return date >= weekStart && date <= weekEnd;
    } else if (tf === 'monthly') {
      const targetMonth = new Date(today.getFullYear(), today.getMonth() - bucketIndex, 1);
      return date.getMonth() === targetMonth.getMonth() && date.getFullYear() === targetMonth.getFullYear();
    } else if (tf === 'quarterly') {
      const currentQuarter = Math.floor((today.getMonth() + 3) / 3);
      const targetQuarterVal = currentQuarter - bucketIndex; // logic simplified for demo
      // Simple 90 day chunks for demo robust quarter logic
      const chunkStart = bucketIndex * 90;
      const chunkEnd = (bucketIndex + 1) * 90;
      return diffDays >= chunkStart && diffDays < chunkEnd;
    } else { // Yearly
      return date.getFullYear() === (today.getFullYear() - bucketIndex);
    }
  };

  const getAggregatedData = (bucketIndex: number) => {
    const filtered = logs.filter(l => isInBucket(l.date, bucketIndex, reportTimeframe));
    const sum = (key: keyof LeadGenLog) => filtered.reduce((acc, curr) => acc + (typeof curr[key] === 'number' ? (curr[key] as number) : 0), 0);
    
    return {
      callsMade: sum('callsMade'),
      lettersSent: sum('lettersSent'),
      socialPosts: sum('socialPosts'),
      targetedEmails: sum('targetedEmails'),
      networkingEvents: sum('networkingEvents'),
      clientMeetings: sum('clientMeetings'),
      referralsGenerated: sum('referralsGenerated'),
      propertyTours: sum('propertyTours'),
      bovsSubmitted: sum('bovsSubmitted'),
      listingsSigned: sum('listingsSigned'),
      offersMade: sum('offersMade'),
      underContract: sum('underContract'),
      closedDeals: sum('closedDeals'),
      closedAmount: sum('closedAmount'),
    };
  };

  const currentPeriod = useMemo(() => getAggregatedData(0), [logs, reportTimeframe]);
  const previousPeriod = useMemo(() => getAggregatedData(1), [logs, reportTimeframe]);

  const calculateChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  // --- Chart Helper Component ---
  const CategoryChart = ({ title, icon: Icon, color, data, metricKeys, labelMap }: any) => {
    // Generate trend data for the last 6 periods
    const trendData = [5, 4, 3, 2, 1, 0].map(i => {
      const d = getAggregatedData(i);
      const total = metricKeys.reduce((acc: number, key: string) => acc + (d[key as keyof typeof d] || 0), 0);
      return { label: i === 0 ? 'Current' : `-${i}`, value: total };
    }).reverse();

    const maxValue = Math.max(...trendData.map(d => d.value), 1);

    const currentTotal = trendData[trendData.length - 1].value;
    const prevTotal = trendData[trendData.length - 2].value;
    const change = calculateChange(currentTotal, prevTotal);

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
           <div>
             <h3 className="flex items-center gap-2 font-bold text-slate-800 text-lg">
               <Icon size={18} className={color} /> {title}
             </h3>
             <p className="text-slate-400 text-xs mt-1 font-medium uppercase tracking-wider">{reportTimeframe} Performance</p>
           </div>
           <div className={`flex items-center text-sm font-bold ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {change >= 0 ? <ArrowUp size={14} className="mr-1" /> : <ArrowDown size={14} className="mr-1" />}
              {Math.abs(change)}%
           </div>
        </div>

        {/* Big Number */}
        <div className="mb-6">
           <span className="text-3xl font-bold text-slate-900">{currentTotal.toLocaleString()}</span>
           <span className="text-slate-500 text-sm ml-2">total actions</span>
        </div>

        {/* Chart */}
        <div className="flex-1 flex items-end gap-2 h-32 mt-auto">
           {trendData.map((d, i) => (
             <div key={i} className="flex-1 flex flex-col items-center group">
               <div 
                  className={`w-full rounded-t-sm transition-all duration-500 relative ${i === trendData.length - 1 ? color.replace('text-', 'bg-') : 'bg-slate-200'}`} 
                  style={{ height: `${(d.value / maxValue) * 100}%` }}
               >
                 <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded pointer-events-none">
                   {d.value}
                 </div>
               </div>
             </div>
           ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400 font-medium">
          <span>Prior</span>
          <span>Current</span>
        </div>

        {/* Breakdown */}
        <div className="mt-6 pt-4 border-t border-slate-50 space-y-2">
           {metricKeys.map((key: string) => (
             <div key={key} className="flex justify-between text-sm">
               <span className="text-slate-600">{labelMap[key]}</span>
               <span className="font-bold text-slate-900">{(currentPeriod as any)[key]}</span>
             </div>
           ))}
        </div>
      </div>
    );
  };

  const downloadReport = () => {
    const headers = "Date,Calls,Emails,Meetings,Tours,Offers,Closed Deals,Volume,Notes\n";
    const rows = logs.map(l => 
      `${l.date},${l.callsMade},${l.targetedEmails},${l.clientMeetings},${l.propertyTours},${l.offersMade},${l.closedDeals},${l.closedAmount},"${l.notes || ''}"`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Activity_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Log Daily Activity</h1>
           <p className="text-slate-500">Track your daily outreach, engagement, and results.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={downloadReport}
            className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2"
          >
            <Download size={18} /> Export Report
          </button>
          <button 
            onClick={handleAddNew}
            className="bg-summit-900 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-summit-900/20 hover:bg-summit-800 transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Log Activity
          </button>
        </div>
      </div>

      {/* Timeframe Controls */}
      <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 inline-flex mb-8">
        {(['weekly', 'monthly', 'quarterly', 'yearly'] as const).map(tf => (
          <button
            key={tf}
            onClick={() => setReportTimeframe(tf)}
            className={`px-4 py-2 rounded-md text-sm font-bold capitalize transition-colors ${reportTimeframe === tf ? 'bg-summit-900 text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* 4-Chart Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
         <CategoryChart 
            title="Outreach" 
            icon={Phone} 
            color="text-blue-500"
            metricKeys={['callsMade', 'targetedEmails', 'lettersSent', 'socialPosts']}
            labelMap={{callsMade: 'Calls', targetedEmails: 'Emails', lettersSent: 'Letters', socialPosts: 'Social'}}
            data={currentPeriod}
         />
         <CategoryChart 
            title="Engagement" 
            icon={Users} 
            color="text-purple-500"
            metricKeys={['clientMeetings', 'networkingEvents', 'propertyTours', 'referralsGenerated']}
            labelMap={{clientMeetings: 'Meetings', networkingEvents: 'Events', propertyTours: 'Tours', referralsGenerated: 'Referrals'}}
            data={currentPeriod}
         />
         <CategoryChart 
            title="Pipeline" 
            icon={FileText} 
            color="text-amber-500"
            metricKeys={['bovsSubmitted', 'listingsSigned', 'offersMade', 'underContract']}
            labelMap={{bovsSubmitted: 'BOVs', listingsSigned: 'Listings', offersMade: 'Offers', underContract: 'Under Contract'}}
            data={currentPeriod}
         />
         <CategoryChart 
            title="Results" 
            icon={TrendingUp} 
            color="text-green-500"
            metricKeys={['closedDeals']} // Amount handled separately if needed
            labelMap={{closedDeals: 'Closed Deals'}}
            data={currentPeriod}
         />
      </div>

      {/* Recent Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
           <h3 className="font-bold text-slate-800">Recent Activity Logs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-xs">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Calls</th>
                <th className="p-4">Emails</th>
                <th className="p-4">Meetings</th>
                <th className="p-4">Tours</th>
                <th className="p-4">Offers</th>
                <th className="p-4">Closed</th>
                <th className="p-4 text-right">Vol ($)</th>
                <th className="p-4">Notes</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.slice(0, 15).map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-900 whitespace-nowrap">{log.date}</td>
                  <td className="p-4 text-slate-600">{log.callsMade}</td>
                  <td className="p-4 text-slate-600">{log.targetedEmails}</td>
                  <td className="p-4 text-slate-600">{log.clientMeetings}</td>
                  <td className="p-4 text-slate-600">{log.propertyTours}</td>
                  <td className="p-4 text-slate-600">{log.offersMade}</td>
                  <td className="p-4 text-slate-600">
                    {log.closedDeals > 0 ? <span className="text-green-600 font-bold">{log.closedDeals}</span> : '-'}
                  </td>
                  <td className="p-4 text-right font-mono text-slate-700">
                    {log.closedAmount > 0 ? `$${(log.closedAmount).toLocaleString()}` : '-'}
                  </td>
                  <td className="p-4 text-slate-500 max-w-xs truncate">{log.notes}</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => handleEditClick(log)}
                      className="text-slate-400 hover:text-summit-accent p-1 transition-colors"
                      title="Edit Entry"
                    >
                      <Edit size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Input Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Activity Log' : 'Log Activity'}</h2>
                <p className="text-sm text-slate-500">{editingId ? `Editing entry for ${formData.date}` : 'Record your daily production numbers.'}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Date Selection */}
              <div className="md:col-span-2">
                 <label className="block text-sm font-medium text-slate-700 mb-1">Activity Date</label>
                 <div className="relative max-w-xs">
                   <Calendar size={18} className="absolute left-3 top-2.5 text-slate-400" />
                   <input 
                     type="date" 
                     name="date"
                     value={formData.date}
                     onChange={handleChange}
                     className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none" 
                     required
                   />
                 </div>
              </div>

              {/* Outreach */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-bold text-slate-800 border-b border-slate-100 pb-2">
                  <Phone size={18} className="text-blue-500" /> Outreach
                </h3>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="text-xs font-semibold text-slate-500 uppercase">Calls Made</label>
                     <input type="number" min="0" name="callsMade" value={formData.callsMade} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg mt-1 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow" />
                   </div>
                   <div>
                     <label className="text-xs font-semibold text-slate-500 uppercase">Targeted Emails</label>
                     <input type="number" min="0" name="targetedEmails" value={formData.targetedEmails} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg mt-1 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow" />
                   </div>
                   <div>
                     <label className="text-xs font-semibold text-slate-500 uppercase">Letters Sent</label>
                     <input type="number" min="0" name="lettersSent" value={formData.lettersSent} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg mt-1 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow" />
                   </div>
                   <div>
                     <label className="text-xs font-semibold text-slate-500 uppercase">Social Posts</label>
                     <input type="number" min="0" name="socialPosts" value={formData.socialPosts} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg mt-1 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow" />
                   </div>
                </div>
              </div>

              {/* Engagement */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-bold text-slate-800 border-b border-slate-100 pb-2">
                  <Users size={18} className="text-purple-500" /> Engagement
                </h3>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="text-xs font-semibold text-slate-500 uppercase">Meetings</label>
                     <input type="number" min="0" name="clientMeetings" value={formData.clientMeetings} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg mt-1 focus:ring-1 focus:ring-purple-500 outline-none transition-shadow" />
                   </div>
                   <div>
                     <label className="text-xs font-semibold text-slate-500 uppercase">Networking Events</label>
                     <input type="number" min="0" name="networkingEvents" value={formData.networkingEvents} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg mt-1 focus:ring-1 focus:ring-purple-500 outline-none transition-shadow" />
                   </div>
                   <div>
                     <label className="text-xs font-semibold text-slate-500 uppercase">Property Tours</label>
                     <input type="number" min="0" name="propertyTours" value={formData.propertyTours} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg mt-1 focus:ring-1 focus:ring-purple-500 outline-none transition-shadow" />
                   </div>
                   <div>
                     <label className="text-xs font-semibold text-slate-500 uppercase">Referrals</label>
                     <input type="number" min="0" name="referralsGenerated" value={formData.referralsGenerated} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg mt-1 focus:ring-1 focus:ring-purple-500 outline-none transition-shadow" />
                   </div>
                </div>
              </div>

              {/* Pipeline */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-bold text-slate-800 border-b border-slate-100 pb-2">
                  <FileText size={18} className="text-amber-500" /> Pipeline
                </h3>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="text-xs font-semibold text-slate-500 uppercase">BOVs Submitted</label>
                     <input type="number" min="0" name="bovsSubmitted" value={formData.bovsSubmitted} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg mt-1 focus:ring-1 focus:ring-amber-500 outline-none transition-shadow" />
                   </div>
                   <div>
                     <label className="text-xs font-semibold text-slate-500 uppercase">Listings Signed</label>
                     <input type="number" min="0" name="listingsSigned" value={formData.listingsSigned} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg mt-1 focus:ring-1 focus:ring-amber-500 outline-none transition-shadow" />
                   </div>
                   <div>
                     <label className="text-xs font-semibold text-slate-500 uppercase">Offers Made</label>
                     <input type="number" min="0" name="offersMade" value={formData.offersMade} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg mt-1 focus:ring-1 focus:ring-amber-500 outline-none transition-shadow" />
                   </div>
                   <div>
                     <label className="text-xs font-semibold text-slate-500 uppercase">Under Contract</label>
                     <input type="number" min="0" name="underContract" value={formData.underContract} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg mt-1 focus:ring-1 focus:ring-amber-500 outline-none transition-shadow" />
                   </div>
                </div>
              </div>

              {/* Results */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-bold text-slate-800 border-b border-slate-100 pb-2">
                  <TrendingUp size={18} className="text-green-500" /> Results
                </h3>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="text-xs font-semibold text-slate-500 uppercase">Closed Deals</label>
                     <input type="number" min="0" name="closedDeals" value={formData.closedDeals} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg mt-1 focus:ring-1 focus:ring-green-500 outline-none transition-shadow" />
                   </div>
                   <div>
                     <label className="text-xs font-semibold text-slate-500 uppercase">Volume ($)</label>
                     <input type="number" min="0" name="closedAmount" value={formData.closedAmount} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg mt-1 focus:ring-1 focus:ring-green-500 outline-none transition-shadow" />
                   </div>
                </div>
                 <div>
                     <label className="text-xs font-semibold text-slate-500 uppercase">Daily Notes</label>
                     <textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg mt-1 focus:ring-1 focus:ring-slate-500 outline-none transition-shadow" rows={2} placeholder="Key wins or focus areas..." />
                 </div>
              </div>

              <div className="md:col-span-2 flex justify-end pt-4 border-t border-slate-100 gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-summit-900 text-white rounded-lg hover:bg-summit-800 font-medium shadow-lg shadow-summit-900/20 transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
                   <Save size={18} /> {editingId ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadGenPage;
