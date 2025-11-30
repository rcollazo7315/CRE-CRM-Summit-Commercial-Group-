
import React, { useState, useEffect } from 'react';
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
import DealModal from './components/DealModal';
import AiChatModal from './components/AiChatModal';
import { Deal, LeadGenLog, UserAccount, DocumentFile } from './types';
import { api } from './services/firestore';
import { AuthProvider, useAuth } from './context/AuthContext';

// Wrapper to handle Auth State Loading
const AppContent: React.FC = () => {
  const { currentUser, loading, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // -- Data State --
  const [deals, setDeals] = useState<Deal[]>([]);
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);
  const [leadGenLogs, setLeadGenLogs] = useState<LeadGenLog[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  // -- UI State --
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [dealModalInitialData, setDealModalInitialData] = useState<Deal | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [documentFilterId, setDocumentFilterId] = useState<string | null>(null);

  // Load Data on User Change
  useEffect(() => {
    if (currentUser) {
      loadUserData(currentUser.id, currentUser.role === 'admin');
    } else {
      setDeals([]);
    }
  }, [currentUser]);

  const loadUserData = async (userId: string, isAdmin: boolean) => {
    try {
      const userDeals = await api.getDeals(userId, isAdmin);
      setDeals(userDeals);
      
      // Load users for reports/admin views
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
    if (!deal) {
        console.log('Deal not found');
        return;
    }
    
    // Check for documents
    const hasDocuments = deal.documents && deal.documents.length > 0;
    
    // Construct appropriate warning message
    const warningMessage = hasDocuments 
        ? `⚠️ WARNING: This deal has ${deal.documents.length} attached document(s).\n\nAre you sure you want to delete "${deal.propertyAddress}"?\n\nThis will:\n- Delete the deal permanently\n- Delete all attached documents\n- Remove from all reports\n- Cannot be undone\n\nType "DELETE" to confirm:`
        : `Are you sure you want to delete "${deal.propertyAddress}"?\n\nThis action cannot be undone.`;
    
    // Ask for confirmation
    const confirmation = hasDocuments 
        ? prompt(warningMessage)
        : confirm(warningMessage);
    
    // Verify confirmation
    if (hasDocuments && confirmation !== 'DELETE') {
        if (confirmation !== null) {
            console.log('Deletion cancelled. You must type "DELETE" to confirm.');
        }
        return;
    }
    
    if (!hasDocuments && !confirmation) {
        return;
    }

    try {
       await api.deleteDeal(dealId, currentUser.id);
       await loadUserData(currentUser.id, currentUser.role === 'admin');
       
       if (selectedDealId === dealId) {
         setSelectedDealId(null);
         setActiveTab('deals');
       }
       // Only alert if we are still on the same view (optional UX choice)
       if (activeTab === 'deal-details') {
          setActiveTab('deals');
       }
    } catch (error: any) {
       console.error("Delete failed", error);
       console.log(`Failed to delete deal: ${error.message}`);
    }
  };

  const handleUpdateProfile = async (updatedData: Partial<UserAccount>) => {
    if (!currentUser) return;
    await api.updateUserProfile(currentUser.id, updatedData);
    refreshUser();
  };

  // Document Handlers
  const handleAddDocument = async (dealId: string, doc: DocumentFile, file: File) => {
    if (!currentUser) return;
    try {
      await api.saveDocument(dealId, doc, file);
      // Reload deals to reflect new document
      await loadUserData(currentUser.id, currentUser.role === 'admin');
    } catch (error) {
      console.error("Failed to save document:", error);
      console.log("Failed to save document. Please ensure you have enabled Firebase Storage in your console.");
    }
  };

  const handleDeleteDocument = async (dealId: string, docId: string) => {
    if (!currentUser) return;
    try {
      await api.deleteDocument(dealId, docId);
      await loadUserData(currentUser.id, currentUser.role === 'admin');
    } catch (error) {
      console.error("Failed to delete document:", error);
      throw error; // Re-throw to let the component handle UI feedback
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-400">Loading SummitCG...</div>;

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
        if (!deal) return <div>Deal not found</div>;
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
            setLeadGenLogs([log, ...leadGenLogs]);
          }
        }} onDeleteLog={(id) => api.deleteLeadLog(id).then(() => setLeadGenLogs(prev => prev.filter(l => l.id !== id)))} />;
      default:
        return <DashboardPage activeTab="dashboard" deals={deals} onAddDeal={() => { setDealModalInitialData(null); setIsDealModalOpen(true); }} onDealClick={(id) => { setSelectedDealId(id); setActiveTab('deal-details'); }} onDeleteDeal={handleDeleteDeal} onRouteChange={setActiveTab} onOpenAi={() => setIsChatOpen(true)} onSaveDeal={handleSaveDeal} />;
    }
  };

  return (
    <Routes>
      <Route path="/login" element={!currentUser ? <AuthPage onLogin={() => {}} /> : <Navigate to="/" />} />
      <Route path="/" element={currentUser ? (
          <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={currentUser} onLogout={handleLogout}>
            {renderContent()}
            <DealModal isOpen={isDealModalOpen} onClose={() => setIsDealModalOpen(false)} onSave={handleSaveDeal} initialData={dealModalInitialData} />
            <AiChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
          </Layout>
        ) : <Navigate to="/login" />
      } />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
