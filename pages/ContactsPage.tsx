import React, { useState, useMemo } from 'react';
import { 
  Users, UserPlus, Search, Filter, X, Save, 
  MapPin, Phone, Mail, Globe, Tag, 
  Plus, Building, Edit, Trash2, ChevronRight, TrendingUp, AlertCircle, MessageSquare
} from 'lucide-react';
import { Contact, ContactInteraction, Deal, ContactType, PropertyType } from '../types.ts';

const LOUISVILLE_SUBMARKETS = [
  "Downtown/CBD", "East End", "River Ridge (IN)", "Bluegrass Industrial", 
  "Riverport", "Middletown", "Hurstbourne", "Dixie Highway", "Jeffersonville"
];

const CONTACT_TYPES: { value: ContactType; label: string; color: string }[] = [
  { value: 'owner', label: 'Owner/Landlord', color: 'bg-blue-100 text-blue-700' },
  { value: 'tenant', label: 'Tenant/Occupier', color: 'bg-rose-100 text-rose-700' },
  { value: 'investor', label: 'Buyer/Investor', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'developer', label: 'Developer', color: 'bg-purple-100 text-purple-700' },
  { value: 'partner', label: 'Partner/Broker', color: 'bg-orange-100 text-orange-700' },
  { value: 'prospect', label: 'Prospect', color: 'bg-slate-100 text-slate-700' }
];

const ContactsPage: React.FC<{ 
  contacts: Contact[]; 
  deals: Deal[]; 
  onSaveContact: (c: Contact) => Promise<void>;
  onDeleteContact: (id: string) => Promise<void>;
  onAddInteraction: (id: string, i: ContactInteraction) => Promise<void>;
}> = ({ contacts, deals, onSaveContact, onDeleteContact, onAddInteraction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Partial<Contact> | null>(null);
  const [isAddingInteraction, setIsAddingInteraction] = useState(false);
  const [newInteraction, setNewInteraction] = useState<Partial<ContactInteraction>>({
    type: 'call', date: new Date().toISOString().split('T')[0], subject: '', notes: ''
  });

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      return name.includes(searchTerm.toLowerCase()) || 
             c.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             c.submarkets?.some(m => m.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  }, [contacts, searchTerm]);

  const getScore = (lastContactedAt?: string) => {
    if (!lastContactedAt) return { label: 'Cold', color: 'text-slate-400 bg-slate-50' };
    const days = (Date.now() - new Date(lastContactedAt).getTime()) / (1000 * 3600 * 24);
    if (days < 14) return { label: 'Hot', color: 'text-red-600 bg-red-50' };
    if (days < 60) return { label: 'Warm', color: 'text-orange-600 bg-orange-50' };
    return { label: 'Cool', color: 'text-blue-600 bg-blue-50' };
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
      const i = { ...newInteraction, id: Math.random().toString(36).substr(2, 9) } as ContactInteraction;
      await onAddInteraction(selectedContact.id, i);
      setIsAddingInteraction(false);
      setNewInteraction({ type: 'call', date: new Date().toISOString().split('T')[0], subject: '', notes: '' });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="text-summit-accent" /> Relationship Hub
          </h1>
          <p className="text-slate-500 text-sm">Louisville Metro & Southern Indiana Network</p>
        </div>
        <button onClick={() => { setEditingContact({ firstName: '', lastName: '', contactType: 'prospect', status: 'lead', submarkets: [], propertyInterests: [], tags: [], linkedDealIds: [], interactions: [] }); setIsEditModalOpen(true); }} className="bg-summit-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-summit-900/10 transition-all hover:-translate-y-0.5">
          <UserPlus size={18} /> New Contact
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Search by name, company, or submarket..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-summit-accent/20" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <button className="px-3 py-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors"><Filter size={18} /></button>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="p-4">Contact</th>
                <th className="p-4">Type</th>
                <th className="p-4">Engagement</th>
                <th className="p-4 hidden md:table-cell">Focus Submarkets</th>
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
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 border group-hover:border-summit-accent/50 transition-colors uppercase">
                          {c.firstName[0]}{c.lastName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-summit-accent transition-colors">{c.firstName} {c.lastName}</p>
                          <p className="text-xs text-slate-500">{c.company || 'Private Entity'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${CONTACT_TYPES.find(t => t.value === c.contactType)?.color}`}>
                        {c.contactType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${score.color}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${score.color.replace('text-', 'bg-').split(' ')[0]}`}></div>
                        {score.label}
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {c.submarkets?.slice(0, 2).map(m => (
                          <span key={m} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-medium">{m}</span>
                        ))}
                        {c.submarkets && c.submarkets.length > 2 && <span className="text-[10px] text-slate-400">+{c.submarkets.length - 2}</span>}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={e => { e.stopPropagation(); setEditingContact(c); setIsEditModalOpen(true); }} className="p-2 text-slate-400 hover:text-summit-900 hover:bg-white rounded-lg transition-colors"><Edit size={16} /></button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-slate-400">
                    <Users size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-medium text-lg text-slate-600">No relationships matching search</p>
                    <p className="text-sm">Try broadening your filters or add a new contact.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- DETAIL SLIDE-OVER --- */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in" onClick={() => setSelectedContact(null)} />
          <div className="fixed inset-y-0 right-0 max-w-xl w-full flex">
            <div className="w-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-summit-accent text-summit-900 flex items-center justify-center font-black text-2xl shadow-lg uppercase">
                    {selectedContact.firstName[0]}{selectedContact.lastName[0]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedContact.firstName} {selectedContact.lastName}</h2>
                    <p className="text-summit-accent font-medium text-sm">{selectedContact.jobTitle || 'Decision Maker'} @ {selectedContact.company || 'Individual'}</p>
                    <div className="flex gap-2 mt-2">
                       <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{selectedContact.contactType}</span>
                       <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{selectedContact.status}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedContact(null)} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <button className="flex items-center justify-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-100 transition-all"><Phone size={16} className="text-blue-500" /> Call</button>
                  <button className="flex items-center justify-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-100 transition-all"><Mail size={16} className="text-rose-500" /> Email</button>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b pb-2 flex items-center gap-2">
                    <TrendingUp size={14} /> Market Intelligence
                  </h3>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4 text-sm">
                    <div className="flex justify-between items-start">
                      <span className="text-slate-500 font-medium">Submarkets</span>
                      <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                        {selectedContact.submarkets?.map(m => <span key={m} className="bg-white border px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">{m}</span>)}
                        {!selectedContact.submarkets?.length && <span className="text-slate-400 italic">None assigned</span>}
                      </div>
                    </div>
                    {selectedContact.contactType === 'investor' && selectedContact.investorCriteria && (
                      <div className="pt-2 border-t space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-500">1031 Status</span>
                          <span className={`font-bold ${selectedContact.investorCriteria.is1031Active ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {selectedContact.investorCriteria.is1031Active ? 'ACTIVE' : 'NONE'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                      <MessageSquare size={14} /> Timeline
                    </h3>
                    <button onClick={() => setIsAddingInteraction(true)} className="text-xs font-bold text-summit-900 flex items-center gap-1 hover:text-summit-accent transition-colors"><Plus size={14} /> Log Entry</button>
                  </div>

                  {isAddingInteraction && (
                    <form onSubmit={logInteraction} className="bg-slate-50 p-4 rounded-xl border border-summit-accent/30 space-y-3 animate-in slide-in-from-top-2">
                      <div className="grid grid-cols-2 gap-2">
                         <select value={newInteraction.type} onChange={e => setNewInteraction({...newInteraction, type: e.target.value as any})} className="p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none">
                            <option value="call">Call</option>
                            <option value="email">Email</option>
                            <option value="meeting">Meeting</option>
                            <option value="tour">Property Tour</option>
                         </select>
                         <input type="date" value={newInteraction.date} onChange={e => setNewInteraction({...newInteraction, date: e.target.value})} className="p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none" />
                      </div>
                      <input type="text" placeholder="Subject line..." className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none text-sm" value={newInteraction.subject} onChange={e => setNewInteraction({...newInteraction, subject: e.target.value})} required />
                      <textarea rows={2} placeholder="Brief summary of interaction..." className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none text-sm" value={newInteraction.notes} onChange={e => setNewInteraction({...newInteraction, notes: e.target.value})} />
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setIsAddingInteraction(false)} className="text-xs font-bold text-slate-500 px-3 transition-colors hover:text-slate-700">Cancel</button>
                        <button type="submit" className="bg-summit-900 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md hover:bg-slate-800 transition-all">Save Activity</button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-6 relative ml-3 border-l-2 border-slate-100 pl-6 py-2">
                    {selectedContact.interactions?.length > 0 ? selectedContact.interactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(i => (
                      <div key={i.id} className="relative">
                        <div className="absolute -left-[31px] top-1 w-2 h-2 rounded-full bg-summit-accent shadow-[0_0_0_4px_rgba(16,185,129,0.1)]" />
                        <div className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                           <div className="flex justify-between items-center mb-1">
                              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{i.type} • {new Date(i.date).toLocaleDateString()}</p>
                           </div>
                           <p className="text-sm font-bold text-slate-800">{i.subject}</p>
                           <p className="text-xs text-slate-500 mt-1 leading-relaxed">{i.notes}</p>
                        </div>
                      </div>
                    )) : (
                       <div className="text-center py-6 text-slate-400 italic text-xs">No activity history recorded.</div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{editingContact.id ? 'Modify Relationship' : 'Register New Contact'}</h2>
                <p className="text-xs text-slate-500">All data is synchronized with your agent profile.</p>
              </div>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>
            
            <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b pb-2">Profile Basics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">First Name</label>
                    <input required type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-summit-accent/20" value={editingContact.firstName} onChange={e => setEditingContact({...editingContact, firstName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Last Name</label>
                    <input required type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-summit-accent/20" value={editingContact.lastName} onChange={e => setEditingContact({...editingContact, lastName: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Company / Group</label>
                  <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-summit-accent/20" value={editingContact.company || ''} onChange={e => setEditingContact({...editingContact, company: e.target.value})} placeholder="e.g. Hogan Real Estate" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Relationship Type</label>
                    <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer" value={editingContact.contactType} onChange={e => setEditingContact({...editingContact, contactType: e.target.value as any})}>
                      {CONTACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Pipeline Status</label>
                    <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer" value={editingContact.status} onChange={e => setEditingContact({...editingContact, status: e.target.value as any})}>
                      {['active', 'lead', 'prospect', 'inactive'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Email</label>
                    <input type="email" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-summit-accent/20" value={editingContact.email || ''} onChange={e => setEditingContact({...editingContact, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Phone</label>
                    <input type="tel" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-summit-accent/20" value={editingContact.phone || ''} onChange={e => setEditingContact({...editingContact, phone: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b pb-2">Market focus</h3>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-3">Louisville Area Submarkets</label>
                  <div className="grid grid-cols-2 gap-2">
                    {LOUISVILLE_SUBMARKETS.map(m => (
                      <label key={m} className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${editingContact.submarkets?.includes(m) ? 'bg-summit-accent/10 border-summit-accent' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                        <input type="checkbox" className="hidden" checked={editingContact.submarkets?.includes(m)} onChange={e => { const cur = editingContact.submarkets || []; setEditingContact({...editingContact, submarkets: e.target.checked ? [...cur, m] : cur.filter(x => x !== m)}); }} />
                        <div className={`w-3 h-3 rounded-full border ${editingContact.submarkets?.includes(m) ? 'bg-summit-accent border-summit-accent' : 'border-slate-300 bg-white'}`} />
                        <span className="text-[10px] font-bold text-slate-700">{m}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-3">Portfolio Interest</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(PropertyType).map(pt => (
                      <button key={pt} type="button" onClick={() => { const cur = editingContact.propertyInterests || []; setEditingContact({...editingContact, propertyInterests: cur.includes(pt) ? cur.filter(x => x !== pt) : [...cur, pt]}); }} className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${editingContact.propertyInterests?.includes(pt) ? 'bg-summit-900 border-summit-900 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-summit-accent'}`}>
                        {pt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">Cancel</button>
              <button type="submit" className="px-10 py-2.5 rounded-xl bg-summit-900 text-white font-black shadow-lg shadow-summit-900/20 hover:bg-slate-800 transition-all hover:-translate-y-0.5 flex items-center gap-2">
                 <Save size={18} /> Save Relationship
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ContactsPage;