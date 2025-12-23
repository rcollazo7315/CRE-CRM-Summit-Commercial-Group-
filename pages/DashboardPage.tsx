import React, { useState, useEffect } from 'react';
import { Plus, ArrowUpRight, DollarSign, Clock, MessageSquare, Briefcase, FileText, LayoutGrid, Columns, Building2, Trash2, Undo2, Loader2, MapPin } from 'lucide-react';
import { Deal, DealStatus, Task } from '../types.ts';
import { api } from '../services/firestore.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface DashboardPageProps {
  activeTab: string;
  deals: Deal[];
  onAddDeal: () => void;
  onDealClick: (dealId: string) => void;
  onDeleteDeal: (dealId: string) => Promise<void>;
  onRouteChange: (route: string) => void;
  onOpenAi: () => void;
  onSaveDeal: (deal: Deal) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ activeTab, deals, onAddDeal, onDealClick, onDeleteDeal, onRouteChange, onOpenAi, onSaveDeal }) => {
  const { currentUser } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'pipeline'>('grid');
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null);
  
  const activeDealsCount = deals.filter(d => d.status !== DealStatus.COMPLETED && d.status !== DealStatus.ARCHIVED).length;
  const pipelineValue = deals.reduce((acc, curr) => acc + (curr.status !== DealStatus.ARCHIVED && curr.status !== DealStatus.COMPLETED ? curr.askingPrice : 0), 0);

  let displayedDeals = deals;
  if (activeTab === 'closed-deals') {
    displayedDeals = deals.filter(d => d.status === DealStatus.COMPLETED);
  } else if (activeTab === 'deals' || activeTab === 'dashboard') {
    displayedDeals = deals.filter(d => d.status !== DealStatus.COMPLETED && d.status !== DealStatus.ARCHIVED);
  }

  const pipelineStatuses = [DealStatus.ACTIVE, DealStatus.UNDER_REVIEW, DealStatus.NEGOTIATING, DealStatus.CLOSING];

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {activeTab === 'dashboard' ? 'Market Overview' : activeTab === 'closed-deals' ? 'Closed Portfolio' : 'Active Pipeline'}
          </h1>
          <p className="text-slate-500 mt-1">
            {activeTab === 'dashboard' 
              ? `You have ${activeDealsCount} active transactions requiring attention.`
              : `Managing ${displayedDeals.length} ${activeTab === 'closed-deals' ? 'historical' : 'active'} transactions.`}
          </p>
        </div>
        <div className="flex gap-3">
          {(activeTab === 'dashboard' || activeTab === 'deals') && (
            <div className="bg-white p-1 rounded-lg border border-slate-200 flex items-center shadow-sm">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-summit-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutGrid size={20} />
              </button>
              <button 
                onClick={() => setViewMode('pipeline')}
                className={`p-2 rounded-md transition-all ${viewMode === 'pipeline' ? 'bg-slate-100 text-summit-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Columns size={20} />
              </button>
            </div>
          )}
          
          <button onClick={onOpenAi} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2 transition-colors shadow-sm">
            <MessageSquare size={18} className="text-summit-accent" /> AI Assistant
          </button>
          
          {activeTab !== 'closed-deals' && (
            <button onClick={onAddDeal} className="bg-summit-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-summit-800 flex items-center gap-2 shadow-lg shadow-summit-900/10 transition-all transform hover:-translate-y-0.5">
              <Plus size={20} /> New Deal
            </button>
          )}
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 flex-shrink-0">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between group hover:border-summit-accent transition-colors">
             <div>
               <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Total Pipeline Value</p>
               <h3 className="text-3xl font-bold text-slate-900">${(pipelineValue / 1000000).toFixed(1)}M</h3>
               <p className="text-xs text-green-600 font-bold mt-2 flex items-center bg-green-50 w-fit px-2 py-0.5 rounded-full"><ArrowUpRight size={12} className="mr-1"/> +12% MoM</p>
             </div>
             <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-summit-900 group-hover:bg-summit-900 group-hover:text-white transition-all">
               <DollarSign size={28} />
             </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between group hover:border-summit-accent transition-colors">
             <div>
               <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Active Mandates</p>
               <h3 className="text-3xl font-bold text-slate-900">{activeDealsCount}</h3>
               <p className="text-xs text-slate-400 font-medium mt-2">Across all asset classes</p>
             </div>
             <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-summit-900 group-hover:bg-summit-900 group-hover:text-white transition-all">
               <Briefcase size={28} />
             </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between group hover:border-summit-accent transition-colors">
             <div>
               <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Portfolio Insights</p>
               <h3 className="text-3xl font-bold text-slate-900">4.2</h3>
               <p className="text-xs text-blue-600 font-bold mt-2 bg-blue-50 w-fit px-2 py-0.5 rounded-full">Avg Daily Activity</p>
             </div>
             <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-summit-900 group-hover:bg-summit-900 group-hover:text-white transition-all">
               <Clock size={28} />
             </div>
          </div>
        </div>
      )}

      {viewMode === 'grid' || activeTab === 'closed-deals' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
          {displayedDeals.map(deal => (
            <div key={deal.id} onClick={() => onDealClick(deal.id)} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl transition-all cursor-pointer group flex flex-col h-full border-t-4 border-t-transparent hover:border-t-summit-accent">
              <div className="h-56 overflow-hidden relative">
                <img src={deal.imageUrl} alt={deal.propertyAddress} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-900 shadow-sm uppercase tracking-tighter">
                  {deal.status}
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                   <div className="text-[10px] font-black text-summit-accent uppercase tracking-widest bg-summit-accent/10 px-2 py-1 rounded">
                     {deal.propertyType}
                   </div>
                   <div className="text-xs text-slate-400 font-medium">{new Date(deal.lastUpdated).toLocaleDateString()}</div>
                </div>
                <h3 className="font-bold text-xl text-slate-900 mb-2 leading-tight group-hover:text-summit-accent transition-colors">{deal.propertyAddress}</h3>
                <p className="text-slate-500 text-sm mb-6 line-clamp-2 leading-relaxed">{deal.description || 'Professional portfolio asset under active management.'}</p>
                
                <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                   <div className="font-black text-slate-900 text-2xl">${(deal.askingPrice / 1000000).toFixed(1)}M</div>
                   <button 
                     onClick={(e) => { e.stopPropagation(); onDeleteDeal(deal.id); }}
                     className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                   >
                     <Trash2 size={18} />
                   </button>
                </div>
              </div>
            </div>
          ))}
          {displayedDeals.length === 0 && (
            <div className="col-span-full py-32 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <Building2 size={64} className="mx-auto text-slate-200 mb-4" />
              <h3 className="text-xl font-bold text-slate-400 tracking-tight">No Transactions Recorded</h3>
              <p className="text-slate-300 text-sm mt-2">Initialize your pipeline by registering a new asset.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex overflow-x-auto pb-10 gap-6 h-full items-start">
          {pipelineStatuses.map(status => {
            const statusDeals = deals.filter(d => d.status === status);
            return (
              <div key={status} className="min-w-[340px] w-[340px] flex-shrink-0 flex flex-col h-full max-h-[calc(100vh-280px)] bg-slate-100 rounded-3xl border border-slate-200/50">
                <div className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      status === DealStatus.ACTIVE ? 'bg-blue-500' :
                      status === DealStatus.UNDER_REVIEW ? 'bg-amber-500' :
                      status === DealStatus.NEGOTIATING ? 'bg-purple-500' : 'bg-emerald-500'
                    }`}></div>
                    <span className="font-black text-slate-700 text-xs uppercase tracking-widest">{status}</span>
                  </div>
                  <span className="bg-white text-slate-500 text-[10px] font-black px-2 py-1 rounded-full shadow-sm">{statusDeals.length}</span>
                </div>
                
                <div className="p-4 space-y-4 overflow-y-auto flex-1 scrollbar-hide">
                  {statusDeals.map(deal => (
                    <div 
                      key={deal.id} 
                      onClick={() => onDealClick(deal.id)}
                      className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:scale-[1.02] cursor-pointer transition-all group"
                    >
                      <div className="flex gap-4 mb-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
                          <img src={deal.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] text-summit-accent font-black uppercase tracking-tighter truncate">{deal.propertyType}</p>
                          <h4 className="font-bold text-sm text-slate-900 leading-tight truncate group-hover:text-summit-accent transition-colors">{deal.propertyAddress}</h4>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 uppercase font-bold">
                            <MapPin size={8} /> Louisville Metro
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                        <span className="font-black text-slate-900 text-sm">${(deal.askingPrice / 1000).toFixed(0)}K</span>
                        <div className="flex -space-x-2">
                           <div className="w-6 h-6 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-[8px] font-bold text-white uppercase">{deal.owner.name[0]}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;