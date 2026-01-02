
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';

interface AiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AiChatModal: React.FC<AiChatModalProps> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: 'Hello! I am your Summit Commercial Assistant. I can help you draft clauses, analyze market trends, or summarize deal terms. How can I help you today?' }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      // Dynamic import to prevent crash if module fails to load
      const { GoogleGenAI } = await import("@google/genai");
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are a helpful expert commercial real estate assistant. Answer the following request concisely and professionally: ${userMsg}`,
      });
      
      setMessages(prev => [...prev, { role: 'model', text: response.text || "I apologize, I couldn't generate a response." }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting to the intelligence network right now. The AI module may not be fully loaded." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 h-[500px] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden font-sans">
      <div className="bg-summit-900 p-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
          <div className="bg-summit-accent/20 p-1.5 rounded-lg">
            <Sparkles size={18} className="text-summit-accent" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Summit AI</h3>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
              <span className="text-xs text-slate-300">Online</span>
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
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
              ${msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-summit-100 text-summit-900'}
            `}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={`
              max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed
              ${msg.role === 'user' 
                ? 'bg-summit-900 text-white rounded-tr-none' 
                : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'}
            `}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-summit-100 text-summit-900 flex items-center justify-center flex-shrink-0">
               <Bot size={14} />
             </div>
             <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm">
               <Loader2 size={16} className="animate-spin text-summit-900" />
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100">
        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about deals, market data..." 
            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-summit-accent outline-none text-sm"
          />
          <button 
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-summit-900 text-white rounded-lg hover:bg-summit-800 disabled:opacity-50 transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default AiChatModal;
