import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserPlus, Search, Filter, Download, Upload, X, Save, 
  MapPin, Phone, Mail, Globe, Linkedin, Twitter, Tag, 
  Calendar, Clock, Edit, Trash2, Link as LinkIcon, Plus, 
  Briefcase, MoreVertical, MessageSquare, StickyNote,
  ChevronRight, Building, ArrowRight, Check
} from 'lucide-react';
import { Contact, ContactInteraction, Deal, ContactType, ContactStatus } from '../types.ts';

// Constants for Dropdowns & Styling
const CONTACT_TYPES: { value: ContactType; label: string; color: string }[] = [
  { value: 'owner', label: 'Owner', color: 'bg-blue-100 text-blue-700' },
  { value: 'strategic_partner', label: 'Strategic Partner', color: 'bg-purple-100 text-purple-700' },
  { value: 'banker', label: 'Banker', color: 'bg-green-100 text-green-700' },
  { value: 'investor', label: 'Investor', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'vendor', label: 'Vendor', color: 'bg-orange-100 text-orange-700' },
  { value: 'attorney', label: 'Attorney', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'broker', label: 'Broker', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'title_company', label: 'Title Co.', color: 'bg-teal-100 text-teal-700' },
  { value: 'appraiser', label: 'Appraiser', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'contractor', label: 'Contractor', color: 'bg-stone-100 text-stone-700' },
  { value: 'property_manager', label: 'Prop. Manager', color: 'bg-lime-100 text-lime-700' },
  { value: 'tenant', label: 'Tenant', color: 'bg-rose-100 text-rose-700' },
  { value: 'other', label: 'Other', color: 'bg-slate-100 text-slate-700' }
];

const CONTACT_STATUSES: { value: ContactStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-700' },
  { value: 'lead', label: 'Lead', color: 'bg-blue-100 text-blue-700' },
  { value: 'prospect', label: 'Prospect', color: 'bg-amber-100 text-amber-700' },
  { value: 'inactive', label: 'Inactive', color: 'bg-slate-100 text-slate-500' }
];

const INTERACTION_TYPES = [
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Meeting', icon: Users },
  { value: 'note', label: 'Note', icon: StickyNote },
  { value: 'other', label: 'Other', icon: MoreVertical }
];

interface ContactsPageProps {
  contacts: Contact[];
  deals: Deal[];
  onSaveContact: (contact: Contact) => Promise<void>;
  onDeleteContact: (contactId: string) => Promise<void>;
  onAddInteraction: (contactId: string, interaction: ContactInteraction) => Promise<void>;
  onLinkDeal: (contactId: string, dealId: string) => Promise<void>;
  onUnlinkDeal: (contactId: string, dealId: string) => Promise<void>;
  onImportContacts: (contacts: Contact[]) => Promise<void>;
}

const ContactsPage: React.FC<ContactsPageProps> = ({ 
  contacts, deals, onSaveContact, onDeleteContact, onAddInteraction, onLinkDeal, onUnlinkDeal, onImportContacts 
}) => {
  // -- Local State --
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Partial<Contact> | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  
  // Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<'paste' | 'map'>('paste');
  const [importText, setImportText] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, number>>({});

  // Interaction State
  const [isAddingInteraction, setIsAddingInteraction] = useState(false);
  const [newInteraction, setNewInteraction] = useState<Partial<ContactInteraction>>({
    type: 'call',
    date: new Date().toISOString().split('T')[0],
    subject: '',
    notes: ''
  });

  // Deal Link State
  const [isLinkingDeal, setIsLinkingDeal] = useState(false);

  // -- Computed --
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = 
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = filterType === 'all' || c.contactType === filterType;
      const matchesStatus = filterStatus === 'all' || c.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [contacts, searchTerm, filterType, filterStatus]);

  // -- Helpers --
  const getInitials = (first: string, last: string) => `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
  const getTypeColor = (type: ContactType) => CONTACT_TYPES.find(t => t.value === type)?.color || 'bg-slate-100 text-slate-700';
  const getStatusColor = (status: ContactStatus) => CONTACT_STATUSES.find(s => s.value === status)?.color || 'bg-slate-100 text-slate-700';

  // -- Handlers --
  const handleEditClick = (contact?: Contact) => {
    if (contact) {
      setEditingContact(contact);
    } else {
      setEditingContact({
        firstName: '', lastName: '', company: '', jobTitle: '', 
        contactType: 'other', status: 'lead', 
        tags: [], linkedDealIds: [], interactions: []
      });
    }
    setIsEditModalOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;
    
    if (!editingContact.firstName || !editingContact.lastName) {
      alert("First and Last Name are required.");
      return;
    }

    const contactToSave = {
      ...editingContact,
      id: editingContact.id || Math.random().toString(36).substr(2, 9),
      createdAt: editingContact.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Contact;

    await onSaveContact(contactToSave);
    setIsEditModalOpen(false);
    
    if (selectedContact && selectedContact.id === contactToSave.id) {
        setSelectedContact(contactToSave);
    }
  };

  const handleInteractionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !newInteraction.subject) return;

    const interaction: ContactInteraction = {
        id: Math.random().toString(36).substr(2, 9),
        date: newInteraction.date || new Date().toISOString(),
        type: newInteraction.type as any,
        subject: newInteraction.subject || '',
        notes: newInteraction.notes || ''
    };

    await onAddInteraction(selectedContact.id, interaction);
    const updatedContact = { ...selectedContact, interactions: [...selectedContact.interactions, interaction] };
    setSelectedContact(updatedContact);
    setIsAddingInteraction(false);
    setNewInteraction({ type: 'call', date: new Date().toISOString().split('T')[0], subject: '', notes: '' });
  };

  const handleParseCsv = () => {
    const lines = importText.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      alert("CSV must contain a header row and at least one data row.");
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => line.split(',').map(c => c.trim().replace(/^"|"$/g, '')));

    setCsvHeaders(headers);
    setCsvRows(rows);

    // Try to auto-map based on common names
    const autoMappings: Record<string, number> = {};
    const fieldKeys = ['firstName', 'lastName', 'email', 'phone', 'company', 'contactType', 'jobTitle'];
    
    fieldKeys.forEach(field => {
      const matchIndex = headers.findIndex(h => {
        const header = h.toLowerCase().replace(/[\s_]/g, '');
        const fieldName = field.toLowerCase();
        return header.includes(fieldName) || fieldName.includes(header);
      });
      if (matchIndex !== -1) autoMappings[field] = matchIndex;
    });

    setFieldMappings(autoMappings);
    setImportStep('map');
  };

  const handleCompleteImport = async () => {
    if (fieldMappings['firstName'] === undefined || fieldMappings['lastName'] === undefined) {
      alert("Mapping for First Name and Last Name is required.");
      return;
    }

    const newContacts: Contact[] = csvRows.map(row => ({
      id: Math.random().toString(36).substr(2, 9),
      userId: '', // Set by parent
      firstName: row[fieldMappings['firstName']] || 'Unknown',
      lastName: row[fieldMappings['lastName']] || '',
      email: row[fieldMappings['email']] || '',
      phone: row[fieldMappings['phone']] || '',
      company: row[fieldMappings['company']] || '',
      jobTitle: row[fieldMappings['jobTitle']] || '',
      contactType: (row[fieldMappings['contactType']]?.toLowerCase() as ContactType) || 'other',
      status: 'lead',
      tags: ['Imported'],
      linkedDealIds: [],
      interactions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    await onImportContacts(newContacts);
    setIsImportModalOpen(false);
    setImportStep('paste');
    setImportText('');
    alert(`Imported ${newContacts.length} contacts.`);
  };

  const exportCsv = () => {
    const headers = "FirstName,LastName,Company,Email,Phone,Type,Status\n";
    const rows = contacts.map(c => 
        `${c.firstName},${c.lastName},${c.company || ''},${c.email || ''},${c.phone || ''},${c.contactType},${c.status}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Contacts_Export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 flex-shrink-0">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
           <p className="text-slate-500">Manage your network, partners, and leads.</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => { setIsImportModalOpen(true); setImportStep('paste'); }} className="bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2 text-sm">
             <Upload size={16} /> Import
           </button>
           <button onClick={exportCsv} className="bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2 text-sm">
             <Download size={16} /> Export
           </button>
           <button onClick={() => handleEditClick()} className="bg-summit-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-summit-800 flex items-center gap-2 shadow-lg shadow-summit-900/10">
             <UserPlus size={18} /> Add Contact
           </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 flex-shrink-0">
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase">Total Contacts</p>
            <p className="text-2xl font-bold text-slate-900">{contacts.length}</p>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase">Active</p>
            <p className="text-2xl font-bold text-green-600">{contacts.filter(c => c.status === 'active').length}</p>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase">Leads</p>
            <p className="text-2xl font-bold text-blue-600">{contacts.filter(c => c.status === 'lead').length}</p>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase">Recent Activity</p>
            <p className="text-2xl font-bold text-purple-600">
                {contacts.filter(c => {
                    if (!c.lastContactedAt) return false;
                    const days = (new Date().getTime() - new Date(c.lastContactedAt).getTime()) / (1000 * 3600 * 24);
                    return days <= 30;
                }).length}
            </p>
         </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4 flex flex-col md:flex-row gap-4 items-center justify-between flex-shrink-0">
         <div className="relative w-full md:w-96">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name, company, email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-summit-accent"
            />
         </div>
         <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none cursor-pointer"
            >
               <option value="all">All Types</option>
               {CONTACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none cursor-pointer"
            >
               <option value="all">All Statuses</option>
               {CONTACT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
         </div>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
         <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse">
               <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                     <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Name</th>
                     <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Info</th>
                     <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type / Status</th>
                     <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Tags</th>
                     <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredContacts.length > 0 ? filteredContacts.map(contact => (
                     <tr key={contact.id} onClick={() => setSelectedContact(contact)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                        <td className="p-4">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm">
                                 {getInitials(contact.firstName, contact.lastName)}
                              </div>
                              <div>
                                 <div className="font-bold text-slate-900">{contact.firstName} {contact.lastName}</div>
                                 <div className="text-xs text-slate-500">{contact.jobTitle} {contact.company ? `at ${contact.company}` : ''}</div>
                              </div>
                           </div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">
                           {contact.email && <div className="flex items-center gap-2 mb-1"><Mail size={12} className="text-slate-400"/> {contact.email}</div>}
                           {contact.phone && <div className="flex items-center gap-2"><Phone size={12} className="text-slate-400"/> {contact.phone}</div>}
                        </td>
                        <td className="p-4">
                           <div className="flex flex-col gap-1.5 items-start">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${getTypeColor(contact.contactType)}`}>
                                 {contact.contactType.replace('_', ' ')}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(contact.status).replace('bg-', 'border-').replace('text-', 'text-')}`}>
                                 {contact.status}
                              </span>
                           </div>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                           <div className="flex flex-wrap gap-1">
                              {contact.tags.slice(0, 2).map(t => (
                                 <span key={t} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">{t}</span>
                              ))}
                              {contact.tags.length > 2 && <span className="text-xs text-slate-400">+{contact.tags.length - 2}</span>}
                           </div>
                        </td>
                        <td className="p-4 text-right">
                           <button onClick={(e) => { e.stopPropagation(); handleEditClick(contact); }} className="p-2 text-slate-400 hover:text-summit-900 rounded-full hover:bg-slate-200"><Edit size={16} /></button>
                        </td>
                     </tr>
                  )) : (
                     <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-400">
                           <Users size={48} className="mx-auto mb-4 opacity-20" />
                           <p>No contacts found matching your filters.</p>
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* Detail Slide-over */}
      {selectedContact && (
         <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setSelectedContact(null)}></div>
            <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
               {/* Detail Header */}
               <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-start">
                  <div className="flex items-center gap-4">
                     <div className="w-16 h-16 rounded-full bg-summit-900 text-white flex items-center justify-center font-bold text-2xl shadow-lg">
                        {getInitials(selectedContact.firstName, selectedContact.lastName)}
                     </div>
                     <div>
                        <h2 className="text-2xl font-bold text-slate-900">{selectedContact.firstName} {selectedContact.lastName}</h2>
                        <p className="text-slate-600 font-medium">{selectedContact.jobTitle} @ {selectedContact.company}</p>
                        <div className="flex gap-2 mt-2">
                           <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${getTypeColor(selectedContact.contactType)}`}>{selectedContact.contactType.replace('_', ' ')}</span>
                           <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${getStatusColor(selectedContact.status)}`}>{selectedContact.status}</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => { handleEditClick(selectedContact); setSelectedContact(null); }} className="p-2 text-slate-500 hover:text-summit-900 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all">
                        <Edit size={20} />
                     </button>
                     <button onClick={() => { if(confirm("Delete contact?")) { onDeleteContact(selectedContact.id); setSelectedContact(null); }}} className="p-2 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg border border-transparent hover:border-red-100 transition-all">
                        <Trash2 size={20} />
                     </button>
                     <button onClick={() => setSelectedContact(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg">
                        <X size={24} />
                     </button>
                  </div>
               </div>

               {/* Detail Content */}
               <div className="flex-1 overflow-y-auto p-6 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                     <div className="space-y-4">
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide border-b border-slate-100 pb-2">Contact Details</h3>
                        <div className="space-y-3 text-sm">
                           {selectedContact.email && <div className="flex items-center gap-3 text-slate-600"><Mail size={16} className="text-slate-400"/> {selectedContact.email}</div>}
                           {selectedContact.phone && <div className="flex items-center gap-3 text-slate-600"><Phone size={16} className="text-slate-400"/> {selectedContact.phone} (Office)</div>}
                           {selectedContact.mobile && <div className="flex items-center gap-3 text-slate-600"><Phone size={16} className="text-slate-400"/> {selectedContact.mobile} (Mobile)</div>}
                        </div>
                     </div>
                     <div className="space-y-6">
                        <div>
                           <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide border-b border-slate-100 pb-2 mb-3">Tags</h3>
                           <div className="flex flex-wrap gap-2">
                              {selectedContact.tags.length > 0 ? selectedContact.tags.map(t => (
                                 <span key={t} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"><Tag size={12} /> {t}</span>
                              )) : <span className="text-slate-400 text-sm italic">No tags</span>}
                           </div>
                        </div>
                        <div>
                           <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide border-b border-slate-100 pb-2 mb-2">Notes</h3>
                           <p className="text-sm text-slate-600 whitespace-pre-line bg-slate-50 p-3 rounded-lg border border-slate-100">
                              {selectedContact.notes || "No notes available."}
                           </p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* --- ADD/EDIT MODAL --- */}
      {isEditModalOpen && editingContact && (
         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
               <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h2 className="font-bold text-lg text-slate-800">{editingContact.id ? 'Edit Contact' : 'New Contact'}</h2>
                  <button onClick={() => setIsEditModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
               </div>
               <form onSubmit={handleSaveForm} className="p-6 overflow-y-auto flex-1 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">First Name *</label>
                        <input type="text" className="w-full p-2 border border-slate-300 rounded outline-none focus:border-summit-accent" value={editingContact.firstName} onChange={e => setEditingContact({...editingContact, firstName: e.target.value})} required />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Last Name *</label>
                        <input type="text" className="w-full p-2 border border-slate-300 rounded outline-none focus:border-summit-accent" value={editingContact.lastName} onChange={e => setEditingContact({...editingContact, lastName: e.target.value})} required />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Company</label>
                        <input type="text" className="w-full p-2 border border-slate-300 rounded outline-none focus:border-summit-accent" value={editingContact.company || ''} onChange={e => setEditingContact({...editingContact, company: e.target.value})} />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Job Title</label>
                        <input type="text" className="w-full p-2 border border-slate-300 rounded outline-none focus:border-summit-accent" value={editingContact.jobTitle || ''} onChange={e => setEditingContact({...editingContact, jobTitle: e.target.value})} />
                     </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                     <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                     <button type="submit" className="px-6 py-2 bg-summit-900 text-white rounded-lg hover:bg-summit-800 font-medium">Save Contact</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* --- ENHANCED IMPORT MODAL --- */}
      {isImportModalOpen && (
         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
               <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <div>
                    <h2 className="font-bold text-lg text-slate-800">Import Contacts</h2>
                    <p className="text-xs text-slate-500">Step {importStep === 'paste' ? '1' : '2'} of 2</p>
                  </div>
                  <button onClick={() => setIsImportModalOpen(false)}><X size={20} className="text-slate-400"/></button>
               </div>
               
               <div className="p-6 overflow-y-auto flex-1">
                  {importStep === 'paste' ? (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-600">
                        Paste your CSV data below. Ensure the first row contains headers.
                      </p>
                      <textarea 
                        rows={12} 
                        className="w-full p-4 border border-slate-300 rounded-lg font-mono text-xs outline-none focus:ring-2 focus:ring-summit-accent/20 transition-all"
                        placeholder="FirstName,LastName,Email,Phone,Company,Type..."
                        value={importText}
                        onChange={e => setImportText(e.target.value)}
                      />
                      <div className="flex justify-end">
                        <button 
                          onClick={handleParseCsv}
                          disabled={!importText.trim()}
                          className="px-6 py-2.5 bg-summit-900 text-white rounded-lg hover:bg-summit-800 font-bold flex items-center gap-2 disabled:opacity-50 transition-all"
                        >
                          Next: Map Columns <ArrowRight size={18} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                        <p className="text-sm text-blue-800 font-medium">
                          We found {csvHeaders.length} columns and {csvRows.length} contacts. Match them below:
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                        {[
                          { field: 'firstName', label: 'First Name', required: true },
                          { field: 'lastName', label: 'Last Name', required: true },
                          { field: 'email', label: 'Email Address' },
                          { field: 'phone', label: 'Phone Number' },
                          { field: 'company', label: 'Company' },
                          { field: 'jobTitle', label: 'Job Title' },
                          { field: 'contactType', label: 'Contact Type' }
                        ].map(f => (
                          <div key={f.field} className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                            <label className="text-sm font-bold text-slate-700">
                              {f.label} {f.required && <span className="text-red-500">*</span>}
                            </label>
                            <select 
                              className="w-full md:w-64 p-2 bg-slate-50 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-summit-accent/20"
                              value={fieldMappings[f.field] === undefined ? "" : fieldMappings[f.field]}
                              onChange={e => setFieldMappings({...fieldMappings, [f.field]: parseInt(e.target.value)})}
                            >
                              <option value="">-- Ignore Field --</option>
                              {csvHeaders.map((h, i) => (
                                <option key={i} value={i}>{h}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
                        <button 
                          onClick={() => setImportStep('paste')}
                          className="px-5 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg font-medium"
                        >
                          Back to Paste
                        </button>
                        <button 
                          onClick={handleCompleteImport}
                          className="px-8 py-2.5 bg-summit-accent text-white rounded-lg hover:bg-emerald-600 font-bold shadow-lg shadow-emerald-900/10 flex items-center gap-2"
                        >
                          <Check size={18} /> Complete Import
                        </button>
                      </div>
                    </div>
                  )}
               </div>
            </div>
         </div>
      )}

      {/* Link Deal Modal */}
      {isLinkingDeal && selectedContact && (
         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
               <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                  <h2 className="font-bold text-lg text-slate-800">Link Deal to Contact</h2>
                  <button onClick={() => setIsLinkingDeal(false)}><X size={20} className="text-slate-400"/></button>
               </div>
               <div className="p-4 max-h-96 overflow-y-auto">
                  {deals.filter(d => !selectedContact.linkedDealIds.includes(d.id)).length > 0 ? (
                     <div className="space-y-2">
                        {deals.filter(d => !selectedContact.linkedDealIds.includes(d.id)).map(deal => (
                           <div key={deal.id} 
                                onClick={async () => {
                                    await onLinkDeal(selectedContact.id, deal.id);
                                    setSelectedContact({...selectedContact, linkedDealIds: [...selectedContact.linkedDealIds, deal.id]});
                                    setIsLinkingDeal(false);
                                }}
                                className="p-3 border border-slate-200 rounded hover:border-summit-accent hover:bg-green-50 cursor-pointer transition-all"
                           >
                              <div className="font-bold text-sm text-slate-800">{deal.propertyAddress}</div>
                              <div className="text-xs text-slate-500">${deal.askingPrice.toLocaleString()} • {deal.status}</div>
                           </div>
                        ))}
                     </div>
                  ) : (
                     <p className="text-center text-slate-500 text-sm py-4">No available deals to link.</p>
                  )}
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default ContactsPage;