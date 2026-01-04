
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MapPin, User, Phone, Mail, Edit, FileText, Download, Trash2, CheckSquare, Clock, Plus, Map as MapIcon, Upload, Loader2, MoreVertical, Tag, Briefcase, Building, CheckCircle2, Zap, Compass, Sparkles, MapPinned, ExternalLink, Target, Globe, ShieldCheck, Camera, Calendar } from 'lucide-react';
import { Deal, DealStatus, DocumentFile, Task, LEAD_SOURCE_LABELS, REPRESENTATION_LABELS } from '../types.ts';
import TaskModal from '../components/TaskModal.tsx';
import { api } from '../services/firestore.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { analyzeSiteNeighborhood, GroundingSource } from '../services/geminiService.ts';
import { generateOwnerReport } from '../utils/pdfGenerator.ts';
import { getDaysRemaining, getDeadlineColor, isValidDate } from '../utils/dateUtils.ts';

interface DealDetailsPageProps {
  deal: Deal;
  onBack: () => void;
  onUpdateDeal: (deal: Deal) => void;
  onEditDeal: () => void;
  onDeleteDeal: () => void;
  onViewDocuments: () => void;
  onAddDocument: (dealId: string, doc: DocumentFile, file: File) => void;
  onDeleteDocument: (dealId: string, docId: string) => void;
  onTaskComplete: (task: Task) => void;
}

const DealDetailsPage: React.FC<DealDetailsPageProps> = ({ deal, onBack, onUpdateDeal, onEditDeal, onDeleteDeal, onViewDocuments, onAddDocument, onDeleteDocument, onTaskComplete }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'tasks' | 'documents'>('info');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task> | undefined>(undefined);
  const [mapError, setMapError] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insights, setInsights] = useState<{ text: string; sources: GroundingSource[] } | null>(null);
  
  // Document & Image Upload State
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroImageInputRef = useRef<HTMLInputElement>(null);

  const isDemandSide = deal.representation === 'buyer' || deal.representation === 'tenant';
  const isLeasing = deal.representation === 'landlord' || deal.representation === 'tenant';
  const isClosed = deal.status === DealStatus.COMPLETED;

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

  const handleStatusChange = (value: string) => {
    onUpdateDeal({ ...deal, status: value as DealStatus });
  };

  const fetchSiteAudit = async () => {
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

  // Google Maps Embed URL
  const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(deal.propertyAddress)}&output=embed`;

  // Hero Image Handler
  const handleHeroImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      onUpdateDeal({ ...deal, imageUrl: base64String });
    };
    reader.readAsDataURL(file);
  };

  // Document Handler
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

  // Determine next deadline
  const nextDeadline = React.useMemo(() => {
    if (!deal.contractDates?.contractDate) return null;
    
    const types: ('dueDiligence' | 'financing' | 'closing')[] = ['dueDiligence', 'financing', 'closing'];
    const candidates = types
      .map(t => ({
        type: t,
        ...deal.contractDates![t]
      }))
      .filter(item => item.status === 'pending' && isValidDate(item.date))
      .map(item => ({
        ...item,
        daysRemaining: getDaysRemaining(item.date!)
      }))
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    return candidates[0] || null;
  }, [deal.contractDates]);

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <button onClick={onBack} className="flex items-center text-slate-500 hover:text-summit-900 mb-6 transition-colors font-medium">
        <ArrowLeft size={18} className="mr-2" /> Back to Deals
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
             <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${isDemandSide ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {isDemandSide ? <Briefcase size={12}/> : <Building size={12}/>}
                    {REPRESENTATION_LABELS[deal.representation || 'seller']}
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-medium text-slate-500">{deal.propertyType}</span>
                
                {/* Next Deadline Badge */}
                {nextDeadline && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                      getDeadlineColor(nextDeadline.daysRemaining, false)
                    }`}>
                      <Clock size={12} />
                      {nextDeadline.type === 'dueDiligence' ? 'Due Diligence' : nextDeadline.type === 'financing' ? 'Financing' : 'Closing'} in {nextDeadline.daysRemaining} days
                    </span>
                  </>
                )}
             </div>
             <h1 className="text-3xl font-bold text-slate-900">{deal.propertyAddress}</h1>
             <p className="flex items-center text-slate-500 mt-2">
               <MapPin size={16} className="mr-1" />
               {isDemandSide ? 'Search Area / Target Location' : 'Property Location'}
             </p>
          </div>
          <div className="flex items-center gap-3">
             <div className="relative">
                <select 
                  value={deal.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-lg pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-summit-accent outline-none cursor-pointer"
                >
                  {Object.values(DealStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <Edit size={14} />
                </div>
             </div>
             <button onClick={onEditDeal} className="bg-summit-900 text-white px-5 py-2.5 rounded-lg font-medium shadow-lg hover:bg-summit-800 transition-colors">Edit Deal</button>
             <button onClick={() => generateOwnerReport(deal, tasks)} className="bg-white border border-slate-200 text-slate-700 hover:text-summit-900 px-3 py-2.5 rounded-lg flex items-center gap-2 font-medium" title="Export Owner Report">
               <Download size={18} /> Owner Report
             </button>
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
              
              {/* FINAL DEAL POINTS CARD */}
              {(deal.closingPrice || deal.finalLeaseRate || isClosed) && (
                <div className={`rounded-xl shadow-sm border p-6 ${isClosed ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                   <h3 className={`font-bold text-lg mb-4 flex items-center gap-2 ${isClosed ? 'text-emerald-900' : 'text-slate-800'}`}>
                     <CheckCircle2 size={20} className={isClosed ? 'text-emerald-600' : 'text-slate-400'} />
                     Final Term Sheet
                   </h3>
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      {isLeasing ? (
                        <>
                          <div>
                             <p className="text-xs font-bold uppercase opacity-60 mb-1">Exec. Lease Rate</p>
                             <p className="text-xl font-bold">${deal.finalLeaseRate || 0}<span className="text-sm font-normal">/sf/yr</span></p>
                          </div>
                          <div>
                             <p className="text-xs font-bold uppercase opacity-60 mb-1">Lease Term</p>
                             <p className="text-xl font-bold">{deal.finalLeaseTerm || 0} <span className="text-sm font-normal">Months</span></p>
                          </div>
                          <div>
                             <p className="text-xs font-bold uppercase opacity-60 mb-1">Lease Type</p>
                             <p className="text-xl font-bold">{deal.finalLeaseType || deal.leaseType || 'N/A'}</p>
                          </div>
                          <div>
                             <p className="text-xs font-bold uppercase opacity-60 mb-1">Commencement</p>
                             <p className="text-lg font-semibold">{deal.leaseStartDate ? new Date(deal.leaseStartDate).toLocaleDateString() : 'Pending'}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                             <p className="text-xs font-bold uppercase opacity-60 mb-1">Final Price</p>
                             <p className="text-2xl font-bold text-emerald-700">${deal.closingPrice?.toLocaleString() || '-'}</p>
                          </div>
                          <div>
                             <p className="text-xs font-bold uppercase opacity-60 mb-1">Closing Date</p>
                             <p className="text-lg font-semibold">{deal.closingDate ? new Date(deal.closingDate).toLocaleDateString() : 'Pending'}</p>
                          </div>
                        </>
                      )}
                      
                      {deal.actualCommission && (
                        <div className="p-3 bg-white/50 rounded-lg border border-slate-200/50">
                           <p className="text-xs font-bold uppercase opacity-60 mb-1">Gross Commission</p>
                           <p className="text-lg font-mono font-bold text-slate-800">${deal.actualCommission.toLocaleString()}</p>
                        </div>
                      )}
                   </div>
                </div>
              )}

              {/* Site Intelligence */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 relative overflow-hidden group">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6">
                   <div>
                     <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                       <Zap size={20} className="text-summit-accent" /> Site Intelligence IQ
                     </h3>
                     <p className="text-xs text-slate-500 mt-1 font-bold uppercase tracking-widest flex items-center gap-2">
                        <Compass size={12} className="text-slate-400" /> AI Infrastructure Audit
                     </p>
                   </div>
                   {!insights && (
                     <button onClick={fetchSiteAudit} disabled={loadingInsights} className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-purple-200 disabled:opacity-50 transition-all">
                       {loadingInsights ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                       {loadingInsights ? 'Analyzing...' : 'Run Neural Audit'}
                     </button>
                   )}
                </div>

                {insights ? (
                  <div className="space-y-4 animate-in fade-in duration-500">
                    <div className="prose prose-sm max-w-none text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-100 whitespace-pre-wrap">
                      {insights.text}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-2">Sources</p>
                      <div className="flex flex-wrap gap-2">
                        {insights.sources.map((src, i) => (
                          <a key={i} href={src.uri} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:border-purple-300 transition-colors">
                            <Target size={12} className="text-rose-500" />
                            {src.title}
                            <ExternalLink size={10} className="text-slate-300 ml-1" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : !loadingInsights && (
                   <div className="bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-100 p-8 text-center">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-50">
                        <Globe size={24} className="text-slate-300" />
                      </div>
                      <p className="text-slate-400 text-sm font-medium">Generate spatial awareness for this asset.</p>
                   </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="h-64 bg-slate-100 relative group">
                   <img src={deal.imageUrl} className="w-full h-full object-cover transition-all group-hover:scale-105" alt="Property" />
                   <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => heroImageInputRef.current?.click()}
                        className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
                      >
                        <Camera size={18} /> Change Photo
                      </button>
                      <input 
                        type="file" 
                        ref={heroImageInputRef}
                        onChange={handleHeroImageChange}
                        className="hidden"
                        accept="image/*"
                      />
                   </div>
                   {isDemandSide && !deal.imageUrl.includes('base64') && (
                       <div className="absolute top-4 left-4">
                           <div className="bg-white/90 backdrop-blur px-3 py-1 rounded text-xs font-bold text-slate-800 shadow-sm">
                               Ref / Target Style
                           </div>
                       </div>
                   )}
                </div>
                <div className="p-6">
                   <h3 className="font-bold text-lg mb-4">{isDemandSide ? 'Requirements Brief' : 'Property Description'}</h3>
                   <p className="text-slate-600 leading-relaxed whitespace-pre-line">{deal.description || "No description."}</p>
                </div>
              </div>
              
              {/* Map Section */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <MapIcon size={20} className="text-slate-400"/> {isDemandSide ? 'Search Area' : 'Location Map'}
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
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                 <h3 className="font-bold text-lg mb-4">Initial Financial Targets</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg">
                       <p className="text-xs text-slate-500 uppercase">{isDemandSide ? 'Target Budget' : 'Asking Price'}</p>
                       <p className="text-xl font-bold text-slate-900">${deal.askingPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    </div>
                    {isDemandSide ? (
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500 uppercase">Size Requirements</p>
                            <p className="text-xl font-bold text-slate-900">
                                {deal.minSqFt ? deal.minSqFt.toLocaleString() : '0'} - {deal.maxSqFt ? deal.maxSqFt.toLocaleString() : 'Any'} <span className="text-sm font-normal text-slate-500">sqft</span>
                            </p>
                        </div>
                    ) : (
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="text-xs text-slate-500 uppercase">Highest Offer</p>
                            <p className="text-xl font-bold text-green-600">{deal.highestOffer > 0 ? `$${deal.highestOffer.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '-'}</p>
                        </div>
                    )}
                    {deal.projectedCommission && (
                        <div className="p-4 bg-slate-50 rounded-lg col-span-2 border border-slate-200">
                            <p className="text-xs text-slate-500 uppercase">Projected Commission</p>
                            <p className="text-xl font-bold text-slate-900">${deal.projectedCommission.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                    )}
                 </div>
              </div>
           </div>

           {/* Right Col */}
           <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                 <h3 className="font-bold text-sm text-slate-400 uppercase mb-4">{isDemandSide ? 'Client Contact' : 'Owner Contact'}</h3>
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-summit-100 flex items-center justify-center text-summit-900"><User size={20} /></div>
                    <div><p className="font-bold text-slate-900">{deal.owner.name}</p><p className="text-xs text-slate-500">{isDemandSide ? 'Client' : 'Property Owner'}</p></div>
                 </div>
                 <div className="space-y-3 text-sm">
                    <div className="flex gap-3"><Mail size={16} className="text-slate-400" /> {deal.owner.email}</div>
                    <div className="flex gap-3"><Phone size={16} className="text-slate-400" /> {deal.owner.phone}</div>
                 </div>
              </div>

              {/* Lead Source Info */}
              {deal.leadSource && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                  <h3 className="font-bold text-sm text-slate-400 uppercase mb-4 flex items-center gap-2">
                    <Tag size={16} /> Attribution
                  </h3>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">Lead Source</h4>
                    <p className="font-medium text-slate-800">{LEAD_SOURCE_LABELS[deal.leadSource] || deal.leadSource}</p>
                    {deal.leadSourceNotes && (
                      <p className="text-sm text-slate-600 mt-2 italic border-t border-slate-200 pt-2">{deal.leadSourceNotes}</p>
                    )}
                  </div>
                </div>
              )}
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
               <div key={task.id} className="p-4 border-b border-slate-100 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <button 
                       className={`p-2 rounded-full transition-colors flex-shrink-0 ${task.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400 hover:bg-green-50 hover:text-green-500'}`}
                       onClick={(e) => { 
                         e.stopPropagation();
                         onTaskComplete(task);
                         // Optimistic update locally for immediate feedback
                         setTasks(prev => prev.map(t => t.id === task.id ? {...t, status: t.status === 'completed' ? 'pending' : 'completed'} : t));
                       }}
                  >
                     <CheckSquare size={20} />
                  </button>
                  <div className="flex-1 cursor-pointer" onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }}>
                     <h4 className={`font-medium ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</h4>
                     <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        <span className="capitalize bg-slate-100 px-2 rounded font-semibold">{task.type}</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {new Date(task.dueDate).toLocaleDateString()} at {task.dueTime}</span>
                        {task.priority === 'urgent' && <span className="text-red-500 font-bold bg-red-50 px-2 rounded">Urgent</span>}
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
