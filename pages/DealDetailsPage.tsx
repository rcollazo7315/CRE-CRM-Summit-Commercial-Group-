
import React, { useState } from 'react';
import { ArrowLeft, MapPin, Building2, User, Phone, Mail, Calendar, Edit, CheckCircle, FileText, Download, Trash2 } from 'lucide-react';
import { Deal, DealStatus, DocumentFile } from '../types';

interface DealDetailsPageProps {
  deal: Deal;
  onBack: () => void;
  onUpdateDeal: (deal: Deal) => void;
  onEditDeal: () => void;
  onDeleteDeal: () => void;
  onViewDocuments: () => void;
}

const DealDetailsPage: React.FC<DealDetailsPageProps> = ({ deal, onBack, onUpdateDeal, onEditDeal, onDeleteDeal, onViewDocuments }) => {
  const [status, setStatus] = useState(deal.status);

  // Helper to update status locally and propagate up
  const handleStatusChange = (newStatus: DealStatus) => {
    setStatus(newStatus);
    onUpdateDeal({ ...deal, status: newStatus });
  };

  const handleDownload = (doc: DocumentFile) => {
    // Create blob logic for download simulation
    const blob = new Blob([`Simulated content for ${doc.name}`], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.name;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const mapQuery = encodeURIComponent(deal.propertyAddress);

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
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value as DealStatus)}
                  className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-lg pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-summit-accent outline-none cursor-pointer"
                >
                  {Object.values(DealStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <Edit size={14} />
                </div>
             </div>
             <button 
               onClick={onEditDeal}
               className="bg-summit-900 text-white px-5 py-2.5 rounded-lg font-medium shadow-lg shadow-summit-900/20 hover:bg-summit-800 transition-colors"
             >
               Edit Deal
             </button>
             <button 
               onClick={onDeleteDeal}
               className="bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 px-3 py-2.5 rounded-lg transition-colors"
               title="Delete Deal"
             >
               <Trash2 size={20} />
             </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
           
           {/* Image & Map Tabs */}
           <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="h-64 md:h-80 relative bg-slate-100 group">
                {/* Visual toggle between Map and Image could be added, defaulting to Image or Map based on preference */}
                <img src={deal.imageUrl} className="w-full h-full object-cover" alt="Property" />
                
                <div className="absolute bottom-4 right-4 flex gap-2">
                   <a 
                    href={`https://maps.google.com/?q=${mapQuery}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 shadow-sm flex items-center hover:bg-white"
                   >
                     <MapPin size={12} className="mr-1 text-red-500" /> Open Maps
                   </a>
                </div>
             </div>
             <div className="p-6">
                <h3 className="font-bold text-lg mb-4">Property Description</h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {deal.description || "No description provided."}
                </p>
                {deal.notes && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
                    <h4 className="text-xs font-bold text-yellow-700 uppercase mb-1">Agent Notes</h4>
                    <p className="text-sm text-yellow-800">{deal.notes}</p>
                  </div>
                )}
             </div>
           </div>

           {/* Financial Highlights */}
           <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-bold text-lg mb-4">Deal Financials</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Asking Price</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">${(deal.askingPrice / 1000000).toFixed(2)}M</p>
                 </div>
                 <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Highest Offer</p>
                    <p className={`text-xl font-bold mt-1 ${deal.highestOffer > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                       {deal.highestOffer > 0 ? `$${(deal.highestOffer / 1000000).toFixed(2)}M` : 'N/A'}
                    </p>
                 </div>
                 <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Price / SF</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">$450</p>
                 </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Cap Rate</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">5.2%</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
           {/* Owner Card */}
           <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">Owner Contact</h3>
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-full bg-summit-100 text-summit-900 flex items-center justify-center">
                    <User size={20} />
                 </div>
                 <div>
                    <p className="font-bold text-slate-900">{deal.owner.name}</p>
                    <p className="text-xs text-slate-500">Property Owner</p>
                 </div>
              </div>
              <div className="space-y-3">
                 <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Mail size={16} className="text-slate-400" />
                    <a href={`mailto:${deal.owner.email}`} className="hover:text-summit-accent">{deal.owner.email}</a>
                 </div>
                 <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Phone size={16} className="text-slate-400" />
                    <span>{deal.owner.phone}</span>
                 </div>
              </div>
           </div>

           {/* Deal Stats */}
           <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">Status & Timeline</h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600 flex items-center gap-2"><Calendar size={16} /> Days on Market</span>
                    <span className="font-bold text-slate-900">{deal.daysOnMarket} Days</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600 flex items-center gap-2"><FileText size={16} /> Offers Received</span>
                    <span className="font-bold text-slate-900">{deal.offersReceived}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600 flex items-center gap-2"><CheckCircle size={16} /> Last Updated</span>
                    <span className="font-bold text-slate-900">{new Date(deal.lastUpdated).toLocaleDateString()}</span>
                 </div>
              </div>
           </div>

           {/* Documents Snippet */}
           <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider">Documents</h3>
                 <button onClick={onViewDocuments} className="text-xs text-summit-accent font-bold hover:underline">View All</button>
               </div>
               <ul className="space-y-2">
                 {deal.documents.length > 0 ? deal.documents.slice(0, 3).map((doc, i) => (
                   <li key={i} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded transition-colors group">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText size={14} className="text-slate-400 flex-shrink-0" />
                        <span className="text-sm text-slate-700 truncate" title={doc.name}>{doc.name}</span>
                      </div>
                      <button onClick={() => handleDownload(doc)} className="text-slate-400 hover:text-summit-900 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                         <Download size={14} />
                      </button>
                   </li>
                 )) : <li className="text-sm text-slate-400 italic">No documents uploaded.</li>}
               </ul>
           </div>

        </div>
      </div>
    </div>
  );
};

export default DealDetailsPage;
