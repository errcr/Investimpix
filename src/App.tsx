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
              <button className="px-10 py-5 bg-white border border-brand-slate-200 text-brand-slate-600 rounded-[24px] font-bold text-lg hover:bg-brand-slate-50 transition-all active:scale-95">
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
    </div>
  );
}
