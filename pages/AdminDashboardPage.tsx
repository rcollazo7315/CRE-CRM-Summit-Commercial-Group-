
import React, { useEffect, useState } from 'react';
import { Shield, Users, UserCheck, UserX, FileText, Download, TrendingUp, BarChart3, AlertTriangle } from 'lucide-react';
import { api } from '../services/firestore';
import { UserAccount, Deal } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
    await api.updateUserStatus(userId, 'active');
    loadData();
    alert("User approved.");
  };

  const handleDeny = async (userId: string) => {
    if (confirm("Are you sure you want to deny this user?")) {
      await api.updateUserStatus(userId, 'denied');
      loadData();
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("Summit Commercial Group", 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("Comprehensive Agent Activity Report", 14, 30);
    doc.text(`Generated: ${today}`, 14, 36);

    // Summary Stats
    const totalVolume = deals.reduce((acc, d) => acc + (d.status === 'Completed' ? d.askingPrice : 0), 0);
    const totalCommissions = totalVolume * 0.03; 

    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(14, 45, 180, 25, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Active Agents: ${users.filter(u => u.role === 'agent' && u.status === 'active').length}`, 20, 55);
    doc.text(`Total Closed Volume: $${(totalVolume / 1000000).toFixed(2)}M`, 20, 62);
    doc.text(`Total Commission Revenue: $${(totalCommissions / 1000).toFixed(0)}k`, 100, 62);

    // Agents Performance Table
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Agent Performance Overview", 14, 85);

    const agentTableData = users.filter(u => u.role === 'agent').map(u => [
      `${u.firstName} ${u.lastName}`,
      u.status.toUpperCase(),
      u.stats?.activeDeals || 0,
      u.stats?.closedDeals || 0,
      `$${((u.stats?.totalVolume || 0) / 1000000).toFixed(2)}M`
    ]);

    autoTable(doc, {
      startY: 90,
      head: [['Agent Name', 'Status', 'Active Deals', 'Closed Deals', 'Volume']],
      body: agentTableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] }
    });

    // New Deals Section (Last 30 Days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newDeals = deals.filter(d => new Date(d.createdAt) > thirtyDaysAgo);
    
    // @ts-ignore - autoTable adds lastAutoTable to doc object
    let finalY = doc.lastAutoTable.finalY + 20;
    
    doc.setFontSize(14);
    doc.text("New Deals (Last 30 Days)", 14, finalY);

    const dealsTableData = newDeals.map(d => {
        // Find agent name
        const agent = users.find(u => u.id === d.userId);
        return [
            d.propertyAddress,
            d.propertyType,
            `$${d.askingPrice.toLocaleString()}`,
            agent ? `${agent.firstName} ${agent.lastName}` : 'Unknown'
        ];
    });

    if (dealsTableData.length > 0) {
        autoTable(doc, {
            startY: finalY + 5,
            head: [['Address', 'Type', 'Asking Price', 'Listing Agent']],
            body: dealsTableData,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] } // emerald
        });
    } else {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("No new deals created in the last 30 days.", 14, finalY + 10);
    }

    doc.save(`Summit_Full_Report_${new Date().toISOString().split('T')[0]}.pdf`);
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
        <button onClick={generatePDF} className="bg-summit-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-summit-800 transition-colors">
          <Download size={18} /> Generate Report PDF
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
        <div className="bg-amber-50 border border-amber-100 rounded-xl overflow-hidden">
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
                     <button onClick={() => handleApprove(user.id)} className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 flex items-center gap-1">
                        <UserCheck size={16} /> Approve
                     </button>
                     <button onClick={() => handleDeny(user.id)} className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 flex items-center gap-1">
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
                   <tr key={user.id} className="hover:bg-slate-50">
                      <td className="p-4">
                         <div className="flex items-center gap-3">
                            <img src={user.avatar} className="w-8 h-8 rounded-full bg-slate-200" alt="Avatar" />
                            <span className="font-semibold text-slate-700">{user.firstName} {user.lastName}</span>
                         </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                         <div>{user.email}</div>
                         <div className="text-xs text-slate-400">{user.phone}</div>
                      </td>
                      <td className="p-4">
                         <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
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
