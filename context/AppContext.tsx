/**
 * AppContext.tsx
 * -------------
 * Replaces the subscribe/notify pattern from mockStore.
 * Provides all app-level data and mutation functions to the component tree.
 */
import React, {
  createContext, useContext, useState, useEffect,
  useCallback, useRef
} from 'react';
import {
  Market, Position, Trade, LedgerEntry, DepositMethodConfig,
  Config, User, Side, Outcome, KycStatus, Role, QuizQuestion, QuizAnswer, Category
} from '../types';
import * as svc from '../services/supabaseService';
import { useAuth } from './AuthContext';

interface AppContextType {
  // Data
  markets: Market[];
  positions: Position[];
  trades: Trade[];
  ledger: LedgerEntry[];
  depositMethods: DepositMethodConfig[];
  config: Config;
  activeQuiz: QuizQuestion | null;

  // Loading states
  marketsLoading: boolean;
  portfolioLoading: boolean;

  // Market ops
  refreshMarkets: () => Promise<void>;
  adminCreateMarket: (data: Partial<Market>) => Promise<void>;
  adminUpdateMarketField: (id: string, field: string, value: any) => Promise<void>;
  adminResolveMarket: (marketId: string, outcome: Outcome) => Promise<{ winners: number; losers: number; cancelled: number; total_invested: number; total_paid: number; house_profit: number }>;

  // Trade ops
  buy: (marketId: string, side: Side, price: number, quantity: number, outcomeId?: string) => Promise<void>;
  sell: (marketId: string, side: Side, price: number, quantity: number, outcomeId?: string) => Promise<void>;
  refreshPortfolio: () => Promise<void>;

  // Finance ops
  requestDeposit: (amountCents: number, reference: string, method: string, screenshotProofUrl?: string) => Promise<void>;
  requestWithdrawal: (amountCents: number, destination: string) => Promise<void>;
  refreshLedger: () => Promise<void>;

  // Admin finance
  approveDeposit: (id: string) => Promise<void>;
  rejectDeposit: (id: string) => Promise<void>;
  approveWithdrawal: (id: string) => Promise<void>;
  rejectWithdrawal: (id: string) => Promise<void>;
  getPendingDeposits: () => LedgerEntry[];
  getPendingWithdrawals: () => LedgerEntry[];

  // Admin user ops
  allUsers: User[];
  refreshAllUsers: () => Promise<void>;
  adminUpdateUserRole: (userId: string, role: Role) => Promise<void>;
  adminUpdateKycStatus: (userId: string, status: KycStatus) => Promise<void>;
  adminAdjustBalance: (userId: string, amount: number, description: string) => Promise<void>;
  adminCreateUser: (email: string, password: string, name: string, role: Role) => Promise<void>;

  // Settings ops
  adminUpdateConfig: (value: Record<string, any>) => Promise<void>;
  adminCreateDepositMethod: (method: Omit<DepositMethodConfig, 'isActive'> & { isActive?: boolean }) => Promise<void>;
  adminUpdateDepositMethod: (id: string, updates: Partial<DepositMethodConfig>) => Promise<void>;
  adminDeleteDepositMethod: (id: string) => Promise<void>;

  // Quiz ops
  getUserQuizAnswer: (quizId: string) => Promise<QuizAnswer | null>;
  answerQuiz: (quizId: string, selectedIndex: number) => Promise<QuizAnswer>;
  adminGetQuizzes: () => Promise<any[]>;
  adminCreateQuiz: (question: string, options: string[], correctIndex: number, rewardCents: number) => Promise<void>;
  adminDeleteQuiz: (id: string) => Promise<void>;
  adminEndQuizEarly: (id: string) => Promise<void>;

  // Stats
  adminGetStats: () => Promise<any>;
  adminGetAllTrades: () => Promise<Trade[]>;

  // Category ops
  categories: Category[];
  refreshCategories: () => Promise<void>;
  adminCreateCategory: (name: string, icon?: string, color?: string) => Promise<Category>;
  adminUpdateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  adminDeleteCategory: (id: string) => Promise<void>;
  adminGetAllCategories: () => Promise<Category[]>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, isAdmin, refreshProfile } = useAuth();

  const [markets, setMarkets] = useState<Market[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [depositMethods, setDepositMethods] = useState<DepositMethodConfig[]>([]);
  const [config, setConfig] = useState<Config>({ key: 'app', value: { tradingFee: 0 }, updatedAt: '', updatedBy: '' });
  const [activeQuiz, setActiveQuiz] = useState<QuizQuestion | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [marketsLoading, setMarketsLoading] = useState(true);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const userId = userProfile?.id;

  // ── Initial loads ──────────────────────────────────────────

  const refreshMarkets = useCallback(async () => {
    setMarketsLoading(true);
    try {
      const m = await svc.getMarkets();
      setMarkets(m);
    } finally {
      setMarketsLoading(false);
    }
  }, []);

  const refreshCategories = useCallback(async () => {
    try {
      const c = await svc.getCategories();
      setCategories(c);
    } catch {
      // categories table may not exist yet — silently ignore
    }
  }, []);

  const refreshPortfolio = useCallback(async () => {
    if (!userId) return;
    setPortfolioLoading(true);
    try {
      const [p, t, l] = await Promise.all([
        svc.getPositions(userId),
        svc.getTrades(userId),
        svc.getLedger(userId),
      ]);
      setPositions(p);
      setTrades(t);
      setLedger(l);
    } finally {
      setPortfolioLoading(false);
    }
  }, [userId]);

  const refreshLedger = useCallback(async () => {
    if (!userId) return;
    const l = await svc.getLedger(userId);
    setLedger(l);
  }, [userId]);

  const refreshConfig = useCallback(async () => {
    const c = await svc.getConfig();
    setConfig(c);
    const dm = await svc.getDepositMethods();
    setDepositMethods(dm);
  }, []);

  const refreshAllUsers = useCallback(async () => {
    if (!isAdmin) return;
    const u = await svc.adminGetAllUsers();
    setAllUsers(u);
  }, [isAdmin]);

  // Load markets + config on mount
  useEffect(() => {
    refreshMarkets();
    refreshConfig();
    refreshCategories();
    svc.getActiveQuiz().then(setActiveQuiz);
  }, [refreshMarkets, refreshConfig, refreshCategories]);

  // Load user data when authenticated
  useEffect(() => {
    if (userId) {
      refreshPortfolio();
    } else {
      setPositions([]);
      setTrades([]);
      setLedger([]);
    }
  }, [userId, refreshPortfolio]);

  // Load admin data when admin
  useEffect(() => {
    if (isAdmin) {
      refreshAllUsers();
    }
  }, [isAdmin, refreshAllUsers]);

  // ── Market ops ─────────────────────────────────────────────

  const adminCreateMarket = async (data: Partial<Market>) => {
    await svc.adminCreateMarket(data);
    await refreshMarkets();
  };

  const adminUpdateMarketField = async (id: string, field: string, value: any) => {
    await svc.adminUpdateMarketField(id, field, value);
    await refreshMarkets();
  };

  const adminResolveMarket = async (marketId: string, outcome: Outcome) => {
    const result = await svc.adminResolveMarket(marketId, outcome);
    // Refresh everything affected by settlement: markets, user balances, ledger
    await Promise.all([refreshMarkets(), refreshAllUsers(), refreshAllLedger()]);
    // Also refresh current user's own portfolio if they had a position
    if (userId) await refreshPortfolio();
    return result;
  };

  // ── Trade ops ──────────────────────────────────────────────

  const TRADING_FEE_PERCENT = 1.5; // 1.5% fee on all trades

  const buy = async (
    marketId: string, side: Side, price: number,
    quantity: number, outcomeId?: string
  ) => {
    if (!userId) throw new Error('Not authenticated');
    const market = markets.find(m => m.id === marketId);
    const commissionPercent = market?.commission || 0;
    const cost = price * quantity;
    const commission = Math.round((cost * commissionPercent) / 100);
    const tradingFee = Math.round((cost * TRADING_FEE_PERCENT) / 100);

    await svc.executeBuy(userId, marketId, side, price, quantity, outcomeId, commission, tradingFee);

    const increment = Math.floor(quantity / 100);
    if (increment > 0 && market) {
      if (outcomeId && market.outcomes) {
        const updatedOutcomes = market.outcomes.map(o => {
          if (o.id === outcomeId) {
            return { ...o, probability: Math.min(100, o.probability + increment) };
          }
          return o;
        });
        await svc.adminUpdateMarketField(marketId, 'outcomes', updatedOutcomes);
      } else {
        const currentProb = market.probability;
        let newProb = currentProb;
        if (side === 'YES') {
          newProb = Math.min(100, currentProb + increment);
        } else if (side === 'NO') {
          newProb = Math.max(0, currentProb - increment);
        }
        await svc.adminUpdateMarketField(marketId, 'probability', newProb);
      }
    }

    await Promise.all([refreshPortfolio(), refreshProfile(), refreshMarkets()]);
  };

  const sell = async (
    marketId: string, side: Side, price: number,
    quantity: number, outcomeId?: string
  ) => {
    if (!userId) throw new Error('Not authenticated');
    const market = markets.find(m => m.id === marketId);
    const commissionPercent = market?.commission || 0;
    const revenue = price * quantity;
    const commission = Math.round((revenue * commissionPercent) / 100);
    const tradingFee = Math.round((revenue * TRADING_FEE_PERCENT) / 100);

    await svc.executeSell(userId, marketId, side, price, quantity, outcomeId, commission, tradingFee);
    await Promise.all([refreshPortfolio(), refreshProfile(), refreshMarkets()]);
  };

  // ── Finance ops ────────────────────────────────────────────

  const requestDeposit = async (
    amountCents: number, reference: string,
    method: string, screenshotProofUrl?: string
  ) => {
    if (!userId) throw new Error('Not authenticated');
    await svc.requestDeposit(userId, amountCents, reference, method, screenshotProofUrl);
    await refreshLedger();
  };

  const requestWithdrawal = async (amountCents: number, destination: string) => {
    if (!userId) throw new Error('Not authenticated');
    await svc.requestWithdrawal(userId, amountCents, destination);
    await Promise.all([refreshLedger(), refreshProfile()]);
  };

  const approveDeposit = async (id: string) => {
    await svc.approveDeposit(id);
    await Promise.all([refreshAllLedger(), refreshAllUsers()]);
  };

  const rejectDeposit = async (id: string) => {
    await svc.rejectDeposit(id);
    await refreshAllLedger();
  };

  const approveWithdrawal = async (id: string) => {
    await svc.approveWithdrawal(id);
    await refreshAllLedger();
  };

  const rejectWithdrawal = async (id: string) => {
    await svc.rejectWithdrawal(id);
    await refreshAllLedger();
  };

  // For admin: load all ledger entries (deposits + withdrawals)
  const [allLedger, setAllLedger] = useState<LedgerEntry[]>([]);
  const refreshAllLedger = useCallback(async () => {
    if (!isAdmin) return;
    const l = await svc.getAllLedger();
    setAllLedger(l);
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) refreshAllLedger();
  }, [isAdmin, refreshAllLedger]);

  const getPendingDeposits = () =>
    allLedger.filter(l => l.type === 'DEPOSIT' && l.status === 'PENDING');

  const getPendingWithdrawals = () =>
    allLedger.filter(l => l.type === 'WITHDRAWAL' && l.status === 'PENDING');

  // ── Admin user ops ─────────────────────────────────────────

  const adminUpdateUserRole = async (userId: string, role: Role) => {
    await svc.adminUpdateUserRole(userId, role);
    await refreshAllUsers();
  };

  const adminUpdateKycStatus = async (userId: string, status: KycStatus) => {
    await svc.adminUpdateKycStatus(userId, status);
    await refreshAllUsers();
  };

  const adminAdjustBalance = async (userId: string, amount: number, description: string) => {
    await svc.adminAdjustBalance(userId, amount, description);
    await refreshAllUsers();
  };

  const adminCreateUser = async (
    email: string, password: string, name: string, role: Role
  ) => {
    await svc.adminCreateUser(email, password, name, role);
    await refreshAllUsers();
  };

  // ── Settings ops ───────────────────────────────────────────

  const adminUpdateConfig = async (value: Record<string, any>) => {
    const updaterName = userProfile?.name || 'Admin';
    await svc.adminUpdateConfig(updaterName, value);
    const c = await svc.getConfig();
    setConfig(c);
  };

  const adminCreateDepositMethod = async (method: Omit<DepositMethodConfig, 'isActive'> & { isActive?: boolean }) => {
    await svc.adminCreateDepositMethod(method);
    const dm = await svc.getDepositMethods();
    setDepositMethods(dm);
  };

  const adminUpdateDepositMethod = async (id: string, updates: Partial<DepositMethodConfig>) => {
    await svc.adminUpdateDepositMethod(id, updates);
    const dm = await svc.getDepositMethods();
    setDepositMethods(dm);
  };

  const adminDeleteDepositMethod = async (id: string) => {
    await svc.adminDeleteDepositMethod(id);
    const dm = await svc.getDepositMethods();
    setDepositMethods(dm);
  };

  // ── Quiz ops ───────────────────────────────────────────────

  const getUserQuizAnswer = async (quizId: string) => {
    if (!userId) return null;
    return svc.getUserQuizAnswer(userId, quizId);
  };

  const answerQuiz = async (quizId: string, selectedIndex: number) => {
    if (!userId) throw new Error('Not authenticated');
    const answer = await svc.answerQuiz(userId, quizId, selectedIndex);
    await Promise.all([refreshLedger(), refreshProfile()]);
    return answer;
  };

  const adminGetQuizzes = () => svc.adminGetQuizzes();

  const adminCreateQuiz = async (
    question: string, options: string[],
    correctIndex: number, rewardCents: number
  ) => {
    await svc.adminCreateQuiz(question, options, correctIndex, rewardCents);
    const q = await svc.getActiveQuiz();
    setActiveQuiz(q);
  };

  const adminDeleteQuiz = async (id: string) => {
    await svc.adminDeleteQuiz(id);
    const q = await svc.getActiveQuiz();
    setActiveQuiz(q);
  };

  const adminEndQuizEarly = async (id: string) => {
    await svc.adminEndQuizEarly(id);
    const q = await svc.getActiveQuiz();
    setActiveQuiz(q);
  };

  // ── Stats ──────────────────────────────────────────────────────
  const adminGetStats = () => svc.adminGetStats();
  const adminGetAllTrades = () => svc.getAllTrades();

  // ── Category ops ────────────────────────────────────────────

  const adminCreateCategory = async (name: string, icon?: string, color?: string): Promise<Category> => {
    const cat = await svc.adminCreateCategory(name, icon, color);
    await refreshCategories();
    return cat;
  };

  const adminUpdateCategory = async (id: string, updates: Partial<Category>) => {
    await svc.adminUpdateCategory(id, {
      name: updates.name,
      icon: updates.icon,
      color: updates.color,
      isActive: updates.isActive,
      sortOrder: updates.sortOrder,
    });
    await refreshCategories();
  };

  const adminDeleteCategory = async (id: string) => {
    await svc.adminDeleteCategory(id);
    await refreshCategories();
  };

  const adminGetAllCategories = () => svc.adminGetAllCategories();

  const value: AppContextType = {
    markets, positions, trades, ledger, depositMethods, config, activeQuiz,
    marketsLoading, portfolioLoading,
    refreshMarkets, adminCreateMarket, adminUpdateMarketField, adminResolveMarket,
    buy, sell, refreshPortfolio,
    requestDeposit, requestWithdrawal, refreshLedger,
    approveDeposit, rejectDeposit, approveWithdrawal, rejectWithdrawal,
    getPendingDeposits, getPendingWithdrawals,
    allUsers, refreshAllUsers,
    adminUpdateUserRole, adminUpdateKycStatus, adminAdjustBalance, adminCreateUser,
    adminUpdateConfig, adminCreateDepositMethod, adminUpdateDepositMethod, adminDeleteDepositMethod,
    getUserQuizAnswer, answerQuiz,
    adminGetQuizzes, adminCreateQuiz, adminDeleteQuiz, adminEndQuizEarly,
    adminGetStats, adminGetAllTrades,
    categories, refreshCategories,
    adminCreateCategory, adminUpdateCategory, adminDeleteCategory, adminGetAllCategories,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
};
