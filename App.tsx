import React, { Component, useState, useEffect, ErrorInfo, ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import DealDetailsPage from './pages/DealDetailsPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import DocumentsPage from './pages/DocumentsPage';
import CommunicationsPage from './pages/CommunicationsPage';
import LeadGenPage from './pages/LeadGenPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import MortgageCalculatorPage from './pages/MortgageCalculatorPage';
import ContactsPage from './pages/ContactsPage';
import DealModal from './components/DealModal';
import AiChatModal from './components/AiChatModal';
import ConfirmModal from './components/ConfirmModal';
import { Deal, LeadGenLog, UserAccount, DocumentFile, Contact, ContactInteraction } from './types';
import { api } from './services/firestore';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-slate-500 mb-6 text-sm">
              The application encountered an unexpected error. Please try refreshing the page.
            </p>
            <div className="bg-slate-100 p-3 rounded text-xs font-mono text-left mb-6 overflow-auto max-h-32 text-red-800">
              {this.state.error?.message}
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-summit-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-summit-800 flex items-center justify-center gap-2 w-full transition-colors"
            >
              <RefreshCw size={16} /> Reload Page
            </button>
          </div>
        </div>
      );
    }

    return (this.props as any).children;
  }
}

// --- Main App Logic ---
const AppContent: React.FC = () => {
  const { currentUser, loading, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // -- Data State --
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);
  const [leadGenLogs, setLeadGenLogs] = useState<LeadGenLog[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  // -- UI State --
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [dealModalInitialData, setDealModalInitialData] = useState<Deal | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [documentFilterId, setDocumentFilterId] = useState<string | null>(null);

  // -- Delete Confirmation State --
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    dealId: string | null;
    dealAddress: string;
    hasDocuments: boolean;
    documentCount: number;
    isDeleting: boolean;
  }>({
    isOpen: false,
    dealId: null,
    dealAddress: '',
    hasDocuments: false,
    documentCount: 0,
    isDeleting: false
  });

  // Load Data on User Change
  useEffect(() => {
    if (currentUser) {
      loadUserData(currentUser.id, currentUser.role === 'admin');
    } else {
      setDeals([]);
      setContacts([]);
    }
  }, [currentUser]);

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
    } catch (e) {
      console.error("Failed to load user data", e);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setActiveTab('dashboard');
  };

  // -- Data Handlers --
  const handleSaveDeal = async (dealData: Deal) => {
    if (!currentUser) return;
    const dealWithUser = { ...dealData, userId: currentUser.id };
    await api.saveDeal(dealWithUser);
    await loadUserData(currentUser.id, currentUser.role === 'admin');
    refreshUser();
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (!currentUser) return;
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;
    
    setDeleteConfirmModal({
      isOpen: true,
      dealId: dealId,
      dealAddress: deal.propertyAddress,
      hasDocuments: (deal.documents && deal.documents.length > 0) || false,
      documentCount: deal.documents?.length || 0,
      isDeleting: false
    });
  };

  const executeDeleteDeal = async () => {
    if (!currentUser || !deleteConfirmModal.dealId) return;
    setDeleteConfirmModal(prev => ({ ...prev, isDeleting: true }));

    try {
      await api.deleteDeal(deleteConfirmModal.dealId, currentUser.id);
      await loadUserData(currentUser.id, currentUser.role === 'admin');
      
      if (selectedDealId === deleteConfirmModal.dealId) {
        setSelectedDealId(null);
        setActiveTab('deals');
      }
      if (activeTab === 'deal-details') {
        setActiveTab('deals');
      }
      
      closeDeleteModal();
    } catch (error: any) {
      console.error("Delete failed:", error);
      alert("Failed to delete deal: " + error.message);
      setDeleteConfirmModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const closeDeleteModal = () => {
    if (!deleteConfirmModal.isDeleting) {
      setDeleteConfirmModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleUpdateProfile = async (updatedData: Partial<UserAccount>) => {
    if (!currentUser) return;
    await api.updateUserProfile(currentUser.id, updatedData);
    refreshUser();
  };

  // Contact Handlers
  const handleSaveContact = async (contact: Contact) => {
    if (!currentUser) return;
    const contactWithUser = { ...contact, userId: currentUser.id };
    await api.saveContact(contactWithUser);
    await loadUserData(currentUser.id, currentUser.role === 'admin');
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!currentUser) return;
    await api.deleteContact(contactId);
    await loadUserData(currentUser.id, currentUser.role === 'admin');
  };

  const handleAddInteraction = async (contactId: string, interaction: ContactInteraction) => {
    if (!currentUser) return;
    await api.addContactInteraction(contactId, interaction);
    await loadUserData(currentUser.id, currentUser.role === 'admin');
  };

  const handleLinkDeal = async (contactId: string, dealId: string) => {
    if (!currentUser) return;
    await api.linkContactToDeal(contactId, dealId);
    await loadUserData(currentUser.id, currentUser.role === 'admin');
  };

  const handleUnlinkDeal = async (contactId: string, dealId: string) => {
    if (!currentUser) return;
    await api.unlinkContactFromDeal(contactId, dealId);
    await loadUserData(currentUser.id, currentUser.role === 'admin');
  };

  const handleImportContacts = async (newContacts: Contact[]) => {
    if (!currentUser) return;
    for (const c of newContacts) {
      await api.saveContact({ ...c, userId: currentUser.id });
    }
    await loadUserData(currentUser.id, currentUser.role === 'admin');
  };

  // Document Handlers
  const handleAddDocument = async (dealId: string, doc: DocumentFile, file: File) => {
    if (!currentUser) return;
    await api.saveDocument(dealId, doc, file);
    await loadUserData(currentUser.id, currentUser.role === 'admin');
  };

  const handleDeleteDocument = async (dealId: string, docId: string) => {
    if (!currentUser) return;
    await api.deleteDocument(dealId, docId);
    await loadUserData(currentUser.id, currentUser.role === 'admin');
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-400">
      <div className="w-10 h-10 border-4 border-summit-900 border-t-transparent rounded-full animate-spin mb-4"></div>
      Loading SummitCG...
    </div>
  );

  const renderContent = () => {
    if (activeTab === 'admin-dashboard' && currentUser?.role === 'admin') {
      return <AdminDashboardPage />;
    }

    switch (activeTab) {
      case 'dashboard':
      case 'deals':
      case 'closed-deals':
        return (
          <DashboardPage 
            activeTab={activeTab} 
            deals={deals} 
            onAddDeal={() => { setDealModalInitialData(null); setIsDealModalOpen(true); }}
            onDealClick={(id) => { setSelectedDealId(id); setActiveTab('deal-details'); }}
            onDeleteDeal={handleDeleteDeal}
            onRouteChange={setActiveTab}
            onOpenAi={() => setIsChatOpen(true)}
            onSaveDeal={handleSaveDeal}
          />
        );
      case 'deal-details':
        const deal = deals.find(d => d.id === selectedDealId);
        if (!deal) return <div className="p-8 text-center text-slate-500">Deal not found. It may have been deleted.</div>;
        return (
          <DealDetailsPage 
            deal={deal} 
            onBack={() => setActiveTab('deals')} 
            onUpdateDeal={handleSaveDeal}
            onEditDeal={() => { setDealModalInitialData(deal); setIsDealModalOpen(true); }}
            onDeleteDeal={() => handleDeleteDeal(deal.id)}
            onViewDocuments={() => { setDocumentFilterId(deal.id); setActiveTab('documents'); }}
            onAddDocument={handleAddDocument}
            onDeleteDocument={handleDeleteDocument}
          />
        );
      case 'contacts':
        return (
          <ContactsPage 
            contacts={contacts}
            deals={deals}
            onSaveContact={handleSaveContact}
            onDeleteContact={handleDeleteContact}
            onAddInteraction={handleAddInteraction}
            onLinkDeal={handleLinkDeal}
            onUnlinkDeal={handleUnlinkDeal}
            onImportContacts={handleImportContacts}
          />
        );
      case 'calculator':
        return <MortgageCalculatorPage />;
      case 'settings':
        return <SettingsPage user={currentUser!} onUpdateProfile={handleUpdateProfile} />;
      case 'reports':
        return <ReportsPage deals={deals} users={allUsers} currentUser={currentUser} />;
      case 'documents':
        return (
          <DocumentsPage 
            deals={deals} 
            initialFilterDealId={documentFilterId} 
            onAddDocument={handleAddDocument} 
            onDeleteDocument={handleDeleteDocument} 
          />
        );
      case 'communications':
        return <CommunicationsPage user={currentUser} onUpdateUser={handleUpdateProfile} />;
      case 'lead-gen':
        return <LeadGenPage logs={leadGenLogs} onSaveLog={(l) => {
          if(currentUser) {
            const log = { ...l, userId: currentUser.id };
            api.saveLeadLog(log);
            setLeadGenLogs(prev => [log, ...prev]);
          }
        }} onDeleteLog={(id) => api.deleteLeadLog(id).then(() => setLeadGenLogs(prev => prev.filter(l => l.id !== id)))} />;
      default:
        return <DashboardPage activeTab="dashboard" deals={deals} onAddDeal={() => { setDealModalInitialData(null); setIsDealModalOpen(true); }} onDealClick={(id) => { setSelectedDealId(id); setActiveTab('deal-details'); }} onDeleteDeal={handleDeleteDeal} onRouteChange={setActiveTab} onOpenAi={() => setIsChatOpen(true)} onSaveDeal={handleSaveDeal} />;
    }
  };

  return (
    <Routes>
      <Route path="/login" element={!currentUser ? <AuthPage onLogin={() => {}} /> : <Navigate to="/" />} />
      <Route path="/*" element={currentUser ? (
          <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={currentUser} onLogout={handleLogout}>
            {renderContent()}
            <DealModal 
              isOpen={isDealModalOpen} 
              onClose={() => setIsDealModalOpen(false)} 
              onSave={handleSaveDeal} 
              initialData={dealModalInitialData}
              onDelete={handleDeleteDeal}
            />
            <AiChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
            <ConfirmModal
              isOpen={deleteConfirmModal.isOpen}
              onClose={closeDeleteModal}
              onConfirm={executeDeleteDeal}
              title="Delete Deal"
              message={deleteConfirmModal.hasDocuments 
                ? `⚠️ WARNING: This deal has ${deleteConfirmModal.documentCount} attached document(s).\n\nAre you sure you want to delete "${deleteConfirmModal.dealAddress}"?\n\nThis will:\n• Delete the deal permanently\n• Delete all attached documents\n• Remove from all reports\n• Cannot be undone`
                : `Are you sure you want to delete "${deleteConfirmModal.dealAddress}"?\n\nThis action cannot be undone.`
              }
              confirmText={deleteConfirmModal.isDeleting ? "Deleting..." : "Delete Deal"}
              cancelText="Cancel"
              variant="danger"
              requireTextConfirmation={deleteConfirmModal.hasDocuments}
              textConfirmationWord="DELETE"
              isLoading={deleteConfirmModal.isDeleting}
            />
          </Layout>
        ) : <Navigate to="/login" />
      } />
    </Routes>
  );
};

// --- App Root ---
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