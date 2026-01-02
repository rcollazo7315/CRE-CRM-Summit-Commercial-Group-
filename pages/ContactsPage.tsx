import React, { useState, useMemo } from 'react';
import { 
  Users, UserPlus, Search, X, Mail, Phone, Tag, 
  Upload, Check, ArrowRight, AlertCircle, Edit, Trash2,
  Building, User as UserIcon, MoreHorizontal
} from 'lucide-react';
import { Contact, ContactInteraction, Deal, ContactType, ContactStatus } from '../types.ts';

const CONTACT_TYPES: { value: ContactType; label: string; color: string }[] = [
  { value: 'owner', label: 'Owner/Landlord', color: 'bg-blue-100 text-blue-700' },
  { value: 'tenant', label: 'Tenant/Occupier', color: 'bg-rose-100 text-rose-700' },
  { value: 'investor', label: 'Buyer/Investor', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'partner', label: 'Broker/Partner', color: 'bg-orange-100 text-orange-700' },
  { value: 'developer', label: 'Developer', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'prospect', label: 'Prospect', color: 'bg-slate-100 text-slate-700' }
];

const CONTACT_STATUS_OPTS: { value: ContactStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-700' },
  { value: 'lead', label: 'Lead', color: 'bg-blue-100 text-blue-700' },
  { value: 'prospect', label: 'Prospect', color: 'bg-amber-100 text-amber-700' },
  { value: 'inactive', label: 'Inactive', color: 'bg-slate-100 text-slate-500' }
];

const CONTACT_FIELDS = [
  { key: 'firstName', label: 'First Name', required: true },
  { key: 'lastName', label: 'Last Name', required: true },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'contactType', label: 'Relationship Type' },
];

const ContactsPage: React.FC<{ 
  contacts: Contact[]; 
  deals: Deal[]; 
  onSaveContact: (c: Contact) => Promise<void>;
  onDeleteContact: (id: string) => Promise<void>;
  onAddInteraction: (id: string, i: ContactInteraction) => Promise<void>;
  onLinkDeal: (cId: string, dId: string) => Promise<void>;
  onUnlinkDeal: (cId: string, dId: string) => Promise<void>;
  onImportContacts: (list: Contact[]) => Promise<void>;
}> = ({ contacts, deals, onSaveContact, onDeleteContact, onImportContacts }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Partial<Contact> | null>(null);

  // Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<'paste' | 'map'>('paste');
  const [importText, setImportText] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<Record<string, number>>({});

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      return name.includes(searchTerm.toLowerCase()) || 
             c.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             c.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  }, [contacts, searchTerm]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingContact) {
      await onSaveContact({
        ...editingContact,
        id: editingContact.id || Math.random().toString(36).substr(2, 9),
        tags: editingContact.tags || [],
        linkedDealIds: editingContact.linkedDealIds || [],
        interactions: editingContact.interactions || [],
        status: editingContact.status || 'lead',
        contactType: editingContact.contactType || 'prospect',
        tier: editingContact.tier || 'C',
        submarkets: editingContact.submarkets || [],
        propertyInterests: editingContact.propertyInterests || []
      } as Contact);
      setIsEditModalOpen(false);
    }
  };

  const parseCsv = () => {
    const lines = importText.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      alert("Invalid CSV format. Please include a header row and at least one data row.");
      return;
    }
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(l => l.split(',').map(v => v.trim().replace(/^"|"$/g, '')));
    
    setCsvHeaders(headers);
    setCsvRows(rows);

    // Initial Guess logic
    const initialMappings: Record<string, number> = {};
    CONTACT_FIELDS.forEach(field => {
      const idx = headers.findIndex(h => {
        const hLow = h.toLowerCase();
        const fLow = field.label.toLowerCase();
        const kLow = field.key.toLowerCase();
        return hLow.includes(fLow) || fLow.includes(hLow) || hLow.includes(kLow);
      });
      if (idx !== -1) initialMappings[field.key] = idx;
    });

    setMappings(initialMappings);
    setImportStep('map');
  };

  const handleFinalImport = async () => {
    if (mappings['firstName'] === undefined || mappings['lastName'] === undefined) {
      alert("Please map both First Name and Last Name columns.");
      return;
    }

    const newContacts: Contact[] = csvRows.map(row => ({
      id: Math.random().toString(36).substr(2, 9),
      userId: '', // Set by parent
      firstName: row[mappings['firstName']] || 'Unknown',
      lastName: row[mappings['lastName']] || '',
      email: row[mappings['email']] || '',
      phone: row[mappings['phone']] || '',
      company: row[mappings['company']] || '',
      contactType: (row[mappings['contactType']]?.toLowerCase() as ContactType) || 'prospect',
      status: 'lead',
      tier: 'C',
      submarkets: [],
      propertyInterests: [],
      tags: ['Imported'],
      linkedDealIds: [],
      interactions: [],
      createdAt: new Date().toISOString()
    }));

    await onImportContacts(newContacts);
    setIsImportModalOpen(false);
    setImportText('');
    setImportStep('paste');
  };

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Relationships</h1>
          <p className="text-slate-500 font-medium mt-1">Manage your professional network and lead pipeline.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { setIsImportModalOpen(true); setImportStep('paste'); }}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Upload size={18} /> Import CSV
          </button>
          <button onClick={() => { setEditingContact({ firstName: '', lastName: '' }); setIsEditModalOpen(true); }} className="bg-summit-900 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-summit-900/20 hover:scale-[1.02] transition-all">
            <UserPlus size={20} /> New Contact
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 mb-8 flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input 
            type="text" 
            placeholder="Search network by name, company, or tags..." 
            className="w-full pl-12 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-summit-accent/20 font-medium transition-all" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="p-6">Contact</th>
                <th className="p-6">Company</th>
                <th className="p-6">Type</th>
                <th className="p-6">Status</th>
                <th className="p-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContacts.map(c => (
                <tr key={c.id} onClick={() => setSelectedContact(c)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500 border-2 border-transparent group-hover:border-summit-accent/50 transition-all uppercase">
                        {c.firstName?.[0] || ''}{c.lastName?.[0] || ''}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 leading-tight">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-slate-400 font-medium">{c.email || 'No email'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="text-sm font-bold text-slate-600 uppercase tracking-tighter">{c.company || 'Private'}</span>
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${CONTACT_TYPES.find(t => t.value === c.contactType)?.color || 'bg-slate-100 text-slate-700'}`}>
                      {c.contactType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${CONTACT_STATUS_OPTS.find(s => s.value === c.status)?.color || 'bg-slate-100 text-slate-700'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <button onClick={e => { e.stopPropagation(); setEditingContact(c); setIsEditModalOpen(true); }} className="p-2 text-slate-300 hover:text-summit-900 transition-colors"><Edit size={18} /></button>
                    <button onClick={e => { e.stopPropagation(); if(confirm('Delete contact?')) onDeleteContact(c.id); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors ml-2"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
              {filteredContacts.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-32 text-center text-slate-300">
                    <Users size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-black uppercase tracking-widest text-xs">No matching relationships</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- IMPORT MODAL --- */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
           <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                 <div>
                    <h3 className="font-black text-2xl text-slate-900">Batch Onboarding</h3>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Step {importStep === 'paste' ? '1' : '2'} of 2</p>
                 </div>
                 <button onClick={() => setIsImportModalOpen(false)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm"><X size={24}/></button>
              </div>

              <div className="p-8 flex-1 overflow-y-auto">
                 {importStep === 'paste' ? (
                   <div className="space-y-6">
                      <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100 flex items-start gap-4">
                         <AlertCircle className="text-blue-600 mt-1" size={20} />
                         <p className="text-sm text-blue-800 leading-relaxed font-semibold">
                            Paste your CSV data directly from your spreadsheet. The first row should contain headers like "First Name", "Email", "Company", etc.
                         </p>
                      </div>
                      <textarea 
                        rows={10}
                        className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-mono text-xs outline-none focus:border-summit-accent transition-all resize-none"
                        placeholder="First Name,Last Name,Email,Company,Phone..."
                        value={importText}
                        onChange={e => setImportText(e.target.value)}
                      />
                      <div className="flex justify-end pt-4">
                        <button 
                          onClick={parseCsv}
                          disabled={!importText.trim()}
                          className="bg-summit-900 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-summit-800 disabled:opacity-50 transition-all hover:translate-x-1"
                        >
                          Scan Document <ArrowRight size={20} />
                        </button>
                      </div>
                   </div>
                 ) : (
                   <div className="space-y-8">
                      <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 text-emerald-800 text-sm font-black flex items-center gap-3">
                        <Check size={20} className="bg-emerald-600 text-white rounded-full p-0.5" /> 
                        Successfully identified {csvRows.length} entities and {csvHeaders.length} data points.
                      </div>

                      <div className="space-y-4">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Column Mapping</p>
                         {CONTACT_FIELDS.map(field => (
                           <div key={field.key} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-summit-accent/30 transition-all">
                              <label className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                                {field.label} {field.required && <span className="text-red-500 text-lg">*</span>}
                              </label>
                              <select 
                                className="w-full md:w-64 p-3 bg-white border border-slate-200 rounded-xl text-xs font-black outline-none focus:ring-4 focus:ring-summit-accent/10"
                                value={mappings[field.key] === undefined ? "" : mappings[field.key]}
                                onChange={e => setMappings({...mappings, [field.key]: parseInt(e.target.value)})}
                              >
                                 <option value="">-- Ignore Header --</option>
                                 {csvHeaders.map((h, i) => (
                                   <option key={i} value={i}>{h}</option>
                                 ))}
                              </select>
                           </div>
                         ))}
                      </div>

                      <div className="flex justify-between items-center pt-8 mt-4 border-t border-slate-100">
                         <button onClick={() => setImportStep('paste')} className="text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition-colors">Abort & Reset</button>
                         <button onClick={handleFinalImport} className="bg-summit-accent text-summit-900 px-12 py-5 rounded-2xl font-black text-xl shadow-2xl shadow-emerald-900/20 hover:scale-[1.02] transition-all active:scale-95">
                           Sync Database
                         </button>
                      </div>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* --- ADD/EDIT MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
           <div className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl p-10 animate-in fade-in zoom-in duration-200">
              <h3 className="font-black text-3xl mb-8 tracking-tight">Entity Profile</h3>
              <form onSubmit={handleSave} className="space-y-5">
                 <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">First Name</label>
                       <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-summit-accent transition-all" placeholder="John" value={editingContact?.firstName || ''} onChange={e => setEditingContact({...editingContact!, firstName: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Name</label>
                       <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-summit-accent transition-all" placeholder="Doe" value={editingContact?.lastName || ''} onChange={e => setEditingContact({...editingContact!, lastName: e.target.value})} required />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Company / Entity</label>
                    <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-summit-accent transition-all" placeholder="Acme Corp" value={editingContact?.company || ''} onChange={e => setEditingContact({...editingContact!, company: e.target.value})} />
                 </div>
                 <div className="flex justify-end gap-4 mt-10">
                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-8 py-4 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition-all">Cancel</button>
                    <button type="submit" className="bg-summit-900 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:bg-summit-800 transition-all active:scale-95">Save Relationship</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default ContactsPage;