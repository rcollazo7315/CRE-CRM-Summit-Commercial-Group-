
import React, { useState } from 'react';
import { 
  Plus, ArrowUpRight, DollarSign, Clock, MessageSquare, 
  Briefcase, FileText, LayoutGrid, Columns, Building2, 
  Trash2, MapPin, TrendingUp, Target, Search
} from 'lucide-react';
import { Deal, DealStatus, REPRESENTATION_LABELS } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import UpcomingDeadlinesWidget from '../components/UpcomingDeadlinesWidget.tsx';

interface DashboardPageProps {
  activeTab: string;
  deals: Deal[];
  onAddDeal: () => void;
  onDealClick: (dealId: string) => void;
  onDeleteDeal: (dealId: string) => Promise<void>;
  onRouteChange: (route: string) => void;
  onOpenAi: () => void;
  onSaveDeal: (deal: Deal) => void;
  searchTerm?: string;
  onTaskComplete?: (task: any) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ 
  activeTab, deals, onAddDeal, onDealClick, onDeleteDeal, onRouteChange, onOpenAi, searchTerm 
}) => {
  const { currentUser } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'pipeline'>('grid');
  
  const calculateDealValue = (deal: Deal) => {
    const isLease = deal.representation === 'landlord' || deal.representation === 'tenant';
    if (isLease) {
      // askingPrice is Monthly Rent
      // leaseTerm is Years (default to 1 year/12 months if missing for pipeline estimation)
      const termMonths = (deal.leaseTerm || 1) * 12;
      return deal.askingPrice * termMonths;
    }
    return deal.askingPrice;
  };

  const activeDealsCount = deals.filter(d => d.status !== DealStatus.COMPLETED && d.status !== DealStatus.ARCHIVED && d.status !== DealStatus.CLOSED_LOST).length;
  
  const pipelineValue = deals.reduce((acc, curr) => {
    if (curr.status === DealStatus.ARCHIVED || curr.status === DealStatus.COMPLETED || curr.status === DealStatus.CLOSED_LOST) return acc;
    return acc + calculateDealValue(curr);
  }, 0);

  let displayedDeals = deals;
  if (activeTab === 'closed-deals') {
    displayedDeals = deals.filter(d => d.status === DealStatus.COMPLETED);
  } else {
    displayedDeals = deals.filter(d => d.status !== DealStatus.COMPLETED && d.status !== DealStatus.ARCHIVED && d.status !== DealStatus.CLOSED_LOST);
  }

  // Filter by search term if provided
  if (searchTerm) {
    const lower = searchTerm.toLowerCase();
    displayedDeals = displayedDeals.filter(d => 
      d.propertyAddress.toLowerCase().includes(lower) || 
      d.owner.name.toLowerCase().includes(lower) ||
      d.propertyType.toLowerCase().includes(lower)
    );
  }

  const pipelineStatuses = [DealStatus.ACTIVE, DealStatus.UNDER_REVIEW, DealStatus.NEGOTIATING, DealStatus.CLOSING];

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <div className="flex items-center gap-2 text-summit-accent font-bold text-xs uppercase tracking-[0.2em] mb-2">
            <Target size={14} />
            <span>Operational Hub</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            {activeTab === 'dashboard' ? 'Market Overview' : activeTab === 'closed-deals' ? 'Closed Portfolio' : 'Deal Pipeline'}
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            {activeTab === 'dashboard' 
              ? `You have ${activeDealsCount} mandates currently active in the market.`
              : `Managing ${displayedDeals.length} ${activeTab === 'closed-deals' ? 'historical' : 'live'} assets.`}
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {(activeTab === 'dashboard' || activeTab === 'deals') && (
            <div className="bg-white p-1 rounded-xl border border-slate-200 flex items-center shadow-sm">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-summit-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutGrid size={20} />
              </button>
              <button 
                onClick={() => setViewMode('pipeline')}
                className={`p-2.5 rounded-lg transition-all ${viewMode === 'pipeline' ? 'bg-summit-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Columns size={20} />
              </button>
            </div>
          )}
          
          <button onClick={onOpenAi} className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-xl font-bold hover:bg-slate-50 flex items-center justify-center gap-2 transition-all shadow-sm">
            <MessageSquare size={18} className="text-purple-500" /> Summit IQ
          </button>
          
          {activeTab !== 'closed-deals' && (
            <button onClick={onAddDeal} className="flex-1 md:flex-none bg-summit-900 text-white px-6 py-3 rounded-xl font-black hover:bg-slate-800 flex items-center justify-center gap-2 shadow-xl shadow-summit-900/10 transition-all hover:-translate-y-0.5 active:scale-95">
              <Plus size={20} /> New mandate
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {activeTab === 'dashboard' && !searchTerm && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 relative overflow-hidden group hover:border-summit-accent transition-all">
             <div className="relative z-10">
               <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Total Pipeline Value</p>
               <h3 className="text-4xl font-black text-slate-900">${(pipelineValue / 1000000).toFixed(1)}M</h3>
               <div className="flex items-center gap-2 mt-4">
                  <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full flex items-center"><ArrowUpRight size={12} className="mr-1"/> +8.4%</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">vs trailing 30d</span>
               </div>
             </div>
             <div className="absolute -bottom-4 -right-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
               <DollarSign size={160} />
             </div>
          </div>
          
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 relative overflow-hidden group hover:border-summit-accent transition-all">
             <div className="relative z-10">
               <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Active Mandates</p>
               <h3 className="text-4xl font-black text-slate-900">{activeDealsCount}</h3>
               <p className="text-xs text-slate-400 font-bold mt-4 uppercase tracking-tighter">
                 {deals.filter(d => d.representation === 'seller' || d.representation === 'landlord').length} Listings • {deals.filter(d => d.representation === 'buyer' || d.representation === 'tenant').length} Requirements
               </p>
             </div>
             <div className="absolute -bottom-4 -right-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
               <Briefcase size={160} />
             </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 relative overflow-hidden group hover:border-summit-accent transition-all">
             <div className="relative z-10">
               <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Upcoming Critical Dates</p>
               <div className="h-24 -mt-2 -ml-2">
                  <UpcomingDeadlinesWidget deals={deals} onDealClick={onDealClick} />
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Main View Area */}
      {viewMode === 'grid' || activeTab === 'closed-deals' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayedDeals.map(deal => {
            const isLease = deal.representation === 'landlord' || deal.representation === 'tenant';
            const dealVal = calculateDealValue(deal);
            
            return (
            <div key={deal.id} onClick={() => onDealClick(deal.id)} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-slate-200 transition-all cursor-pointer group flex flex-col h-full border-t-4 border-t-transparent hover:border-t-summit-accent">
              <div className="h-64 overflow-hidden relative">
                <img src={deal.imageUrl} alt={deal.propertyAddress} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                   <p className="text-white text-sm font-bold flex items-center gap-2">Explore asset details <ArrowUpRight size={16} /></p>
                </div>
                <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl text-[10px] font-black text-slate-900 shadow-sm uppercase tracking-widest">
                  {deal.status}
                </div>
              </div>
              <div className="p-8 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                   <div className="text-[10px] font-black text-summit-accent uppercase tracking-[0.2em] bg-summit-accent/10 px-3 py-1.5 rounded-xl">
                     {deal.propertyType}
                   </div>
                   <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{new Date(deal.lastUpdated).toLocaleDateString()}</div>
                </div>
                <h3 className="font-black text-2xl text-slate-900 mb-2 leading-tight group-hover:text-summit-accent transition-colors truncate">{deal.propertyAddress}</h3>
                
                <div className="mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-1 rounded">
                        {REPRESENTATION_LABELS[deal.representation || 'seller']}
                    </span>
                </div>

                <p className="text-slate-500 text-sm mb-8 line-clamp-2 leading-relaxed font-medium">{deal.description || 'No executive summary provided for this asset.'}</p>
                
                <div className="mt-auto pt-8 border-t border-slate-50 flex items-center justify-between">
                   <div>
                     <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">
                        {isLease ? 'Total Lease Value' : 'Valuation'}
                     </p>
                     <div className="font-black text-slate-900 text-3xl">
                        ${(dealVal >= 1000000) ? (dealVal / 1000000).toFixed(1) + 'M' : (dealVal / 1000).toFixed(0) + 'K'}
                     </div>
                   </div>
                   <button 
                     onClick={(e) => { e.stopPropagation(); onDeleteDeal(deal.id); }}
                     className="w-12 h-12 flex items-center justify-center text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                   >
                     <Trash2 size={20} />
                   </button>
                </div>
              </div>
            </div>
          );})}
          {displayedDeals.length === 0 && (
            <div className="col-span-full py-40 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
              <Building2 size={80} className="mx-auto text-slate-100 mb-6" />
              <h3 className="text-2xl font-black text-slate-300 tracking-tight">System state: Idle</h3>
              <p className="text-slate-300 font-medium mt-2">Initialize your pipeline by registering a new commercial mandate.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex overflow-x-auto pb-12 gap-8 h-full items-start scrollbar-hide">
          {pipelineStatuses.map(status => {
            const statusDeals = displayedDeals.filter(d => d.status === status);
            const totalValue = statusDeals.reduce((a, b) => a + calculateDealValue(b), 0);
            return (
              <div key={status} className="min-w-[360px] w-[360px] flex-shrink-0 flex flex-col h-full max-h-[calc(100vh-320px)] bg-slate-50/50 rounded-[2.5rem] border border-slate-100 p-2">
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      status === DealStatus.ACTIVE ? 'bg-blue-500' :
                      status === DealStatus.UNDER_REVIEW ? 'bg-amber-500' :
                      status === DealStatus.NEGOTIATING ? 'bg-purple-500' : 'bg-emerald-500'
                    }`}></div>
                    <span className="font-black text-slate-800 text-sm uppercase tracking-widest">{status}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="bg-white text-slate-400 text-[10px] font-black px-2.5 py-1 rounded-xl shadow-sm border border-slate-100">{statusDeals.length}</span>
                    <span className="text-[10px] text-slate-400 font-bold mt-1">${(totalValue/1000000).toFixed(1)}M</span>
                  </div>
                </div>
                
                <div className="px-4 pb-4 space-y-4 overflow-y-auto flex-1 scrollbar-hide">
                  {statusDeals.map(deal => (
                    <div 
                      key={deal.id} 
                      onClick={() => onDealClick(deal.id)}
                      className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:scale-[1.02] cursor-pointer transition-all group"
                    >
                      <div className="flex gap-5 mb-5">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-50 border border-slate-100">
                          <img src={deal.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] text-summit-accent font-black uppercase tracking-widest mb-1 truncate">{deal.propertyType}</p>
                          <h4 className="font-black text-sm text-slate-900 leading-tight truncate group-hover:text-summit-accent transition-colors">{deal.propertyAddress}</h4>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-2 font-bold uppercase">
                            <MapPin size={10} className="text-slate-300" /> Louisville, KY
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <span className="font-black text-slate-900 text-base">${(deal.askingPrice / 1000).toFixed(0)}K{(deal.representation === 'landlord' || deal.representation === 'tenant') ? '/mo' : ''}</span>
                        <div className="flex -space-x-2">
                           <div className="w-7 h-7 rounded-full bg-summit-900 border-2 border-white flex items-center justify-center text-[10px] font-black text-white uppercase shadow-sm">{deal.owner.name[0]}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {statusDeals.length === 0 && (
                    <div className="py-12 text-center text-slate-300 text-xs font-bold uppercase tracking-widest italic opacity-50">
                      Zone Cleared
                    </div>
                  )}
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
