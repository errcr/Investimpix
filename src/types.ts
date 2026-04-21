export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  balance: number;
  totalInvested: number;
  updatedAt?: string;
}

export interface Portfolio {
  id: string;
  name: string;
  risk: 'Baixo' | 'Médio' | 'Alto';
  description: string;
  expectedReturn: string;
  color: string;
}

export interface Investment {
  id?: string;
  userId: string;
  portfolioId: string;
  portfolioName: string;
  amount: number;
  investedAt: any;
  status: 'active' | 'withdrawn';
}

export interface Transaction {
  id?: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'investment';
  amount: number;
  pixKey?: string;
  timestamp: any;
  status: 'completed' | 'pending';
}

export const PORTFOLIOS: Portfolio[] = [
  {
    id: 'conservative',
    name: 'Tesouro Direto',
    risk: 'Baixo',
    description: 'Investimento seguro em títulos públicos com liquidez diária.',
    expectedReturn: '10.5% a.a.',
    color: '#00D166'
  },
  {
    id: 'moderate',
    name: 'Fundo Tech Global',
    risk: 'Médio',
    description: 'Exposição às maiores empresas de tecnologia do mundo.',
    expectedReturn: '15.2% a.a.',
    color: '#00B1A5'
  },
  {
    id: 'aggressive',
    name: 'Crypto & Inovação',
    risk: 'Alto',
    description: 'Ativos digitais e startups disruptivas com alto potencial.',
    expectedReturn: '28.4% a.a.',
    color: '#6366F1'
  }
];
