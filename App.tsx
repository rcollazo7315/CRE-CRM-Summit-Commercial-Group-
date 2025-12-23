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
import { Deal, Contact, UserAccount, DocumentFile, ContactInteraction, LeadGenLog } from './types.ts';
import { api } from './services/firestore.ts';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean}> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("App Crash:", error, errorInfo); }
  render() {
    if (this.state.hasError) return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertTriangle size={64} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Transaction Hub Error</h2>
        <p className="text-slate-500 max-w-md mb-6">The application encountered an unexpected runtime failure.</p>
        <button onClick={() => window.location.reload()} className="flex items-center gap-2 bg-summit-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-summit-800 transition-all">
          <RefreshCw size={20} /> Reload Portal
        </button>
      </div>
    );
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
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{isOpen: boolean; dealId: string | null; dealAddress: string; isDeleting: boolean;}>({isOpen: false, dealId: null, dealAddress: '', isDeleting: false});

  useEffect(() => {
    if (currentUser) {
      loadWorkspace();
    }
  }, [currentUser]);

  const loadWorkspace = async () => {
    if (!currentUser) return;
    try {
      const [uDeals, uContacts, uLogs] = await Promise.all([
        api.getDeals(currentUser.id, currentUser.role === 'admin'),
        api.getContacts(currentUser.id, currentUser.role === 'admin'),
        api.getLeadLogs(currentUser.id)
      ]);
      setDeals(uDeals);
      setContacts(uContacts);
      setLeadGenLogs(uLogs);
      if (currentUser.role === 'admin') {
        const users = await api.getUsers();
        setAllUsers(users);
      }
    } catch (e) { console.error("Workspace load failed:", e); }
  };

  if (loading) return null;

  const renderView = () => {
    if (activeTab === 'admin-dashboard' && currentUser?.role === 'admin') return <AdminDashboardPage />;
    switch (activeTab) {
      case 'dashboard': case 'deals': case 'closed-deals':
        return <DashboardPage activeTab={activeTab} deals={deals} onAddDeal={() => { setDealModalInitialData(null); setIsDealModalOpen(true); }} onDealClick={id => { setSelectedDealId(id); setActiveTab('deal-details'); }} onDeleteDeal={async (id) => { const deal = deals.find(d => d.id === id); setDeleteConfirmModal({ isOpen: true, dealId: id, dealAddress: deal?.propertyAddress || '', isDeleting: false }); }} onRouteChange={setActiveTab} onOpenAi={() => setIsChatOpen(true)} onSaveDeal={d => api.saveDeal(d).then(loadWorkspace)} />;
      case 'deal-details':
        const deal = deals.find(d => d.id === selectedDealId);
        return deal ? <DealDetailsPage deal={deal} onBack={() => setActiveTab('deals')} onUpdateDeal={d => api.saveDeal(d).then(loadWorkspace)} onEditDeal={() => { setDealModalInitialData(deal); setIsDealModalOpen(true); }} onDeleteDeal={() => setDeleteConfirmModal({ isOpen: true, dealId: deal.id, dealAddress: deal.propertyAddress, isDeleting: false })} onViewDocuments={() => setActiveTab('documents')} onAddDocument={api.saveDocument} onDeleteDocument={api.deleteDocument} /> : <div className="p-20 text-center text-slate-400">Transaction record not found.</div>;
      case 'contacts':
        return <ContactsPage contacts={contacts} deals={deals} onSaveContact={c => api.saveContact({...c, userId: currentUser!.id}).then(loadWorkspace)} onDeleteContact={id => api.deleteContact(id).then(loadWorkspace)} onAddInteraction={api.addContactInteraction} onLinkDeal={api.linkContactToDeal} onUnlinkDeal={api.unlinkContactFromDeal} onImportContacts={async (list) => { for(const c of list) { await api.saveContact({...c, userId: currentUser!.id}); } loadWorkspace(); }} />;
      case 'calculator': return <MortgageCalculatorPage />;
      case 'settings': return <SettingsPage user={currentUser!} onUpdateProfile={u => api.updateUserProfile(currentUser!.id, u).then(refreshUser)} />;
      case 'documents': return <DocumentsPage deals={deals} onAddDocument={api.saveDocument} onDeleteDocument={api.deleteDocument} />;
      case 'communications': return <CommunicationsPage user={currentUser} onUpdateUser={u => api.updateUserProfile(currentUser!.id, u).then(refreshUser)} />;
      case 'lead-gen':
        return <LeadGenPage logs={leadGenLogs} onSaveLog={l => api.saveLeadLog({...l, userId: currentUser!.id}).then(loadWorkspace)} onDeleteLog={id => api.deleteLeadLog(id).then(loadWorkspace)} />;
      case 'reports':
        return <ReportsPage deals={deals} users={allUsers} currentUser={currentUser} />;
      default: return <DashboardPage activeTab="dashboard" deals={deals} onAddDeal={() => setIsDealModalOpen(true)} onDealClick={() => {}} onDeleteDeal={async () => {}} onRouteChange={setActiveTab} onOpenAi={() => setIsChatOpen(true)} onSaveDeal={() => {}} />;
    }
  };

  return (
    <Routes>
      <Route path="/login" element={!currentUser ? <AuthPage onLogin={() => {}} /> : <Navigate to="/" />} />
      <Route path="/*" element={currentUser ? (
          <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={currentUser} onLogout={() => api.logout().then(() => window.location.reload())}>
            {renderView()}
            <DealModal isOpen={isDealModalOpen} onClose={() => setIsDealModalOpen(false)} onSave={d => api.saveDeal({...d, userId: currentUser.id}).then(loadWorkspace)} initialData={dealModalInitialData} />
            <AiChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
            <ConfirmModal isOpen={deleteConfirmModal.isOpen} onClose={() => setDeleteConfirmModal(prev => ({...prev, isOpen: false}))} onConfirm={async () => { if(!deleteConfirmModal.dealId) return; setDeleteConfirmModal(p => ({...p, isDeleting: true})); await api.deleteDeal(deleteConfirmModal.dealId, currentUser.id); loadWorkspace(); setDeleteConfirmModal(p => ({...p, isOpen: false})); }} title="Confirm Deletion" message={`Are you sure you want to delete ${deleteConfirmModal.dealAddress}? This will also remove all associated tasks and files.`} isLoading={deleteConfirmModal.isDeleting} />
          </Layout>
        ) : <Navigate to="/login" />
      } />
    </Routes>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <AuthProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </AuthProvider>
  </ErrorBoundary>
);
export default App;