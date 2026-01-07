
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
import LeaseCalculatorPage from './pages/LeaseCalculatorPage.tsx';
import ContactsPage from './pages/ContactsPage.tsx';
import DealModal from './components/DealModal.tsx';
import AiChatModal from './components/AiChatModal.tsx';
import ConfirmModal from './components/ConfirmModal.tsx';
import { Deal, LeadGenLog, UserAccount, DocumentFile, Contact, ContactInteraction, Task } from './types.ts';
import { api } from './services/firestore.ts';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { isFirebaseInitialized } from './firebase/config.ts';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';

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
            <pre className="bg-slate-100 p-4 rounded text-xs text-left mb-6 overflow-auto max-h-40 text-red-500">{this.state.error?.message}</pre>
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
  const [searchTerm, setSearchTerm] = useState('');
  
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

  const isMockMode = !isFirebaseInitialized();

  useEffect(() => {
    if (currentUser) {
      loadUserData(currentUser.id, currentUser.role === 'admin');
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
      console.error("Critical: Failed to load user data", e); 
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchTerm('');
  };

  const handleLogout = async () => { await api.logout(); setActiveTab('dashboard'); };

  // Handlers
  const handleSaveDeal = async (dealData: Deal) => { 
    if (!currentUser) return; 
    try {
      const payload = { ...dealData, userId: dealData.userId || currentUser.id };
      await api.saveDeal(payload); 
      await loadUserData(currentUser.id, currentUser.role === 'admin'); 
      refreshUser(); 
    } catch (e: any) { alert("Failed to save deal. " + (e.message || "")); }
  };

  const handleDeleteDeal = async (dealId: string) => { 
    if (!currentUser) return; 
    const deal = deals.find(d => d.id === dealId); 
    if (!deal) return; 
    setDeleteConfirmModal({ isOpen: true, dealId: dealId, dealAddress: deal.propertyAddress, hasDocuments: (deal.documents && deal.documents.length > 0) || false, documentCount: deal.documents?.length || 0, isDeleting: false }); 
  };

  const executeDeleteDeal = async () => {
    if (!currentUser || !deleteConfirmModal.dealId) return;
    setDeleteConfirmModal(prev => ({ ...prev, isDeleting: true }));
    const dealToDelete = deals.find(d => d.id === deleteConfirmModal.dealId);
    const ownerId = dealToDelete?.userId || currentUser.id;
    try {
      await api.deleteDeal(deleteConfirmModal.dealId, ownerId);
      await loadUserData(currentUser.id, currentUser.role === 'admin');
      if (selectedDealId === deleteConfirmModal.dealId) { setSelectedDealId(null); setActiveTab('deals'); }
      setDeleteConfirmModal(prev => ({ ...prev, isOpen: false }));
    } catch (error: any) { setDeleteConfirmModal(prev => ({ ...prev, isDeleting: false })); }
  };

  const handleUpdateProfile = async (updatedData: Partial<UserAccount>) => { 
    if (!currentUser) return; 
    await api.updateUserProfile(currentUser.id, updatedData); 
    refreshUser(); 
  };

  const handleSaveContact = async (contact: Contact) => { 
    if (!currentUser) return; 
    try {
      const payload = { ...contact, userId: contact.userId || currentUser.id };
      await api.saveContact(payload); 
      await loadUserData(currentUser.id, currentUser.role === 'admin');
    } catch(e: any) { throw e; }
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
    for (const c of newContacts) { await api.saveContact({ ...c, userId: currentUser.id }); } 
    await loadUserData(currentUser.id, currentUser.role === 'admin');
  };

  const handleAddDocument = async (dealId: string, doc: DocumentFile, file: File) => { 
    if (!currentUser) return; 
    try { await api.saveDocument(dealId, doc, file); await loadUserData(currentUser.id, currentUser.role === 'admin'); } catch (e) { throw e; }
  };

  const handleDeleteDocument = async (dealId: string, docId: string) => { 
    if (!currentUser) return; 
    await api.deleteDocument(dealId, docId); 
    await loadUserData(currentUser.id, currentUser.role === 'admin');
  };

  const handleSaveLog = async (l: LeadGenLog) => {
    if(!currentUser) return;
    const payload = { ...l, userId: l.userId || currentUser.id };
    await api.saveLeadLog(payload);
    loadUserData(currentUser.id, currentUser.role === 'admin');
  };

  const handleDeleteLog = async (id: string) => {
    await api.deleteLeadLog(id);
    setLeadGenLogs(prev => prev.filter(l => l.id !== id));
  };

  const handleTaskComplete = async (task: Task) => {
    if (!currentUser) return;
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const updatedTask = { ...task, status: newStatus } as Task;
    try {
      await api.saveTask(updatedTask);
      if (newStatus === 'completed') {
        const today = new Date().toISOString().split('T')[0];
        const existingLog = leadGenLogs.find(l => l.date === today);
        const logPayload: LeadGenLog = existingLog ? { ...existingLog } : {
          id: Math.random().toString(36).substr(2, 9), userId: currentUser.id, date: today,
          callsMade: 0, lettersSent: 0, socialPosts: 0, targetedEmails: 0, networkingEvents: 0, clientMeetings: 0, referralsGenerated: 0, propertyTours: 0, bovsSubmitted: 0, listingsSigned: 0, offersMade: 0, underContract: 0, closedDeals: 0, closedAmount: 0
        };
        let activityLogged = false;
        if (task.type === 'call') { logPayload.callsMade++; activityLogged = true; }
        else if (task.type === 'email') { logPayload.targetedEmails++; activityLogged = true; }
        else if (task.type === 'meeting') { logPayload.clientMeetings++; activityLogged = true; }
        else if (task.type === 'site-visit') { logPayload.propertyTours++; activityLogged = true; }
        else if (task.type === 'proposal') { logPayload.offersMade++; activityLogged = true; }
        if (activityLogged) await api.saveLeadLog(logPayload);
      }
      loadUserData(currentUser.id, currentUser.role === 'admin');
    } catch (e) { console.error("Task completion error:", e); }
  };

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
        return <DashboardPage activeTab={activeTab} deals={deals} onAddDeal={() => { setDealModalInitialData(null); setIsDealModalOpen(true); }} onDealClick={(id) => { setSelectedDealId(id); setActiveTab('deal-details'); }} onDeleteDeal={handleDeleteDeal} onRouteChange={setActiveTab} onOpenAi={() => setIsChatOpen(true)} onSaveDeal={handleSaveDeal} searchTerm={searchTerm} onTaskComplete={handleTaskComplete} />;
      case 'deal-details':
        const deal = deals.find(d => d.id === selectedDealId);
        if (!deal) return <div className="p-8 text-center">Deal not found. <button onClick={() => setActiveTab('deals')} className="text-blue-600 hover:underline">Return to list</button></div>;
        return <DealDetailsPage deal={deal} onBack={() => setActiveTab('deals')} onUpdateDeal={handleSaveDeal} onEditDeal={() => { setDealModalInitialData(deal); setIsDealModalOpen(true); }} onDeleteDeal={() => handleDeleteDeal(deal.id)} onViewDocuments={() => { setDocumentFilterId(deal.id); setActiveTab('documents'); }} onAddDocument={handleAddDocument} onDeleteDocument={handleDeleteDocument} onTaskComplete={handleTaskComplete} />;
      case 'contacts': return <ContactsPage contacts={contacts} deals={deals} onSaveContact={handleSaveContact} onDeleteContact={handleDeleteContact} onAddInteraction={handleAddInteraction} onLinkDeal={handleLinkDeal} onUnlinkDeal={handleUnlinkDeal} onImportContacts={handleImportContacts} />;
      case 'calculator': return <MortgageCalculatorPage />;
      case 'lease-calculator': return <LeaseCalculatorPage />;
      case 'settings': return <SettingsPage user={currentUser!} onUpdateProfile={handleUpdateProfile} />;
      case 'reports': 
        if (currentUser?.role !== 'admin') return <DashboardPage activeTab="dashboard" deals={deals} onAddDeal={() => setIsDealModalOpen(true)} onDealClick={() => {}} onDeleteDeal={async () => {}} onRouteChange={setActiveTab} onOpenAi={() => setIsChatOpen(true)} onSaveDeal={() => {}} onTaskComplete={handleTaskComplete} />;
        return <ReportsPage deals={deals} users={allUsers} currentUser={currentUser} logs={leadGenLogs} />;
      case 'documents': return <DocumentsPage deals={deals} initialFilterDealId={documentFilterId} onAddDocument={handleAddDocument} onDeleteDocument={handleDeleteDocument} />;
      case 'communications': return <CommunicationsPage user={currentUser} onUpdateUser={handleUpdateProfile} />;
      case 'lead-gen': return <LeadGenPage logs={leadGenLogs} onSaveLog={handleSaveLog} onDeleteLog={handleDeleteLog} />;
      default: return <DashboardPage activeTab="dashboard" deals={deals} onAddDeal={() => { setDealModalInitialData(null); setIsDealModalOpen(true); }} onDealClick={(id) => { setSelectedDealId(id); setActiveTab('deal-details'); }} onDeleteDeal={handleDeleteDeal} onRouteChange={setActiveTab} onOpenAi={() => setIsChatOpen(true)} onSaveDeal={handleSaveDeal} searchTerm={searchTerm} onTaskComplete={handleTaskComplete} />;
    }
  };

  return (
    <Routes>
      <Route path="/login" element={!currentUser ? <AuthPage onLogin={() => refreshUser()} /> : <Navigate to="/" />} />
      <Route path="/*" element={currentUser ? (
          <Layout activeTab={activeTab} setActiveTab={handleTabChange} user={currentUser} onLogout={handleLogout} searchTerm={searchTerm} onSearch={setSearchTerm}>
            {isMockMode && (
               <div className="bg-amber-100 text-amber-800 text-xs text-center py-1 font-bold flex items-center justify-center gap-2 print:hidden"><WifiOff size={12} /> Running in Local Demo Mode</div>
            )}
            {renderContent()}
            <DealModal isOpen={isDealModalOpen} onClose={() => setIsDealModalOpen(false)} onSave={handleSaveDeal} initialData={dealModalInitialData} onDelete={handleDeleteDeal} contacts={contacts} />
            <AiChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} currentUser={currentUser} deals={deals} contacts={contacts} />
            <ConfirmModal isOpen={deleteConfirmModal.isOpen} onClose={() => { if(!deleteConfirmModal.isDeleting) setDeleteConfirmModal(prev => ({...prev, isOpen: false})); }} onConfirm={executeDeleteDeal} title="Delete Deal" message={deleteConfirmModal.hasDocuments ? "Warning: This deal contains documents that will also be deleted." : "Are you sure you want to delete this deal?"} confirmText={deleteConfirmModal.isDeleting ? "Deleting..." : "Delete"} isLoading={deleteConfirmModal.isDeleting} />
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
