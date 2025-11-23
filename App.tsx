import React, { useState } from 'react';
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
import DealModal from './components/DealModal';
import AiChatModal from './components/AiChatModal';
import { MOCK_DEALS, MOCK_LEAD_GEN_LOGS } from './constants';
import { Deal, DocumentFile, LeadGenLog, UserAccount } from './types';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // -- Mock Database State --
  // In a real app, this would be in a backend database.
  const [users, setUsers] = useState<UserAccount[]>([
    {
      id: 'user-1',
      username: 'amercer',
      email: 'alex.mercer@summitcg.com',
      passwordHash: 'password', // Simulating a hash
      name: 'Alex Mercer',
      phone: '(555) 123-4567',
      licenseNumber: 'CA-DRE-123456',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2.25&w=256&h=256&q=80'
    }
  ]);

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  // -- Global App State --
  const [deals, setDeals] = useState<Deal[]>(MOCK_DEALS);
  const [leadGenLogs, setLeadGenLogs] = useState<LeadGenLog[]>(MOCK_LEAD_GEN_LOGS);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [isGmailConnected, setIsGmailConnected] = useState(false);

  // -- Modal States --
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [dealModalInitialData, setDealModalInitialData] = useState<Deal | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [documentFilterId, setDocumentFilterId] = useState<string | null>(null);

  // -- Auth Handlers --

  const handleLogin = (usernameOrEmail: string, password: string): { success: boolean; message?: string } => {
    const user = users.find(u => 
      (u.username.toLowerCase() === usernameOrEmail.toLowerCase() || 
       u.email.toLowerCase() === usernameOrEmail.toLowerCase()) && 
      u.passwordHash === password // In real app, verify hash
    );

    if (!user) {
      // Generic error for security
      return { success: false, message: 'Invalid username or password.' };
    }

    if (user.status === 'pending') {
      return { success: false, message: 'Your account is pending admin approval. You will receive an email once approved.' };
    }

    if (user.status === 'denied') {
      return { success: false, message: 'Your account request was denied. Please contact administration.' };
    }

    setCurrentUser(user);
    setIsAuthenticated(true);
    return { success: true };
  };

  const handleRegister = (userData: Omit<UserAccount, 'id' | 'status' | 'avatar'>) => {
    const newUser: UserAccount = {
      ...userData,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random`
    };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  };

  // Simulated Admin Action
  const handleSimulateAdminApprove = (username: string) => {
    setUsers(prev => prev.map(u => 
      u.username === username ? { ...u, status: 'active' } : u
    ));
    alert(`Admin has approved user: ${username}. You may now log in.`);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTab('dashboard');
    setIsGmailConnected(false);
  };

  // -- Data Handlers --

  const handleSaveDeal = (dealData: Deal) => {
    const exists = deals.find(d => d.id === dealData.id);
    if (exists) {
      setDeals(deals.map(d => d.id === dealData.id ? dealData : d));
    } else {
      setDeals([dealData, ...deals]);
    }
  };

  const handleDeleteDeal = (dealId: string) => {
    if (window.confirm("Are you sure you want to delete this deal? This action cannot be undone.")) {
      setDeals(prev => prev.filter(d => d.id !== dealId));
      if (selectedDealId === dealId) {
        setSelectedDealId(null);
        setActiveTab('deals');
      }
    }
  };

  const handleDealClick = (dealId: string) => {
    setSelectedDealId(dealId);
    setActiveTab('deal-details');
  };

  const handleEditDeal = (deal: Deal) => {
    setDealModalInitialData(deal);
    setIsDealModalOpen(true);
  };

  const handleAddDealClick = () => {
    setDealModalInitialData(null);
    setIsDealModalOpen(true);
  };

  const handleViewDocuments = (dealId: string) => {
    setDocumentFilterId(dealId);
    setActiveTab('documents');
  };

  const handleUpdateProfile = (updatedProfile: any) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, ...updatedProfile });
      setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, ...updatedProfile } : u));
    }
  };

  const handleAddDocument = (dealId: string, docFile: DocumentFile) => {
    setDeals(prev => prev.map(d => {
      if (d.id === dealId) {
        return { ...d, documents: [docFile, ...d.documents], lastUpdated: new Date().toISOString() };
      }
      return d;
    }));
  };

  const handleDeleteDocument = (dealId: string, docId: string) => {
    setDeals(prev => prev.map(d => {
      if (d.id === dealId) {
        return { ...d, documents: d.documents.filter(doc => doc.id !== docId) };
      }
      return d;
    }));
  };

  const handleSaveLeadGenLog = (log: LeadGenLog) => {
    setLeadGenLogs(prev => {
      const existingIndex = prev.findIndex(l => l.id === log.id);
      if (existingIndex >= 0) {
        const updatedLogs = [...prev];
        updatedLogs[existingIndex] = log;
        return updatedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
      return [log, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
  };

  // -- Routing Logic --

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
      case 'deals':
        return (
          <DashboardPage 
            activeTab={activeTab} 
            deals={deals} 
            onAddDeal={handleAddDealClick}
            onDealClick={handleDealClick}
            onDeleteDeal={handleDeleteDeal}
            onRouteChange={setActiveTab}
            onOpenAi={() => setIsChatOpen(true)}
          />
        );
      case 'deal-details':
        const deal = deals.find(d => d.id === selectedDealId);
        if (!deal) return <div onClick={() => setActiveTab('dashboard')} className="p-8 cursor-pointer text-slate-500">Deal not found or deleted. Return to dashboard.</div>;
        return (
          <DealDetailsPage 
            deal={deal} 
            onBack={() => setActiveTab('deals')} 
            onUpdateDeal={handleSaveDeal}
            onEditDeal={() => handleEditDeal(deal)}
            onDeleteDeal={() => handleDeleteDeal(deal.id)}
            onViewDocuments={() => handleViewDocuments(deal.id)}
          />
        );
      case 'settings':
        return currentUser ? <SettingsPage user={currentUser} onUpdateProfile={handleUpdateProfile} /> : null;
      case 'reports':
        return <ReportsPage deals={deals} />;
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
        return <CommunicationsPage isConnected={isGmailConnected} onConnectGmail={() => setIsGmailConnected(true)} />;
      case 'lead-gen':
        return <LeadGenPage logs={leadGenLogs} onSaveLog={handleSaveLeadGenLog} />;
      default:
        return <DashboardPage activeTab="dashboard" deals={deals} onAddDeal={handleAddDealClick} onDealClick={handleDealClick} onDeleteDeal={handleDeleteDeal} onRouteChange={setActiveTab} onOpenAi={() => setIsChatOpen(true)} />;
    }
  };

  return (
    <HashRouter>
      <Routes>
        <Route 
          path="/login" 
          element={
            !isAuthenticated ? (
              <AuthPage 
                onLogin={handleLogin} 
                onRegister={handleRegister} 
                onSimulateAdminApprove={handleSimulateAdminApprove}
              />
            ) : (
              <Navigate to="/" />
            )
          } 
        />
        <Route 
          path="/" 
          element={
            isAuthenticated && currentUser ? (
              <Layout 
                activeTab={activeTab} 
                setActiveTab={(tab) => {
                  setActiveTab(tab);
                  if (tab === 'documents') setDocumentFilterId('all');
                }}
                user={currentUser}
                onLogout={handleLogout}
              >
                {renderContent()}
                
                <DealModal 
                  isOpen={isDealModalOpen}
                  onClose={() => setIsDealModalOpen(false)}
                  onSave={handleSaveDeal}
                  initialData={dealModalInitialData}
                />
                
                <AiChatModal 
                  isOpen={isChatOpen}
                  onClose={() => setIsChatOpen(false)}
                />
                
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
      </Routes>
    </HashRouter>
  );
};

export default App;