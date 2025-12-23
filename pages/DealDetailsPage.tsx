import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MapPin, Building2, User, Phone, Mail, Edit, Trash2, CheckSquare, Clock, Plus, Map as MapIcon, Upload, Loader2, MoreVertical, Sparkles, MapPinned, ExternalLink } from 'lucide-react';
import { Deal, DealStatus, DocumentFile, Task } from '../types.ts';
import TaskModal from '../components/TaskModal.tsx';
import { api } from '../services/firestore.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { analyzeSiteNeighborhood, GroundingSource } from '../services/geminiService.ts';

interface DealDetailsPageProps {
  deal: Deal;
  onBack: () => void;
  onUpdateDeal: (deal: Deal) => void;
  onEditDeal: () => void;
  onDeleteDeal: () => void;
  onViewDocuments: () => void;
  onAddDocument: (dealId: string, doc: DocumentFile, file: File) => void;
  onDeleteDocument: (dealId: string, docId: string) => void;
}

const DealDetailsPage: React.FC<DealDetailsPageProps> = ({ deal, onBack, onUpdateDeal, onEditDeal, onDeleteDeal, onViewDocuments, onAddDocument, onDeleteDocument }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'tasks' | 'documents'>('info');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | undefined>(undefined);
  
  // Maps Grounding State
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insights, setInsights] = useState<{ text: string; sources: GroundingSource[] } | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTasks = async () => {
    if (currentUser) {
      const allTasks = await api.getTasks(currentUser.id);
      setTasks(allTasks.filter(t => t.dealId === deal.id));
    }
  };

  useEffect(() => {
    loadTasks();
  }, [deal.id, currentUser]);

  const fetchNeighborhoodIQ = async () => {
    setLoadingInsights(true);
    try {
      const result = await analyzeSiteNeighborhood(deal.propertyAddress);
      setInsights(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleStatusChange = (value: string) => {
    onUpdateDeal({ ...deal, status: value as DealStatus });
  };

  const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(deal.propertyAddress)}&output=embed`;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const newDoc: DocumentFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
        size: `${(file.size / 1024).toFixed(0)} KB`,
        uploadDate: new Date().toISOString(),
        dealId: deal.id,
        url: '' 
      };
      await onAddDocument(deal.id, newDoc, file);
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <button onClick={onBack} className="flex items-center text-slate-500 hover:text-summit-900 mb-6 transition-colors font-medium">
        <ArrowLeft size={18} className="mr-2" /> Back to Pipeline
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
             <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <Building2 size={14} />
                <span>{deal.propertyType}</span>
                <span>•</span>
                <span className="text-slate-400">ID: {deal.id}</span>
             </div>
             <h1 className="text-3xl font-bold text-slate-900">{deal.propertyAddress}</h1>
          </div>
          <div className="flex items-center gap-3">
             <select value={deal.status} onChange={(e) => handleStatusChange(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-lg px-4 py-2.5 outline-none cursor-pointer">
                {Object.values(DealStatus).map(s => <option key={s} value={s}>{s}</option>)}
             </select>
             <button onClick={onEditDeal} className="bg-summit-900 text-white px-5 py-2.5 rounded-lg font-medium shadow-lg hover:bg-summit-800 transition-colors">Edit</button>
             <button onClick={onDeleteDeal} className="bg-white border border-slate-200 text-slate-400 hover:text-red-600 px-3 py-2.5 rounded-lg"><Trash2 size={20} /></button>
          </div>
        </div>

        <div className="flex gap-6 mt-8 border-b border-slate-100">
           <button onClick={() => setActiveTab('info')} className={`pb-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'info' ? 'border-summit-accent text-summit-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Property Data</button>
           <button onClick={() => setActiveTab('tasks')} className={`pb-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'tasks' ? 'border-summit-accent text-summit-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Tasks <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{tasks.filter(t => t.status === 'pending').length}</span></button>
           <button onClick={() => setActiveTab('documents')} className={`pb-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'documents' ? 'border-summit-accent text-summit-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Files <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{(deal.documents || []).length}</span></button>
        </div>
      </div>

      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 space-y-6">
              {/* Site Analysis - Maps Grounding */}
              <div className="bg-white rounded-xl shadow-md border-t-4 border-summit-accent p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Sparkles size={100} /></div>
                <div className="flex justify-between items-start mb-6">
                   <div>
                     <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                       <MapPinned className="text-summit-accent" /> Site Intelligence
                     </h3>
                     <p className="text-sm text-slate-500">Live neighborhood analysis powered by Google Maps.</p>
                   </div>
                   {!insights && (
                     <button onClick={fetchNeighborhoodIQ} disabled={loadingInsights} className="bg-summit-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50 shadow-lg">
                       {loadingInsights ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                       {loadingInsights ? 'Analyzing...' : 'Run Analysis'}
                     </button>
                   )}
                </div>

                {insights ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap">
                      {insights.text}
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Nearby Landmarks & Infrastructure</p>
                      <div className="flex flex-wrap gap-2">
                        {insights.sources.map((src, i) => (
                          <a key={i} href={src.uri} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 hover:border-summit-accent transition-all shadow-sm group">
                            <MapPin size={12} className="text-red-500" />
                            {src.title}
                            <ExternalLink size={10} className="text-slate-300 group-hover:text-summit-accent" />
                          </a>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => setInsights(null)} className="text-xs text-slate-400 font-medium hover:text-red-500">Reset Analysis</button>
                  </div>
                ) : !loadingInsights && (
                   <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-10 text-center">
                      <MapIcon size={40} className="mx-auto text-slate-200 mb-2" />
                      <p className="text-slate-400 text-sm italic">Analyze nearby transit, retail density, and logistics anchors.</p>
                   </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="h-64 bg-slate-100 relative">
                   <img src={deal.imageUrl} className="w-full h-full object-cover" alt="Property" />
                </div>
                <div className="p-6">
                   <h3 className="font-bold text-lg mb-4">Description</h3>
                   <p className="text-slate-600 leading-relaxed whitespace-pre-line">{deal.description || "No description."}</p>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2"><MapIcon size={20} className="text-slate-400"/> Map View</h3>
                  <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deal.propertyAddress)}`, '_blank')} className="text-xs text-summit-accent hover:underline">Open Full Map</button>
                </div>
                <div className="w-full h-64 bg-slate-100 rounded-lg overflow-hidden relative">
                   <iframe width="100%" height="100%" frameBorder="0" style={{ border: 0 }} src={mapUrl} allowFullScreen></iframe>
                </div>
              </div>
           </div>

           <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                 <h3 className="font-bold text-sm text-slate-400 uppercase mb-4">Contact Profile</h3>
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-summit-100 flex items-center justify-center text-summit-900 font-bold uppercase">{deal.owner.name[0]}</div>
                    <div><p className="font-bold text-slate-900">{deal.owner.name}</p><p className="text-xs text-slate-500">Representative</p></div>
                 </div>
                 <div className="space-y-3 text-sm">
                    <div className="flex gap-3 text-slate-600"><Mail size={16} className="text-slate-400" /> {deal.owner.email}</div>
                    <div className="flex gap-3 text-slate-600"><Phone size={16} className="text-slate-400" /> {deal.owner.phone}</div>
                 </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                 <h3 className="font-bold text-sm text-slate-400 uppercase mb-4">Financials</h3>
                 <div className="space-y-4">
                    <div>
                       <p className="text-xs text-slate-500 uppercase">Asking Price</p>
                       <p className="text-2xl font-bold text-slate-900">${deal.askingPrice.toLocaleString()}</p>
                    </div>
                    <div>
                       <p className="text-xs text-slate-500 uppercase">Highest Offer</p>
                       <p className="text-2xl font-bold text-green-600">{deal.highestOffer > 0 ? `$${deal.highestOffer.toLocaleString()}` : 'None'}</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Tabs fallback for task/doc logic simplified to root Page */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center"><h2 className="text-lg font-bold text-slate-800">Deal Pipeline Tasks</h2><button onClick={() => setIsTaskModalOpen(true)} className="bg-summit-900 text-white px-4 py-2 rounded-lg flex items-center gap-2"><Plus size={16} /> Add Task</button></div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
             {tasks.length > 0 ? tasks.map(task => (
               <div key={task.id} className="p-4 border-b border-slate-100 flex items-center gap-4 hover:bg-slate-50">
                  <div className={`p-2 rounded-full ${task.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}><CheckSquare size={20} /></div>
                  <div className="flex-1"><h4 className={`font-medium ${task.status === 'completed' ? 'text-slate-300 line-through' : 'text-slate-800'}`}>{task.title}</h4></div>
               </div>
             )) : <div className="p-12 text-center text-slate-400 italic">No tasks assigned.</div>}
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center"><h2 className="text-lg font-bold text-slate-800">Files & Assets</h2><input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} /><button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="bg-summit-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50">{isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Upload</button></div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
             {(deal.documents || []).length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {deal.documents.map(doc => (
                   <div key={doc.id} className="border border-slate-200 rounded-lg p-4 group bg-white hover:border-summit-accent transition-colors">
                      <div className="flex justify-between items-start mb-3"><div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xs">{doc.type}</div><button onClick={() => onDeleteDocument(deal.id, doc.id)} className="text-slate-300 hover:text-red-600"><Trash2 size={14} /></button></div>
                      <h3 className="font-semibold text-slate-800 text-sm truncate" title={doc.name}>{doc.name}</h3>
                      <p className="text-[10px] text-slate-400 mt-1">{doc.size} • {new Date(doc.uploadDate).toLocaleDateString()}</p>
                   </div>
                 ))}
               </div>
             ) : <div className="text-center py-12 text-slate-400 italic">No files uploaded.</div>}
          </div>
        </div>
      )}

      <TaskModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} onSave={(t) => { api.saveTask({ ...t, userId: currentUser!.id, dealId: deal.id } as Task).then(loadTasks); setIsTaskModalOpen(false); }} dealId={deal.id} />
    </div>
  );
};

export default DealDetailsPage;