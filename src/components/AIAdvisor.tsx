import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { UserProfile, PORTFOLIOS } from '../types';
import { X, Send, Bot, User as UserIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

interface AIAdvisorProps {
  onClose: () => void;
  profile: UserProfile;
}

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export default function AIAdvisor({ onClose, profile }: AIAdvisorProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { 
      role: 'model', 
      text: `Olá ${profile.name.split(' ')[0]}! Sou seu assessor financeiro InvestimPix. Vi que você tem R$ ${profile.balance.toLocaleString('pt-BR')} disponíveis e R$ ${profile.totalInvested.toLocaleString('pt-BR')} investidos. Como posso ajudar você a rentabilizar seu capital hoje?` 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: `Você é um Assessor de Investimentos da InvestimPix, uma fintech moderna.
          Perfil do Usuário: Nome: ${profile.name}, Saldo Pix: R$ ${profile.balance}, Total Investido: R$ ${profile.totalInvested}.
          Portfólios Disponíveis:
          1. ${PORTFOLIOS[0].name} (${PORTFOLIOS[0].risk} Risco, ${PORTFOLIOS[0].expectedReturn} retorno)
          2. ${PORTFOLIOS[1].name} (${PORTFOLIOS[1].risk} Risco, ${PORTFOLIOS[1].expectedReturn} retorno)
          3. ${PORTFOLIOS[2].name} (${PORTFOLIOS[2].risk} Risco, ${PORTFOLIOS[2].expectedReturn} retorno)
          
          Seja direto, profissional, porém amigável. Use termos financeiros brasileiros. 
          Incentive-os a diversificar. Nunca dê garantias de lucro absoluto, sempre mencione riscos se for o caso.
          Mantenha as respostas concisas e formatadas em Markdown.`
        }
      });

      const response = await chat.sendMessage({ message: userMessage });
      const modelText = response.text || "Desculpe, tive um problema ao processar sua solicitação. Pode repetir?";
      
      setMessages(prev => [...prev, { role: 'model', text: modelText }]);
    } catch (err) {
      console.error("AI Error:", err);
      setMessages(prev => [...prev, { role: 'model', text: "Ocorreu um erro na minha conexão. Verifique sua chave de API ou tente novamente." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-brand-dark/30 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        className="relative w-full max-w-2xl bg-white h-[90vh] md:h-[80vh] md:rounded-[40px] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 bg-brand-slate-900 text-white flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-primary flex items-center justify-center">
              <Bot size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold tracking-tight">Assessor Inteligente</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse" />
                <span className="text-[10px] text-brand-slate-400 font-bold uppercase tracking-widest">Especialista disponível</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/30 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 bg-brand-slate-50"
        >
          {messages.map((msg, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={i} 
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center shadow-sm ${msg.role === 'model' ? 'bg-brand-primary text-white' : 'bg-brand-slate-900 text-white'}`}>
                {msg.role === 'model' ? <Bot size={20} /> : <UserIcon size={20} />}
              </div>
              <div className={`max-w-[85%] p-4 rounded-[24px] text-sm leading-relaxed ${msg.role === 'model' ? 'bg-white shadow-sm border border-brand-slate-100 text-brand-slate-800' : 'bg-brand-slate-900 text-white shadow-lg'}`}>
                <div className="markdown-body">
                  <Markdown>{msg.text}</Markdown>
                </div>
              </div>
            </motion.div>
          ))}
          {loading && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-2xl bg-brand-primary text-white flex items-center justify-center">
                <Bot size={20} />
              </div>
              <div className="bg-white p-4 rounded-[24px] shadow-sm border border-brand-slate-100">
                <Loader2 size={18} className="animate-spin text-brand-primary" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-6 bg-white border-t border-brand-slate-100">
          <div className="relative flex items-center gap-3">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Pergunte sobre portfólios..."
              className="flex-1 px-6 py-4 bg-brand-slate-50 rounded-2xl font-medium outline-none border-2 border-transparent focus:border-brand-primary transition-all text-sm text-brand-slate-900 placeholder:text-brand-slate-400"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="w-12 h-12 rounded-2xl bg-brand-slate-900 text-white flex items-center justify-center hover:bg-brand-primary transition-all active:scale-95 disabled:opacity-30"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
