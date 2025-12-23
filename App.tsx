import React, { Component, useState, useEffect, ReactNode, ErrorInfo } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.tsx';
import AuthPage from './pages/AuthPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import DealDetailsPage from './pages/DealDetailsPage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import ReportsPage from './pages/ReportsPage.tsx';
import DocumentsPage from './pages/DocumentsPage.tsx';
import CommunicationsPage from './pages/CommunicationsPage.tsx';
import LeadGenPage from './pages/LeadGenPage.tsx';
import AdminDashboardPage from './pages/AdminDashboardPage.tsx';
import MortgageCalculatorPage from './pages/MortgageCalculatorPage.tsx';
import ContactsPage from './pages/ContactsPage.tsx';
import DealModal from './components/DealModal.tsx';
import AiChatModal from './components/AiChatModal.tsx';
import ConfirmModal from './components/ConfirmModal.tsx';
import { Deal, LeadGenLog, UserAccount, DocumentFile, Contact, ContactInteraction } from './types.ts';
import { api } from './services/firestore.ts';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps { children?: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("Boundary Error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
          <AlertTriangle size={48} className="text-red-500 mb-4" />
          <h2 className="text-xl font-bold">Application Error</h2>
          <button onClick={() => window.location.reload()} className="mt-4 flex items-center gap-2 bg-summit-900 text-white px-4 py-2 rounded">
            <RefreshCw size={16} /> Restart Dashboard
          </button>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

const AppContent: React.FC = () => {
  const { currentUser, loading, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);
  const [leadGenLogs, setLeadGenLogs] = useState<LeadGenLog[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [dealModalInitialData, setDealModalInitialData] = useState<Deal | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [documentFilterId, setDocumentFilterId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState({isOpen: false, dealId: '', address: ''});

  useEffect(() => {
    if (currentUser) {
      loadWorkspace(currentUser.id, currentUser.role === 'admin');
    }
  }, [currentUser]);

  const loadWorkspace = async (userId: string, isAdmin: boolean) => {
    try {
      const [uDeals, uContacts, uLogs] = await Promise.all([
        api.getDeals(userId, isAdmin),
        api.getContacts(userId, isAdmin),
        api.getLeadLogs(userId)
      ]);
      setDeals(uDeals);
      setContacts(uContacts);
      setLeadGenLogs(uLogs);
      if (isAdmin) setAllUsers(await api.getUsers());
    } catch (e) { console.error("Workspace Load Error:", e); }
  };

  const handleLogout = async () => { await api.logout(); window.location.reload(); };

  if (loading) return null;

  const renderView = () => {
    if (activeTab === 'admin-dashboard' && currentUser?.role === 'admin') return <AdminDashboardPage />;
    switch (activeTab) {
      case 'dashboard': case 'deals': case 'closed-deals':
        return <DashboardPage activeTab={activeTab} deals={deals} onAddDeal={() => { setDealModalInitialData(null); setIsDealModalOpen(true); }} onDealClick={(id) => { setSelectedDealId(id); setActiveTab('deal-details'); }} onDeleteDeal={async (id) => { const d = deals.find(x => x.id === id); if(d) setDeleteConfirm({isOpen: true, dealId: id, address: d.propertyAddress}) }} onRouteChange={setActiveTab} onOpenAi={() => setIsChatOpen(true)} onSaveDeal={async (d) => { await api.saveDeal({...d, userId: currentUser!.id}); loadWorkspace(currentUser!.id, currentUser!.role === 'admin'); }} />;
      case 'deal-details':
        const deal = deals.find(d => d.id === selectedDealId);
        if (!deal) return <div className="p-12 text-center text-slate-500">Deal not found. Please refresh.</div>;
        return <DealDetailsPage deal={deal} onBack={() => setActiveTab('deals')} onUpdateDeal={async (d) => { await api.saveDeal(d); loadWorkspace(currentUser!.id, currentUser!.role === 'admin'); }} onEditDeal={() => { setDealModalInitialData(deal); setIsDealModalOpen(true); }} onDeleteDeal={() => setDeleteConfirm({isOpen: true, dealId: deal.id, address: deal.propertyAddress})} onViewDocuments={() => { setDocumentFilterId(deal.id); setActiveTab('documents'); }} onAddDocument={api.saveDocument} onDeleteDocument={api.deleteDocument} />;
      case 'contacts': return <ContactsPage contacts={contacts} deals={deals} onSaveContact={async (c) => { await api.saveContact({...c, userId: currentUser!.id}); loadWorkspace(currentUser!.id, currentUser!.role === 'admin'); }} onDeleteContact={async (id) => { await api.deleteContact(id); loadWorkspace(currentUser!.id, currentUser!.role === 'admin'); }} onAddInteraction={api.addContactInteraction} onLinkDeal={api.linkContactToDeal} onUnlinkDeal={api.unlinkContactFromDeal} onImportContacts={async (l) => { for(const c of l) await api.saveContact({...c, userId: currentUser!.id}); loadWorkspace(currentUser!.id, currentUser!.role === 'admin'); }} />;
      case 'calculator': return <MortgageCalculatorPage />;
      case 'settings': return <SettingsPage user={currentUser!} onUpdateProfile={async (u) => { await api.updateUserProfile(currentUser!.id, u); refreshUser(); }} />;
      case 'reports': return <ReportsPage deals={deals} users={allUsers} currentUser={currentUser} />;
      case 'documents': return <DocumentsPage deals={deals} initialFilterDealId={documentFilterId} onAddDocument={api.saveDocument} onDeleteDocument={api.deleteDocument} />;
      case 'communications': return <CommunicationsPage user={currentUser} onUpdateUser={async (u) => { await api.updateUserProfile(currentUser!.id, u); refreshUser(); }} />;
      case 'lead-gen': return <LeadGenPage logs={leadGenLogs} onSaveLog={async (l) => { if(currentUser) { await api.saveLeadLog({...l, userId: currentUser.id}); loadWorkspace(currentUser.id, currentUser.role === 'admin'); } }} onDeleteLog={async (id) => { await api.deleteLeadLog(id); if(currentUser) loadWorkspace(currentUser.id, currentUser.role === 'admin'); }} />;
      default: return <DashboardPage activeTab="dashboard" deals={deals} onAddDeal={() => setIsDealModalOpen(true)} onDealClick={setSelectedDealId} onDeleteDeal={async () => {}} onRouteChange={setActiveTab} onOpenAi={() => setIsChatOpen(true)} onSaveDeal={() => {}} />;
    }
  };

  return (
    <Routes>
      <Route path="/login" element={!currentUser ? <AuthPage onLogin={() => {}} /> : <Navigate to="/" />} />
      <Route path="/*" element={currentUser ? (
          <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={currentUser} onLogout={handleLogout}>
            {renderView()}
            <DealModal isOpen={isDealModalOpen} onClose={() => setIsDealModalOpen(false)} onSave={async (d) => { await api.saveDeal({...d, userId: currentUser.id}); loadWorkspace(currentUser.id, currentUser.role === 'admin'); }} initialData={dealModalInitialData} />
            <AiChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
            <ConfirmModal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({...deleteConfirm, isOpen: false})} onConfirm={async () => { await api.deleteDeal(deleteConfirm.dealId, currentUser.id); setDeleteConfirm({isOpen: false, dealId: '', address: ''}); loadWorkspace(currentUser.id, currentUser.role === 'admin'); }} title="Delete Deal" message={`Permanently remove ${deleteConfirm.address}?`} />
          </Layout>
        ) : <Navigate to="/login" />
      } />
    </Routes>
  );
};

const App: React.FC = () => { return <ErrorBoundary><AuthProvider><HashRouter><AppContent /></HashRouter></AuthProvider></ErrorBoundary>; };
export default App;