
import React, { useEffect, useState } from 'react';
import { Shield, Users, UserCheck, UserX, Download, AlertTriangle, Trash2, Loader2, CheckCircle, Database } from 'lucide-react';
import { api } from '../services/firestore.ts';
import { UserAccount, Deal, DealStatus } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';

const AdminDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const u = await api.getUsers();
      setUsers(u);
      if (currentUser?.id) {
        const d = await api.getDeals(currentUser.id, true);
        setDeals(d);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [currentUser]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSystemReset = async () => {
    const confirmation = prompt(`🚨 WARNING: SYSTEM HARD RESET 🚨\n\nThis will permanently delete:\n- ALL Deals & Documents\n- ALL Tasks\n- ALL Lead Logs\n- ALL Contact Data\n- ALL Mortgage Calculations\n\nUser accounts will remain but statistics will be zeroed out.\n\nType "RESET SYSTEM" to confirm:`);
    
    if (confirmation !== 'RESET SYSTEM') return;

    setIsResetting(true);
    try {
      await api.adminHardReset();
      showNotification('success', 'System data cleared successfully.');
      await loadData();
    } catch (e: any) {
      showNotification('error', `Reset failed: ${e.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium animate-pulse">Loading system metrics...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      {notification && (
        <div className={`fixed top-20 right-4 z-50 px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-in slide-in-from-right ${
            notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
            {notification.type === 'success' ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
            <p className="font-medium">{notification.message}</p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Admin Console</h1>
           <p className="text-slate-500">Global system management and user oversight.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <p className="text-slate-500 text-xs font-bold uppercase">Pending</p>
           <h3 className="text-3xl font-bold mt-2">{users.filter(u => u.status === 'pending').length}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <p className="text-slate-500 text-xs font-bold uppercase">Active Agents</p>
           <h3 className="text-3xl font-bold mt-2">{users.filter(u => u.status === 'active' && u.role === 'agent').length}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <p className="text-slate-500 text-xs font-bold uppercase">Total Deals</p>
           <h3 className="text-3xl font-bold mt-2">{deals.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <p className="text-slate-500 text-xs font-bold uppercase">System Volume</p>
           <h3 className="text-3xl font-bold mt-2">${(deals.reduce((a, b) => a + b.askingPrice, 0) / 1000000).toFixed(1)}M</h3>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
           <h3 className="font-bold text-slate-800 flex items-center gap-2"><Users size={20} /> User Directory</h3>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                 <tr>
                    <th className="p-4">Name</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Last Login</th>
                    <th className="p-4">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {users.map(user => (
                   <tr key={user.id} className="hover:bg-slate-50">
                      <td className="p-4 font-semibold">{user.firstName} {user.lastName}</td>
                      <td className="p-4">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                           user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                         }`}>{user.status}</span>
                      </td>
                      <td className="p-4 text-xs text-slate-500">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
                      <td className="p-4 flex gap-2">
                        {user.status === 'pending' && <button onClick={() => api.updateUserStatus(user.id, 'active').then(loadData)} className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100"><UserCheck size={16} /></button>}
                        <button onClick={() => { if(confirm('Delete user?')) api.deleteUser(user.id).then(loadData) }} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100"><Trash2 size={16} /></button>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden mt-10">
        <div className="p-6">
            <h3 className="text-xl font-bold text-red-700 flex items-center gap-2 mb-2">
                <AlertTriangle size={24} /> Danger Zone
            </h3>
            <p className="text-red-600 mb-6">
                Clear all user-inputted system data. This action is <strong>permanent</strong> and cannot be reversed.
            </p>
            <button 
                onClick={handleSystemReset}
                disabled={isResetting}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg disabled:opacity-50 transition-colors"
            >
                {isResetting ? <Loader2 size={20} className="animate-spin" /> : <Database size={20} />}
                {isResetting ? "Clearing..." : "Reset System (Delete All Input Data)"}
            </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
