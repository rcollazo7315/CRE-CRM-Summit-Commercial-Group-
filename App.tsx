
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
import { Deal, LeadGenLog, UserAccount } from './types';
import { mockApi } from './services/mockApi';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // -- Data State --
  const [deals, setDeals] = useState<Deal[]>([]);
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]); // For reports
  const [leadGenLogs, setLeadGenLogs] = useState<LeadGenLog[]>([]); // Clean state
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  // -- UI State --
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [dealModalInitialData, setDealModalInitialData] = useState<Deal | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [documentFilterId, setDocumentFilterId] = useState<string | null>(null);

  // -- Initialize App --
  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('summit_currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      setIsAuthenticated(true);
      loadUserData(user.id, user.role === 'admin');
    }
  }, []);

  // -- Task Reminder Interval --
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    
    const checkReminders = async () => {
      // In a real app this would be a backend cron, here we simulate polling
      // Just a placeholder to show where logic goes as requested
      // console.log("Checking for due tasks...");
    };

    const timer = setInterval(checkReminders, 60000); // Check every minute
    return () => clearInterval(timer);
  }, [isAuthenticated, currentUser]);

  const loadUserData = async (userId: string, isAdmin: boolean) => {
    try {
      const userDeals = await mockApi.getDeals(userId, isAdmin);
      setDeals(userDeals);
      
      // Load users for reports/admin views
      if (isAdmin) {
        const users = await mockApi.getUsers();
        setAllUsers(users);
      } else {
        // For agents, we might just want their own stats, but to render the table safely:
        const self = await mockApi.getUsers(); // simplified for mock, fetching all
        setAllUsers(self);
      }
    } catch (e) {
      console.error("Failed to load user data", e);
    }
  };

  const handleLogin = (user: UserAccount) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('summit_currentUser', JSON.stringify(user));
    loadUserData(user.id, user.role === 'admin');
    setActiveTab(user.role === 'admin' ? 'admin-dashboard' : 'dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('summit_currentUser');
    setDeals([]);
  };

  // -- Data Handlers --
  const handleSaveDeal = async (dealData: Deal) => {
    if (!currentUser) return;
    const dealWithUser = { ...dealData, userId: currentUser.id };
    await mockApi.saveDeal(dealWithUser);
    loadUserData(currentUser.id, currentUser.role === 'admin');
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (confirm("Are you sure you want to delete this deal? This action cannot be undone.") && currentUser) {
       await mockApi.deleteDeal(dealId, currentUser.id);
       loadUserData(currentUser.id, currentUser.role === 'admin');
       if (selectedDealId === dealId) {
         setSelectedDealId(null);
         setActiveTab('deals');
       }
    }
  };

  const handleUpdateProfile = async (updatedData: Partial<UserAccount>) => {
    if (!currentUser) return;
    const updatedUser = await mockApi.updateUserProfile(currentUser.id, updatedData);
    setCurrentUser(updatedUser);
    localStorage.setItem('summit_currentUser', JSON.stringify(updatedUser));
  };

  const renderContent = () => {
    // Admin Specific Route
    if (activeTab === 'admin-dashboard' && currentUser?.role === 'admin') {
      return <AdminDashboardPage />;
    }

    // Shared Routes (Agents & Admins)
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
        return <LeadGenPage logs={leadGenLogs} onSaveLog={(l) => setLeadGenLogs([l, ...leadGenLogs])} />;
      default:
        return <DashboardPage activeTab="dashboard" deals={deals} onAddDeal={() => { setDealModalInitialData(null); setIsDealModalOpen(true); }} onDealClick={(id) => { setSelectedDealId(id); setActiveTab('deal-details'); }} onDeleteDeal={handleDeleteDeal} onRouteChange={setActiveTab} onOpenAi={() => setIsChatOpen(true)} />;
    }
  };

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <AuthPage onLogin={handleLogin} /> : <Navigate to="/" />} />
        <Route path="/" element={isAuthenticated && currentUser ? (
            <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={currentUser} onLogout={handleLogout}>
              {renderContent()}
              <DealModal isOpen={isDealModalOpen} onClose={() => setIsDealModalOpen(false)} onSave={handleSaveDeal} initialData={dealModalInitialData} />
              <AiChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
            </Layout>
          ) : <Navigate to="/login" />
        } />
      </Routes>
    </HashRouter>
  );
};

export default App;
