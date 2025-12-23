
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Building2, User, Phone, Mail, Edit, Trash2, CheckSquare, Plus, Map as MapIcon, Upload, Loader2, Sparkles, MapPinned, ExternalLink, Target, DollarSign, ArrowRight, FileText } from 'lucide-react';
import { Deal, DealStatus, DocumentFile, Task } from '../types.ts';
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
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insights, setInsights] = useState<{ text: string; sources: GroundingSource[] } | null>(null);

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

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <button onClick={onBack} className="flex items-center text-slate-400 hover:text-summit-900 mb-8 transition-colors font-bold text-sm uppercase tracking-widest">
        <ArrowLeft size={16} className="mr-2" /> Return to Pipeline
      </button>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex-1">
             <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                <Building2 size={12} className="text-summit-accent" />
                <span>{deal.propertyType} Asset</span>
                <span>•</span>
                <span>UID: {deal.id.slice(0,8)}</span>
             </div>
             <h1 className="text-4xl font-black text-slate-900 tracking-tight">{deal.propertyAddress}</h1>
          </div>
          <div className="flex items-center gap-3">
             <select 
               value={deal.status} 
               onChange={(e) => onUpdateDeal({ ...deal, status: e.target.value as DealStatus })} 
               className="bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-xl px-5 py-3 outline-none cursor-pointer hover:border-summit-accent transition-colors"
             >
                {Object.values(DealStatus).map(s => <option key={s} value={s}>{s}</option>)}
             </select>
             <button onClick={onEditDeal} className="bg-summit-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-summit-800 transition-all">Modify</button>
             <button onClick={onDeleteDeal} className="bg-red-50 text-red-500 hover:bg-red-100 px-3 py-3 rounded-xl transition-colors"><Trash2 size={20} /></button>
          </div>
        </div>

        <div className="flex gap-8 mt-10 border-b border-slate-100">
           {['info', 'tasks', 'documents'].map(tab => (
             <button 
               key={tab}
               onClick={() => setActiveTab(tab as any)} 
               className={`pb-4 font-black text-xs uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-summit-accent text-summit-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
             >
                {tab === 'info' ? 'Transaction Data' : tab}
             </button>
           ))}
        </div>
      </div>

      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-8">
              {/* Site Analysis - Maps Grounding */}
              <div className="bg-white rounded-3xl shadow-xl border-2 border-summit-accent/20 p-8 relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 p-10 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none rotate-12">
                   <Sparkles size={240} />
                </div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                   <div>
                     <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                       <MapPinned className="text-summit-accent" /> Site Intelligence
                     </h3>
                     <p className="text-sm text-slate-500 mt-1 font-medium italic">Louisville Metro Area • AI Research Suite</p>
                   </div>
                   {!insights && (
                     <button onClick={fetchNeighborhoodIQ} disabled={loadingInsights} className="bg-summit-900 text-white px-6 py-3 rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-summit-800 disabled:opacity-50 shadow-xl transition-all hover:scale-[1.02]">
                       {loadingInsights ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                       {loadingInsights ? 'Analyzing Infrastructure...' : 'Run Site Audit'}
                     </button>
                   )}
                </div>

                {insights ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100 whitespace-pre-wrap font-medium">
                      {insights.text}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Key Infrastructure Sources</p>
                      <div className="flex flex-wrap gap-2">
                        {insights.sources.map((src, i) => (
                          <a key={i} href={src.uri} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-800 hover:border-summit-accent hover:shadow-md transition-all group">
                            <Target size={14} className="text-red-500" />
                            {src.title}
                            <ExternalLink size={12} className="text-slate-300 group-hover:text-summit-accent ml-2" />
                          </a>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => setInsights(null)} className="text-[10px] font-black uppercase text-slate-300 hover:text-red-500 transition-colors">Clear Analysis Cache</button>
                  </div>
                ) : !loadingInsights && (
                   <div className="bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <MapIcon size={32} className="text-slate-300" />
                      </div>
                      <p className="text-slate-400 font-bold">Audit transit hubs, retail density, and logistics anchors.</p>
                      <p className="text-slate-300 text-xs mt-1">Grounding powered by Google Maps API</p>
                   </div>
                )}
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="h-[400px] bg-slate-100 relative">
                   <img src={deal.imageUrl} className="w-full h-full object-cover" alt="Property Asset" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                </div>
                <div className="p-8">
                   <h3 className="font-black text-xl mb-4 text-slate-900 uppercase tracking-tight">Executive Summary</h3>
                   <p className="text-slate-600 leading-relaxed text-lg whitespace-pre-line font-medium italic">"{deal.description || "Portfolio asset details currently being updated by agent."}"</p>
                </div>
              </div>
           </div>

           <div className="space-y-8">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
                 <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest mb-6 border-b pb-4">Financial Metrics</h3>
                 <div className="space-y-6">
                    <div className="group">
                       <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Target Asking Price</p>
                       <p className="text-3xl font-black text-slate-900 group-hover:text-summit-accent transition-colors">${deal.askingPrice.toLocaleString()}</p>
                    </div>
                    <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                       <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Highest Executed Offer</p>
                       <p className="text-2xl font-black text-emerald-700">{deal.highestOffer > 0 ? `$${deal.highestOffer.toLocaleString()}` : 'No offers yet'}</p>
                    </div>
                    <div className="flex items-center justify-between px-2 pt-4 border-t border-slate-50">
                       <span className="text-xs font-bold text-slate-400">Yield (Cap Rate)</span>
                       <span className="text-sm font-black text-slate-900">5.2% Est.</span>
                    </div>
                 </div>
              </div>
              
              <div className="bg-summit-900 rounded-3xl shadow-xl p-8 text-white">
                 <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest mb-6 border-b border-white/10 pb-4">Principal Contact</h3>
                 <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-summit-accent font-black text-xl uppercase">
                      {deal.owner.name[0]}
                    </div>
                    <div>
                      <p className="font-black text-lg">{deal.owner.name}</p>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Representative</p>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <button className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group">
                       <div className="flex items-center gap-3">
                          <Mail size={18} className="text-summit-accent" />
                          <span className="text-sm font-bold truncate max-w-[150px]">{deal.owner.email}</span>
                       </div>
                       <ArrowRight size={14} className="text-slate-500 group-hover:text-white" />
                    </button>
                    <button className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group">
                       <div className="flex items-center gap-3">
                          <Phone size={18} className="text-summit-accent" />
                          <span className="text-sm font-bold">{deal.owner.phone}</span>
                       </div>
                       <ArrowRight size={14} className="text-slate-500 group-hover:text-white" />
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
      
      {activeTab === 'documents' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white rounded-3xl p-10 shadow-sm border border-slate-200 min-h-[400px]">
           <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mb-4">
                 <FileText size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Data Room Empty</h3>
              <p className="text-slate-400 text-sm mt-2 max-w-xs">Upload contracts, appraisals, or zoning permits to this transaction's dedicated secure storage.</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default DealDetailsPage;
