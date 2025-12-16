import React from 'react';
import { LayoutDashboard, Building2, FileText, Settings, Bell, Search, LogOut, Menu, X, PieChart, Target, Shield, Calculator, CheckCircle2, Users } from 'lucide-react';
import { UserAccount } from '../types.ts';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: UserAccount;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, user, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const currentNav = activeTab === 'deal-details' ? 'deals' : activeTab;

  const agentNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'deals', label: 'Active Deals', icon: Building2 },
    { id: 'closed-deals', label: 'Closed Deals', icon: CheckCircle2 },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'calculator', label: 'Mortgage Calc', icon: Calculator },
    { id: 'lead-gen', label: 'Log Activity', icon: Target },
    { id: 'reports', label: 'Reports', icon: PieChart },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const navItems = user.role === 'admin' ? [{ id: 'admin-dashboard', label: 'Admin Console', icon: Shield }, ...agentNavItems] : agentNavItems;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      <div className="md:hidden bg-summit-900 text-white p-4 flex justify-between items-center z-50 sticky top-0 print:hidden">
        <div className="font-bold text-xl tracking-tight">Summit<span className="font-light text-summit-accent">CG</span></div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X /> : <Menu />}</button>
      </div>
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-summit-900 text-slate-300 flex flex-col transition-transform duration-300 z-40 print:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b border-slate-700 hidden md:block">
          <div className="font-bold text-2xl text-white tracking-tight cursor-pointer" onClick={() => setActiveTab(user.role === 'admin' ? 'admin-dashboard' : 'dashboard')}>Summit<span className="font-light text-summit-accent">CG</span></div>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{user.role === 'admin' ? 'Admin Portal' : 'Agent Portal'}</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-6">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => (
              <li key={item.id}>
                <button onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }} className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${currentNav === item.id ? 'bg-summit-accent/10 text-summit-accent border-r-2 border-summit-accent' : 'hover:bg-slate-800 hover:text-white'}`}>
                  <item.icon size={20} className="mr-3" /><span className="font-medium">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-4 px-2 cursor-pointer hover:bg-slate-800 p-2 rounded transition-colors" onClick={() => setActiveTab('settings')}>
            <img src={user.avatar || user.profileImage} alt="User" className="w-10 h-10 rounded-full border-2 border-slate-600 object-cover" />
            <div className="overflow-hidden"><p className="text-sm font-semibold text-white truncate">{user.firstName} {user.lastName}</p></div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center justify-center px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"><LogOut size={16} className="mr-2" /> Sign Out</button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-30 print:hidden">
          <div className="flex items-center flex-1 max-w-xl">
            {activeTab === 'admin-dashboard' ? <div className="font-bold text-slate-800 text-lg">Administrator Console</div> : <div className="relative w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-summit-accent outline-none transition-all"/></div>}
          </div>
          <div className="flex items-center gap-4 ml-4"><button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"><Bell size={20} /><span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span></button></div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 print:p-0 print:bg-white print:overflow-visible">{children}</div>
      </main>
    </div>
  );
};
export default Layout;