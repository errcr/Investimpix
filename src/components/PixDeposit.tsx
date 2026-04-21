import { useState } from 'react';
import { X, CheckCircle2, ExternalLink, Copy, Check } from 'lucide-react';
import { motion } from 'motion/react';
import axios from 'axios';
import { apiUrl } from '../lib/api';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';

interface PixDepositProps {
  onClose: () => void;
  userId: string;
  userEmail: string;
  profile: UserProfile;
}

export default function PixDeposit({ onClose, userId, userEmail }: PixDepositProps) {
  const [amount, setAmount] = useState<string>('100');
  const [status, setStatus] = useState<'input' | 'loading' | 'redirect' | 'qr_code' | 'success'>('input');
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<{ image: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateBilling = async () => {
    const value = parseFloat(amount);
    if (value <= 0) return;

    setStatus('loading');
    setError(null);

    try {
      // Step 1: Create the transaction record on the client-side (uses user's auth permissions)
      // This bypasses the server-side PERMISSION_DENIED issues
      const transRef = collection(db, 'users', userId, 'transactions');
      const docRef = await addDoc(transRef, {
        type: 'deposit',
        amount: value,
        status: 'pending',
        timestamp: serverTimestamp(),
        userId: userId,
        description: 'Depósito via Pix (AbacatePay)'
      });

      // Step 2: Request the checkout data from the server
      const response = await axios.post(apiUrl('/api/billing/create'), {
        amount: value,
        userId: userId,
        email: userEmail, 
      });

      // Update the transaction with the billing ID for better webhook matching
      const billingId = response.data.id;
      if (billingId) {
        const txDocRef = doc(db, 'users', userId, 'transactions', docRef.id);
        await updateDoc(txDocRef, { billingId: billingId });
      }

      // Save CPF and phone to user profile for future use
      if (cpf || phone) {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          ...(cpf && { cpf: cpf.replace(/\D/g, '') }),
          ...(phone && { phone: phone.replace(/\D/g, '') }),
        });
      }

      if (response.data.qrCode) {
        setQrCodeData({
          image: response.data.qrCode,
          code: response.data.copyPaste
        });
        setStatus('qr_code');
      } else if (response.data.url) {
        setCheckoutUrl(response.data.url);
        setStatus('redirect');
      } else {
        throw new Error("Resposta inválida do servidor");
      }
    } catch (err: any) {
      console.error("Erro na criação do depósito:", err);
      
      let errorMsg = "Ocorreu um erro ao processar seu depósito.";
      
      if (err.response?.data?.details) {
        const details = err.response.data.details;
        errorMsg = typeof details === 'object' ? JSON.stringify(details) : String(details);
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      setStatus('input');
    }
  };

  const copyToClipboard = () => {
    if (qrCodeData?.code) {
      navigator.clipboard.writeText(qrCodeData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
              <h3 className="text-2xl font-bold mb-2 text-brand-slate-900">Depositar via Pix</h3>
              <p className="text-brand-slate-500 mb-8 text-sm">Integração real via <span className="text-brand-primary font-bold">AbacatePay</span>.</p>
              
              <div className="relative mb-6">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-brand-slate-300">R$</span>
                <input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-16 pr-6 py-8 bg-brand-slate-50 border-2 border-transparent focus:border-brand-primary rounded-3xl text-4xl font-bold text-brand-slate-900 outline-none transition-all"
                  placeholder="0,00"
                />
              </div>

              {error && (
                <p className="text-rose-500 text-xs font-bold text-center mb-6 uppercase tracking-wider">{error}</p>
              )}

              <button 
                onClick={handleCreateBilling}
                disabled={!amount || parseFloat(amount) <= 0}
                className="w-full py-5 bg-brand-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-brand-slate-800 transition-all active:scale-95 disabled:grayscale disabled:opacity-50"
              >
                Gerar Pagamento Real
              </button>
            </div>
          )}

          {status === 'loading' && (
            <div className="text-center py-12 flex flex-col items-center">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full mb-6"
              />
              <h3 className="text-xl font-bold text-brand-slate-900">Comunicando com o Banco...</h3>
              <p className="text-brand-slate-500 text-sm">Gerando seu Pix seguro no AbacatePay.</p>
            </div>
          )}

          {status === 'qr_code' && qrCodeData && (
            <div className="text-center pt-2">
              <h3 className="text-2xl font-bold mb-2 text-brand-slate-900">Pagamento Gerado!</h3>
              <p className="text-brand-slate-500 mb-6 text-sm">Escaneie o QR Code abaixo ou copie a chave Pix para pagar.</p>

              <div className="bg-brand-slate-50 p-6 rounded-3xl mb-6 flex flex-col items-center justify-center border-2 border-brand-primary/10">
                <div className="bg-white p-4 rounded-2xl shadow-sm mb-4 border border-brand-slate-100">
                  <img 
                    src={qrCodeData.image} 
                    alt="QR Code Pix" 
                    className="w-48 h-48"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <p className="text-brand-slate-900 font-bold mb-1">R$ {parseFloat(amount).toFixed(2)}</p>
                <p className="text-[10px] text-brand-slate-400 font-medium uppercase tracking-widest leading-none">Vencimento em 24 horas</p>
              </div>

              <button 
                onClick={copyToClipboard}
                className="w-full py-4 px-6 bg-brand-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-brand-slate-800 transition-all active:scale-95 mb-6"
              >
                {copied ? (
                  <>
                    <Check size={18} className="text-teal-400" />
                    COPIADO!
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    PIX COPIA E COLA
                  </>
                )}
              </button>

              <p className="text-[10px] text-brand-slate-400 font-medium uppercase tracking-widest text-center leading-relaxed">
                O seu saldo será atualizado automaticamente<br />assim que o pagamento for confirmado.
              </p>
            </div>
          )}

          {status === 'redirect' && (
            <div className="text-center pt-4">
              <h3 className="text-2xl font-bold mb-2 text-brand-slate-900">Pagamento Gerado!</h3>
              <p className="text-brand-slate-500 mb-8 text-sm">Clique no botão abaixo para abrir o checkout seguro e pagar via Pix.</p>

              <div className="bg-brand-slate-50 p-8 rounded-3xl mb-8 flex flex-col items-center justify-center border-2 border-brand-primary/10">
                <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <p className="text-brand-slate-900 font-bold">R$ {parseFloat(amount).toFixed(2)}</p>
              </div>

              <a 
                href={checkoutUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-5 pix-gradient text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:brightness-110 transition-all active:scale-95 shadow-xl shadow-teal-900/20 mb-4"
              >
                IR PARA O PAGAMENTO
                <ExternalLink size={18} />
              </a>

              <p className="text-[10px] text-brand-slate-400 font-medium uppercase tracking-widest text-center">
                O seu saldo será atualizado automaticamente assim que o pagamento for confirmado.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
