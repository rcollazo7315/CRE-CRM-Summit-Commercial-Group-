
import React, { useEffect, useState } from 'react';
import { Shield, Users, UserCheck, UserX, Download, AlertTriangle, Trash2, Loader2, CheckCircle } from 'lucide-react';
import { api } from '../services/firestore';
import { UserAccount, Deal, DealStatus } from '../types';
import { useAuth } from '../context/AuthContext';

const AdminDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Notification State
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [managingUserId, setManagingUserId] = useState<string | null>(null);

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

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleApprove = async (userId: string) => {
    try {
        await api.updateUserStatus(userId, 'active');
        // Optimistic update
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'active' } : u));
        showNotification('success', "User approved successfully.");
    } catch (e) {
        console.error(e);
        showNotification('error', "Failed to approve user.");
    }
  };

  const handleDeny = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    // Auto confirm for deny
    if (true) {
      try {
        await api.updateUserStatus(userId, 'denied');
        // Optimistic update
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'denied' } : u));
        showNotification('success', `User ${user?.firstName} ${user?.lastName} has been denied access.`);
      } catch (e) {
        console.error(e);
        showNotification('error', "Failed to deny user.");
      }
    }
  };

  const handleDeactivateAgent = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const userDeals = deals.filter(d => d.userId === userId);
    const activeDealCount = userDeals.filter(d => d.status !== DealStatus.COMPLETED && d.status !== DealStatus.ARCHIVED).length;
    
    // Auto confirm logic
    if (activeDealCount > 0) {
      const confirmation = 'DEACTIVATE'; 
      if (confirmation !== 'DEACTIVATE') {
        return;
      }
    }
    
    setManagingUserId(userId);
    try {
      await api.updateUserStatus(userId, 'denied');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'denied' } : u));
      showNotification('success', `Agent ${user.firstName} ${user.lastName} has been deactivated.`);
    } catch (e) {
      console.error(e);
      showNotification('error', 'Failed to deactivate agent.');
    } finally {
      setManagingUserId(null);
    }
  };

  const handleReactivateAgent = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    // Auto confirm logic
    if (false) return;
    
    setManagingUserId(userId);
    try {
      await api.updateUserStatus(userId, 'active');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'active' } : u));
      showNotification('success', `Agent ${user.firstName} ${user.lastName} has been reactivated.`);
    } catch (e) {
      console.error(e);
      showNotification('error', 'Failed to reactivate agent.');
    } finally {
      setManagingUserId(null);
    }
  };

  const handlePermanentlyDelete = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const userDeals = deals.filter(d => d.userId === userId);
    
    // Auto confirm logic for prompt
    const confirmation = 'DELETE PERMANENTLY';
    if (confirmation !== 'DELETE PERMANENTLY') {
      return;
    }
    
    setManagingUserId(userId);
    try {
      console.log(`🗑️ Starting permanent deletion of user ${userId} and their ${userDeals.length} deals...`);
      
      for (const deal of userDeals) {
        console.log(`   Deleting deal: ${deal.propertyAddress}`);
        await api.deleteDeal(deal.id, userId);
      }
      console.log(`✅ All deals deleted successfully`);
      
      await api.deleteUser(userId);
      console.log(`✅ User document deleted from Firestore`);
      
      setUsers(prev => prev.filter(u => u.id !== userId));
      setDeals(prev => prev.filter(d => d.userId !== userId));
      
      showNotification('success', `Agent ${user.firstName} ${user.lastName} and all associated data have been permanently removed.`);
    } catch (e: any) {
      console.error('❌ Failed to delete agent:', e);
      showNotification('error', `Failed to delete agent: ${e.message || 'Unknown error'}`);
    } finally {
      setManagingUserId(null);
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
    <div className="max-w-7xl mx-auto space-y-8 pb-10 relative">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-20 right-4 z-50 px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 ${
            notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
            {notification.type === 'success' ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
            <p className="font-medium">{notification.message}</p>
        </div>
      )}

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
                    <th className="p-4 text-center">Actions</th>
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
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          {user.status === 'active' ? (
                            <>
                              <button
                                onClick={() => handleDeactivateAgent(user.id)}
                                disabled={managingUserId === user.id}
                                className="px-2 py-1 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded text-xs font-medium disabled:opacity-50 flex items-center gap-1"
                                title="Deactivate agent (can be reactivated)"
                              >
                                {managingUserId === user.id ? <Loader2 size={12} className="animate-spin" /> : <UserX size={12} />}
                                Deactivate
                              </button>
                              <button
                                onClick={() => handlePermanentlyDelete(user.id)}
                                disabled={managingUserId === user.id}
                                className="px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium disabled:opacity-50 flex items-center gap-1"
                                title="Permanently delete agent and all deals"
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            </>
                          ) : user.status === 'denied' ? (
                            <>
                              <button
                                onClick={() => handleReactivateAgent(user.id)}
                                disabled={managingUserId === user.id}
                                className="px-2 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded text-xs font-medium disabled:opacity-50 flex items-center gap-1"
                                title="Reactivate agent"
                              >
                                {managingUserId === user.id ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
                                Reactivate
                              </button>
                              <button
                                onClick={() => handlePermanentlyDelete(user.id)}
                                disabled={managingUserId === user.id}
                                className="px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium disabled:opacity-50 flex items-center gap-1"
                                title="Permanently delete agent and all deals"
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            </>
                          ) : null}
                        </div>
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
