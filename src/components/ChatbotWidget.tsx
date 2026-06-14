import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, X, Send, Sparkles, Loader2, Coffee, 
  Receipt, Building, ShieldAlert, Calendar, MapPin, Minimize2 
} from 'lucide-react';
import { playSound } from '../soundUtils';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  { label: '🍽️ Room Dining Menu', text: 'What food items can I order from room service dining?' },
  { label: '🧾 Invoices & Receipts', text: 'How do I download my PDF invoice or check GST receipts?' },
  { label: '🏨 Room Pricing', text: 'What are the room types and prices per night?' },
  { label: '🛠️ Lodge a Complaint', text: 'How do I file a Wi-Fi or AC complaint in the issues desk?' },
  { label: '🛂 Check-in Policies', text: 'What are the check-in/check-out timings and ID requirements?' },
];

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Namaste! Welcome to Sai Nirvana Plaza. 🌟\n\nI am your dedicated digital hospitality assistant. Ask me anything about room service dining, room booking procedures, invoices, or raising support tickets. How can I help you today?',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleToggle = () => {
    playSound('click');
    setIsOpen(!isOpen);
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    playSound('tap');
    const userMsgId = 'msg_' + Date.now();
    const newUserMessage: Message = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);

    // Prepare history payload for context-aware chat
    const historyPayload = messages.slice(-10).map(m => ({
      role: m.sender === 'user' ? 'user' : 'model',
      content: m.text
    }));

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload
        })
      });

      if (response.ok) {
        const data = await response.json();
        const botMsgId = 'msg_bot_' + Date.now();
        const newBotMessage: Message = {
          id: botMsgId,
          sender: 'bot',
          text: data.message || 'Apologies, I encountered an issue processing your query.',
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        };
        playSound('assistant');
        setMessages(prev => [...prev, newBotMessage]);
      } else {
        throw new Error('API server issue');
      }
    } catch (err) {
      console.error(err);
      playSound('error');
      const errorMsgId = 'msg_err_' + Date.now();
      const newBotMessage: Message = {
        id: errorMsgId,
        sender: 'bot',
        text: 'Apologies, I am experiencing temporary connectivity issues. Please try again shortly or contact the Front Desk at EXT 201.',
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, newBotMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Format message text to handle simple markdown-like double asterisks
  const renderMessageText = (text: string) => {
    return text.split('\n').map((line, i) => {
      // replace **text** with <strong>text</strong>
      const parts = line.split(/\*\*([^*]+)\*\*/g);
      return (
        <p key={i} className="mb-1 last:mb-0">
          {parts.map((part, index) => {
            if (index % 2 === 1) {
              return <strong key={index} className="font-bold text-[#F9D976] dark:text-[#F9D976]">{part}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans flex flex-col items-end pointer-events-none" id="chatbot_floating_root">
      
      {/* 1. CHAT WINDOW CONSOLE */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="pointer-events-auto w-[calc(100vw-2rem)] sm:w-96 h-[500px] md:h-[550px] bg-gradient-to-b from-[#001f3f] to-[#002d59] border border-[#D4AF37]/40 rounded-3xl shadow-2xl flex flex-col justify-between overflow-hidden backdrop-blur-md mb-4"
            id="chatbot_expanded_window"
          >
            {/* Header section with brand colors */}
            <div className="bg-[#001124] border-b border-[#D4AF37]/35 p-4 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#D4AF37] to-[#F9D976] flex items-center justify-center border border-[#D4AF37]/45 animate-pulse shadow-glow">
                  <Sparkles className="h-4 w-4 text-[#001f3f]" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-black uppercase text-white tracking-widest leading-none font-heading">Sai Nirvana Desk</h4>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[9px] font-mono text-emerald-400 font-bold tracking-wider uppercase leading-none">AI Support Online</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleToggle}
                className="text-slate-400 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                aria-label="Close chatbot window"
              >
                <Minimize2 className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Chat Messages Body Log */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/20 backdrop-blur-sm" id="chatbot_message_log">
              {messages.map((msg) => {
                const isBot = msg.sender === 'bot';
                return (
                  <div 
                    key={msg.id}
                    className={`flex flex-col ${isBot ? 'items-start' : 'items-end'} max-w-[85%] ${isBot ? 'mr-auto' : 'ml-auto'}`}
                  >
                    <div className={`text-xs px-3.5 py-2.5 rounded-2xl shadow-md leading-relaxed ${
                      isBot 
                        ? 'bg-slate-900/90 text-slate-100 border border-[#D4AF37]/20 rounded-tl-sm' 
                        : 'bg-gradient-to-r from-[#D4AF37] to-[#F9D976] text-[#001f3f] font-medium rounded-tr-sm'
                    }`}>
                      {isBot ? renderMessageText(msg.text) : <p className="whitespace-pre-line">{msg.text}</p>}
                    </div>
                    <span className="text-[9px] text-slate-400/80 font-mono mt-1 px-1">
                      {msg.timestamp}
                    </span>
                  </div>
                );
              })}

              {/* Loader Skeleton / Typing indicator */}
              {isLoading && (
                <div className="flex flex-col items-start max-w-[85%] mr-auto">
                  <div className="bg-slate-900/90 border border-[#D4AF37]/20 text-xs px-3.5 py-3 rounded-2xl rounded-tl-sm shadow-md flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F9D976]" />
                    <span className="text-slate-400 font-mono text-[10px]">Formulating response...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Questions Section */}
            <div className="bg-slate-950/50 p-2.5 border-t border-[#D4AF37]/15 flex gap-2 overflow-x-auto select-none no-scrollbar">
              {QUICK_PROMPTS.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(qp.text)}
                  className="shrink-0 bg-white/5 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/45 text-[10px] text-slate-200 hover:text-white px-3 py-1.5 rounded-full border border-white/10 transition-all cursor-pointer whitespace-nowrap"
                >
                  {qp.label}
                </button>
              ))}
            </div>

            {/* Input Submission Bar */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="bg-[#001124] border-t border-[#D4AF37]/35 p-3 flex gap-2 items-center"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask something..."
                disabled={isLoading}
                className="flex-1 text-xs bg-slate-900/90 text-white placeholder-slate-400 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/65 border border-white/10 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-[#D4AF37] to-[#F9D976] hover:brightness-110 disabled:opacity-40 text-[#001f3f] p-3 rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Send message"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. CIRCULAR FLOATING WIDGET BUTTON */}
      <motion.button
        onClick={handleToggle}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="pointer-events-auto w-14 h-14 bg-gradient-to-tr from-[#001f3f] to-[#003366] hover:brightness-110 text-white rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(212,175,55,0.3)] border-2 border-[#D4AF37] cursor-pointer focus:outline-none relative group overflow-hidden"
        id="chatbot_toggle_trigger_btn"
        aria-label="Toggle chatbot"
      >
        {/* Shine hover effect */}
        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
        
        {isOpen ? (
          <X className="h-6 w-6 text-[#F9D976]" />
        ) : (
          <div className="relative">
            <MessageSquare className="h-6 w-6 text-[#F9D976]" />
            <span className="absolute -top-1.5 -right-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-white animate-pulse" />
          </div>
        )}
      </motion.button>

    </div>
  );
}
