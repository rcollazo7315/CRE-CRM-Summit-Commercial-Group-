
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserPlus, Search, Filter, Download, Upload, X, Save, 
  MapPin, Phone, Mail, Globe, Linkedin, Twitter, Tag, 
  Calendar, Clock, Edit, Trash2, Link as LinkIcon, Plus, 
  Briefcase, MoreVertical, MessageSquare, StickyNote,
  ChevronRight, Building
} from 'lucide-react';
import { Contact, ContactInteraction, Deal, ContactType, ContactStatus } from '../types';

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
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null); // For slide-over detail view
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');

  // Interaction State (within detail view)
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
    
    // Ensure required fields
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
    
    // If we were editing the currently selected contact, update the view
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
    
    // Update local view immediately
    const updatedContact = { ...selectedContact, interactions: [...selectedContact.interactions, interaction] };
    setSelectedContact(updatedContact);
    
    setIsAddingInteraction(false);
    setNewInteraction({ type: 'call', date: new Date().toISOString().split('T')[0], subject: '', notes: '' });
  };

  const handleCsvImport = async () => {
    // Simple CSV parser
    try {
        const rows = importText.split('\n').filter(r => r.trim());
        const newContacts: Contact[] = [];
        
        // Skip header if present (heuristic: check if first row has "first name" or similar)
        const startIdx = rows[0].toLowerCase().includes('name') ? 1 : 0;

        for (let i = startIdx; i < rows.length; i++) {
            const cols = rows[i].split(',');
            if (cols.length < 2) continue;
            
            // Expected Format: FirstName, LastName, Email, Phone, Company, Type
            newContacts.push({
                id: Math.random().toString(36).substr(2, 9),
                userId: '', // set in app
                firstName: cols[0]?.trim() || 'Unknown',
                lastName: cols[1]?.trim() || '',
                email: cols[2]?.trim(),
                phone: cols[3]?.trim(),
                company: cols[4]?.trim(),
                contactType: (cols[5]?.trim().toLowerCase() as ContactType) || 'other',
                status: 'lead',
                tags: ['Imported'],
                linkedDealIds: [],
                interactions: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        await onImportContacts(newContacts);
        setIsImportModalOpen(false);
        setImportText('');
        alert(`Successfully imported ${newContacts.length} contacts.`);
    } catch (e) {
        alert("Failed to parse CSV. Please ensure format: First Name, Last Name, Email, Phone, Company, Type");
    }
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
           <button onClick={() => setIsImportModalOpen(true)} className="bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2 text-sm">
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
            {(filterType !== 'all' || filterStatus !== 'all' || searchTerm) && (
                <button 
                  onClick={() => { setFilterType('all'); setFilterStatus('all'); setSearchTerm(''); }}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                >
                    Clear
                </button>
            )}
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

      {/* --- SLIDE OVER DETAIL VIEW --- */}
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
                     {/* Contact Info Card */}
                     <div className="space-y-4">
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide border-b border-slate-100 pb-2">Contact Details</h3>
                        <div className="space-y-3 text-sm">
                           {selectedContact.email && <div className="flex items-center gap-3 text-slate-600"><Mail size={16} className="text-slate-400"/> {selectedContact.email}</div>}
                           {selectedContact.phone && <div className="flex items-center gap-3 text-slate-600"><Phone size={16} className="text-slate-400"/> {selectedContact.phone} (Office)</div>}
                           {selectedContact.mobile && <div className="flex items-center gap-3 text-slate-600"><Phone size={16} className="text-slate-400"/> {selectedContact.mobile} (Mobile)</div>}
                           {selectedContact.website && <div className="flex items-center gap-3 text-slate-600"><Globe size={16} className="text-slate-400"/> {selectedContact.website}</div>}
                           {selectedContact.address?.city && (
                              <div className="flex items-start gap-3 text-slate-600">
                                 <MapPin size={16} className="text-slate-400 mt-0.5"/> 
                                 <span>
                                    {selectedContact.address.street}<br/>
                                    {selectedContact.address.city}, {selectedContact.address.state} {selectedContact.address.zip}
                                 </span>
                              </div>
                           )}
                        </div>
                     </div>

                     {/* Right Column: Tags & Notes */}
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

                  {/* Linked Deals Section */}
                  <div className="mb-8">
                     <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Linked Deals</h3>
                        <button onClick={() => setIsLinkingDeal(true)} className="text-xs text-summit-accent font-bold hover:underline flex items-center gap-1"><LinkIcon size={12} /> Link Deal</button>
                     </div>
                     {selectedContact.linkedDealIds.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                           {deals.filter(d => selectedContact.linkedDealIds.includes(d.id)).map(deal => (
                              <div key={deal.id} className="border border-slate-200 rounded-lg p-3 flex justify-between items-center bg-slate-50">
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded bg-white border border-slate-200 flex items-center justify-center">
                                       <Building size={18} className="text-slate-400" />
                                    </div>
                                    <div>
                                       <div className="font-bold text-slate-900 text-sm">{deal.propertyAddress}</div>
                                       <div className="text-xs text-slate-500">{deal.status} • ${deal.askingPrice.toLocaleString()}</div>
                                    </div>
                                 </div>
                                 <button onClick={() => {
                                     onUnlinkDeal(selectedContact.id, deal.id);
                                     setSelectedContact({...selectedContact, linkedDealIds: selectedContact.linkedDealIds.filter(id => id !== deal.id)});
                                 }} className="text-slate-400 hover:text-red-500 p-2"><X size={16} /></button>
                              </div>
                           ))}
                        </div>
                     ) : (
                        <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-sm">
                           No deals linked to this contact.
                        </div>
                     )}
                  </div>

                  {/* Activity History */}
                  <div>
                     <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Activity History</h3>
                        <button onClick={() => setIsAddingInteraction(!isAddingInteraction)} className="text-xs bg-summit-900 text-white px-3 py-1.5 rounded flex items-center gap-1 hover:bg-summit-800 transition-colors">
                           <Plus size={12} /> Add Activity
                        </button>
                     </div>

                     {/* Add Interaction Form */}
                     {isAddingInteraction && (
                        <form onSubmit={handleInteractionSubmit} className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4 animate-in fade-in slide-in-from-top-2">
                           <div className="grid grid-cols-2 gap-3 mb-3">
                              <select 
                                 value={newInteraction.type}
                                 onChange={e => setNewInteraction({...newInteraction, type: e.target.value as any})}
                                 className="w-full p-2 border border-slate-300 rounded text-sm outline-none"
                              >
                                 {INTERACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                              <input 
                                 type="date"
                                 value={newInteraction.date}
                                 onChange={e => setNewInteraction({...newInteraction, date: e.target.value})}
                                 className="w-full p-2 border border-slate-300 rounded text-sm outline-none"
                              />
                           </div>
                           <input 
                              type="text" 
                              placeholder="Subject / Summary"
                              className="w-full p-2 border border-slate-300 rounded text-sm outline-none mb-3"
                              value={newInteraction.subject}
                              onChange={e => setNewInteraction({...newInteraction, subject: e.target.value})}
                              required
                           />
                           <textarea 
                              placeholder="Notes..."
                              rows={2}
                              className="w-full p-2 border border-slate-300 rounded text-sm outline-none mb-3"
                              value={newInteraction.notes}
                              onChange={e => setNewInteraction({...newInteraction, notes: e.target.value})}
                           />
                           <div className="flex justify-end gap-2">
                              <button type="button" onClick={() => setIsAddingInteraction(false)} className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1.5">Cancel</button>
                              <button type="submit" className="text-xs bg-summit-accent text-white px-3 py-1.5 rounded font-bold hover:bg-emerald-600">Save Activity</button>
                           </div>
                        </form>
                     )}

                     {/* Timeline */}
                     <div className="relative border-l-2 border-slate-100 ml-3 space-y-6 pb-6">
                        {selectedContact.interactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(interaction => {
                           const Icon = INTERACTION_TYPES.find(t => t.value === interaction.type)?.icon || MoreVertical;
                           return (
                              <div key={interaction.id} className="relative pl-6 group">
                                 <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-slate-300 group-hover:border-summit-accent transition-colors"></div>
                                 <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-1">
                                       <div className="flex items-center gap-2">
                                          <Icon size={14} className="text-slate-400" />
                                          <span className="font-bold text-sm text-slate-800">{interaction.subject}</span>
                                       </div>
                                       <span className="text-xs text-slate-400">{new Date(interaction.date).toLocaleDateString()}</span>
                                    </div>
                                    {interaction.notes && <p className="text-xs text-slate-600 mt-1">{interaction.notes}</p>}
                                 </div>
                              </div>
                           );
                        })}
                        {selectedContact.interactions.length === 0 && !isAddingInteraction && (
                           <p className="text-sm text-slate-400 pl-6 italic">No activity recorded yet.</p>
                        )}
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
                  {/* Basic Info */}
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
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Type</label>
                        <select className="w-full p-2 border border-slate-300 rounded outline-none focus:border-summit-accent bg-white" value={editingContact.contactType} onChange={e => setEditingContact({...editingContact, contactType: e.target.value as ContactType})}>
                           {CONTACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                        <select className="w-full p-2 border border-slate-300 rounded outline-none focus:border-summit-accent bg-white" value={editingContact.status} onChange={e => setEditingContact({...editingContact, status: e.target.value as ContactStatus})}>
                           {CONTACT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                     </div>
                  </div>

                  {/* Contact Info */}
                  <div className="border-t border-slate-100 pt-4">
                     <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2"><Phone size={14} className="text-summit-accent"/> Contact Information</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="email" placeholder="Email Address" className="w-full p-2 border border-slate-300 rounded outline-none" value={editingContact.email || ''} onChange={e => setEditingContact({...editingContact, email: e.target.value})} />
                        <input type="tel" placeholder="Work Phone" className="w-full p-2 border border-slate-300 rounded outline-none" value={editingContact.phone || ''} onChange={e => setEditingContact({...editingContact, phone: e.target.value})} />
                        <input type="tel" placeholder="Mobile Phone" className="w-full p-2 border border-slate-300 rounded outline-none" value={editingContact.mobile || ''} onChange={e => setEditingContact({...editingContact, mobile: e.target.value})} />
                        <input type="text" placeholder="Website" className="w-full p-2 border border-slate-300 rounded outline-none" value={editingContact.website || ''} onChange={e => setEditingContact({...editingContact, website: e.target.value})} />
                     </div>
                  </div>

                  {/* Address */}
                  <div className="border-t border-slate-100 pt-4">
                     <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2"><MapPin size={14} className="text-summit-accent"/> Address</h3>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <input type="text" placeholder="Street" className="col-span-2 md:col-span-4 w-full p-2 border border-slate-300 rounded outline-none" value={editingContact.address?.street || ''} onChange={e => setEditingContact({...editingContact, address: {...editingContact.address, street: e.target.value}})} />
                        <input type="text" placeholder="City" className="w-full p-2 border border-slate-300 rounded outline-none" value={editingContact.address?.city || ''} onChange={e => setEditingContact({...editingContact, address: {...editingContact.address, city: e.target.value}})} />
                        <input type="text" placeholder="State" className="w-full p-2 border border-slate-300 rounded outline-none" value={editingContact.address?.state || ''} onChange={e => setEditingContact({...editingContact, address: {...editingContact.address, state: e.target.value}})} />
                        <input type="text" placeholder="Zip" className="w-full p-2 border border-slate-300 rounded outline-none" value={editingContact.address?.zip || ''} onChange={e => setEditingContact({...editingContact, address: {...editingContact.address, zip: e.target.value}})} />
                        <input type="text" placeholder="Country" className="w-full p-2 border border-slate-300 rounded outline-none" value={editingContact.address?.country || ''} onChange={e => setEditingContact({...editingContact, address: {...editingContact.address, country: e.target.value}})} />
                     </div>
                  </div>

                  {/* Meta */}
                  <div className="border-t border-slate-100 pt-4">
                     <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2"><Tag size={14} className="text-summit-accent"/> Tags & Notes</h3>
                     <input 
                        type="text" 
                        placeholder="Tags (comma separated)" 
                        className="w-full p-2 border border-slate-300 rounded outline-none mb-4" 
                        value={editingContact.tags?.join(', ') || ''} 
                        onChange={e => setEditingContact({...editingContact, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})} 
                     />
                     <textarea 
                        rows={3} 
                        placeholder="Internal Notes..." 
                        className="w-full p-2 border border-slate-300 rounded outline-none" 
                        value={editingContact.notes || ''} 
                        onChange={e => setEditingContact({...editingContact, notes: e.target.value})} 
                     />
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4">
                     <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                     <button type="submit" className="px-6 py-2 bg-summit-900 text-white rounded-lg hover:bg-summit-800 font-medium">Save Contact</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* --- IMPORT MODAL --- */}
      {isImportModalOpen && (
         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
               <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                  <h2 className="font-bold text-lg text-slate-800">Import Contacts</h2>
                  <button onClick={() => setIsImportModalOpen(false)}><X size={20} className="text-slate-400"/></button>
               </div>
               <div className="p-6">
                  <p className="text-sm text-slate-600 mb-4">
                     Paste your CSV data below. Format: <br/>
                     <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">First Name, Last Name, Email, Phone, Company, Type</code>
                  </p>
                  <textarea 
                     rows={10} 
                     className="w-full p-3 border border-slate-300 rounded-lg font-mono text-xs outline-none focus:border-summit-accent"
                     placeholder="John, Doe, john@example.com, 555-1234, Acme Corp, investor"
                     value={importText}
                     onChange={e => setImportText(e.target.value)}
                  />
                  <div className="flex justify-end gap-3 mt-4">
                     <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
                     <button onClick={handleCsvImport} className="px-4 py-2 bg-summit-900 text-white rounded-lg hover:bg-summit-800">Process Import</button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* --- LINK DEAL MODAL --- */}
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
