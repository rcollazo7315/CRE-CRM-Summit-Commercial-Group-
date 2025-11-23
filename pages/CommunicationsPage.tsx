import React, { useState } from 'react';
import { Mail, Plus, Filter, Star, Search, X, Send, Link2, CheckCircle, Loader2 } from 'lucide-react';
import { EmailMessage } from '../types';
import { MOCK_EMAILS } from '../constants';

interface CommunicationsPageProps {
  isConnected: boolean;
  onConnectGmail: () => void;
}

const CommunicationsPage: React.FC<CommunicationsPageProps> = ({ isConnected, onConnectGmail }) => {
  const [emails, setEmails] = useState<EmailMessage[]>(MOCK_EMAILS);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    // Simulate OAuth pop-up delay
    setTimeout(() => {
      setIsConnecting(false);
      onConnectGmail();
      // Add a mock welcome email from Gmail
      setEmails(prev => [{
        id: 'gmail-welcome',
        from: 'Gmail Team',
        subject: 'Security Alert: SummitCG connected',
        preview: 'Summit Commercial Group was granted access to your Google Account...',
        date: 'Just now',
        read: false
      }, ...prev]);
    }, 2000);
  };

  const filteredEmails = emails.filter(e => 
    e.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.from.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCompose = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Email sent successfully! (Simulation)");
    setIsComposing(false);
  };

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="text-center bg-white p-12 rounded-2xl shadow-xl max-w-lg border border-slate-100">
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Connect Your Email</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Integrate your Gmail account to sync correspondence directly with your deal flow. Track emails, schedule follow-ups, and manage communications in one place.
          </p>
          <button 
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full bg-white border border-slate-300 text-slate-700 py-3 rounded-lg font-bold shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-3"
          >
            {isConnecting ? (
              <Loader2 className="animate-spin text-summit-900" />
            ) : (
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            )}
            {isConnecting ? 'Connecting...' : 'Sign in with Google'}
          </button>
          <div className="mt-6 text-xs text-slate-400">
            By connecting, you agree to SummitCG's Privacy Policy and Terms of Service.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex gap-6">
      
      {/* Email List */}
      <div className={`
        bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col transition-all duration-300
        ${selectedEmail ? 'w-1/3 hidden md:flex' : 'w-full'}
      `}>
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex justify-between items-center mb-4">
             <h2 className="font-bold text-slate-800 flex items-center gap-2">
               <Mail size={18} /> Inbox 
               <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                 <CheckCircle size={8} /> Synced
               </span>
             </h2>
             <button 
                onClick={() => setIsComposing(true)}
                className="bg-summit-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-summit-800 transition-colors"
             >
               <Plus size={16} /> Compose
             </button>
          </div>
          <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input 
               type="text" 
               placeholder="Search mail..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-summit-accent"
             />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredEmails.map(email => (
            <div 
              key={email.id} 
              onClick={() => setSelectedEmail(email)}
              className={`
                p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer flex gap-3 transition-colors
                ${!email.read ? 'bg-blue-50/40' : ''}
                ${selectedEmail?.id === email.id ? 'bg-summit-accent/10 border-l-4 border-l-summit-accent' : ''}
              `}
            >
               <div className="pt-1 text-slate-300 hover:text-yellow-400"><Star size={16} /></div>
               <div className="flex-1 min-w-0">
                 <div className="flex justify-between mb-1">
                   <span className={`text-sm truncate ${!email.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                     {email.from}
                   </span>
                   <span className="text-xs text-slate-400 whitespace-nowrap ml-2">{email.date}</span>
                 </div>
                 <div className="text-sm text-slate-800 mb-1 truncate">{email.subject}</div>
                 <div className="text-xs text-slate-500 truncate">{email.preview}</div>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reading Pane */}
      {selectedEmail ? (
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
           <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">{selectedEmail.subject}</h2>
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-summit-100 rounded-full flex items-center justify-center text-summit-900 font-bold">
                     {selectedEmail.from.charAt(0)}
                   </div>
                   <div>
                      <p className="text-sm font-bold text-slate-800">{selectedEmail.from}</p>
                      <p className="text-xs text-slate-500">to me • {selectedEmail.date}</p>
                   </div>
                </div>
              </div>
              <button onClick={() => setSelectedEmail(null)} className="text-slate-400 hover:text-slate-600 md:hidden">
                 <X size={24} />
              </button>
           </div>
           <div className="p-8 flex-1 overflow-y-auto text-slate-700 leading-relaxed whitespace-pre-wrap">
              {selectedEmail.preview}
              <br/><br/>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
              <br/>
              <p>Best regards,</p>
              <p>{selectedEmail.from}</p>
           </div>
           <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button className="bg-summit-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-summit-800 transition-colors flex items-center gap-2">
                 <Send size={16} /> Reply
              </button>
           </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 bg-slate-50 rounded-xl border border-slate-200 border-dashed items-center justify-center text-slate-400 flex-col">
           <Mail size={48} className="mb-4 opacity-20" />
           <p>Select an email to read</p>
        </div>
      )}

      {/* Compose Modal */}
      {isComposing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="p-4 bg-summit-900 text-white flex justify-between items-center">
                 <h3 className="font-bold">New Message</h3>
                 <button onClick={() => setIsComposing(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleCompose} className="p-6 space-y-4">
                 <input type="email" placeholder="To:" className="w-full p-2 border-b border-slate-200 outline-none focus:border-summit-accent" autoFocus />
                 <input type="text" placeholder="Subject:" className="w-full p-2 border-b border-slate-200 outline-none focus:border-summit-accent" />
                 <textarea rows={8} className="w-full p-2 outline-none resize-none" placeholder="Write your message..."></textarea>
                 <div className="flex justify-end pt-2">
                    <button type="submit" className="bg-summit-900 text-white px-6 py-2 rounded-lg hover:bg-summit-800 transition-colors flex items-center gap-2">
                       <Send size={16} /> Send Message
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default CommunicationsPage;
