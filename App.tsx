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
import DealModal from './components/DealModal';
import AiChatModal from './components/AiChatModal';
import { MOCK_DEALS } from './constants';
import { Deal, DocumentFile } from './types';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // -- Global State --
  const [deals, setDeals] = useState<Deal[]>(MOCK_DEALS);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    name: 'Alex Mercer',
    email: 'alex.mercer@summitcg.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2.25&w=256&h=256&q=80',
    phone: '(555) 123-4567',
    bio: 'Senior Commercial Agent specializing in Retail and Office properties.'
  });

  // -- Modal States --
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [dealModalInitialData, setDealModalInitialData] = useState<Deal | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [documentFilterId, setDocumentFilterId] = useState<string | null>(null);

  // -- Handlers --

  const handleLogin = (email: string) => {
    setIsAuthenticated(true);
    setCurrentUser(prev => ({...prev, email: email}));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveTab('dashboard');
  };

  const handleSaveDeal = (dealData: Deal) => {
    // If ID exists in current state, update it. Otherwise add new.
    const exists = deals.find(d => d.id === dealData.id);
    if (exists) {
      setDeals(deals.map(d => d.id === dealData.id ? dealData : d));
    } else {
      setDeals([dealData, ...deals]);
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
    setCurrentUser(prev => ({ ...prev, ...updatedProfile }));
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
            onRouteChange={setActiveTab}
            onOpenAi={() => setIsChatOpen(true)}
          />
        );
      case 'deal-details':
        const deal = deals.find(d => d.id === selectedDealId);
        if (!deal) return <div onClick={() => setActiveTab('dashboard')} className="p-8 cursor-pointer text-slate-500">Deal not found. Return to dashboard.</div>;
        return (
          <DealDetailsPage 
            deal={deal} 
            onBack={() => setActiveTab('deals')} 
            onUpdateDeal={handleSaveDeal}
            onEditDeal={() => handleEditDeal(deal)}
            onViewDocuments={() => handleViewDocuments(deal.id)}
          />
        );
      case 'settings':
        return <SettingsPage user={currentUser} onUpdateProfile={handleUpdateProfile} />;
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
      default:
        return <DashboardPage activeTab="dashboard" deals={deals} onAddDeal={handleAddDealClick} onDealClick={handleDealClick} onRouteChange={setActiveTab} onOpenAi={() => setIsChatOpen(true)} />;
    }
  };

  return (
    <HashRouter>
      <Routes>
        <Route 
          path="/login" 
          element={!isAuthenticated ? <AuthPage onLogin={handleLogin} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <Layout 
                activeTab={activeTab} 
                setActiveTab={(tab) => {
                  setActiveTab(tab);
                  if (tab === 'documents') setDocumentFilterId('all'); // Reset filter if clicking nav directly
                }}
                user={currentUser}
                onLogout={handleLogout}
              >
                {renderContent()}
                
                {/* Global Modals */}
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
