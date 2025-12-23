
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, UserPlus, Search, Filter, Download, Upload, X, Save, 
  MapPin, Phone, Mail, Globe, Linkedin, Tag, 
  Calendar, Clock, Edit, Trash2, Link as LinkIcon, Plus, 
  Briefcase, MoreVertical, MessageSquare, StickyNote,
  ChevronRight, Building, CheckCircle, AlertCircle, TrendingUp
} from 'lucide-react';
import { Contact, ContactInteraction, Deal, ContactType, ContactStatus, PropertyType, RelationshipTier } from '../types.ts';
import { api } from '../services/firestore.ts';

const LOUISVILLE_SUBMARKETS = [
  "Downtown/CBD", "East End", "Hurstbourne", "Middletown", "Dixie Highway", 
  "Riverport", "Bluegrass Industrial", "Preston Highway", "Bullitt County", 
  "River Ridge (IN)", "Jeffersonville", "Clarksville", "New Albany"
];

const CONTACT_TYPES: { value: ContactType; label: string; color: string }[] = [
  { value: 'owner', label: 'Owner/Landlord', color: 'bg-blue-100 text-blue-700' },
  { value: 'tenant', label: 'Tenant/Occupier', color: 'bg-rose-100 text-rose-700' },
  { value: 'investor', label: 'Buyer/Investor', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'developer', label: 'Developer', color: 'bg-purple-100 text-purple-700' },
  { value: 'partner', label: 'Referral Partner', color: 'bg-orange-100 text-orange-700' },
  { value: 'prospect', label: 'Prospect', color: 'bg-slate-100 text-slate-700' }
];

const TIERS: RelationshipTier[] = ['A', 'B', 'C', 'D'];

const ContactsPage: React.FC<{ 
  contacts: Contact[]; 
  deals: Deal[]; 
  onSaveContact: (c: Contact) => Promise<void>;
  onDeleteContact: (id: string) => Promise<void>;
  onAddInteraction: (id: string, i: ContactInteraction) => Promise<void>;
  onLinkDeal: (cid: string, did: string) => Promise<void>;
  onUnlinkDeal: (cid: string, did: string) => Promise<void>;
}> = ({ contacts, deals, onSaveContact, onDeleteContact, onAddInteraction, onLinkDeal, onUnlinkDeal }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Partial<Contact> | null>(null);
  const [isAddingInteraction, setIsAddingInteraction] = useState(false);
  const [newInteraction, setNewInteraction] = useState<Partial<ContactInteraction>>({
    type: 'call', date: new Date().toISOString().split('T')[0], subject: '', notes: ''
  });

  // Calculate Engagement Score dynamically
  const getScore = (lastContact?: string): { label: string; color: string } => {
    if (!lastContact) return { label: 'Cold', color: 'text-slate-400 bg-slate-50' };
    const days = (Date.now() - new Date(lastContact).getTime()) / (1000 * 3600 * 24);
    if (days < 14) return { label: 'Hot', color: 'text-red-600 bg-red-50' };
    if (days < 45) return { label: 'Warm', color: 'text-orange-600 bg-orange-50' };
    return { label: 'Cool', color: 'text-blue-600 bg-blue-50' };
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      const matchesSearch = name.includes(searchTerm.toLowerCase()) || 
                           c.company?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || c.contactType === filterType;
      const matchesTier = filterTier === 'all' || c.tier === filterTier;
      return matchesSearch && matchesType && matchesTier;
    });
  }, [contacts, searchTerm, filterType, filterTier]);

  const handleOpenEdit = (contact?: Contact) => {
    setEditingContact(contact || {
      firstName: '', lastName: '', company: '', contactType: 'prospect', 
      status: 'active', tier: 'C', submarkets: [], propertyInterests: [], tags: [], linkedDealIds: [], interactions: []
    });
    setIsEditModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingContact) {
      await onSaveContact(editingContact as Contact);
      setIsEditModalOpen(false);
      if (selectedContact?.id === editingContact.id) setSelectedContact(editingContact as Contact);
    }
  };

  const logInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedContact && newInteraction.subject) {
      const interaction = { ...newInteraction, id: Math.random().toString(36).substr(2, 9) } as ContactInteraction;
      await onAddInteraction(selectedContact.id, interaction);
      setIsAddingInteraction(false);
      setNewInteraction({ type: 'call', date: new Date().toISOString().split('T')[0], subject: '', notes: '' });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="text-summit-accent" /> Relationship Manager
          </h1>
          <p className="text-slate-500 text-sm">Louisville Metro & Southern Indiana Network</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleOpenEdit()} className="bg-summit-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-summit-900/20 hover:bg-summit-800 transition-all">
            <UserPlus size={18} /> New Contact
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, company, submarket..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-summit-accent/20"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm outline-none font-medium text-slate-600">
            <option value="all">All Roles</option>
            {CONTACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={filterTier} onChange={e => setFilterTier(e.target.value)} className="bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm outline-none font-medium text-slate-600">
            <option value="all">All Tiers</option>
            {TIERS.map(t => <option key={t} value={t}>Tier {t}</option>)}
          </select>
          <button className="px-3 py-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50"><Filter size={18} /></button>
        </div>
      </div>

      {/* Main List Table */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="p-4">Contact</th>
                <th className="p-4">Role & Tier</th>
                <th className="p-4">Engagement</th>
                <th className="p-4 hidden md:table-cell">Submarkets</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContacts.length > 0 ? filteredContacts.map(c => {
                const score = getScore(c.lastContactedAt);
                return (
                  <tr key={c.id} onClick={() => setSelectedContact(c)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500 group-hover:border-summit-accent/30">
                          {c.firstName[0]}{c.lastName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{c.firstName} {c.lastName}</p>
                          <p className="text-xs text-slate-500">{c.company || 'Private Individual'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${CONTACT_TYPES.find(t => t.value === c.contactType)?.color}`}>
                          {c.contactType}
                        </span>
                        <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-black">
                          {c.tier}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${score.color}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${score.color.replace('text-', 'bg-').split(' ')[0]}`}></div>
                        {score.label}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Last contacted: {c.lastContactedAt ? new Date(c.lastContactedAt).toLocaleDateString() : 'Never'}</p>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {c.submarkets.slice(0, 2).map(m => (
                          <span key={m} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-medium">{m}</span>
                        ))}
                        {c.submarkets.length > 2 && <span className="text-[10px] text-slate-400">+{c.submarkets.length - 2}</span>}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                       <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(c); }} className="p-2 text-slate-400 hover:text-summit-900 hover:bg-slate-100 rounded-full"><Edit size={16} /></button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-slate-400">
                    <Users size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-medium text-lg">No relationships found</p>
                    <p className="text-sm">Start building your pipeline by adding a new contact.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- SLIDE-OVER DETAIL VIEW --- */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedContact(null)} />
          <div className="fixed inset-y-0 right-0 max-w-2xl w-full flex">
            <div className="relative w-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              {/* Detail Header */}
              <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-summit-accent text-summit-900 flex items-center justify-center font-black text-2xl">
                    {selectedContact.firstName[0]}{selectedContact.lastName[0]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedContact.firstName} {selectedContact.lastName}</h2>
                    <p className="text-summit-accent font-medium text-sm">{selectedContact.jobTitle || 'Decision Maker'} @ {selectedContact.company}</p>
                    <div className="flex gap-2 mt-2">
                       <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Tier {selectedContact.tier}</span>
                       <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{selectedContact.contactType}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedContact(null)} className="text-white/60 hover:text-white"><X size={24} /></button>
              </div>

              {/* Action Bar */}
              <div className="px-6 py-3 border-b border-slate-100 flex gap-4 overflow-x-auto bg-slate-50">
                 <button className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-lg hover:shadow-sm">
                   <Phone size={14} className="text-blue-500" /> Call
                 </button>
                 <button className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-lg hover:shadow-sm">
                   <Mail size={14} className="text-rose-500" /> Email
                 </button>
                 <button onClick={() => setIsAddingInteraction(true)} className="flex items-center gap-2 text-xs font-bold text-white bg-summit-900 px-3 py-2 rounded-lg hover:bg-slate-800">
                   <Plus size={14} /> Log Activity
                 </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                 {/* Intelligence Grid */}
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                       <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 flex items-center gap-2">
                         <Building size={14} /> Louisville Focus
                       </h3>
                       <div className="flex flex-wrap gap-2">
                          {selectedContact.submarkets.map(m => (
                            <span key={m} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">{m}</span>
                          ))}
                          {selectedContact.submarkets.length === 0 && <p className="text-xs text-slate-400 italic">No specific submarkets assigned.</p>}
                       </div>
                    </div>
                    <div className="space-y-4">
                       <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 flex items-center gap-2">
                         <TrendingUp size={14} /> Interests
                       </h3>
                       <div className="flex flex-wrap gap-2">
                          {selectedContact.propertyInterests.map(p => (
                            <span key={p} className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs font-bold">{p}</span>
                          ))}
                          {selectedContact.propertyInterests.length === 0 && <p className="text-xs text-slate-400 italic">No interests logged.</p>}
                       </div>
                    </div>
                 </div>

                 {/* Contact Details */}
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Primary Phone</p>
                       <p className="text-sm font-bold text-slate-800">{selectedContact.phone || selectedContact.mobile || 'N/A'}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Primary Email</p>
                       <p className="text-sm font-bold text-slate-800 truncate">{selectedContact.email || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Office Address</p>
                       <p className="text-sm font-bold text-slate-800">
                          {selectedContact.address?.street ? `${selectedContact.address.street}, ${selectedContact.address.city}` : 'No address on file'}
                       </p>
                    </div>
                 </div>

                 {/* Type Specific Context */}
                 {selectedContact.contactType === 'investor' && selectedContact.investorCriteria && (
                   <div className="bg-emerald-900 text-white p-4 rounded-xl shadow-lg">
                      <h3 className="font-bold mb-3 flex items-center gap-2 text-sm"><AlertCircle size={16}/> Investor Portfolio Criteria</h3>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                         <div className="bg-white/10 p-2 rounded">
                            <p className="opacity-60">1031 Status</p>
                            <p className="font-bold text-sm">{selectedContact.investorCriteria.is1031Active ? 'ACTIVE 1031' : 'No Active Exchange'}</p>
                         </div>
                         <div className="bg-white/10 p-2 rounded">
                            <p className="opacity-60">Target Cap Rate</p>
                            <p className="font-bold text-sm">{selectedContact.investorCriteria.targetCapRate}% - {Number(selectedContact.investorCriteria.targetCapRate) + 1}%</p>
                         </div>
                      </div>
                   </div>
                 )}

                 {/* Timeline */}
                 <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">Activity History</h3>
                    
                    {isAddingInteraction && (
                       <form onSubmit={logInteraction} className="bg-slate-50 p-4 rounded-xl border border-summit-accent/30 animate-in fade-in slide-in-from-top-2">
                          <div className="grid grid-cols-2 gap-4 mb-4">
                             <select value={newInteraction.type} onChange={e => setNewInteraction({...newInteraction, type: e.target.value as any})} className="bg-white border p-2 rounded text-xs outline-none">
                                <option value="call">Phone Call</option>
                                <option value="email">Email Sent</option>
                                <option value="meeting">In-Person Meeting</option>
                                <option value="tour">Property Tour</option>
                             </select>
                             <input type="date" value={newInteraction.date} onChange={e => setNewInteraction({...newInteraction, date: e.target.value})} className="bg-white border p-2 rounded text-xs outline-none" />
                          </div>
                          <input type="text" placeholder="Subject line..." value={newInteraction.subject} onChange={e => setNewInteraction({...newInteraction, subject: e.target.value})} className="w-full bg-white border p-2 rounded text-xs outline-none mb-4" required />
                          <textarea rows={2} placeholder="Detailed notes..." value={newInteraction.notes} onChange={e => setNewInteraction({...newInteraction, notes: e.target.value})} className="w-full bg-white border p-2 rounded text-xs outline-none mb-4" />
                          <div className="flex justify-end gap-2">
                             <button type="button" onClick={() => setIsAddingInteraction(false)} className="text-xs font-bold text-slate-500 px-3">Cancel</button>
                             <button type="submit" className="bg-summit-900 text-white px-4 py-2 rounded font-bold text-xs">Save Entry</button>
                          </div>
                       </form>
                    )}

                    <div className="relative border-l-2 border-slate-100 ml-4 pl-8 space-y-8 py-4">
                       {selectedContact.interactions.length > 0 ? selectedContact.interactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(i => (
                          <div key={i.id} className="relative group">
                             <div className="absolute -left-[37px] top-0 w-4 h-4 rounded-full bg-white border-4 border-summit-accent group-hover:scale-125 transition-transform" />
                             <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm group-hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                   <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-tighter">
                                      {i.type === 'call' && <Phone size={12} />}
                                      {i.type === 'email' && <Mail size={12} />}
                                      {i.type === 'tour' && <MapPin size={12} />}
                                      {i.type} • {new Date(i.date).toLocaleDateString()}
                                   </div>
                                </div>
                                <h4 className="font-bold text-slate-800 text-sm">{i.subject}</h4>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{i.notes}</p>
                             </div>
                          </div>
                       )) : (
                         <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <MessageSquare className="mx-auto text-slate-200 mb-2" />
                            <p className="text-xs text-slate-400 italic">No activity history recorded.</p>
                         </div>
                       )}
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD/EDIT MODAL --- */}
      {isEditModalOpen && editingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
           <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                 <h2 className="text-xl font-bold text-slate-800">{editingContact.id ? 'Edit Relationship' : 'Register New Contact'}</h2>
                 <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
              </div>
              <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* Basic Profile */}
                 <div className="space-y-6">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b pb-2">Professional Profile</h3>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">First Name</label>
                          <input required type="text" className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-summit-accent/20" value={editingContact.firstName} onChange={e => setEditingContact({...editingContact, firstName: e.target.value})} />
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Last Name</label>
                          <input required type="text" className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-summit-accent/20" value={editingContact.lastName} onChange={e => setEditingContact({...editingContact, lastName: e.target.value})} />
                       </div>
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Company / Entity</label>
                       <input type="text" className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none" value={editingContact.company || ''} onChange={e => setEditingContact({...editingContact, company: e.target.value})} placeholder="e.g. Hogan Real Estate" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Contact Type</label>
                          <select className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none" value={editingContact.contactType} onChange={e => setEditingContact({...editingContact, contactType: e.target.value as ContactType})}>
                             {CONTACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Relationship Tier</label>
                          <select className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none" value={editingContact.tier} onChange={e => setEditingContact({...editingContact, tier: e.target.value as RelationshipTier})}>
                             {TIERS.map(t => <option key={t} value={t}>Tier {t}</option>)}
                          </select>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Email</label>
                          <input type="email" className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none" value={editingContact.email || ''} onChange={e => setEditingContact({...editingContact, email: e.target.value})} />
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Phone</label>
                          <input type="tel" className="w-full p-2.5 bg-slate-50 border rounded-lg outline-none" value={editingContact.phone || ''} onChange={e => setEditingContact({...editingContact, phone: e.target.value})} />
                       </div>
                    </div>
                 </div>

                 {/* CRE Specifics */}
                 <div className="space-y-6">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b pb-2">Market Intelligence</h3>
                    <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Louisville Submarket Focus</label>
                       <div className="grid grid-cols-2 gap-2">
                          {LOUISVILLE_SUBMARKETS.map(market => (
                            <label key={market} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 border border-transparent cursor-pointer">
                               <input 
                                 type="checkbox" 
                                 className="rounded border-slate-300 text-summit-accent focus:ring-summit-accent" 
                                 checked={editingContact.submarkets?.includes(market)} 
                                 onChange={e => {
                                    const current = editingContact.submarkets || [];
                                    const next = e.target.checked ? [...current, market] : current.filter(m => m !== market);
                                    setEditingContact({...editingContact, submarkets: next});
                                 }}
                               />
                               <span className="text-[10px] font-bold text-slate-600">{market}</span>
                            </label>
                          ))}
                       </div>
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Property Type Interest</label>
                       <div className="flex flex-wrap gap-2">
                          {Object.values(PropertyType).map(pt => (
                            <button 
                              key={pt} 
                              type="button"
                              onClick={() => {
                                 const current = editingContact.propertyInterests || [];
                                 const next = current.includes(pt) ? current.filter(x => x !== pt) : [...current, pt];
                                 setEditingContact({...editingContact, propertyInterests: next});
                              }}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                                 editingContact.propertyInterests?.includes(pt) ? 'bg-summit-accent border-summit-accent text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-summit-accent/30'
                              }`}
                            >
                               {pt}
                            </button>
                          ))}
                       </div>
                    </div>
                    {editingContact.contactType === 'investor' && (
                       <div className="p-4 bg-slate-900 rounded-xl space-y-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                             <input 
                               type="checkbox" 
                               className="rounded border-white/20 bg-white/10 text-summit-accent focus:ring-0" 
                               checked={editingContact.investorCriteria?.is1031Active} 
                               onChange={e => setEditingContact({...editingContact, investorCriteria: {...(editingContact.investorCriteria || {is1031Active: false}), is1031Active: e.target.checked}})}
                             />
                             <span className="text-[10px] font-black text-white uppercase tracking-widest">Active 1031 Exchange</span>
                          </label>
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">Target Cap Rate %</label>
                                <input type="number" step="0.1" className="w-full p-2 bg-white/10 border border-white/10 rounded outline-none text-white text-xs" value={editingContact.investorCriteria?.targetCapRate || ''} onChange={e => setEditingContact({...editingContact, investorCriteria: {...(editingContact.investorCriteria || {is1031Active: false}), targetCapRate: Number(e.target.value)}})} />
                             </div>
                             <div>
                                <label className="block text-[10px] font-bold text-white/50 uppercase mb-1">Cap Available ($M)</label>
                                <input type="number" className="w-full p-2 bg-white/10 border border-white/10 rounded outline-none text-white text-xs" value={editingContact.investorCriteria?.capitalAvailable || ''} onChange={e => setEditingContact({...editingContact, investorCriteria: {...(editingContact.investorCriteria || {is1031Active: false}), capitalAvailable: Number(e.target.value)}})} />
                             </div>
                          </div>
                       </div>
                    )}
                 </div>
              </div>
              <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
                 <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-6 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-200">Cancel</button>
                 <button type="submit" className="px-8 py-2 rounded-lg bg-summit-900 text-white font-black shadow-lg shadow-summit-900/20 hover:bg-slate-800 transition-all">Save Relationship</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

export default ContactsPage;
