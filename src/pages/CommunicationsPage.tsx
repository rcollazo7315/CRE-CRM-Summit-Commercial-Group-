
import React, { useState } from 'react';
import { Mail, Plus, Star, Search, X, Send, CheckCircle, Loader2 } from 'lucide-react';
import { UserAccount, EmailMessage } from '../types.ts';
import { MOCK_EMAILS } from '../constants.ts'; 

interface CommunicationsPageProps {
  user: UserAccount | null;
  onUpdateUser: (data: Partial<UserAccount>) => void;
}

const CommunicationsPage: React.FC<CommunicationsPageProps> = ({ user, onUpdateUser }) => {
  const [emails, setEmails] = useState<EmailMessage[]>(MOCK_EMAILS);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    // Simulate OAuth pop-up and token exchange
    setTimeout(() => {
      setIsConnecting(false);
      onUpdateUser({ 
        gmailIntegration: { 
          connected: true, 
          connectedAt: new Date().toISOString() 
        } 
      });
      setEmails(prev => [{
        id: 'gmail-welcome',
        from: 'Google',
        subject: 'Security Alert: SummitCG was granted access to your Google Account',
        preview: 'You granted Summit Commercial Group access to your Gmail...',
        date: 'Just now',
        read: false,
        userId: user?.id || ''
      }, ...prev]);
    }, 2000);
  };

  const handleDisconnect = () => {
    if(confirm('Disconnect Gmail integration?')) {
      onUpdateUser({ gmailIntegration: { connected: false } });
    }
  };

  if (!user?.gmailIntegration?.connected) {
    return (
      <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="text-center bg-white p-12 rounded-2xl shadow-xl max-w-lg border border-slate-100">
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Connect Your Email</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Integrate your Gmail account to sync correspondence directly with your deal flow.
          </p>
          <button 
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full bg-white border border-slate-300 text-slate-700 py-3 rounded-lg font-bold shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-3"
          >
            {isConnecting ? <Loader2 className="animate-spin" /> : <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />}
            {isConnecting ? 'Connecting...' : 'Sign in with Google'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex gap-6">
      {/* Inbox List */}
      <div className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col transition-all duration-300 ${selectedEmail ? 'w-1/3 hidden md:flex' : 'w-full'}`}>
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex justify-between items-center mb-4">
             <h2 className="font-bold text-slate-800 flex items-center gap-2">
               <Mail size={18} /> Inbox 
               <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1"><CheckCircle size={8} /> Synced</span>
             </h2>
             <button onClick={handleDisconnect} className="text-xs text-red-500 hover:underline">Disconnect</button>
          </div>
          <input type="text" placeholder="Search mail..." className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {emails.map(email => (
            <div key={email.id} onClick={() => setSelectedEmail(email)} className={`p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${!email.read ? 'bg-blue-50/40' : ''}`}>
               <div className="flex justify-between mb-1">
                 <span className={`text-sm truncate ${!email.read ? 'font-bold' : ''}`}>{email.from}</span>
                 <span className="text-xs text-slate-400">{email.date}</span>
               </div>
               <div className="text-sm text-slate-800 mb-1 truncate">{email.subject}</div>
               <div className="text-xs text-slate-500 truncate">{email.preview}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Reading Pane */}
      {selectedEmail ? (
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
           <div className="p-6 border-b border-slate-100 flex justify-between">
              <h2 className="text-xl font-bold">{selectedEmail.subject}</h2>
              <button onClick={() => setSelectedEmail(null)} className="md:hidden"><X /></button>
           </div>
           <div className="p-8 flex-1 overflow-y-auto">{selectedEmail.preview}</div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 bg-slate-50 border border-dashed border-slate-200 rounded-xl items-center justify-center text-slate-400">Select an email to read</div>
      )}
    </div>
  );
};

export default CommunicationsPage;
