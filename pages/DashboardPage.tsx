
import React, { useState, useEffect } from 'react';
import { Plus, ArrowUpRight, DollarSign, Clock, ChevronDown, MessageSquare, Briefcase, FileText, CheckCircle, Trash2, MapPin, Undo2 } from 'lucide-react';
import { Deal, DealStatus, Task } from '../types';
import { api } from '../services/firestore';
import TaskModal from '../components/TaskModal';
import { useAuth } from '../context/AuthContext';

interface DashboardPageProps {
  activeTab: string;
  deals: Deal[];
  onAddDeal: () => void;
  onDealClick: (dealId: string) => void;
  onDeleteDeal: (dealId: string) => void;
  onRouteChange: (route: string) => void;
  onOpenAi: () => void;
  onSaveDeal: (deal: Deal) => void; // Added to support reopening
}

const DashboardPage: React.FC<DashboardPageProps> = ({ activeTab, deals, onAddDeal, onDealClick, onDeleteDeal, onRouteChange, onOpenAi, onSaveDeal }) => {
  const { currentUser } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | undefined>(undefined);
  
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
    if(confirm('Do you want to reopen this deal? It will be moved back to Active Deals.')) {
        onSaveDeal({ ...deal, status: DealStatus.ACTIVE });
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
  const overdueTasks = pendingTasks.filter(t => {
     const due = new Date(`${t.dueDate}T${t.dueTime}`);
     return due < new Date();
  });

  const StatsCard = ({ title, value, subtext, icon: Icon, colorClass }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        {subtext && <p className="text-xs text-slate-400 mt-2 font-medium">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-lg ${colorClass}`}>
        <Icon size={20} />
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Active Deals" value={activeDealsCount} subtext="Current Portfolio" icon={Briefcase} colorClass="bg-blue-100 text-blue-600" />
          <StatsCard title="Total Offers" value={totalOffers} subtext="Activity Level" icon={DollarSign} colorClass="bg-green-100 text-green-600" />
          <StatsCard title="Pending Tasks" value={pendingTasks.length} subtext={`${overdueTasks.length} Overdue`} icon={CheckCircle} colorClass="bg-purple-100 text-purple-600" />
          <StatsCard title="Pipeline Value" value={`$${(pipelineValue / 1000000).toFixed(1)}M`} subtext="Total Asking (Active)" icon={ArrowUpRight} colorClass="bg-orange-100 text-orange-600" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Main Deals Table Area */}
        <div className={`${activeTab !== 'dashboard' ? 'col-span-4' : 'lg:col-span-3'} space-y-6`}>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
            <div className="p-5 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">
                {activeTab === 'closed-deals' ? 'Closed Deals' : 'Deal Flow'}
              </h2>
              <div className="flex gap-2">
                {activeTab !== 'closed-deals' && (
                  <div className="relative">
                    <select 
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg pl-3 pr-8 py-2 focus:ring-summit-accent outline-none cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      {Object.values(DealStatus).filter(s => s !== DealStatus.COMPLETED).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                )}
                
                {/* REMOVED: "New Deal" Button from Closed Deals Tab */}
                {activeTab !== 'closed-deals' && (
                    <button 
                    onClick={onAddDeal}
                    className="bg-summit-900 text-white hover:bg-summit-800 text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                    <Plus size={16} /> New Deal
                    </button>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="p-4">Property</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Price</th>
                    <th className="p-4 text-center">Offers</th>
                    <th className="p-4">Last Updated</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedDeals.length > 0 ? (
                    displayedDeals.map((deal) => (
                      <tr key={deal.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-4 cursor-pointer" onClick={() => onDealClick(deal.id)}>
                          <div className="flex items-center gap-3">
                            <img src={deal.imageUrl} alt="Prop" className="w-10 h-10 rounded-lg object-cover" />
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{deal.propertyAddress.split(',')[0]}</p>
                              <div className="flex items-center text-xs text-slate-500 mt-0.5">
                                <MapPin size={10} className="mr-1" />
                                {deal.propertyType}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 cursor-pointer" onClick={() => onDealClick(deal.id)}>
                           <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap
                             ${deal.status === DealStatus.ACTIVE ? 'bg-green-100 text-green-700' : 
                               deal.status === DealStatus.NEGOTIATING ? 'bg-amber-100 text-amber-700' : 
                               deal.status === DealStatus.COMPLETED ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`
                           }>
                            {deal.status}
                          </span>
                        </td>
                        <td className="p-4 text-right font-medium text-slate-700 text-sm cursor-pointer" onClick={() => onDealClick(deal.id)}>
                          ${deal.askingPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-center text-slate-600 text-sm cursor-pointer" onClick={() => onDealClick(deal.id)}>
                          {deal.offersReceived}
                        </td>
                        <td className="p-4 text-xs text-slate-500 cursor-pointer" onClick={() => onDealClick(deal.id)}>
                          {new Date(deal.lastUpdated).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-center flex items-center justify-center gap-2">
                          {activeTab === 'closed-deals' && (
                            <button
                                onClick={(e) => handleReopenDeal(deal, e)}
                                className="text-slate-400 hover:text-summit-accent p-2 rounded-full hover:bg-green-50 transition-colors"
                                title="Reopen Deal (Move to Active)"
                            >
                                <Undo2 size={16} />
                            </button>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteDeal(deal.id); }}
                            className="text-slate-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                            title="Delete Deal"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        <div className="flex flex-col items-center">
                           <Briefcase size={40} className="mb-4 opacity-20" />
                           <p className="font-medium">No deals found.</p>
                           <p className="text-sm mt-1">
                             {activeTab === 'closed-deals' 
                              ? "You haven't closed any deals yet. Keep pushing!" 
                              : "Start by clicking 'New Deal' to build your pipeline."}
                           </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Widgets */}
        {activeTab === 'dashboard' && (
          <div className="lg:col-span-1 space-y-6">
             {/* Quick Actions */}
             <div className="bg-summit-900 rounded-xl shadow-lg text-white p-6">
               <h3 className="font-bold mb-4">Quick Actions</h3>
               <div className="grid grid-cols-2 gap-3">
                  <button onClick={onAddDeal} className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-sm font-medium flex flex-col items-center gap-1">
                    <Plus size={16} /> Add Deal
                  </button>
                  <button onClick={() => { setEditingTask(undefined); setIsTaskModalOpen(true); }} className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-sm font-medium flex flex-col items-center gap-1">
                    <CheckCircle size={16} /> Add Task
                  </button>
                  <button onClick={() => onRouteChange('documents')} className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-sm font-medium flex flex-col items-center gap-1">
                    <FileText size={16} /> Docs
                  </button>
                  <button onClick={onOpenAi} className="bg-summit-accent text-summit-900 hover:bg-emerald-400 p-3 rounded-lg text-sm font-bold flex flex-col items-center gap-1">
                    <MessageSquare size={16} /> AI Chat
                  </button>
               </div>
             </div>

             {/* Tasks Widget */}
             <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-96">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle size={16} className="text-summit-accent" /> Tasks
                  </h3>
                  <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{pendingTasks.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                   {pendingTasks.length > 0 ? pendingTasks.map(task => (
                     <div key={task.id} className={`p-3 rounded-lg border hover:bg-slate-50 transition-colors flex gap-3 ${new Date(`${task.dueDate}T${task.dueTime}`) < new Date() ? 'border-red-100 bg-red-50/30' : 'border-slate-100'}`}>
                        <button onClick={() => toggleTaskComplete(task)} className="mt-1 text-slate-300 hover:text-green-500">
                          <CheckCircle size={18} />
                        </button>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }}>
                           <p className={`text-sm font-medium truncate ${new Date(`${task.dueDate}T${task.dueTime}`) < new Date() ? 'text-red-700' : 'text-slate-800'}`}>{task.title}</p>
                           <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                              <Clock size={10} /> {new Date(task.dueDate).toLocaleDateString()} at {task.dueTime}
                           </p>
                        </div>
                     </div>
                   )) : (
                     <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                        <CheckCircle size={24} className="mb-2 opacity-20" />
                        <p className="text-xs">All caught up!</p>
                     </div>
                   )}
                </div>
             </div>
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
