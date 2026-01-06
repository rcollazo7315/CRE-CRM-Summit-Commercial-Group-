
import React, { useState, useMemo } from 'react';
import { 
  Users, UserPlus, Search, X, Mail, Phone, Tag, 
  Upload, Check, ArrowRight, AlertCircle, Edit, Trash2,
  Building, User as UserIcon, MoreHorizontal, MapPin, 
  Linkedin, Globe, Briefcase, FileText, Smartphone, Download
} from 'lucide-react';
import { Contact, ContactInteraction, Deal, ContactType, ContactStatus, RelationshipTier } from '../types.ts';
import * as XLSX from 'xlsx';

const CONTACT_TYPES: { value: ContactType; label: string; color: string }[] = [
  { value: 'owner', label: 'Owner/Landlord', color: 'bg-blue-100 text-blue-700' },
  { value: 'investor', label: 'Buyer/Investor', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'tenant', label: 'Tenant/Occupier', color: 'bg-rose-100 text-rose-700' },
  { value: 'broker', label: 'Broker', color: 'bg-orange-100 text-orange-700' },
  { value: 'developer', label: 'Developer', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'lender', label: 'Lender', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'prospect', label: 'Prospect', color: 'bg-slate-100 text-slate-700' }
];

const CONTACT_STATUS_OPTS: { value: ContactStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-700' },
  { value: 'lead', label: 'Lead', color: 'bg-blue-100 text-blue-700' },
  { value: 'prospect', label: 'Prospect', color: 'bg-amber-100 text-amber-700' },
  { value: 'inactive', label: 'Inactive', color: 'bg-slate-100 text-slate-500' }
];

const TIERS: RelationshipTier[] = ['A', 'B', 'C', 'D'];

const CONTACT_FIELDS = [
  { key: 'firstName', label: 'First Name', required: true },
  { key: 'lastName', label: 'Last Name', required: true },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Office Phone' },
  { key: 'mobile', label: 'Mobile Phone' },
  { key: 'company', label: 'Company' },
  { key: 'jobTitle', label: 'Job Title' },
  { key: 'linkedin', label: 'LinkedIn URL' },
  { key: 'website', label: 'Website' },
  { key: 'contactType', label: 'Type' },
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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'profile'>('details');

  // Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importedContacts, setImportedContacts] = useState<Contact[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);

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
    setSaveError(null);
    if (editingContact) {
      try {
        await onSaveContact({
          ...editingContact,
          id: editingContact.id, 
          tags: editingContact.tags || [],
          linkedDealIds: editingContact.linkedDealIds || [],
          interactions: editingContact.interactions || [],
          status: editingContact.status || 'lead',
          contactType: editingContact.contactType || 'prospect',
          tier: editingContact.tier || 'C',
          submarkets: editingContact.submarkets || [],
          propertyInterests: editingContact.propertyInterests || [],
          address: editingContact.address || {},
          investorCriteria: editingContact.investorCriteria || { is1031Active: false }
        } as Contact);
        setIsEditModalOpen(false);
      } catch (err: any) {
        setSaveError(err.message || 'Failed to save contact. Check permissions.');
      }
    }
  };

  const handleEditClick = (c: Contact) => {
    setEditingContact({
        ...c,
        address: c.address || { city: '', state: '' },
        tags: c.tags || [],
    });
    setActiveTab('details');
    setIsEditModalOpen(true);
    setSaveError(null);
  };

  const handleNewClick = () => {
    setEditingContact({ 
        firstName: '', 
        lastName: '', 
        company: '', 
        contactType: 'prospect',
        status: 'lead',
        tier: 'C',
        address: { city: '', state: '' },
        tags: []
    }); 
    setActiveTab('details');
    setIsEditModalOpen(true); 
    setSaveError(null);
  };

  // --- IMPORT EXPORT LOGIC ---

  const handleDownloadTemplate = () => {
    const headers = [
      "First Name*", "Last Name*", "Company", "Job Title", "Email", 
      "Phone", "Mobile", "LinkedIn", "Website", "Contact Type", 
      "Status", "Tags (comma separated)", "Street", "City", "State", "ZIP"
    ];
    
    const example = [
      "John", "Smith", "ABC Realty", "Principal", "john@abcrealty.com", 
      "555-0100", "555-0101", "linkedin.com/in/johnsmith", "abcrealty.com", 
      "investor", "active", "investor, multifamily", "123 Main St", "Phoenix", "AZ", "85001"
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `contact_import_template_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportContacts = () => {
    const data = contacts.map(c => ({
      "First Name": c.firstName,
      "Last Name": c.lastName,
      "Company": c.company,
      "Job Title": c.jobTitle,
      "Email": c.email,
      "Phone": c.phone,
      "Mobile": c.mobile,
      "Contact Type": c.contactType,
      "Status": c.status,
      "Tags": c.tags.join(', '),
      "City": c.address?.city,
      "State": c.address?.state
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, `Summit_Contacts_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      processImportData(data as any[]);
    };
    reader.readAsBinaryString(file);
    // Reset input
    e.target.value = '';
  };

  const processImportData = (rows: any[]) => {
    if (rows.length < 2) {
      alert("File appears empty or missing headers.");
      return;
    }

    const headers = rows[0].map((h: string) => h.toLowerCase().trim());
    const validContacts: Contact[] = [];
    const errors: string[] = [];

    // Helper to find index by fuzzy match
    const getIdx = (key: string) => headers.findIndex((h: string) => h.includes(key.toLowerCase()));

    // Map column indexes
    const idxMap = {
      first: getIdx('first'),
      last: getIdx('last'),
      email: getIdx('email'),
      phone: getIdx('phone'),
      mobile: getIdx('mobile'),
      company: getIdx('company'),
      title: getIdx('job'),
      type: getIdx('type'),
      status: getIdx('status'),
      tags: getIdx('tags')
    };

    if (idxMap.first === -1 || idxMap.last === -1) {
      alert("Could not find 'First Name' and 'Last Name' columns. Please use the template.");
      return;
    }

    rows.slice(1).forEach((row, i) => {
      if (row.length === 0) return;
      
      const firstName = row[idxMap.first];
      const lastName = row[idxMap.last];

      if (!firstName || !lastName) {
        errors.push(`Row ${i + 2}: Missing Name`);
        return;
      }

      const contact: Contact = {
        id: Math.random().toString(36).substr(2, 9),
        userId: '', // Set by backend
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        email: row[idxMap.email] ? String(row[idxMap.email]).trim() : '',
        phone: row[idxMap.phone] ? String(row[idxMap.phone]).trim() : '',
        mobile: row[idxMap.mobile] ? String(row[idxMap.mobile]).trim() : '',
        company: row[idxMap.company] ? String(row[idxMap.company]).trim() : '',
        jobTitle: row[idxMap.title] ? String(row[idxMap.title]).trim() : '',
        contactType: 'prospect', // Default
        status: 'lead', // Default
        tier: 'C',
        tags: row[idxMap.tags] ? String(row[idxMap.tags]).split(',').map(t => t.trim()) : ['Imported'],
        linkedDealIds: [],
        interactions: [],
        submarkets: [],
        propertyInterests: [],
        createdAt: new Date().toISOString()
      };

      // Type mapping
      const typeVal = row[idxMap.type]?.toLowerCase();
      if (typeVal && CONTACT_TYPES.some(t => t.value === typeVal)) {
        contact.contactType = typeVal as ContactType;
      }

      validContacts.push(contact);
    });

    setImportedContacts(validContacts);
    setImportErrors(errors);
    setIsImportModalOpen(true);
  };

  const confirmImport = async () => {
    await onImportContacts(importedContacts);
    setIsImportModalOpen(false);
    setImportedContacts([]);
    setImportErrors([]);
  };

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Relationships</h1>
          <p className="text-slate-500 font-medium mt-1">Manage your professional network and lead pipeline.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex gap-2">
             <button onClick={handleDownloadTemplate} className="bg-white border border-slate-200 text-slate-600 px-3 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm text-xs uppercase tracking-wider">
                <Download size={16} /> Template
             </button>
             <button onClick={handleExportContacts} className="bg-white border border-slate-200 text-slate-600 px-3 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm text-xs uppercase tracking-wider">
                <FileText size={16} /> Export
             </button>
             <div className="relative">
                <input type="file" onChange={handleFileImport} className="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx, .csv" />
                <button className="bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
                    <Upload size={18} /> Import
                </button>
             </div>
          </div>
          <button onClick={handleNewClick} className="bg-summit-900 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-summit-900/20 hover:scale-[1.02] transition-all">
            <UserPlus size={20} /> New Contact
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 mb-8 flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input 
            type="text" 
            placeholder="Search network by name, company, email, or tags..." 
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
                <th className="p-6">Contact Info</th>
                <th className="p-6">Role</th>
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
                        <p className="text-xs text-slate-400 font-medium">{c.jobTitle || 'No Title'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="space-y-1">
                        {c.email && (
                            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                <Mail size={12} className="text-slate-400" /> {c.email}
                            </div>
                        )}
                        {c.phone && (
                            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                <Phone size={12} className="text-slate-400" /> {c.phone}
                            </div>
                        )}
                        {c.mobile && (
                            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                <Smartphone size={12} className="text-slate-400" /> {c.mobile}
                            </div>
                        )}
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col items-start gap-1">
                        <span className="text-sm font-bold text-slate-800 tracking-tight">{c.company || 'Private'}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${CONTACT_TYPES.find(t => t.value === c.contactType)?.color || 'bg-slate-100 text-slate-700'}`}>
                        {c.contactType.replace('_', ' ')}
                        </span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                            c.status === 'active' ? 'bg-green-500' :
                            c.status === 'lead' ? 'bg-blue-500' :
                            c.status === 'prospect' ? 'bg-amber-500' : 'bg-slate-300'
                        }`}></span>
                        <span className="text-xs font-bold text-slate-600 uppercase">{c.status}</span>
                    </div>
                    <div className="mt-1 text-[10px] text-slate-400 font-medium">
                        Tier {c.tier || 'C'}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                        {c.linkedin && (
                            <a href={c.linkedin} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
                                <Linkedin size={16} />
                            </a>
                        )}
                        <button onClick={e => { e.stopPropagation(); handleEditClick(c); }} className="p-2 text-slate-300 hover:text-summit-900 transition-colors"><Edit size={18} /></button>
                        <button onClick={e => { e.stopPropagation(); if(confirm('Delete contact?')) onDeleteContact(c.id); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                    </div>
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

      {/* --- IMPORT CONFIRMATION MODAL --- */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[100] p-4">
           <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                 <div>
                    <h3 className="font-black text-2xl text-slate-900">Review Import</h3>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">
                        Found {importedContacts.length} valid contacts
                    </p>
                 </div>
                 <button onClick={() => setIsImportModalOpen(false)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm"><X size={24}/></button>
              </div>

              <div className="p-8 flex-1 overflow-y-auto">
                 {importErrors.length > 0 && (
                    <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4">
                        <h4 className="font-bold text-red-800 text-sm mb-2 flex items-center gap-2"><AlertCircle size={16}/> Skipped Rows ({importErrors.length})</h4>
                        <ul className="list-disc list-inside text-xs text-red-600 max-h-32 overflow-y-auto">
                            {importErrors.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                    </div>
                 )}

                 <div className="space-y-4">
                    <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Preview (First 5)</p>
                    {importedContacts.slice(0, 5).map((c, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                                <p className="font-bold text-slate-800 text-sm">{c.firstName} {c.lastName}</p>
                                <p className="text-xs text-slate-500">{c.email}</p>
                            </div>
                            <span className="text-[10px] font-bold uppercase bg-white px-2 py-1 rounded border border-slate-200 text-slate-500">{c.contactType}</span>
                        </div>
                    ))}
                    {importedContacts.length > 5 && <p className="text-center text-xs text-slate-400 italic">...and {importedContacts.length - 5} more.</p>}
                 </div>

                 <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                    <button onClick={() => setIsImportModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
                    <button onClick={confirmImport} className="bg-summit-accent text-summit-900 px-8 py-3 rounded-xl font-black shadow-lg hover:bg-emerald-400 transition-all">
                        Import {importedContacts.length} Contacts
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* --- ADD/EDIT MODAL --- */}
      {isEditModalOpen && editingContact && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
           <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl p-0 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
              
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-3xl font-black text-slate-300">
                        {editingContact.firstName ? editingContact.firstName[0] : <UserIcon />}
                    </div>
                    <div>
                        <h3 className="font-black text-2xl text-slate-900 tracking-tight">
                            {editingContact.id ? 'Edit Profile' : 'New Entity'}
                        </h3>
                        <p className="text-sm text-slate-500 font-bold">Professional Network</p>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => setActiveTab('details')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'details' ? 'bg-summit-900 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Essentials</button>
                    <button onClick={() => setActiveTab('profile')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-summit-900 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Profile & Notes</button>
                 </div>
              </div>

              {saveError && (
                <div className="bg-red-50 text-red-600 p-4 mx-8 mt-4 rounded-xl flex items-center gap-2 text-sm font-bold border border-red-100">
                  <AlertCircle size={20} /> {saveError}
                </div>
              )}

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8">
                 
                 {activeTab === 'details' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">First Name *</label>
                                <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-summit-accent transition-all" placeholder="John" value={editingContact?.firstName || ''} onChange={e => setEditingContact({...editingContact!, firstName: e.target.value})} required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Name *</label>
                                <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-summit-accent transition-all" placeholder="Doe" value={editingContact?.lastName || ''} onChange={e => setEditingContact({...editingContact!, lastName: e.target.value})} required />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Company / Entity</label>
                                <div className="relative">
                                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                    <input className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-summit-accent transition-all" placeholder="Acme Corp" value={editingContact?.company || ''} onChange={e => setEditingContact({...editingContact!, company: e.target.value})} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Title</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                    <input className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-summit-accent transition-all" placeholder="VP of Acquisitions" value={editingContact?.jobTitle || ''} onChange={e => setEditingContact({...editingContact!, jobTitle: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Relationship</label>
                                <select 
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-summit-accent transition-all appearance-none"
                                    value={editingContact.contactType}
                                    onChange={e => setEditingContact({...editingContact!, contactType: e.target.value as ContactType})}
                                >
                                    {CONTACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                                <select 
                                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-summit-accent transition-all appearance-none"
                                    value={editingContact.status}
                                    onChange={e => setEditingContact({...editingContact!, status: e.target.value as ContactStatus})}
                                >
                                    {CONTACT_STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority Tier</label>
                                <div className="flex gap-2">
                                    {TIERS.map(tier => (
                                        <button 
                                            key={tier}
                                            type="button"
                                            onClick={() => setEditingContact({...editingContact!, tier})}
                                            className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all border-2 ${editingContact?.tier === tier ? 'border-summit-accent bg-summit-accent/10 text-summit-900' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                                        >
                                            {tier}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                 )}

                 {activeTab === 'profile' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                    <input className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-summit-accent transition-all" placeholder="email@example.com" value={editingContact?.email || ''} onChange={e => setEditingContact({...editingContact!, email: e.target.value})} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Office Phone</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                    <input className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-summit-accent transition-all" placeholder="(555) 123-4567" value={editingContact?.phone || ''} onChange={e => setEditingContact({...editingContact!, phone: e.target.value})} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile Phone</label>
                                <div className="relative">
                                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                    <input className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-summit-accent transition-all" placeholder="(555) 987-6543" value={editingContact?.mobile || ''} onChange={e => setEditingContact({...editingContact!, mobile: e.target.value})} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Website</label>
                                <div className="relative">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                    <input className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-summit-accent transition-all" placeholder="example.com" value={editingContact?.website || ''} onChange={e => setEditingContact({...editingContact!, website: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes & Context</label>
                            <textarea 
                                className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl font-medium outline-none focus:border-summit-accent transition-all resize-none text-sm leading-relaxed" 
                                rows={6} 
                                placeholder="Meeting notes, preferences, investment criteria..." 
                                value={editingContact?.notes || ''} 
                                onChange={e => setEditingContact({...editingContact!, notes: e.target.value})} 
                            />
                        </div>
                    </div>
                 )}

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
