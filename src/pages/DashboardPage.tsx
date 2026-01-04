
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ArrowUpRight, DollarSign, Clock, ChevronDown, MessageSquare, Briefcase, FileText, CheckCircle, Trash2, MapPin, Undo2, Loader2, Building2, LayoutGrid, Columns, Building, CheckSquare } from 'lucide-react';
import { Deal, DealStatus, Task, REPRESENTATION_LABELS } from '../types.ts';
import { api } from '../services/firestore.ts';
import TaskModal from '../components/TaskModal.tsx';
import UpcomingDeadlinesWidget from '../components/UpcomingDeadlinesWidget.tsx';
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
  searchTerm?: string;
  onTaskComplete?: (task: Task) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ activeTab, deals, onAddDeal, onDealClick, onDeleteDeal, onRouteChange, onOpenAi, onSaveDeal, searchTerm = '', onTaskComplete }) => {
  const { currentUser } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'pipeline'>('grid');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | undefined>(undefined);
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null);
  
  // -- Fetch Tasks --
  const loadTasks = async () => {
    try {
      if (currentUser?.id) {
         const userTasks = await api.getTasks(currentUser.id);
         setTasks(userTasks);
      }
    } catch (e) {
      console.error("Failed to load tasks", e);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [deals, currentUser]);

  const handleSaveTask = async (task: Partial<Task>) => {
    if (!currentUser?.id) return;

    const newTask = {
      ...task,
      id: task.id || Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
    } as Task;

    await api.saveTask(newTask);
    loadTasks();
    setIsTaskModalOpen(false);
  };

  const handleReopenDeal = (deal: Deal, e: React.MouseEvent) => {
    e.stopPropagation();
    if(true) { // Auto-confirm
        onSaveDeal({ ...deal, status: DealStatus.ACTIVE });
    }
  };

  const handleDeleteClick = async (e: React.MouseEvent, dealId: string) => {
    e.stopPropagation();
    setDeletingDealId(dealId);
    try {
        await onDeleteDeal(dealId);
    } finally {
        setDeletingDealId(null);
    }
  };

  // -- Computed Stats --
  const activeDealsCount = deals.filter(d => d.status !== DealStatus.COMPLETED && d.status !== DealStatus.ARCHIVED).length;
  const pipelineValue = deals.reduce((acc, curr) => acc + (curr.status !== DealStatus.ARCHIVED && curr.status !== DealStatus.COMPLETED ? curr.askingPrice : 0), 0);
  
  // Filtering Logic
  const displayedDeals = useMemo(() => {
    let filtered = deals;

    // 1. Tab Filter
    if (activeTab === 'closed-deals') {
      filtered = filtered.filter(d => d.status === DealStatus.COMPLETED);
    } else {
      // dashboard or deals
      filtered = filtered.filter(d => d.status !== DealStatus.COMPLETED && d.status !== DealStatus.ARCHIVED);
    }

    // 2. Search Filter (Prop)
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(d => 
        d.propertyAddress.toLowerCase().includes(lowerSearch) || 
        d.owner.name.toLowerCase().includes(lowerSearch) ||
        d.propertyType.toLowerCase().includes(lowerSearch)
      );
    }

    // 3. Local Status Filter (Grid View Only mostly, but applies to list)
    if (filterStatus !== 'all' && viewMode === 'grid') {
      filtered = filtered.filter(d => d.status === filterStatus);
    }

    return filtered;
  }, [deals, activeTab, searchTerm, filterStatus, viewMode]);

  // -- Task Filtering --
  const pendingTasks = tasks.filter(t => t.status !== 'completed').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  // -- Kanban Columns --
  const pipelineStatuses = [DealStatus.ACTIVE, DealStatus.UNDER_REVIEW, DealStatus.NEGOTIATING, DealStatus.CLOSING];

  return (
    <div className="max-w-7xl mx-auto pb-10 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'closed-deals' ? 'Closed Deals' : 'Active Pipeline'}
          </h1>
          <p className="text-slate-500 mt-1">
            {activeTab === 'dashboard' 
              ? `Welcome back! You have ${activeDealsCount} active deals and ${pendingTasks.length} pending tasks.`
              : `Manage your ${activeTab === 'closed-deals' ? 'closed' : 'active'} transactions.`}
          </p>
        </div>
        <div className="flex gap-3">
          {(activeTab === 'dashboard' || activeTab === 'deals') && (
            <div className="bg-white p-1 rounded-lg border border-slate-200 flex items-center shadow-sm mr-2">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-summit-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                title="Grid View"
              >
                <LayoutGrid size={20} />
              </button>
              <button 
                onClick={() => setViewMode('pipeline')}
                className={`p-2 rounded-md transition-all ${viewMode === 'pipeline' ? 'bg-slate-100 text-summit-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                title="Pipeline View"
              >
                <Columns size={20} />
              </button>
            </div>
          )}
          
          <button onClick={onOpenAi} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2 transition-colors shadow-sm">
            <MessageSquare size={18} /> <span className="hidden sm:inline">AI Assistant</span>
          </button>
          
          {activeTab !== 'closed-deals' && (
            <button onClick={onAddDeal} className="bg-summit-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-summit-800 flex items-center gap-2 shadow-lg shadow-summit-900/10 transition-all transform hover:-translate-y-0.5">
              <Plus size={18} /> <span className="hidden sm:inline">New Deal</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'dashboard' && !searchTerm && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 flex-shrink-0">
          {/* Upcoming Deadlines Widget - Takes up one column */}
          <div className="md:col-span-1 h-full">
             <UpcomingDeadlinesWidget deals={deals} onDealClick={onDealClick} />
          </div>

          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between group hover:border-blue-200 transition-colors">
               <div>
                 <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Pipeline Value</p>
                 <h3 className="text-2xl font-bold text-slate-900">${(pipelineValue / 1000000).toFixed(1)}M</h3>
                 <p className="text-xs text-green-600 font-bold mt-2 flex items-center bg-green-50 w-fit px-2 py-0.5 rounded-full"><ArrowUpRight size={12} className="mr-1"/> +12% vs last month</p>
               </div>
               <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                 <DollarSign size={24} />
               </div>
            </div>
            <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between group hover:border-purple-200 transition-colors">
               <div>
                 <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Active Deals</p>
                 <h3 className="text-2xl font-bold text-slate-900">{activeDealsCount}</h3>
                 <p className="text-xs text-slate-400 font-medium mt-2 bg-slate-100 w-fit px-2 py-0.5 rounded-full">Across 3 property types</p>
               </div>
               <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-purple-600 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                 <Briefcase size={24} />
               </div>
            </div>
             <div className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between group hover:border-amber-200 transition-colors">
               <div className="flex-1">
                 <div className="flex justify-between items-start">
                   <div>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Pending Tasks</p>
                      <h3 className="text-2xl font-bold text-slate-900">{pendingTasks.length}</h3>
                   </div>
                   <button onClick={() => { setEditingTask(undefined); setIsTaskModalOpen(true); }} className="p-2 bg-amber-50 text-amber-600 rounded-full hover:bg-amber-100 transition-colors">
                      <Plus size={16} />
                   </button>
                 </div>
                 
                 {/* Mini Task List in Card */}
                 <div className="mt-3 space-y-2 max-h-24 overflow-y-auto pr-1">
                    {pendingTasks.slice(0, 3).map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-xs bg-white/60 p-1.5 rounded border border-slate-100">
                          <button 
                              className="text-slate-400 hover:text-green-500"
                              onClick={(e) => { e.stopPropagation(); if(onTaskComplete) { onTaskComplete(t); loadTasks(); } }}
                          >
                              <CheckSquare size={14} />
                          </button>
                          <span className="truncate flex-1">{t.title}</span>
                      </div>
                    ))}
                    {pendingTasks.length === 0 && <span className="text-xs text-slate-400 italic">All caught up!</span>}
                 </div>
               </div>
               <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-amber-600 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform self-start ml-4">
                 <Clock size={24} />
               </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW CONTENT */}
      {viewMode === 'grid' || activeTab === 'closed-deals' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-4">
          {displayedDeals.length > 0 ? displayedDeals.map(deal => {
            const isDemandSide = deal.representation === 'buyer' || deal.representation === 'tenant';
            return (
            <div key={deal.id} onClick={() => onDealClick(deal.id)} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg hover:border-summit-accent/30 transition-all cursor-pointer group flex flex-col h-full">
              <div className="h-48 overflow-hidden relative">
                <img src={deal.imageUrl} alt={deal.propertyAddress} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-800 shadow-sm border border-slate-100">
                  {deal.status}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                   <p className="text-white text-sm font-medium">View Details <ArrowUpRight size={14} className="inline ml-1" /></p>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-1.5 text-xs font-bold text-summit-accent uppercase tracking-wide bg-summit-accent/5 px-2 py-1 rounded">
                     <Building2 size={12} /> {deal.propertyType}
                   </div>
                   <div className="text-xs text-slate-400">{new Date(deal.lastUpdated).toLocaleDateString()}</div>
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-1 leading-tight group-hover:text-summit-accent transition-colors truncate" title={deal.propertyAddress}>{deal.propertyAddress}</h3>
                
                {/* Representation Badge */}
                <div className="mb-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isDemandSide ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                        {isDemandSide ? <Briefcase size={10} /> : <Building size={10} />}
                        {REPRESENTATION_LABELS[deal.representation || 'seller']}
                    </span>
                </div>

                <p className="text-slate-500 text-sm mb-4 line-clamp-2">{deal.description || 'No description provided.'}</p>
                
                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                   <div className="flex flex-col">
                       <span className="text-[10px] text-slate-400 uppercase font-bold">{isDemandSide ? 'Target Budget' : 'Asking Price'}</span>
                       <span className="font-bold text-slate-900 text-lg">${deal.askingPrice.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                   </div>
                   <div className="flex gap-2">
                      {deal.status === 'Archived' ? (
                         <button onClick={(e) => handleReopenDeal(deal, e)} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors" title="Reopen Deal">
                           <Undo2 size={18} />
                         </button>
                      ) : (
                         <button 
                           onClick={(e) => handleDeleteClick(e, deal.id)} 
                           disabled={deletingDealId === deal.id}
                           className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Archive Deal"
                         >
                           {deletingDealId === deal.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                         </button>
                      )}
                   </div>
                </div>
              </div>
            </div>
          );}) : (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Building2 size={40} />
              </div>
              <h3 className="text-lg font-bold text-slate-700">No deals found</h3>
              <p className="text-slate-500">Try adjusting your search or create a new deal.</p>
            </div>
          )}
        </div>
      ) : (
        /* KANBAN PIPELINE VIEW */
        <div className="flex overflow-x-auto pb-6 gap-6 h-full items-start">
          {pipelineStatuses.map(status => {
            // If in pipeline view, displayedDeals is already filtered by search term
            const statusDeals = displayedDeals.filter(d => d.status === status);
            return (
              <div key={status} className="min-w-[320px] w-80 flex-shrink-0 flex flex-col h-full max-h-[calc(100vh-220px)] bg-slate-100/50 rounded-xl border border-slate-200/60">
                <div className="p-4 flex items-center justify-between sticky top-0 bg-slate-100/50 backdrop-blur-sm rounded-t-xl z-10 border-b border-slate-200/50">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      status === DealStatus.ACTIVE ? 'bg-blue-500' :
                      status === DealStatus.UNDER_REVIEW ? 'bg-amber-500' :
                      status === DealStatus.NEGOTIATING ? 'bg-purple-500' : 'bg-green-500'
                    }`}></div>
                    <span className="font-bold text-slate-700">{status}</span>
                  </div>
                  <span className="bg-white text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">{statusDeals.length}</span>
                </div>
                
                <div className="p-3 space-y-3 overflow-y-auto flex-1">
                  {statusDeals.length > 0 ? statusDeals.map(deal => {
                    const isDemandSide = deal.representation === 'buyer' || deal.representation === 'tenant';
                    return (
                    <div 
                      key={deal.id} 
                      onClick={() => onDealClick(deal.id)}
                      className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 hover:shadow-md hover:border-summit-accent/30 cursor-pointer transition-all group"
                    >
                      <div className="flex gap-3 mb-2">
                        <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-slate-100">
                          <img src={deal.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                             <p className="text-xs text-summit-accent font-bold uppercase truncate">{deal.propertyType}</p>
                             {deal.documents && deal.documents.length > 0 && (
                                <FileText size={12} className="text-slate-400 flex-shrink-0" />
                             )}
                          </div>
                          <h4 className="font-bold text-sm text-slate-800 leading-tight truncate group-hover:text-summit-accent transition-colors" title={deal.propertyAddress}>
                            {deal.propertyAddress}
                          </h4>
                          <div className="flex gap-1 mt-1">
                             <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${isDemandSide ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                                {REPRESENTATION_LABELS[deal.representation || 'seller'].split(' ')[0]}
                             </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-2">
                        <span className="font-bold text-slate-900 text-sm">${deal.askingPrice.toLocaleString(undefined, {notation: 'compact'})}</span>
                        <span className="text-[10px] text-slate-400">{new Date(deal.lastUpdated).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );}) : (
                    <div className="h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-sm italic">
                      Empty
                    </div>
                  )}
                </div>
                
                {/* Footer Sum */}
                {statusDeals.length > 0 && (
                   <div className="p-3 border-t border-slate-200 bg-white rounded-b-xl text-xs text-slate-500 font-medium text-center">
                      Total: ${(statusDeals.reduce((acc, d) => acc + d.askingPrice, 0) / 1000000).toFixed(1)}M
                   </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        onSave={handleSaveTask}
        initialData={editingTask}
      />
    </div>
  );
};

export default DashboardPage;
