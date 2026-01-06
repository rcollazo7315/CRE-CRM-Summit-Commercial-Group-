
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { chatWithAi } from '../services/geminiService.ts';
import { UserAccount, Deal, Contact } from '../types.ts';

interface AiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
  deals?: Deal[];
  contacts?: Contact[];
}

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

const AiChatModal: React.FC<AiChatModalProps> = ({ isOpen, onClose, currentUser, deals = [], contacts = [] }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'model', 
      text: 'Hello! I am your Summit Commercial Assistant. I have access to your deal pipeline and contacts. How can I help you today?',
      timestamp: Date.now() 
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  if (!isOpen) return null;

  const generateContext = () => {
    const activeDeals = deals.filter(d => d.status !== 'Completed' && d.status !== 'Archived');
    const totalVolume = activeDeals.reduce((sum, d) => sum + (d.askingPrice || 0), 0);
    const closedDeals = deals.filter(d => d.status === 'Completed');
    const userName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Agent';
    
    return `
      You are an AI assistant for "Summit Commercial Group", a commercial real estate CRM.
      You are assisting ${userName} (${currentUser?.role || 'Agent'}).
      
      Current CRM Data Snapshot:
      - Active Deals: ${activeDeals.length}
      - Closed Deals (YTD): ${closedDeals.length}
      - Total Active Pipeline Volume: $${totalVolume.toLocaleString()}
      - Total Contacts Database: ${contacts.length}
      
      Guidelines:
      1. Be concise, professional, and confident.
      2. Provide specific advice related to Commercial Real Estate (CRE).
      3. You can summarize the data provided above but do not hallucinate specific deal details if not provided.
      4. If asked about market trends, you can mention you have general knowledge but for real-time specific comps, you'd typically need external tools.
      
      Goal: Help the agent close more deals and manage their relationships effectively.
    `;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setError(null);
    
    // Add user message to UI
    const newHistory = [...messages, { role: 'user' as const, text: userMsg, timestamp: Date.now() }];
    setMessages(newHistory);
    setLoading(true);

    try {
      const systemContext = generateContext();
      
      // Filter history for API (remove timestamps, just role/text)
      const apiHistory = newHistory.slice(0, -1).map(m => ({ role: m.role, text: m.text }));
      
      const responseText = await chatWithAi(userMsg, apiHistory, systemContext);
      
      setMessages(prev => [...prev, { role: 'model', text: responseText, timestamp: Date.now() }]);
    } catch (err: any) {
      console.error("Chat Error:", err);
      setError(err.message || "I encountered an error connecting to the intelligence network.");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
        setError(null);
        setLoading(true);
        const systemContext = generateContext();
        const apiHistory = messages.filter(m => m !== lastUserMessage).map(m => ({ role: m.role, text: m.text }));
        
        chatWithAi(lastUserMessage.text, apiHistory, systemContext)
            .then(responseText => {
                setMessages(prev => [...prev, { role: 'model', text: responseText, timestamp: Date.now() }]);
            })
            .catch(err => {
                setError(err.message || "Retry failed.");
            })
            .finally(() => setLoading(false));
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 h-[600px] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden font-sans animate-in slide-in-from-bottom-10 duration-300">
      <div className="bg-summit-900 p-4 flex justify-between items-center text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/10">
            <Sparkles size={18} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-wide">Summit Intelligence</h3>
            <div className="flex items-center gap-1.5 opacity-80">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-medium uppercase tracking-wider">Gemini 2.0 Flash</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-slate-50 scrollbar-thin scrollbar-thumb-slate-200">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm
              ${msg.role === 'user' ? 'bg-white border border-slate-200 text-slate-600' : 'bg-summit-900 text-white'}
            `}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className="flex flex-col gap-1 max-w-[80%]">
              <div className={`
                p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm
                ${msg.role === 'user' 
                  ? 'bg-white border border-slate-200 text-slate-800 rounded-tr-none' 
                  : 'bg-summit-900 text-slate-100 rounded-tl-none'}
              `}>
                {msg.text}
              </div>
              <span className={`text-[10px] text-slate-400 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex gap-3 animate-pulse">
             <div className="w-8 h-8 rounded-full bg-summit-900 text-white flex items-center justify-center flex-shrink-0">
               <Bot size={14} />
             </div>
             <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
               <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
               <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
             </div>
          </div>
        )}

        {error && (
            <div className="flex flex-col items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl mx-4">
                <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle size={16} />
                    <p className="text-xs font-bold">Connection Error</p>
                </div>
                <p className="text-xs text-red-600 text-center leading-relaxed">{error}</p>
                <button 
                    onClick={handleRetry} 
                    className="flex items-center gap-2 text-xs font-bold bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors shadow-sm"
                >
                    <RefreshCw size={12} /> Try Again
                </button>
            </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200">
        <div className="relative flex items-center">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your deals, contacts, or market..." 
            className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-summit-accent focus:border-summit-accent outline-none text-sm transition-all placeholder:text-slate-400"
            disabled={loading}
          />
          <button 
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 p-2 bg-summit-900 text-white rounded-lg hover:bg-summit-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <div className="text-center mt-2">
            <span className="text-[10px] text-slate-400 font-medium">Powered by Google Gemini</span>
        </div>
      </form>
    </div>
  );
};

export default AiChatModal;
