import React, { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Filter, Search, MoreVertical, Download, Trash2, FolderOpen } from 'lucide-react';
import { Deal, DocumentFile } from '../types';

interface DocumentsPageProps {
  deals: Deal[];
  initialFilterDealId?: string | null;
  onAddDocument: (dealId: string, docFile: DocumentFile) => void;
  onDeleteDocument: (dealId: string, docId: string) => void;
}

const DocumentsPage: React.FC<DocumentsPageProps> = ({ deals, initialFilterDealId, onAddDocument, onDeleteDocument }) => {
  const [selectedDealId, setSelectedDealId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialFilterDealId) setSelectedDealId(initialFilterDealId);
  }, [initialFilterDealId]);

  const handleUploadClick = () => {
    if (selectedDealId === 'all') {
      alert("Please select a specific property from the filter dropdown before uploading.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (selectedDealId === 'all') return;

    // Create a mock document object
    const newDoc: DocumentFile = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      uploadDate: new Date().toISOString(),
      dealId: selectedDealId,
      url: URL.createObjectURL(file) // Create a blob URL for immediate access
    };

    onAddDocument(selectedDealId, newDoc);
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = (doc: DocumentFile) => {
    // If we have a blob URL (from fresh upload), use it. 
    // Otherwise, simulate a download for mock data.
    const url = doc.url || `https://example.com/mock-doc-${doc.id}.pdf`;
    
    // For mock data simulation
    if (!doc.url) {
      const blob = new Blob([`Simulated content for ${doc.name}`], { type: 'text/plain' });
      const mockUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = mockUrl;
      a.download = doc.name;
      a.click();
      window.URL.revokeObjectURL(mockUrl);
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      a.click();
    }
  };

  // Flatten documents from deals for the view
  const allDocs = deals.flatMap(deal => 
    deal.documents.map((doc) => ({
      ...doc,
      dealAddress: deal.propertyAddress,
      dealId: deal.id
    }))
  );

  const filteredDocs = allDocs.filter(doc => {
    const matchesDeal = selectedDealId === 'all' || doc.dealId === selectedDealId;
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDeal && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Document Center</h1>
           <p className="text-slate-500">Manage contracts, deeds, and offering memorandums.</p>
        </div>
        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange}
          />
          <button 
            onClick={handleUploadClick}
            className="bg-summit-accent text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-emerald-900/10 hover:bg-emerald-600 transition-colors flex items-center gap-2"
          >
            <Upload size={20} /> Upload Document
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="relative">
                <select 
                  value={selectedDealId}
                  onChange={(e) => setSelectedDealId(e.target.value)}
                  className="appearance-none bg-white border border-slate-300 text-slate-700 text-sm rounded-lg pl-3 pr-10 py-2.5 focus:ring-summit-accent outline-none cursor-pointer min-w-[200px]"
                >
                  <option value="all">All Properties</option>
                  {deals.map(d => (
                    <option key={d.id} value={d.id}>{d.propertyAddress}</option>
                  ))}
                </select>
                <FolderOpen size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
             </div>
             <button className="p-2.5 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">
               <Filter size={18} />
             </button>
          </div>
          
          <div className="relative w-full md:w-64">
             <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input 
               type="text" 
               placeholder="Search files..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-summit-accent outline-none" 
             />
          </div>
        </div>

        {/* File List */}
        <div className="min-h-[400px]">
           {filteredDocs.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
               {filteredDocs.map(doc => (
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
                    <p className="text-xs text-slate-500 truncate mb-4">{(doc as any).dealAddress}</p>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                       <span className="text-xs text-slate-400">{new Date(doc.uploadDate).toLocaleDateString()}</span>
                       <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleDownload(doc)} className="text-slate-400 hover:text-summit-900"><Download size={16} /></button>
                          <button 
                            onClick={() => {
                              if(confirm('Are you sure you want to delete this file?')) onDeleteDocument((doc as any).dealId, doc.id);
                            }} 
                            className="text-slate-400 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                       </div>
                    </div>
                 </div>
               ))}
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
                <FileText size={48} className="mb-4 opacity-20" />
                <p>No documents found for this selection.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default DocumentsPage;
