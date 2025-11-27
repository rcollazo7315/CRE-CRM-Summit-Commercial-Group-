
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
            className="bg-summit-