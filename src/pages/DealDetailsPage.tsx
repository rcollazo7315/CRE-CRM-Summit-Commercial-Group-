
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MapPin, Building2, User, Phone, Mail, Calendar, Edit, CheckCircle, FileText, Download, Trash2, CheckSquare, Clock, Plus, Map as MapIcon, Upload, Loader2, MoreVertical } from 'lucide-react';
import { Deal, DealStatus, DocumentFile, Task } from '../types';
import TaskModal from '../components/TaskModal';
import { api } from '../services/firestore';
import { useAuth } from '../context/AuthContext';

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
  const [mapError, setMapError] = useState(false);
  
  // Document Upload State
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

  const handleSaveTask = async (task: Partial<Task>) => {
    if (!currentUser) return;
    const newTask = {
      ...task,
      id: task.id || Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      dealId: deal.id, 
      dealAddress: deal.propertyAddress
    } as Task;
    await api.saveTask(newTask);
    loadTasks();
    setIsTaskModalOpen(false);
  };

  const handleStatusChange = (newStatus: DealStatus) => {
    onUpdateDeal({ ...deal, status: newStatus });
  };

  // Google Maps Embed URL
  const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(deal.propertyAddress)}&output=embed`;

  // Document Handlers
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
        url: '' // API will populate
      };

      await onAddDocument(deal.id, newDoc, file);
    } catch (error) {
      console.error("Upload error:", error);
      console.log("Failed to upload document.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = (doc: DocumentFile) => {
    if (!doc.url) {
        console.log("File URL not found.");
        return;
    }
    window.open(doc.url, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <button onClick={onBack} className="flex items-center text-slate-500 hover:text-summit-900 mb-6 transition-colors font-medium">
        <ArrowLeft size={18} className="mr-2" /> Back to Deals
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
             <p className="flex items-center text-slate-500 mt-2">
               <MapPin size={16} className="mr-1" />
               {deal.propertyAddress}
             </p>
          </div>
          <div className="flex items-center gap-3">
             <div className="relative">
                <select 
                  value={deal.status}
                  onChange={(e) => handleStatusChange(e.target.value as DealStatus)}
                  className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-lg pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-summit-accent outline-none cursor-pointer"
                >
                  {Object.values(DealStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <Edit size={14} />
                </div>
             </div>
             <button onClick={onEditDeal} className="bg-summit-900 text-white px-5 py-2.5 rounded-lg font-medium shadow-lg hover:bg-summit-800 transition-colors">Edit Deal</button>
             <button onClick={onDeleteDeal} className="bg-white border border-slate-200 text-slate-400 hover:text-red-600 px-3 py-2.5 rounded-lg"><Trash2 size={20} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mt-8 border-b border-slate-100">
           <button onClick={() => setActiveTab('info')} className={`pb-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'info' ? 'border-summit-accent text-summit-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Deal Information</button>
           <button onClick={() => setActiveTab('tasks')} className={`pb-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'tasks' ? 'border-summit-accent text-summit-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              Tasks <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{tasks.filter(t => t.status === 'pending').length}</span>
           </button>
           <button onClick={() => setActiveTab('documents')} className={`pb-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'documents' ? 'border-summit-accent text-summit-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              Documents <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{(deal.documents || []).length}</span>
           </button>
        </div>
      </div>

      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info Content - Left Col */}
           <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="h-64 bg-slate-100 relative">
                   <img src={deal.imageUrl} className="w-full h-full object-cover" alt="Property" />
                </div>
                <div className="p-6">
                   <h3 className="font-bold text-lg mb-4">Property Description</h3>
                   <p className="text-slate-600 leading-relaxed whitespace-pre-line">{deal.description || "No description."}</p>
                </div>
              </div>
              
              {/* Map Section */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <MapIcon size={20} className="text-slate-400"/> Location Map
                  </h3>
                  <button 
                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deal.propertyAddress)}`, '_blank')}
                    className="text-xs text-summit-accent hover:underline"
                  >
                    Open in Google Maps
                  </button>
                </div>
                
                <div className="w-full h-64 bg-slate-100 rounded-lg overflow-hidden relative">
                   {mapError ? (
                     <div className="flex flex-col items-center justify-center h-full text-slate-500">
                       <MapPin size={40} className="mb-2 text-slate-300"/>
                       <p>Map view unavailable.</p>
                       <button onClick={() => setMapError(false)} className="text-sm text-blue-600 mt-2 underline">Retry</button>
                     </div>
                   ) : (
                     <iframe
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        style={{ border: 0 }}
                        src={mapUrl}
                        onError={() => setMapError(true)}
                        allowFullScreen
                      ></iframe>
                   )}
                   {/* Fallback Pin Drop Simulation */}
                   <button 
                     className="absolute bottom-3 right-3 bg-white shadow-md text-slate-700 px-3 py-1.5 rounded-md text-xs font-bold border border-slate-200 hover:bg-slate-50"
                     onClick={() => console.log("Pin Drop Mode: In a full production app, this would allow you to drag a marker on a Google Maps JS API instance to correct coordinates.")}
                   >
                     Drop Pin
                   </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                 <h3 className="font-bold text-lg mb-4">Financials</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg">
                       <p className="text-xs text-slate-500 uppercase">Asking Price</p>
                       <p className="text-xl font-bold text-slate-900">${deal.askingPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                       <p className="text-xs text-slate-500 uppercase">Highest Offer</p>
                       <p className="text-xl font-bold text-green-600">{deal.highestOffer > 0 ? `$${deal.highestOffer.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '-'}</p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Right Col */}
           <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                 <h3 className="font-bold text-sm text-slate-400 uppercase mb-4">Owner Contact</h3>
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-summit-100 flex items-center justify-center text-summit-900"><User size={20} /></div>
                    <div><p className="font-bold text-slate-900">{deal.owner.name}</p><p className="text-xs text-slate-500">Property Owner</p></div>
                 </div>
                 <div className="space-y-3 text-sm">
                    <div className="flex gap-3"><Mail size={16} className="text-slate-400" /> {deal.owner.email}</div>
                    <div className="flex gap-3"><Phone size={16} className="text-slate-400" /> {deal.owner.phone}</div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
             <h2 className="text-lg font-bold text-slate-800">Deal Tasks</h2>
             <button onClick={() => { setEditingTask(undefined); setIsTaskModalOpen(true); }} className="bg-summit-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-summit-800">
               <Plus size={16} /> Add Task
             </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
             {tasks.length > 0 ? tasks.map(task => (
               <div key={task.id} className="p-4 border-b border-slate-100 flex items-center gap-4 hover:bg-slate-50">
                  <div className={`p-2 rounded-full ${task.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400 cursor-pointer hover:bg-green-50 hover:text-green-500'}`}
                       onClick={() => handleSaveTask({ ...task, status: task.status === 'completed' ? 'pending' : 'completed' })}
                  >
                     <CheckSquare size={20} />
                  </div>
                  <div className="flex-1 cursor-pointer" onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }}>
                     <h4 className={`font-medium ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</h4>
                     <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        <span className="capitalize bg-slate-100 px-2 rounded">{task.type}</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {new Date(task.dueDate).toLocaleDateString()} at {task.dueTime}</span>
                        {task.priority === 'urgent' && <span className="text-red-500 font-bold">Urgent</span>}
                     </p>
                  </div>
               </div>
             )) : (
               <div className="p-12 text-center text-slate-400">No tasks for this deal yet.</div>
             )}
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
             <h2 className="text-lg font-bold text-slate-800">Deal Documents</h2>
             <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
             <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-summit-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-summit-800 disabled:opacity-70"
             >
               {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
               {isUploading ? 'Uploading...' : 'Upload Document'}
             </button>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
             {(deal.documents || []).length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                 {(deal.documents || []).map(doc => (
                   <div key={doc.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow group bg-white">
                      <div className="flex justify-between items-start mb-3">
                         <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xs">
                            {doc.type}
                         </div>
                         <button className="text-slate-400 hover:text-slate-600">
                            <MoreVertical size={16} />
                         </button>
                      </div>
                      <h3 className="font-semibold text-slate-800 text-sm truncate mb-1" title={doc.name}>{doc.name}</h3>
                      <p className="text-xs text-slate-500 truncate mb-4">{doc.size} • {new Date(doc.uploadDate).toLocaleDateString()}</p>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                         <button onClick={() => handleDownload(doc)} className="text-slate-400 hover:text-summit-900 flex items-center gap-1 text-xs">
                            <Download size={14} /> Download
                         </button>
                         <button 
                           onClick={() => { if(true) onDeleteDocument(deal.id, doc.id); }} 
                           className="text-slate-400 hover:text-red-600"
                         >
                           <Trash2 size={14} />
                         </button>
                      </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="p-12 text-center text-slate-400">
                  <FileText size={40} className="mx-auto mb-3 opacity-20" />
                  <p>No documents uploaded yet.</p>
               </div>
             )}
          </div>
        </div>
      )}

      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        onSave={handleSaveTask}
        initialData={editingTask}
        dealId={deal.id}
      />
    </div>
  );
};

export default DealDetailsPage;
