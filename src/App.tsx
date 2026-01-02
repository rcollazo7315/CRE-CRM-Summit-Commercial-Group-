
import React, { Component, useState, useEffect, ErrorInfo, ReactNode } from 'react';
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
import SetupPage from './pages/SetupPage.tsx'; 
import { Deal, LeadGenLog, UserAccount, DocumentFile, Contact, ContactInteraction } from './types.ts';
import { api } from './services/firestore.ts';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { isFirebaseInitialized, initializationError } from './firebase/config.ts'; 
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps { children?: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: Error | null; }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("Uncaught error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-slate-500 mb-6 text-sm">The application encountered an unexpected error.</p>
            <pre className="bg-slate-100 p-4 rounded text-xs text-left mb-6 overflow-auto max-h-40">{this.state.error?.message}</pre>
            <button onClick={() => window.location.reload()} className="bg-summit-900 text-white px-6 py-2 rounded-lg font-medium flex items-center justify-center gap-2 w-full"><RefreshCw size={16} /> Reload Page</button>
          </div>
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
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{isOpen: boolean; dealId: string | null; dealAddress: string; hasDocuments: boolean; documentCount: number; isDeleting: boolean;}>({isOpen: false, dealId: null, dealAddress: '', hasDocuments: false, documentCount: 0, isDeleting: false});

  const firebaseReady = isFirebaseInitialized();

  console.log("[AppContent] Render - firebaseReady:", firebaseReady, "loading:", loading, "currentUser:", currentUser?.id);

  useEffect(() => {
    if (firebaseReady && currentUser) {
      loadUserData(currentUser.id, currentUser.role === 'admin');
    }
  }, [currentUser, firebaseReady]);

  const loadUserData = async (userId: string, isAdmin: boolean) => {
    try {
      const userDeals = await api.getDeals(userId, isAdmin);
      setDeals(userDeals);
      const userContacts = await api.getContacts(userId, isAdmin);
      setContacts(userContacts);
      const userLogs = await api.getLeadLogs(userId);
      setLeadGenLogs(userLogs);
      if (isAdmin) {
        const users = await api.getUsers();
        setAllUsers(users);
      } else {
        const self = await api.getCurrentUser(userId);
        if(self) setAllUsers([self]);
      }
    } catch (e) { console.error("Failed to load user data", e); }
  };

  const handleLogout = async () => { await api.logout(); setActiveTab('dashboard'); };
  const handleSaveDeal = async (dealData: Deal) => { if (!currentUser) return; await api.saveDeal({ ...dealData, userId: currentUser.id }); await loadUserData(currentUser.id, currentUser.role === 'admin'); refreshUser(); };
  const handleDeleteDeal = async (dealId: string) => { 
    if (!currentUser) return; 
    const deal = deals.find(d => d.id === dealId); 
    if (!deal) return; 
    setDeleteConfirmModal({ isOpen: true, dealId: dealId, dealAddress: deal.propertyAddress, hasDocuments: (deal.documents && deal.documents.length > 0) || false, documentCount: deal.documents?.length || 0, isDeleting: false }); 
  };
  const executeDeleteDeal = async () => {
    if (!currentUser || !deleteConfirmModal.dealId) return;
    setDeleteConfirmModal(prev => ({ ...prev, isDeleting: true }));
    try {
      await api.deleteDeal(deleteConfirmModal.dealId, currentUser.id);
      await loadUserData(currentUser.id, currentUser.role === 'admin');
      if (selectedDealId === deleteConfirmModal.dealId) { setSelectedDealId(null); setActiveTab('deals'); }
      setDeleteConfirmModal(prev => ({ ...prev, isOpen: false }));
    } catch (error: any) { console.error(error); alert("Delete failed"); setDeleteConfirmModal(prev => ({ ...prev, isDeleting: false })); }
  };
  const closeDeleteModal = () => { if (!deleteConfirmModal.isDeleting) setDeleteConfirmModal(prev => ({ ...prev, isOpen: false })); };
  const handleUpdateProfile = async (updatedData: Partial<UserAccount>) => { if (!currentUser) return; await api.updateUserProfile(currentUser.id, updatedData); refreshUser(); };
  const handleSaveContact = async (contact: Contact) => { if (!currentUser) return; await api.saveContact({ ...contact, userId: currentUser.id }); await loadUserData(currentUser.id, currentUser.role === 'admin'); };
  const handleDeleteContact = async (contactId: string) => { if (!currentUser) return; await api.deleteContact(contactId); await loadUserData(currentUser.id, currentUser.role === 'admin'); };
  const handleAddInteraction = async (contactId: string, interaction: ContactInteraction) => { if (!currentUser) return; await api.addContactInteraction(contactId, interaction); await loadUserData(currentUser.id, currentUser.role === 'admin'); };
  const handleLinkDeal = async (contactId: string, dealId: string) => { if (!currentUser) return; await api.linkContactToDeal(contactId, dealId); await loadUserData(currentUser.id, currentUser.role === 'admin'); };
  const handleUnlinkDeal = async (contactId: string, dealId: string) => { if (!currentUser) return; await api.unlinkContactFromDeal(contactId, dealId); await loadUserData(currentUser.id, currentUser.role === 'admin'); };
  const handleImportContacts = async (newContacts: Contact[]) => { if (!currentUser) return; for (const c of newContacts) { await api.saveContact({ ...c, userId: currentUser.id }); } await loadUserData(currentUser.id, currentUser.role === 'admin'); };
  const handleAddDocument = async (dealId: string, doc: DocumentFile, file: File) => { if (!currentUser) return; await api.saveDocument(dealId, doc, file); await loadUserData(currentUser.id, currentUser.role === 'admin'); };
  const handleDeleteDocument = async (dealId: string, docId: string) => { if (!currentUser) return; await api.deleteDocument(dealId, docId); await loadUserData(currentUser.id, currentUser.role === 'admin'); };

  // Conditional Rendering Logic
  
  // 1. Firebase Missing? -> Setup Page
  if (!firebaseReady) {
    return <SetupPage error={initializationError} />;
  }

  // 2. Auth Loading? -> Spinner
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-summit-900 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Secure Connection...</p>
      </div>
    );
  }

  const renderContent = () => {
    if (activeTab === 'admin-dashboard' && currentUser?.role === 'admin') return <AdminDashboardPage />;
    switch (activeTab) {
      case 'dashboard': case 'deals': case 'closed-deals':
        return <DashboardPage activeTab={activeTab} deals={deals} onAddDeal={() => { setDealModalInitialData(null); setIsDealModalOpen(true); }} onDealClick={(id) => { setSelectedDealId(id); setActiveTab('deal-details'); }} onDeleteDeal={handleDeleteDeal} onRouteChange={setActiveTab} onOpenAi={() => setIsChatOpen(true)} onSaveDeal={handleSaveDeal} />;
      case 'deal-details':
        const deal = deals.find(d => d.id === selectedDealId);
        if (!deal) return <div className="p-8 text-center">Deal not found. <button onClick={() => setActiveTab('deals')} className="text-blue-600 hover:underline">Return to list</button></div>;
        return <DealDetailsPage deal={deal} onBack={() => setActiveTab('deals')} onUpdateDeal={handleSaveDeal} onEditDeal={() => { setDealModalInitialData(deal); setIsDealModalOpen(true); }} onDeleteDeal={() => handleDeleteDeal(deal.id)} onViewDocuments={() => { setDocumentFilterId(deal.id); setActiveTab('documents'); }} onAddDocument={handleAddDocument} onDeleteDocument={handleDeleteDocument} />;
      case 'contacts': return <ContactsPage contacts={contacts} deals={deals} onSaveContact={handleSaveContact} onDeleteContact={handleDeleteContact} onAddInteraction={handleAddInteraction} onLinkDeal={handleLinkDeal} onUnlinkDeal={handleUnlinkDeal} onImportContacts={handleImportContacts} />;
      case 'calculator': return <MortgageCalculatorPage />;
      case 'settings': return <SettingsPage user={currentUser!} onUpdateProfile={handleUpdateProfile} />;
      case 'reports': return <ReportsPage deals={deals} users={allUsers} currentUser={currentUser} />;
      case 'documents': return <DocumentsPage deals={deals} initialFilterDealId={documentFilterId} onAddDocument={handleAddDocument} onDeleteDocument={handleDeleteDocument} />;
      case 'communications': return <CommunicationsPage user={currentUser} onUpdateUser={handleUpdateProfile} />;
      case 'lead-gen': return <LeadGenPage logs={leadGenLogs} onSaveLog={(l) => { if(currentUser) { api.saveLeadLog({ ...l, userId: currentUser.id }); setLeadGenLogs(prev => [l, ...prev]); } }} onDeleteLog={(id) => api.deleteLeadLog(id).then(() => setLeadGenLogs(prev => prev.filter(l => l.id !== id)))} />;
      default: return <DashboardPage activeTab="dashboard" deals={deals} onAddDeal={() => { setDealModalInitialData(null); setIsDealModalOpen(true); }} onDealClick={(id) => { setSelectedDealId(id); setActiveTab('deal-details'); }} onDeleteDeal={handleDeleteDeal} onRouteChange={setActiveTab} onOpenAi={() => setIsChatOpen(true)} onSaveDeal={handleSaveDeal} />;
    }
  };

  return (
    <Routes>
      <Route path="/login" element={!currentUser ? <AuthPage onLogin={() => {}} /> : <Navigate to="/" />} />
      <Route path="/*" element={currentUser ? (
          <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={currentUser} onLogout={handleLogout}>
            {renderContent()}
            <DealModal isOpen={isDealModalOpen} onClose={() => setIsDealModalOpen(false)} onSave={handleSaveDeal} initialData={dealModalInitialData} onDelete={handleDeleteDeal} />
            <AiChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
            <ConfirmModal isOpen={deleteConfirmModal.isOpen} onClose={closeDeleteModal} onConfirm={executeDeleteDeal} title="Delete Deal" message={deleteConfirmModal.hasDocuments ? "Warning: This deal contains documents that will also be deleted." : "Are you sure you want to delete this deal?"} confirmText={deleteConfirmModal.isDeleting ? "Deleting..." : "Delete"} isLoading={deleteConfirmModal.isDeleting} />
          </Layout>
        ) : <Navigate to="/login" />
      } />
    </Routes>
  );
};

const App: React.FC = () => { 
  return (
    <ErrorBoundary>
      <AuthProvider>
        <HashRouter>
          <AppContent />
        </HashRouter>
      </AuthProvider>
    </ErrorBoundary>
  ); 
};
export default App;
