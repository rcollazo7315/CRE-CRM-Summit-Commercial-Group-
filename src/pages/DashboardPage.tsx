
import React, { useState, useEffect } from 'react';
import { Plus, ArrowUpRight, DollarSign, Clock, ChevronDown, MessageSquare, Briefcase, FileText, CheckCircle, Trash2, MapPin, Undo2, Loader2, Building2 } from 'lucide-react';
import { Deal, DealStatus, Task } from '../types';
import { api } from '../services/firestore';
import TaskModal from '../components/TaskModal';
import { useAuth } from '../context/AuthContext';

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
  const [filterStatus, setFilterStatus] = useState<string>('all');
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

  const toggleTaskComplete = async (task: Task) => {
    const updated = { ...task, status: task.status === 'completed' ? 'pending' : 'completed' } as Task;
    await api.saveTask(updated);
    loadTasks();
  };

  const handleReopenDeal = (deal: Deal, e: React.MouseEvent) => {
    e.stopPropagation();
    if(true) { // Auto-confirm for reopen
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
  const totalOffers = deals.reduce((acc, curr) => acc + curr.offersReceived, 0);
  
  // Filtering Logic based on Tabs
  let displayedDeals = deals;
  
  if (activeTab === 'closed-deals') {
    displayedDeals = deals.filter(d => d.status === DealStatus.COMPLETED);
  } else if (activeTab === 'deals') {
    displayedDeals = deals.filter(d => d.status !== DealStatus.COMPLETED && d.status !== DealStatus.ARCHIVED);
  }

  // Then apply local filter if set
  if (filterStatus !== 'all') {
    displayedDeals = displayedDeals.filter(d => d.status === filterStatus);
  }

  // -- Task Filtering --
  const pendingTasks = tasks.filter(t => t.status !== 'completed').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {activeTab === 'dashboard' ? 'Overview' : activeTab === 'closed-deals' ? 'Closed Deals' : 'Active Deals'}
          </h1>
          <p className="text-slate-500 mt-1">
            {activeTab === 'dashboard' 
              ? `Welcome back! You have ${activeDealsCount} active deals and ${pendingTasks.length} pending tasks.`
              : `Manage your ${activeTab === 'closed-deals' ? 'closed' : 'active'} transactions.`}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onOpenAi} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2 transition-colors">
            <MessageSquare size={18} /> AI Assistant
          </button>
          {activeTab !== 'closed-deals' && (
            <button onClick={onAddDeal} className="bg-summit-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-summit-800 flex items-center gap-2 shadow-lg shadow-summit-900/10 transition-all transform hover:-translate-y-0.5">
              <Plus size={18} /> New Deal
            </button>
          )}
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
             <div>
               <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Active Pipeline</p>
               <h3 className="text-2xl font-bold text-slate-900 mt-1">${(pipelineValue / 1000000).toFixed(1)}M</h3>
               <p className="text-xs text-green-600 font-bold mt-2 flex items-center"><ArrowUpRight size={12} className="mr-1"/> +12% vs last month</p>
             </div>
             <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
               <DollarSign size={24} />
             </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
             <div>
               <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Active Deals</p>
               <h3 className="text-2xl font-bold text-slate-900 mt-1">{activeDealsCount}</h3>
               <p className="text-xs text-slate-400 font-bold mt-2"> across 3 property types</p>
             </div>
             <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
               <Briefcase size={24} />
             </div>
          </div>
           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
             <div>
               <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Pending Tasks</p>
               <h3 className="text-2xl font-bold text-slate-900 mt-1">{pendingTasks.length}</h3>
               <p className="text-xs text-amber-600 font-bold mt-2">{pendingTasks.filter(t => t.priority === 'urgent').length} urgent</p>
             </div>
             <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
               <Clock size={24} />
             </div>
          </div>
        </div>
      )}

      {/* Deals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedDeals.length > 0 ? displayedDeals.map(deal => (
          <div key={deal.id} onClick={() => onDealClick(deal.id)} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all cursor-pointer group flex flex-col h-full">
            <div className="h-48 overflow-hidden relative">
              <img src={deal.imageUrl} alt={deal.propertyAddress} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-800 shadow-sm">
                {deal.status}
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                 <div className="flex items-center gap-2 text-xs font-bold text-summit-accent uppercase tracking-wide">
                   <Building2 size={12} /> {deal.propertyType}
                 </div>
                 <div className="text-xs text-slate-400">{new Date(deal.lastUpdated).toLocaleDateString()}</div>
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-1 leading-tight">{deal.propertyAddress}</h3>
              <p className="text-slate-500 text-sm mb-4 line-clamp-2">{deal.description || 'No description provided.'}</p>
              
              <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                 <div className="font-bold text-slate-900">${deal.askingPrice.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
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
        )) : (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Building2 size={40} />
            </div>
            <h3 className="text-lg font-bold text-slate-700">No deals found</h3>
            <p className="text-slate-500">Get started by creating a new deal or adjusting filters.</p>
          </div>
        )}
      </div>

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
