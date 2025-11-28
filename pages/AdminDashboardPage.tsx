
import React, { useEffect, useState } from 'react';
import { Shield, Users, UserCheck, UserX, Download, AlertTriangle } from 'lucide-react';
import { api } from '../services/firestore';
import { UserAccount, Deal } from '../types';
import { useAuth } from '../context/AuthContext';

const AdminDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const u = await api.getUsers();
    setUsers(u);
    if (currentUser?.id) {
       const d = await api.getDeals(currentUser.id, true); // true = isAdmin
       setDeals(d);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleApprove = async (userId: string) => {
    try {
        await api.updateUserStatus(userId, 'active');
        // Optimistic update
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'active' } : u));
        alert("User approved successfully.");
    } catch (e) {
        console.error(e);
        alert("Failed to approve user.");
    }
  };

  const handleDeny = async (userId: string) => {
    if (confirm("Are you sure you want to deny this user? Access will be revoked.")) {
      try {
        await api.updateUserStatus(userId, 'denied');
        // Optimistic update
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'denied' } : u));
      } catch (e) {
        console.error(e);
        alert("Failed to deny user.");
      }
    }
  };

  const generateReport = () => {
    const today = new Date().toISOString().split('T')[0];
    const header = "Agent Name,Status,Active Deals,Closed Deals,Total Volume,Total Commission\n";
    
    const agentRows = users.filter(u => u.role === 'agent').map(u => {
        const vol = (u.stats?.totalVolume || 0);
        const comm = vol * 0.03;
        return `"${u.firstName} ${u.lastName}",${u.status},${u.stats?.activeDeals || 0},${u.stats?.closedDeals || 0},${vol},${comm}`;
    }).join("\n");

    const csvContent = header + agentRows;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Summit_Agent_Report_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pendingUsers = users.filter(u => u.status === 'pending');
  const activeAgents = users.filter(u => u.role === 'agent' && u.status === 'active');

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
           <p className="text-slate-500">Manage agents and monitor system performance.</p>
        </div>
        <button onClick={generateReport} className="bg-summit-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-summit-800 transition-colors">
          <Download size={18} /> Export Agent Report (CSV)
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <p className="text-slate-500 text-sm font-bold uppercase">Pending Approvals</p>
           <h3 className="text-3xl font-bold text-slate-900 mt-2">{pendingUsers.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <p className="text-slate-500 text-sm font-bold uppercase">Active Agents</p>
           <h3 className="text-3xl font-bold text-slate-900 mt-2">{activeAgents.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <p className="text-slate-500 text-sm font-bold uppercase">Total Deals</p>
           <h3 className="text-3xl font-bold text-slate-900 mt-2">{deals.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <p className="text-slate-500 text-sm font-bold uppercase">System Volume</p>
           <h3 className="text-3xl font-bold text-slate-900 mt-2">${(deals.reduce((a, b) => a + b.askingPrice, 0) / 1000000).toFixed(0)}M</h3>
        </div>
      </div>

      {/* Pending Approvals Section */}
      {pendingUsers.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-4">
           <div className="p-4 bg-amber-100/50 flex items-center gap-2 text-amber-800 font-bold">
              <AlertTriangle size={20} /> Pending Registrations ({pendingUsers.length})
           </div>
           <div className="divide-y divide-amber-100">
             {pendingUsers.map(user => (
               <div key={user.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center font-bold">
                        {user.firstName[0]}
                     </div>
                     <div>
                        <p className="font-bold text-slate-900">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-slate-600">{user.email}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Applied: {new Date(user.createdAt).toLocaleDateString()}</p>
                     </div>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => handleApprove(user.id)} className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 flex items-center gap-1 shadow-sm">
                        <UserCheck size={16} /> Approve
                     </button>
                     <button onClick={() => handleDeny(user.id)} className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 flex items-center gap-1 shadow-sm">
                        <UserX size={16} /> Deny
                     </button>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* Agent Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
           <h3 className="font-bold text-slate-800 flex items-center gap-2">
             <Users size={20} /> Agent Directory
           </h3>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                 <tr>
                    <th className="p-4">Agent</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Performance</th>
                    <th className="p-4">Last Active</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {users.filter(u => u.role === 'agent').map(user => (
                   <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                         <div className="flex items-center gap-3">
                            <img src={user.avatar} className="w-8 h-8 rounded-full bg-slate-200 object-cover" alt="Avatar" />
                            <span className="font-semibold text-slate-700">{user.firstName} {user.lastName}</span>
                         </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                         <div>{user.email}</div>
                         <div className="text-xs text-slate-400">{user.phone}</div>
                      </td>
                      <td className="p-4">
                         <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${
                           user.status === 'active' ? 'bg-green-100 text-green-700' : 
                           user.status === 'denied' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                         }`}>
                           {user.status}
                         </span>
                      </td>
                      <td className="p-4 text-sm">
                         <div className="flex gap-4">
                            <div>
                               <span className="block font-bold">{user.stats?.closedDeals || 0}</span>
                               <span className="text-xs text-slate-400">Closed</span>
                            </div>
                            <div>
                               <span className="block font-bold text-green-600">${((user.stats?.totalVolume || 0)/1000000).toFixed(1)}M</span>
                               <span className="text-xs text-slate-400">Vol</span>
                            </div>
                         </div>
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                         {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
