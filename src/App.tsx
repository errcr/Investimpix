import { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { UserProfile } from './types';
import Dashboard from './components/Dashboard';
import { Wallet, LogIn, TrendingUp, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Sync profile
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          const newProfile: UserProfile = {
            uid: user.uid,
            name: user.displayName || 'Investidor',
            email: user.email || '',
            balance: 0,
            totalInvested: 0,
          };
          await setDoc(userDocRef, newProfile);
          setProfile(newProfile);
        }

        // Live updates for profile (balance, etc)
        onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            setProfile(doc.data() as UserProfile);
          }
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-surface">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-surface text-brand-dark overflow-x-hidden">
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div 
            key="landing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="max-w-6xl mx-auto px-6 py-12 md:py-24 flex flex-col items-center text-center"
          >
            <div className="mb-8 p-3 bg-brand-primary/10 rounded-2xl">
              <div className="w-12 h-12 pix-gradient rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">P</div>
            </div>
            <h1 className="text-5xl md:text-8xl font-bold tracking-tight text-brand-slate-900 mb-8 leading-[0.9]">
              Invista via <span className="text-brand-primary">Pix</span>.<br />
              <span className="text-brand-slate-400">Sem burocracia.</span>
            </h1>
            <p className="text-lg md:text-xl text-brand-slate-500 mb-12 max-w-2xl font-medium">
              A plataforma mais inteligente para fazer seu capital render com segurança e assessoria de IA em tempo real.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-20 w-full justify-center">
              <button 
                onClick={handleLogin}
                className="px-10 py-5 bg-brand-slate-900 text-white rounded-[24px] font-bold text-lg hover:bg-brand-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95"
              >
                <LogIn className="w-5 h-5 text-brand-primary" />
                Criar Conta Grátis
              </button>
              <button 
                onClick={() => setShowHowItWorks(true)}
                className="px-10 py-5 bg-white border border-brand-slate-200 text-brand-slate-600 rounded-[24px] font-bold text-lg hover:bg-brand-slate-50 transition-all active:scale-95">
                Saiba Mais
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
              {[
                { icon: Wallet, title: "Rapidez Pix", desc: "Depósitos e saques que acontecem na velocidade de um Pix." },
                { icon: ShieldCheck, title: "Proteção", desc: "Seus ativos protegidos pelas melhores tecnologias de segurança." },
                { icon: TrendingUp, title: "Performace", desc: "Portfólios otimizados por especialistas e inteligência artificial." }
              ].map((feature, i) => (
                <div key={i} className="p-10 glass-card rounded-[32px] text-left">
                  <div className="w-12 h-12 rounded-2xl bg-brand-slate-50 flex items-center justify-center text-brand-primary mb-6 shadow-sm border border-brand-slate-100">
                    <feature.icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-brand-slate-900">{feature.title}</h3>
                  <p className="text-brand-slate-500 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          profile && (
            <Dashboard 
              user={user} 
              profile={profile} 
              onLogout={handleLogout} 
            />
          )
        )}
      </AnimatePresence>

      {/* How It Works Modal */}
      {showHowItWorks && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowHowItWorks(false)}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-2xl bg-white rounded-[40px] overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <button 
              onClick={() => setShowHowItWorks(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-brand-slate-100 rounded-full flex items-center justify-center text-brand-slate-500 hover:bg-brand-slate-200 transition-all z-10"
            >
              ✕
            </button>

            <div className="p-8">
              <div className="w-12 h-12 pix-gradient rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg mb-6">P</div>
              <h2 className="text-3xl font-bold text-brand-slate-900 mb-2">Como funciona o InvestimPix?</h2>
              <p className="text-brand-slate-500 mb-10">Simples, rápido e seguro. Veja como fazer seu dinheiro render.</p>

              <div className="space-y-6">
                {[
                  {
                    step: "01",
                    title: "Crie sua conta grátis",
                    desc: "Entre com sua conta Google em segundos. Sem burocracia, sem documentos, sem espera.",
                    color: "#32BCAD"
                  },
                  {
                    step: "02", 
                    title: "Deposite via PIX",
                    desc: "Gere um QR Code PIX e deposite qualquer valor. O saldo cai na sua conta na hora após confirmação do pagamento.",
                    color: "#6366F1"
                  },
                  {
                    step: "03",
                    title: "Escolha um portfólio",
                    desc: "Selecione entre Tesouro Direto (10,5% a.a.), Fundo Tech Global (15,2% a.a.) ou Crypto & Inovação (28,4% a.a.) conforme seu perfil de risco.",
                    color: "#F59E0B"
                  },
                  {
                    step: "04",
                    title: "Seu dinheiro rende automaticamente",
                    desc: "Os juros compostos são calculados em tempo real. Acompanhe seu patrimônio crescer diretamente no dashboard.",
                    color: "#10B981"
                  },
                  {
                    step: "05",
                    title: "Saque quando quiser",
                    desc: "Solicite um saque via PIX a qualquer momento. O valor é enviado diretamente para sua chave PIX em instantes.",
                    color: "#EF4444"
                  }
                ].map((item) => (
                  <div key={item.step} className="flex gap-5 items-start">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.step}
                    </div>
                    <div>
                      <h3 className="font-bold text-brand-slate-900 mb-1">{item.title}</h3>
                      <p className="text-brand-slate-500 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 p-5 bg-brand-slate-50 rounded-2xl">
                <p className="text-xs text-brand-slate-400 leading-relaxed">
                  ⚠️ <strong>Aviso importante:</strong> Os rendimentos apresentados são simulações baseadas em dados históricos de mercado e não constituem garantia de retorno. Investimentos envolvem riscos. Consulte sempre um assessor financeiro antes de tomar decisões de investimento.
                </p>
              </div>

              <button
                onClick={() => { setShowHowItWorks(false); handleLogin(); }}
                className="w-full mt-6 py-5 bg-brand-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-brand-slate-800 transition-all active:scale-95"
              >
                <LogIn className="w-5 h-5 text-brand-primary" />
                Criar Conta Grátis
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
