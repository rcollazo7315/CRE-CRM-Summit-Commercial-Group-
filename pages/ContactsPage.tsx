import React, { useState, useMemo } from 'react';
import { Users, UserPlus, Search, X, MapPin, Phone, Mail, Tag, Plus, Building, Edit, MessageSquare, TrendingUp, ChevronRight } from 'lucide-react';
import { Contact, ContactInteraction, Deal, ContactType, PropertyType } from '../types.ts';

const LOUISVILLE_SUBMARKETS = ["Downtown/CBD", "East End", "Bluegrass Industrial", "Riverport", "Middletown", "Jeffersonville"];
const CONTACT_TYPES = [
  { value: 'owner', label: 'Owner/Landlord', color: 'bg-blue-100 text-blue-700' },
  { value: 'tenant', label: 'Tenant/Occupier', color: 'bg-rose-100 text-rose-700' },
  { value: 'investor', label: 'Buyer/Investor', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'partner', label: 'Broker/Partner', color: 'bg-orange-100 text-orange-700' }
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

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      return name.includes(searchTerm.toLowerCase()) || c.company?.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [contacts, searchTerm]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingContact) {
      await onSaveContact(editingContact as Contact);
      setIsEditModalOpen(false);
    }
  };

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Relationship Hub</h1>
          <p className="text-slate-500 font-medium mt-1">Louisville Metro & Southern Indiana Network</p>
        </div>
        <button onClick={() => { setEditingContact({ firstName: '', lastName: '', contactType: 'prospect', status: 'lead', tier: 'C', submarkets: [], propertyInterests: [], tags: [], linkedDealIds: [], interactions: [] }); setIsEditModalOpen(true); }} className="bg-summit-900 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-summit-900/20 hover:scale-[1.02] transition-all active:scale-95">
          <UserPlus size={20} /> Register Contact
        </button>
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 mb-8 flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input 
            type="text" 
            placeholder="Search network by name, company, or submarket focus..." 
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
                <th className="p-6">Entity Details</th>
                <th className="p-6">Asset Class Focus</th>
                <th className="p-6">Pipeline Tier</th>
                <th className="p-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContacts.map(c => (
                <tr key={c.id} onClick={() => setSelectedContact(c)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-500 border-2 border-transparent group-hover:border-summit-accent/50 transition-all uppercase">
                        {c.firstName[0]}{c.lastName[0]}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 group-hover:text-summit-accent transition-colors leading-tight">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter mt-1">{c.company || 'Private Entity'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${CONTACT_TYPES.find(t => t.value === c.contactType)?.color}`}>
                      {c.contactType}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black tracking-widest uppercase">
                       Tier {c.tier}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <button onClick={e => { e.stopPropagation(); setEditingContact(c); setIsEditModalOpen(true); }} className="p-2 text-slate-300 hover:text-summit-900 transition-colors"><Edit size={18} /></button>
                  </td>
                </tr>
              ))}
              {filteredContacts.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-32 text-center text-slate-300">
                    <Users size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-black uppercase tracking-widest text-xs">Network empty</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Slide-over would go here for a full implementation */}
    </div>
  );
};

export default ContactsPage;