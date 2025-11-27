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
import SetupPage from './pages/SetupPage';
import DealModal from './components/DealModal';
import AiChatModal from './components/AiChatModal';
import { Deal, LeadGenLog, UserAccount } from './types';
import { api } from './services/firestore';
import { AuthProvider, useAuth } from './context/AuthContext';
import { isFirebaseInitialized } from './firebase/config';

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
    loadUserData(currentUser.id, currentUser.role === 'admin');
    refreshUser();
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (confirm("Are you sure you want to delete this deal? This action cannot be undone.") && currentUser) {
       await api.deleteDeal(dealId, currentUser.id);
       loadUserData(currentUser.id, currentUser.role === 'admin');
       if (selectedDealId === dealId) {
         setSelectedDealId(null);
         setActiveTab('deals');
       }
    }
  };

  const handleUpdateProfile = async (updatedData: Partial<UserAccount>) => {
    if (!currentUser) return;
    await api.updateUserProfile(currentUser.id, updatedData);
    refreshUser();
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-400">Loading SummitCG...</div>;

  const renderContent = () => {
    if (activeTab === 'admin-dashboard' && currentUser?.role === 'admin') {
      return <AdminDashboardPage />;
    }

    switch (activeTab) {
      case 'dashboard':
      case 'deals':
        return (
          <DashboardPage 
            activeTab={activeTab} 
            deals={deals} 
            onAddDeal={() => { setDealModalInitialData(null); setIsDealModalOpen(true); }}
            onDealClick={(id) => { setSelectedDealId(id); setActiveTab('deal-details'); }}
            onDeleteDeal={handleDeleteDeal}
            onRouteChange={setActiveTab}
            onOpenAi={() => setIsChatOpen(true)}
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
          />
        );
      case 'calculator':
        return <MortgageCalculatorPage />;
      case 'settings':
        return <SettingsPage user={currentUser!} onUpdateProfile={handleUpdateProfile} />;
      case 'reports':
        return <ReportsPage deals={deals} users={allUsers} currentUser={currentUser} />;
      case 'documents':
        return <DocumentsPage deals={deals} initialFilterDealId={documentFilterId} onAddDocument={() => {}} onDeleteDocument={() => {}} />;
      case 'communications':
        return <CommunicationsPage user={currentUser} onUpdateUser={handleUpdateProfile} />;
      case 'lead-gen':
        return <LeadGenPage logs={leadGenLogs} onSaveLog={(l) => {
          if(currentUser) {
            const log = { ...l, userId: currentUser.id };
            api.saveLeadLog(log);
            setLeadGenLogs([log, ...leadGenLogs]);
          }
        }} />;
      default:
        return <DashboardPage activeTab="dashboard" deals={deals} onAddDeal={() => { setDealModalInitialData(null); setIsDealModalOpen(true); }} onDealClick={(id) => { setSelectedDealId(id); setActiveTab('deal-details'); }} onDeleteDeal={handleDeleteDeal} onRouteChange={setActiveTab} onOpenAi={() => setIsChatOpen(true)} />;
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
  // CRITICAL CHECK: If keys are missing, show Setup Page immediately
  if (!isFirebaseInitialized()) {
    return <SetupPage />;
  }

  return (
    <AuthProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
