import { useState } from 'react';
import { Portfolio } from '../types';
import { TrendingUp, ArrowRight, Shield, AlertTriangle, Zap, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface InvestmentCardProps {
  portfolio: Portfolio;
  userBalance: number;
  userId: string;
}

export default function InvestmentCard({ portfolio, userBalance, userId }: InvestmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [investing, setInvesting] = useState(false);
  const [amount, setAmount] = useState('50');
  const [success, setSuccess] = useState(false);

  const riskIcon = {
    'Baixo': <Shield className="text-brand-primary" size={16} />,
    'Médio': <Zap className="text-amber-500" size={16} />,
    'Alto': <AlertTriangle className="text-rose-500" size={16} />,
  };

  const handleInvest = async () => {
    const value = parseFloat(amount);
    if (value <= 0) return;
    
    setInvesting(true);
    try {
      // 1. Record Investment
      const invRef = collection(db, 'users', userId, 'investments');
      await addDoc(invRef, {
        userId,
        portfolioId: portfolio.id,
        portfolioName: portfolio.name,
        amount: value,
        investedAt: serverTimestamp(),
        status: 'active'
      });

      // 2. Record Transaction
      const txRef = collection(db, 'users', userId, 'transactions');
      await addDoc(txRef, {
        userId,
        type: 'investment',
        amount: value,
        timestamp: serverTimestamp(),
        status: 'completed'
      });

      // 3. Update User Profile (Subtract from balance, add to totalInvested)
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        balance: increment(-value),
        totalInvested: increment(value)
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setExpanded(false);
        setInvesting(false);
      }, 2000);
    } catch (err) {
      console.error("Investment failed:", err);
      setInvesting(false);
    }
  };

  return (
    <motion.div 
      layout
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`glass-card rounded-[32px] overflow-hidden cursor-pointer group hover:bg-white transition-colors ${expanded ? 'ring-2 ring-brand-primary/20 bg-white' : ''}`}
      onClick={() => !expanded && setExpanded(true)}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: portfolio.color }}
            >
              <TrendingUp size={20} />
            </div>
            <div>
              <h4 className="font-bold text-base text-brand-slate-900">{portfolio.name}</h4>
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                {riskIcon[portfolio.risk]}
                <span className="text-brand-slate-400">Risco {portfolio.risk}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-brand-primary font-bold text-lg">{portfolio.expectedReturn}</p>
          </div>
        </div>

        <p className={`text-xs text-brand-slate-500 leading-relaxed mb-4 ${expanded ? '' : 'line-clamp-2'}`}>
          {portfolio.description}
        </p>

        {!expanded && (
          <div className="flex items-center gap-2 text-brand-primary font-bold text-xs uppercase tracking-widest">
            Investir agora <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        )}

        <AnimatePresence>
          {expanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="pt-6 border-t border-brand-slate-50"
              onClick={(e) => e.stopPropagation()}
            >
              {!success ? (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-brand-slate-400 uppercase mb-2 tracking-widest">Valor do Aporte</p>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-brand-slate-300">R$</span>
                        <input 
                          type="number" 
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full pl-10 pr-4 py-3.5 bg-brand-slate-50 rounded-2xl font-bold text-brand-slate-900 outline-none border-2 border-transparent focus:border-brand-primary transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={handleInvest}
                      disabled={investing || parseFloat(amount) > userBalance || !amount || parseFloat(amount) <= 0}
                      className="w-full py-4 bg-brand-slate-900 text-white font-bold rounded-2xl hover:bg-brand-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                    >
                      {investing ? 'Processando...' : 'Confirmar Investimento'}
                    </button>
                    <button 
                      onClick={() => setExpanded(false)}
                      className="w-full py-3 text-brand-slate-400 font-bold text-xs uppercase tracking-widest hover:text-brand-slate-600 transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                  {parseFloat(amount) > userBalance && (
                    <p className="mt-3 text-[10px] text-rose-500 font-bold text-center italic uppercase tracking-widest">Saldo insuficiente (disponível: R$ {userBalance.toFixed(2)})</p>
                  )}
                </>
              ) : (
                <div className="py-4 text-center">
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="text-emerald-500" size={24} />
                  </div>
                  <p className="font-bold text-emerald-600 uppercase text-xs tracking-widest">Investimento Realizado!</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
