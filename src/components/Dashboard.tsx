import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, PORTFOLIOS, Investment, Transaction } from '../types';
import { 
  LogOut, 
  Plus, 
  ArrowUpRight, 
  Home,
  TrendingUp as TrendingIcon,
  LayoutDashboard,
  Wallet as WalletIcon,
  MessageSquare,
  Bot,
  ChevronRight,
  TrendingUp,
  History,
  ArrowDownCircle,
  Clock,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PixDeposit from './PixDeposit';
import PixWithdraw from './PixWithdraw';
import InvestmentCard from './InvestmentCard';
import AIAdvisor from './AIAdvisor';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface DashboardProps {
  user: User;
  profile: UserProfile;
  onLogout: () => void;
}

const mockChartData = [
  { name: 'Seg', val: 38000 },
  { name: 'Ter', val: 39200 },
  { name: 'Qua', val: 39100 },
  { name: 'Qui', val: 40500 },
  { name: 'Sex', val: 41800 },
  { name: 'Sáb', val: 42100 },
  { name: 'Dom', val: 42850 },
];

export default function Dashboard({ profile, onLogout }: DashboardProps) {
  const [showPix, setShowPix] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showAdvisor, setShowAdvisor] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [activeTab, setActiveTab] = useState<'inicio' | 'investimentos' | 'carteira' | 'extrato'>('inicio');
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    // Check for success status in URL (return from AbacatePay)
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'success') {
      setShowSuccessToast(true);
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => setShowSuccessToast(false), 5000);
    }

    // Investimentos Ativos
    const invQuery = query(
      collection(db, 'users', profile.uid, 'investments'),
      where('status', '==', 'active')
    );
    const unsubInv = onSnapshot(invQuery, (snapshot) => {
      setInvestments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Investment)));
    });

    // Extrato de Transações
    const transQuery = query(
      collection(db, 'users', profile.uid, 'transactions'),
      orderBy('timestamp', 'desc')
    );
    const unsubTrans = onSnapshot(transQuery, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });

    return () => {
      unsubInv();
      unsubTrans();
    };
  }, [profile.uid]);

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'Processando...';
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(date.getTime())) return 'Data inválida';
    return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'inicio':
        return (
          <>
            {/* Top Section: Balance & Pix */}
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 glass-card p-8 rounded-[32px] shadow-sm flex flex-col justify-between min-h-[192px]">
                <div className="flex justify-between items-start">
                  <span className="text-brand-slate-500 font-medium">Patrimônio Total</span>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full border border-emerald-100">+12,4%</span>
                    <button 
                      onClick={() => setShowWithdraw(true)}
                      className="px-3 py-1 bg-brand-slate-50 text-brand-slate-500 text-xs font-bold rounded-full border border-brand-slate-100 hover:bg-brand-slate-100 transition-colors"
                    >
                      Sacar
                    </button>
                  </div>
                </div>
                <div>
                  <div className="text-4xl md:text-5xl font-bold text-brand-slate-900 balance-glow mb-4">
                    R$ {(profile.balance + profile.totalInvested).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex gap-8">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-brand-slate-400 tracking-wider">Em Investimento</span>
                      <span className="font-bold text-brand-slate-900">R$ {profile.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-brand-slate-400 tracking-wider">Saldo na Conta</span>
                      <span className="font-bold text-brand-primary">R$ {profile.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pix-gradient p-8 rounded-[32px] shadow-lg flex flex-col justify-center items-center text-center text-white space-y-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Plus className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold">Investir via PIX</h2>
                <p className="text-white/80 text-xs px-2 line-clamp-2">Deposite agora e seu dinheiro rende no mesmo instante.</p>
                <button 
                  onClick={() => setShowPix(true)}
                  className="w-full bg-white text-brand-dark-teal py-3.5 rounded-2xl font-bold text-xs shadow-xl shadow-teal-900/20 active:scale-95 transition-all hover:bg-brand-slate-100"
                >
                  DEPOSITAR AGORA
                </button>
              </div>
            </section>

            {/* Bottom Section: Chart & Performance */}
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-1 bg-white p-8 rounded-[32px] border border-brand-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg mb-6 text-brand-slate-900">Rentabilidade</h3>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-1.5 h-12 bg-brand-primary rounded-full"></div>
                    <div>
                      <p className="text-[10px] text-brand-slate-400 uppercase font-bold tracking-widest">Meta de Março</p>
                      <p className="text-2xl font-bold text-brand-slate-900">82%</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="w-full bg-brand-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-brand-primary h-full w-[82%] rounded-full"></div>
                  </div>
                  <p className="text-xs text-brand-slate-400 font-medium">Você está a R$ 1.200 da sua meta mensal.</p>
                </div>
              </div>

              <div className="xl:col-span-2 bg-white p-8 rounded-[32px] border border-brand-slate-100 shadow-sm relative overflow-hidden min-h-[300px]">
                <div className="flex justify-between items-center mb-8 relative z-10">
                  <h3 className="font-bold text-lg text-brand-slate-900">Histórico de Performance</h3>
                  <span className="text-xs font-bold text-brand-primary cursor-pointer hover:underline uppercase tracking-wider">DETALHES</span>
                </div>
                <div className="h-[220px] w-full relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mockChartData}>
                      <defs>
                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#32BCAD" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#32BCAD" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 600}} dy={10} />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '12px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="val" 
                        stroke="#32BCAD" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorVal)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          </>
        );
      case 'investimentos':
        return (
          <section className="bg-white p-8 rounded-[32px] border border-brand-slate-100 shadow-sm mb-32">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-bold text-2xl text-brand-slate-900 flex items-center gap-3">
                <TrendingIcon className="text-brand-primary" size={28} />
                Oportunidades Disponíveis
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {PORTFOLIOS.map((item) => (
                <InvestmentCard 
                  key={item.id} 
                  portfolio={item} 
                  userId={profile.uid} 
                  canInvest={profile.balance > 0} 
                />
              ))}
            </div>
          </section>
        );
      case 'carteira':
        return (
          <section className="space-y-6 mb-32">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-card p-6 rounded-[24px]">
                <p className="text-xs font-bold text-brand-slate-400 uppercase mb-1 tracking-widest">Total Investido</p>
                <p className="text-2xl font-bold text-brand-slate-900">R$ {profile.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="glass-card p-6 rounded-[24px]">
                <p className="text-xs font-bold text-brand-slate-400 uppercase mb-1 tracking-widest">Ativos Ativos</p>
                <p className="text-2xl font-bold text-brand-slate-900">{investments.length}</p>
              </div>
              <div className="glass-card p-6 rounded-[24px]">
                <p className="text-xs font-bold text-brand-slate-400 uppercase mb-1 tracking-widest">Performance Mês</p>
                <p className="text-2xl font-bold text-emerald-500">+4.2%</p>
              </div>
            </div>

            <div className="bg-white rounded-[32px] border border-brand-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-brand-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-xl text-brand-slate-900">Seus Ativos</h3>
                <button className="text-brand-primary text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  Relatório Completo <ChevronRight size={14} />
                </button>
              </div>
              
              {investments.length > 0 ? (
                <div className="divide-y divide-brand-slate-50">
                  {investments.map((inv) => {
                    const portfolio = PORTFOLIOS.find(p => p.id === inv.portfolioId);
                    return (
                      <div key={inv.id} className="p-6 hover:bg-brand-slate-50 transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                            style={{ backgroundColor: portfolio?.color || '#32BCAD' }}
                          >
                            <TrendingUp size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-brand-slate-900">{inv.portfolioName}</h4>
                            <p className="text-xs text-brand-slate-400 font-medium">Investido em {formatTimestamp(inv.investedAt)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-brand-slate-900">R$ {inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">+R$ {(inv.amount * 0.02).toFixed(2)} rendimento</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-20 text-center flex flex-col items-center">
                  <History size={48} className="text-brand-slate-200 mb-4" />
                  <p className="text-brand-slate-500 font-medium mb-6">Você ainda não possui investimentos ativos.</p>
                  <button 
                    onClick={() => setActiveTab('investimentos')}
                    className="px-6 py-3 bg-brand-slate-900 text-white rounded-xl font-bold text-sm hover:bg-brand-slate-800 transition-all"
                  >
                    Começar a Investir
                  </button>
                </div>
              )}
            </div>
          </section>
        );
      case 'extrato':
        return (
          <section className="bg-white rounded-[32px] border border-brand-slate-100 shadow-sm overflow-hidden mb-32">
            <div className="p-8 border-b border-brand-slate-50">
              <h3 className="font-bold text-xl text-brand-slate-900">Histórico de Transações</h3>
              <p className="text-brand-slate-500 text-sm">Acompanhe suas entradas e saídas recentes.</p>
            </div>

            {transactions.length > 0 ? (
              <div className="divide-y divide-brand-slate-50">
                {transactions.map((trans) => {
                  const isPositive = trans.type === 'deposit';
                  const isInvestment = trans.type === 'investment';
                  const isWithdrawal = trans.type === 'withdrawal';
                  const isPending = trans.status === 'pending';
                  
                  return (
                    <div key={trans.id} className="p-6 flex items-center justify-between hover:bg-brand-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isPending ? 'bg-amber-50 text-amber-500 opacity-60' :
                          isPositive ? 'bg-emerald-50 text-emerald-500' : 
                          isInvestment ? 'bg-indigo-50 text-indigo-500' : 'bg-rose-50 text-rose-500'
                        }`}>
                          {isPending ? <Clock size={20} /> : 
                           isPositive ? <ArrowDownCircle size={20} /> : 
                           isWithdrawal ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`font-bold text-brand-slate-900 ${isPending ? 'opacity-50' : ''}`}>
                              {trans.type === 'deposit' ? 'Depósito via Pix' : 
                               trans.type === 'investment' ? 'Aporte em Investimento' : 'Saque via Pix'}
                            </p>
                            {isPending && (
                              <span className="bg-amber-100 text-amber-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest">
                                Pendente
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-brand-slate-400 font-bold uppercase tracking-widest">
                            <Clock size={10} />
                            {formatTimestamp(trans.timestamp)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-lg ${isPending ? 'text-brand-slate-300' : isPositive ? 'text-emerald-500' : 'text-brand-slate-900'}`}>
                          {isPositive ? '+' : '-'} R$ {trans.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        {isPending ? (
                          <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest animate-pulse">Aguardando Pagamento</p>
                        ) : (
                          <p className="text-[10px] text-brand-slate-400 font-bold uppercase tracking-widest">Confirmado</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-20 text-center flex flex-col items-center">
                <History size={48} className="text-brand-slate-200 mb-4" />
                <p className="text-brand-slate-500 font-medium">Nenhuma transação encontrada.</p>
              </div>
            )}
          </section>
        );
    }
  };

  return (
    <div className="flex h-screen w-full bg-brand-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-brand-slate-200 flex-col">
        <div className="p-8 flex items-center gap-2">
          <div className="w-8 h-8 pix-gradient rounded-lg flex items-center justify-center text-white font-bold">P</div>
          <span className="text-xl font-bold tracking-tight text-brand-slate-900">PixVest</span>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <button 
            onClick={() => setActiveTab('inicio')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'inicio' ? 'sidebar-item-active' : 'text-brand-slate-500 hover:text-brand-slate-900 hover:bg-brand-slate-50'}`}
          >
            <Home size={20} />
            Início
          </button>
          <button 
            onClick={() => setActiveTab('investimentos')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'investimentos' ? 'sidebar-item-active' : 'text-brand-slate-500 hover:text-brand-slate-900 hover:bg-brand-slate-50'}`}
          >
            <TrendingIcon size={20} />
            Investimentos
          </button>
          <button 
            onClick={() => setActiveTab('carteira')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'carteira' ? 'sidebar-item-active' : 'text-brand-slate-500 hover:text-brand-slate-900 hover:bg-brand-slate-50'}`}
          >
            <WalletIcon size={20} />
            Minha Carteira
          </button>
          <button 
            onClick={() => setActiveTab('extrato')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === 'extrato' ? 'sidebar-item-active' : 'text-brand-slate-500 hover:text-brand-slate-900 hover:bg-brand-slate-50'}`}
          >
            <LayoutDashboard size={20} />
            Extrato
          </button>
        </nav>

        <div className="p-6 border-t border-brand-slate-100 flex flex-col gap-4">
          <button 
            onClick={() => setShowAdvisor(true)}
            className="bg-brand-slate-50 rounded-xl p-4 text-left hover:bg-brand-slate-100 transition-colors group"
          >
            <p className="text-xs text-brand-slate-500 mb-1">Assessor IA</p>
            <p className="text-sm font-semibold flex items-center justify-between">
              Falar com consultor
              <MessageSquare size={14} className="text-brand-primary" />
            </p>
          </button>
          
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 text-brand-slate-400 hover:text-rose-500 transition-colors cursor-pointer text-sm font-medium"
          >
            <LogOut size={18} />
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col gap-8 custom-scrollbar">
        <header className="flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-brand-slate-900">Olá, {profile.name.split(' ')[0]}</h1>
            <p className="text-brand-slate-500">O seu patrimônio cresceu 1.2% hoje.</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="bg-white border border-brand-slate-200 px-6 py-2 rounded-full text-sm font-medium hover:bg-brand-slate-50 transition-colors shadow-sm">
              Metas
            </button>
            <div className="w-10 h-10 bg-brand-slate-200 rounded-full flex items-center justify-center font-bold text-brand-slate-500 shadow-inner">
              {profile.name.charAt(0)}
            </div>
          </div>
        </header>

        {renderContent()}
      </main>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm"
          >
            <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 border-2 border-white/20 backdrop-blur-md">
              <div className="bg-white/20 p-2 rounded-full">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="font-bold">Pagamento Identificado!</p>
                <p className="text-xs opacity-90">O link de depósito foi processado com sucesso.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Meta Assistant Toggle for Mobile */}
      <button 
        onClick={() => setShowAdvisor(true)}
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-brand-dark-teal text-white rounded-2xl shadow-2xl flex items-center justify-center active:scale-95 transition-all z-50"
      >
        <Bot size={28} />
      </button>

      {/* Modals */}
      <AnimatePresence>
        {showPix && (
          <PixDeposit 
            onClose={() => setShowPix(false)} 
            userId={profile.uid} 
            userEmail={profile.email}
          />
        )}
        {showWithdraw && (
          <PixWithdraw 
            onClose={() => setShowWithdraw(false)} 
            userId={profile.uid}
            balance={profile.balance}
          />
        )}
        {showAdvisor && (
          <AIAdvisor 
            onClose={() => setShowAdvisor(false)} 
            profile={profile}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

