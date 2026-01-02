
import React, { useState } from 'react';
import { 
  ArrowLeft, Building2, Edit, Trash2, MapPin, 
  Upload, Loader2, Sparkles, MapPinned, ExternalLink, 
  Target, Mail, Phone, ArrowRight, FileText, Globe, 
  Zap, Compass, ShieldCheck, Clock
} from 'lucide-react';
import { Deal, DealStatus, DocumentFile } from '../types.ts';
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

const DealDetailsPage: React.FC<DealDetailsPageProps> = ({ 
  deal, onBack, onUpdateDeal, onEditDeal, onDeleteDeal, onViewDocuments 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'documents'>('overview');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insights, setInsights] = useState<{ text: string; sources: GroundingSource[] } | null>(null);

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

  return (
    <div className="max-w-7xl mx-auto pb-24">
      {/* Navigation */}
      <button onClick={onBack} className="flex items-center text-slate-400 hover:text-summit-900 mb-10 transition-all font-black text-xs uppercase tracking-[0.2em] group">
        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center mr-3 group-hover:border-summit-900 group-hover:shadow-sm transition-all">
          <ArrowLeft size={16} />
        </div>
        Return to Master Pipeline
      </button>

      {/* Hero Header */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-10 mb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 opacity-[0.02] pointer-events-none rotate-12">
            <Building2 size={300} />
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-10">
          <div className="flex-1">
             <div className="flex flex-wrap items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                <span className="bg-summit-accent/10 text-summit-accent px-3 py-1.5 rounded-xl flex items-center gap-1.5"><Building2 size={12}/> {deal.propertyType}</span>
                <span>•</span>
                <span className="flex items-center gap-1.5"><ShieldCheck size={12}/> Asset UID: {deal.id.slice(0,12)}</span>
                <span>•</span>
                {/* Fixed: Added missing Clock import to lucide-react */}
                <span className="flex items-center gap-1.5"><Clock size={12}/> Updated {new Date(deal.lastUpdated).toLocaleDateString()}</span>
             </div>
             <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none mb-4">{deal.propertyAddress}</h1>
             <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                <MapPin size={16} className="text-rose-500" />
                Louisville Metropolitan Area • KY, USA
             </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <div className="relative">
                <select 
                  value={deal.status} 
                  onChange={(e) => onUpdateDeal({ ...deal, status: e.target.value as DealStatus })} 
                  className="bg-slate-50 border-2 border-slate-100 text-slate-900 font-black text-xs uppercase tracking-widest rounded-2xl px-6 py-4 outline-none cursor-pointer hover:border-summit-accent transition-all appearance-none pr-12"
                >
                    {Object.values(DealStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ArrowRight size={16} className="rotate-90" />
                </div>
             </div>
             <button onClick={onEditDeal} className="bg-summit-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-summit-900/20 hover:bg-slate-800 transition-all hover:-translate-y-0.5 active:scale-95">Modify Mandate</button>
             <button onClick={onDeleteDeal} className="bg-red-50 text-red-500 hover:bg-red-100 w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-95"><Trash2 size={24} /></button>
          </div>
        </div>

        <div className="flex gap-10 mt-12 border-b border-slate-50">
           {['overview', 'financials', 'documents'].map(tab => (
             <button 
               key={tab}
               onClick={() => setActiveTab(tab as any)} 
               className={`pb-6 font-black text-xs uppercase tracking-[0.2em] border-b-4 transition-all ${activeTab === tab ? 'border-summit-accent text-summit-900' : 'border-transparent text-slate-300 hover:text-slate-500'}`}
             >
                {tab}
             </button>
           ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
           <div className="lg:col-span-2 space-y-10">
              {/* Maps Grounding Section */}
              <div className="bg-white rounded-[3rem] shadow-xl border-2 border-purple-100 p-10 relative overflow-hidden group">
                <div className="absolute -top-20 -right-20 p-20 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                   <Zap size={300} className="text-purple-600" />
                </div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                   <div>
                     <h3 className="text-3xl font-black text-slate-900 flex items-center gap-4">
                       <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-lg shadow-purple-200">
                          <MapPinned size={28} />
                       </div>
                       Site Intelligence IQ
                     </h3>
                     <p className="text-sm text-slate-500 mt-2 font-bold uppercase tracking-widest flex items-center gap-2">
                        <Compass size={14} className="text-purple-400" /> AI Infrastructure Audit
                     </p>
                   </div>
                   {!insights && (
                     <button onClick={fetchSiteAudit} disabled={loadingInsights} className="bg-purple-600 text-white px-8 py-4 rounded-[1.5rem] text-sm font-black flex items-center gap-3 hover:bg-purple-700 disabled:opacity-50 shadow-2xl shadow-purple-200 transition-all hover:scale-[1.02] active:scale-95">
                       {loadingInsights ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                       {loadingInsights ? 'Parsing Infrastructure...' : 'Run Neural Audit'}
                     </button>
                   )}
                </div>

                {insights ? (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="prose prose-slate max-w-none text-slate-700 leading-[1.8] bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100 whitespace-pre-wrap font-medium text-lg italic">
                      {insights.text}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-5">Verified Grounding Sources</p>
                      <div className="flex flex-wrap gap-3">
                        {insights.sources.map((src, i) => (
                          <a key={i} href={src.uri} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-white border border-slate-200 px-6 py-3 rounded-2xl text-xs font-black text-slate-800 hover:border-purple-600 hover:shadow-xl hover:shadow-purple-100 transition-all group">
                            <Target size={16} className="text-rose-500" />
                            {src.title}
                            <ExternalLink size={14} className="text-slate-300 group-hover:text-purple-600 ml-2" />
                          </a>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => setInsights(null)} className="text-[10px] font-black uppercase text-slate-300 hover:text-rose-500 transition-colors tracking-widest">Clear neural cache</button>
                  </div>
                ) : !loadingInsights && (
                   <div className="bg-slate-50/50 rounded-[2.5rem] border-4 border-dashed border-slate-100 p-16 text-center">
                      <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-50">
                        <Globe size={40} className="text-slate-200" />
                      </div>
                      <p className="text-slate-400 font-black text-xl tracking-tight">Generate spatial awareness of this asset.</p>
                      <p className="text-slate-300 text-sm mt-2 font-bold uppercase tracking-widest">Grounding powered by Google Maps & Gemini 2.5</p>
                   </div>
                )}
              </div>

              {/* Property Imagery */}
              <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="h-[500px] bg-slate-100 relative group">
                   <img src={deal.imageUrl} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" alt="Asset Photography" />
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>
                   <div className="absolute bottom-10 left-10 text-white">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-80">Primary Visualization</p>
                      <h4 className="text-3xl font-black">Exterior Elevation</h4>
                   </div>
                </div>
                <div className="p-10">
                   <h3 className="font-black text-2xl mb-6 text-slate-900 uppercase tracking-tighter">Executive Memorandum</h3>
                   <p className="text-slate-600 leading-relaxed text-xl whitespace-pre-line font-medium italic border-l-4 border-summit-accent pl-8">
                     "{deal.description || "No formal executive memorandum has been drafted for this property asset. Use the 'Edit' tool to update listing details."}"
                   </p>
                </div>
              </div>
           </div>

           {/* Metrics Column */}
           <div className="space-y-10">
              <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-10">
                 <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-[0.3em] mb-10 border-b border-slate-50 pb-6 flex items-center gap-2">
                    <Zap size={14} className="text-summit-accent" /> Institutional Metrics
                 </h3>
                 <div className="space-y-10">
                    <div className="group">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Offering Price</p>
                       <p className="text-4xl font-black text-slate-900 group-hover:text-summit-accent transition-colors tracking-tighter">
                         ${deal.askingPrice.toLocaleString()}
                       </p>
                    </div>
                    <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100">
                       <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Highest Active Offer</p>
                       <p className="text-3xl font-black text-emerald-800 tracking-tighter">
                         {deal.highestOffer > 0 ? `$${deal.highestOffer.toLocaleString()}` : '0 Pending'}
                       </p>
                    </div>
                    <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-50">
                       <div>
                          <span className="block text-[10px] font-black text-slate-400 uppercase mb-1">Target Yield</span>
                          <span className="text-lg font-black text-slate-800 tracking-tight">5.2% Est.</span>
                       </div>
                       <div>
                          <span className="block text-[10px] font-black text-slate-400 uppercase mb-1">Status</span>
                          <span className="text-lg font-black text-summit-accent tracking-tight">{deal.status}</span>
                       </div>
                    </div>
                 </div>
              </div>
              
              <div className="bg-summit-900 rounded-[3rem] shadow-2xl p-10 text-white relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-summit-accent opacity-10 blur-3xl"></div>
                 
                 <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-[0.3em] mb-10 border-b border-white/5 pb-6">Lead Representative</h3>
                 
                 <div className="flex items-center gap-6 mb-10">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-summit-accent text-summit-900 flex items-center justify-center font-black text-2xl uppercase shadow-xl shadow-emerald-900/50">
                      {deal.owner.name[0]}
                    </div>
                    <div>
                      <p className="font-black text-2xl tracking-tight">{deal.owner.name}</p>
                      <p className="text-[10px] text-summit-accent font-black uppercase tracking-[0.2em] mt-1">Principal Mandate</p>
                    </div>
                 </div>
                 
                 <div className="space-y-4">
                    <button className="w-full flex items-center justify-between p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group border border-white/5">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-summit-accent group-hover:bg-summit-accent group-hover:text-summit-900 transition-all">
                             <Mail size={18} />
                          </div>
                          <span className="text-sm font-black truncate max-w-[140px] tracking-tight">{deal.owner.email}</span>
                       </div>
                       <ArrowRight size={16} className="text-slate-500 group-hover:text-white" />
                    </button>
                    <button className="w-full flex items-center justify-between p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group border border-white/5">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-summit-accent group-hover:bg-summit-accent group-hover:text-summit-900 transition-all">
                             <Phone size={18} />
                          </div>
                          <span className="text-sm font-black tracking-tight">{deal.owner.phone}</span>
                       </div>
                       <ArrowRight size={16} className="text-slate-500 group-hover:text-white" />
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
      
      {activeTab === 'documents' && (
        <div className="bg-white rounded-[3rem] p-16 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
           <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mb-8 border border-slate-100">
              <FileText size={48} />
           </div>
           <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Digital Data Room</h3>
           <p className="text-slate-400 font-medium mt-3 max-w-md text-lg">Initialize document storage for this mandate. Securely store appraisals, environmental audits, and title commitments.</p>
           <button onClick={onViewDocuments} className="mt-10 bg-summit-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">Enter Vault</button>
        </div>
      )}
    </div>
  );
};

export default DealDetailsPage;
