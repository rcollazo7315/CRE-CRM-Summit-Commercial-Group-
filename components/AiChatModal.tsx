import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2, Sparkles, Globe, ExternalLink } from 'lucide-react';
import { researchMarketContext, GroundingSource } from '../services/geminiService.ts';

interface Message {
  role: 'user' | 'model';
  text: string;
  sources?: GroundingSource[];
}

const AiChatModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello! I am your Summit Assistant. I have live access to Google Search to help with real-time market data, cap rates, and trends. What can I research for you?' }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const result = await researchMarketContext(userMsg);
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: result.text,
        sources: result.sources.length > 0 ? result.sources : undefined
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble searching the web right now." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 h-[550px] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden font-sans">
      <div className="bg-summit-900 p-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
          <div className="bg-summit-accent/20 p-1.5 rounded-lg">
            <Sparkles size={18} className="text-summit-accent" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Summit Live IQ</h3>
            <div className="flex items-center gap-1">
              <Globe size={10} className="text-blue-400" />
              <span className="text-[10px] text-slate-300 uppercase tracking-tight">Search Grounded</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-summit-100 text-summit-900'}`}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'text-right' : ''}`}>
              <div className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-summit-900 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'}`}>
                {msg.text}
              </div>
              {msg.sources && (
                <div className="flex flex-wrap gap-1 mt-1 justify-start">
                  {msg.sources.map((src, sIdx) => (
                    <a key={sIdx} href={src.uri} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] text-summit-900 font-bold hover:bg-slate-50 transition-colors shadow-sm">
                      <ExternalLink size={8} className="text-blue-500" />
                      <span className="truncate max-w-[100px]">{src.title}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-summit-100 text-summit-900 flex items-center justify-center flex-shrink-0"><Bot size={14} /></div>
             <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
               <Loader2 size={16} className="animate-spin text-summit-900" />
               <span className="text-xs text-slate-400 italic">Searching live market data...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100">
        <div className="relative">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search cap rates, comps, or trends..." className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-summit-accent outline-none text-sm" />
          <button type="submit" disabled={!input.trim() || loading} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-summit-900 text-white rounded-lg hover:bg-summit-800 disabled:opacity-50 transition-colors shadow-sm"><Send size={14} /></button>
        </div>
      </form>
    </div>
  );
};

export default AiChatModal;