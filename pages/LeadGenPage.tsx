
import React, { useState, useMemo } from 'react';
import { Plus, TrendingUp, Phone, Users, FileText, ArrowUp, ArrowDown, Download, Save, X, Calendar, Edit, Trash2 } from 'lucide-react';
import { LeadGenLog } from '../types';

interface LeadGenPageProps {
  logs: LeadGenLog[];
  onSaveLog: (log: LeadGenLog) => void;
  onDeleteLog: (logId: string) => void; 
}

type TimeFrame = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

const LeadGenPage: React.FC<LeadGenPageProps> = ({ logs, onSaveLog, onDeleteLog }) => {
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

  const handleDeleteClick = (logId: string) => {
    if (confirm("Are you sure you want to delete this activity log? This action cannot be undone.")) {
      onDeleteLog(logId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newLog = {
      ...formData,
      id: editingId || Math.random().toString(36).substr(2, 9),
    } as LeadGenLog;
    
    onSaveLog(newLog);
    setIsModalOpen(false);
    
    // Reset form
    if (editingId) {
        setEditingId(null);
        setFormData(prev => ({ ...prev, callsMade: 0, lettersSent: 0, socialPosts: 0, targetedEmails: 0, networkingEvents: 0, clientMeetings: 0, referralsGenerated: 0, propertyTours: 0, bovsSubmitted: 0, listingsSigned: 0, offersMade: 0, underContract: 0, closedDeals: 0, closedAmount: 0, notes: '' }));
    } else {
        setFormData(prev => ({ ...prev, callsMade: 0, lettersSent: 0, socialPosts: 0, targetedEmails: 0, networkingEvents: 0, clientMeetings: 0, referralsGenerated: 0, propertyTours: 0, bovsSubmitted: 0, listingsSigned: 0, offersMade: 0, underContract: 0, closedDeals: 0, closedAmount: 0, notes: '' }));
    }
  };

  // --- Aggregation Engine ---
  const isInBucket = (dateStr: string, bucketIndex: number, tf: TimeFrame) => {
    const date = new Date(dateStr);
    const today = new Date();
    
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
      const chunkStart = bucketIndex * 90;
      const chunkEnd = (bucketIndex + 1) * 90;
      return diffDays >= chunkStart && diffDays < chunkEnd;
    } else { // Yearly
      return date.getFullYear() === (today.getFullYear() - bucketIndex);
    }
  };

  const getAggregatedData = (bucketIndex: number) => {
    const filtered = logs.filter(l => isInBucket(l.date, bucketIndex, reportTimeframe));
    // Explicitly define numeric keys to sum
    const keys: (keyof LeadGenLog)[] = [
      'callsMade', 'lettersSent', 'socialPosts', 'targetedEmails', 
      'networkingEvents', 'clientMeetings', 'referralsGenerated', 
      'propertyTours', 'bovsSubmitted', 'listingsSigned', 
      'offersMade', 'underContract', 'closedDeals', 'closedAmount'
    ];
    
    const result: any = {};
    keys.forEach(key => {
        result[key] = filtered.reduce((acc, curr) => acc + (typeof curr[key] === 'number' ? (curr[key] as number) : 0), 0);
    });
    
    return result;
  };

  const currentPeriod = useMemo(() => getAggregatedData(0), [logs, reportTimeframe]);

  // --- Chart Helper Component ---
  const CategoryChart = ({ title, icon: Icon, color, metricKeys, labelMap }: any) => {
    const trendData = [5, 4, 3, 2, 1, 0].map(i => {
      const d = getAggregatedData(i);
      const total = metricKeys.reduce((acc: number, key: string) => acc + (d[key as keyof typeof d] || 0), 0);
      return { label: i === 0 ? 'Current' : `-${i}`, value: total };
    }).reverse();

    const maxValue = Math.max(...trendData.map(d => d.value), 1);
    const currentTotal = trendData[trendData.length - 1].value;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
           <div>
             <h3 className="flex items-center gap-2 font-bold text-slate-800 text-lg">
               <Icon size={18} className={color} /> {title}
             </h3>
             <p className="text-slate-400 text-xs mt-1 font-medium uppercase tracking-wider">{reportTimeframe} Performance</p>
           </div>
        </div>

        <div className="mb-6">
           <span className="text-3xl font-bold text-slate-900">{currentTotal.toLocaleString()}</span>
           <span className="text-slate-500 text-sm ml-2">total actions</span>
        </div>

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
            className="bg-summit-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-summit-800 flex items-center gap-2 shadow-lg shadow-summit-900/10"
          >
            <Plus size={18} /> Log Activity
          </button>
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="flex justify-center mb-8">
        <div className="bg-white p-1 rounded-lg border border-slate-200 inline-flex shadow-sm">
          {(['weekly', 'monthly', 'quarterly', 'yearly'] as TimeFrame[]).map(tf => (
            <button
              key={tf}
              onClick={() => setReportTimeframe(tf)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${reportTimeframe === tf ? 'bg-summit-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <CategoryChart 
          title="Outreach" 
          icon={Phone} 
          color="text-blue-600"
          metricKeys={['callsMade', 'targetedEmails', 'socialPosts', 'lettersSent']}
          labelMap={{ callsMade: 'Calls Made', targetedEmails: 'Emails Sent', socialPosts: 'Social Posts', lettersSent: 'Letters Sent' }}
        />
        <CategoryChart 
          title="Engagement" 
          icon={Users} 
          color="text-purple-600"
          metricKeys={['clientMeetings', 'networkingEvents', 'referralsGenerated']}
          labelMap={{ clientMeetings: 'Client Meetings', networkingEvents: 'Networking', referralsGenerated: 'Referrals' }}
        />
        <CategoryChart 
          title="Pipeline" 
          icon={FileText} 
          color="text-amber-600"
          metricKeys={['propertyTours', 'bovsSubmitted', 'listingsSigned', 'offersMade']}
          labelMap={{ propertyTours: 'Tours', bovsSubmitted: 'BOVs', listingsSigned: 'Listings', offersMade: 'Offers' }}
        />
        <CategoryChart 
          title="Results" 
          icon={TrendingUp} 
          color="text-green-600"
          metricKeys={['underContract', 'closedDeals']}
          labelMap={{ underContract: 'Under Contract', closedDeals: 'Closed Deals' }}
        />
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
         <div className="p-5 border-b border-slate-100">
           <h3 className="font-bold text-slate-800">Recent Logs</h3>
         </div>
         <div className="overflow-x-auto">
           <table className="w-full text-left">
             <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
               <tr>
                 <th className="p-4">Date</th>
                 <th className="p-4 text-center">Calls</th>
                 <th className="p-4 text-center">Emails</th>
                 <th className="p-4 text-center">Mtgs</th>
                 <th className="p-4 text-center">Tours</th>
                 <th className="p-4 text-center">Offers</th>
                 <th className="p-4 text-center">Closed</th>
                 <th className="p-4">Notes</th>
                 <th className="p-4 text-center">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {logs.length > 0 ? logs.map(log => (
                 <tr key={log.id} className="hover:bg-slate-50">
                   <td className="p-4 font-medium text-slate-700 whitespace-nowrap">{new Date(log.date).toLocaleDateString()}</td>
                   <td className="p-4 text-center text-slate-600">{log.callsMade}</td>
                   <td className="p-4 text-center text-slate-600">{log.targetedEmails}</td>
                   <td className="p-4 text-center text-slate-600">{log.clientMeetings}</td>
                   <td className="p-4 text-center text-slate-600">{log.propertyTours}</td>
                   <td className="p-4 text-center text-slate-600">{log.offersMade}</td>
                   <td className="p-4 text-center text-green-600 font-bold">{log.closedDeals}</td>
                   <td className="p-4 text-sm text-slate-500 max-w-xs truncate">{log.notes || '-'}</td>
                   <td className="p-4 text-center flex items-center justify-center gap-2">
                     <button onClick={() => handleEditClick(log)} className="p-1.5 text-slate-400 hover:text-summit-900 rounded hover:bg-slate-100">
                       <Edit size={16} />
                     </button>
                     <button onClick={() => handleDeleteClick(log.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50">
                       <Trash2 size={16} />
                     </button>
                   </td>
                 </tr>
               )) : (
                 <tr>
                   <td colSpan={9} className="p-12 text-center text-slate-400">No logs found. Start tracking your activity!</td>
                 </tr>
               )}
             </tbody>
           </table>
         </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-slate-100">
                 <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Activity Log' : 'New Activity Log'}</h2>
                 <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                 <div className="mb-6">
                   <label className="block text-sm font-medium text-slate-700 mb-2">Log Date</label>
                   <div className="relative">
                      <Calendar size={18} className="absolute left-3 top-3 text-slate-400" />
                      <input 
                        type="date" 
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none" 
                        required
                      />
                   </div>
                 </div>

                 <div className="space-y-6">
                    {/* Outreach Section */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                       <h3 className="font-bold text-sm text-slate-500 uppercase mb-3 flex items-center gap-2"><Phone size={14} /> Outreach</h3>
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { label: 'Calls Made', name: 'callsMade' },
                            { label: 'Emails Sent', name: 'targetedEmails' },
                            { label: 'Social Posts', name: 'socialPosts' },
                            { label: 'Letters Sent', name: 'lettersSent' }
                          ].map(field => (
                            <div key={field.name}>
                               <label className="block text-xs font-semibold text-slate-500 mb-1">{field.label}</label>
                               <input type="number" name={field.name} value={(formData as any)[field.name]} onChange={handleChange} min="0" className="w-full p-2 border border-slate-300 rounded outline-none focus:border-summit-accent" />
                            </div>
                          ))}
                       </div>
                    </div>

                    {/* Engagement Section */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                       <h3 className="font-bold text-sm text-slate-500 uppercase mb-3 flex items-center gap-2"><Users size={14} /> Engagement</h3>
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {[
                            { label: 'Client Meetings', name: 'clientMeetings' },
                            { label: 'Networking Events', name: 'networkingEvents' },
                            { label: 'Referrals', name: 'referralsGenerated' }
                          ].map(field => (
                            <div key={field.name}>
                               <label className="block text-xs font-semibold text-slate-500 mb-1">{field.label}</label>
                               <input type="number" name={field.name} value={(formData as any)[field.name]} onChange={handleChange} min="0" className="w-full p-2 border border-slate-300 rounded outline-none focus:border-summit-accent" />
                            </div>
                          ))}
                       </div>
                    </div>

                    {/* Pipeline Section */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                       <h3 className="font-bold text-sm text-slate-500 uppercase mb-3 flex items-center gap-2"><FileText size={14} /> Pipeline & Deals</h3>
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {[
                            { label: 'Property Tours', name: 'propertyTours' },
                            { label: 'BOVs Submitted', name: 'bovsSubmitted' },
                            { label: 'Listings Signed', name: 'listingsSigned' },
                            { label: 'Offers Made', name: 'offersMade' },
                            { label: 'Under Contract', name: 'underContract' },
                            { label: 'Closed Deals', name: 'closedDeals' }
                          ].map(field => (
                            <div key={field.name}>
                               <label className="block text-xs font-semibold text-slate-500 mb-1">{field.label}</label>
                               <input type="number" name={field.name} value={(formData as any)[field.name]} onChange={handleChange} min="0" className="w-full p-2 border border-slate-300 rounded outline-none focus:border-summit-accent" />
                            </div>
                          ))}
                       </div>
                       <div className="mt-3">
                           <label className="block text-xs font-semibold text-slate-500 mb-1">Closed Volume ($)</label>
                           <input type="number" name="closedAmount" value={formData.closedAmount} onChange={handleChange} min="0" className="w-full p-2 border border-slate-300 rounded outline-none focus:border-summit-accent" />
                       </div>
                    </div>

                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-2">Daily Notes</label>
                       <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full p-3 border border-slate-300 rounded-lg outline-none" placeholder="Key wins, obstacles, or reminders..." />
                    </div>
                 </div>

                 <div className="flex justify-end gap-3 mt-8">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-summit-900 text-white rounded-lg font-bold hover:bg-summit-800 shadow-lg shadow-summit-900/10">Save Log</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default LeadGenPage;
