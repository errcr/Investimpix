import { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import axios from 'axios';
import { apiUrl } from '../lib/api';

interface PixWithdrawProps {
  onClose: () => void;
  userId: string;
  balance: number;
}

export default function PixWithdraw({ onClose, userId, balance }: PixWithdrawProps) {
  const [amount, setAmount] = useState<string>('');
  const [pixKey, setPixKey] = useState('');
  const [status, setStatus] = useState<'input' | 'processing' | 'success'>('input');
  const [error, setError] = useState<string | null>(null);

  const handleWithdraw = async () => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      setError('Por favor, insira um valor válido.');
      return;
    }
    if (value > balance) {
      setError('Saldo insuficiente para realizar este saque.');
      return;
    }
    if (!pixKey.trim()) {
      setError('Por favor, informe sua chave Pix.');
      return;
    }

    setStatus('processing');
    setError(null);

    try {
      // Use the secure backend API instead of direct Firestore writes
      const response = await axios.post(apiUrl('/api/withdraw/request'), {
        amount: value,
        userId: userId,
        pixKey: pixKey
      });

      if (response.data.success) {
        setStatus('success');
        setTimeout(onClose, 2000);
      } else {
        throw new Error(response.data.error || 'Erro desconhecido');
      }
    } catch (err: any) {
      console.error("Withdrawal failed:", err);
      setError(err.response?.data?.error || 'Ocorreu um erro ao processar seu saque. Tente novamente.');
      setStatus('input');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-[40px] overflow-hidden shadow-2xl border border-brand-slate-100"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-brand-slate-300 hover:text-brand-slate-900 hover:bg-brand-slate-50 rounded-full transition-all"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          {status === 'input' && (
            <div className="pt-4">
              <h3 className="text-2xl font-bold mb-2 text-brand-slate-900">Sacar via Pix</h3>
              <p className="text-brand-slate-500 mb-8 text-sm">Seu saldo disponível é <span className="font-bold text-brand-primary">R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="text-[10px] font-bold text-brand-slate-400 uppercase tracking-widest ml-4 mb-2 block">Chave Pix (CPF, Email ou Telefone)</label>
                  <input 
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    className="w-full px-6 py-4 bg-brand-slate-50 border-2 border-transparent focus:border-brand-primary rounded-2xl font-bold text-brand-slate-900 outline-none transition-all placeholder:text-brand-slate-300"
                    placeholder="Sua chave Pix"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-brand-slate-400 uppercase tracking-widest ml-4 mb-2 block">Valor do Saque</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-bold text-brand-slate-300">R$</span>
                    <input 
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-16 pr-6 py-5 bg-brand-slate-50 border-2 border-transparent focus:border-brand-primary rounded-2xl text-2xl font-bold text-brand-slate-900 outline-none transition-all"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-rose-500 text-xs font-bold text-center mb-6 uppercase tracking-wider">{error}</p>
              )}

              <button 
                onClick={handleWithdraw}
                disabled={!amount || !pixKey || parseFloat(amount) <= 0 || parseFloat(amount) > balance}
                className="w-full py-5 bg-brand-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-brand-slate-800 transition-all active:scale-95 disabled:grayscale disabled:opacity-50"
              >
                Solicitar Saque
              </button>
            </div>
          )}

          {status === 'processing' && (
            <div className="text-center py-12 flex flex-col items-center">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full mb-6"
              />
              <h3 className="text-xl font-bold text-brand-slate-900">Processando Saque...</h3>
              <p className="text-brand-slate-500 text-sm">Validando sua chave Pix e saldo.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-12 flex flex-col items-center">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-32 h-32 bg-emerald-50 flex items-center justify-center rounded-full mb-8"
              >
                <CheckCircle2 size={64} className="text-emerald-500" />
              </motion.div>
              <h3 className="text-3xl font-bold mb-2 text-brand-slate-900 font-mono">Saque Realizado!</h3>
              <p className="text-brand-slate-500 mb-6 font-medium">O valor será enviado para sua chave Pix em instantes.</p>
              <div className="px-8 py-3 bg-emerald-50 text-emerald-600 font-bold rounded-full text-lg">
                - R$ {parseFloat(amount).toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
