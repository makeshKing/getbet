
import { Market, User, Order, Position, Side, KycStatus, Role, Comment, LedgerEntry, LedgerType, Config, AuditLogEntry, Outcome, Trade, QuizQuestion, QuizAnswer, DepositMethodConfig, SavedAddress } from '../types';

// Email Stub
const sendEmail = (to: string, subject: string, body: string) => {
  console.log(`[EMAIL STUB] To: ${to} | Subject: ${subject} | Body: ${body}`);
};

export interface EquityPoint {
  timestamp: string;
  equity: number;
  cash: number;
  holdings: number;
  unrealizedPnL: number;
  totalDeposited: number;
  totalWithdrawn: number;
}

export interface PerformanceStats {
  totalRealizedPnL: number;
  allTimeVolume: number;
  tradesCount: number;
  winRate: number; // 0-100
  bestTrade: number; // max profit in one trade
}

// Initial Mock Data
export const MOCK_USER: User = {
  id: 'user_1',
  email: 'admin@predictkit.com',
  name: 'Admin',
  password: 'password123',
  avatarUrl: 'https://picsum.photos/200',
  balance: 1000000, // 10,000.00 Rs
  totalDeposited: 1000000, // Matches balance for 0 P/L start
  totalWithdrawn: 0,
  withdrawableBalance: 950000,
  kycStatus: KycStatus.APPROVED,
  role: Role.ADMIN,
  savedAddresses: [
    {
      id: 'addr_default',
      address: 'admin@predictkit.com',
      label: 'Primary Email',
      isDefault: true,
      createdAt: new Date().toISOString()
    }
  ]
};

export const HOUSE_USER_ID = 'usr_house';

export const MOCK_MARKETS: Market[] = [
  {
    id: 'mkt_trump_vs_harris',
    title: 'Trump vs Harris: 2024 Presidential Election',
    description: 'Direct head-to-head on who wins the Electoral College. Resolves to YES if Donald Trump wins, NO if Kamala Harris wins.',
    category: 'Politics',
    subcategory: 'Head-to-Head',
    closeDate: '2024-11-05T23:59:59Z',
    startDate: '2024-01-01T00:00:00Z',
    resolutionSource: 'Associated Press (AP)',
    probability: 52,
    volume: 850000000,
    imageUrl: 'https://images.unsplash.com/photo-1541872703-74c5e443d1f9?q=80&w=400&h=200&auto=format&fit=crop',
    isTrending: true,
    isLocked: false,
    slug: 'trump-vs-harris-2024',
    candidateA: { name: 'Donald Trump', imageUrl: 'https://picsum.photos/200?random=trump', color: '#ef4444' },
    candidateB: { name: 'Kamala Harris', imageUrl: 'https://picsum.photos/200?random=harris', color: '#3b82f6' }
  },
  {
    id: 'mkt_elon_vs_mark',
    title: 'Cage Match: Elon Musk vs Mark Zuckerberg',
    description: 'Who would win in a hypothetical physical bout? YES for Musk, NO for Zuckerberg.',
    category: 'Culture',
    subcategory: 'Head-to-Head',
    closeDate: '2025-12-31T23:59:59Z',
    startDate: '2024-06-01T00:00:00Z',
    resolutionSource: 'Official Fight Commission / Verified Livestream',
    probability: 45,
    volume: 12000000,
    imageUrl: 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?q=80&w=400&h=200&auto=format&fit=crop',
    isTrending: true,
    isLocked: false,
    slug: 'musk-vs-zuck-cage-match',
    candidateA: { name: 'Elon Musk', imageUrl: 'https://picsum.photos/200?random=elon', color: '#1e293b' },
    candidateB: { name: 'Mark Zuckerberg', imageUrl: 'https://picsum.photos/200?random=mark', color: '#1877f2' }
  }
];

type Listener = () => void;
let listeners: Listener[] = [];

const notify = () => {
  listeners.forEach(l => l());
  // Save state on every update
  if (typeof store !== 'undefined') {
    (store as any).saveToStorage();
  }
};

export const subscribe = (listener: Listener) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
};

class Store {
  user: User | null = null;
  users: User[] = [MOCK_USER];
  markets: Market[] = MOCK_MARKETS;

  login(email: string, password?: string) {
    const user = this.users.find(u => u.email === email && (password ? u.password === password : true));
    if (user) {
      this.user = user;
      this.equityHistory = this.generateInitialHistory();
      notify();
      return true;
    }
    return false;
  }

  signup(email: string, password?: string, name?: string) {
    if (this.users.find(u => u.email === email)) {
      throw new Error("User already exists");
    }
    const newUser: User = {
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      email,
      name: name || email.split('@')[0],
      password,
      avatarUrl: `https://ui-avatars.com/api/?name=${name || email}&background=random`,
      balance: 0,
      totalDeposited: 0,
      totalWithdrawn: 0,
      withdrawableBalance: 0,
      kycStatus: KycStatus.PENDING,
      role: Role.USER,
      savedAddresses: []
    };
    this.users.push(newUser);
    this.user = newUser;
    this.equityHistory = this.generateInitialHistory();
    notify();
    return newUser;
  }

  adminCreateUser(email: string, password?: string, name?: string, role: Role = Role.USER) {
    if (this.users.find(u => u.email === email)) {
      throw new Error("User already exists");
    }
    const newUser: User = {
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      email,
      name: name || email.split('@')[0],
      password,
      avatarUrl: `https://ui-avatars.com/api/?name=${name || email}&background=random`,
      balance: 0,
      totalDeposited: 0,
      totalWithdrawn: 0,
      withdrawableBalance: 0,
      kycStatus: KycStatus.PENDING,
      role: role,
      savedAddresses: []
    };
    this.users.push(newUser);
    notify();
    return newUser;
  }

  logout() {
    this.user = null;
    notify();
  }
  positions: Position[] = [];
  trades: Trade[] = [];
  comments: Comment[] = [];
  ledger: LedgerEntry[] = [];
  config: Config = { key: 'app', value: { tradingFee: 0 }, updatedAt: '', updatedBy: '' };
  auditLogs: AuditLogEntry[] = [];

  // Deposit Methods Management
  depositMethods: DepositMethodConfig[] = [
    {
      id: 'esewa',
      name: 'eSewa',
      accountName: 'PredictKit Admin',
      accountNumber: '9840000000',
      instructions: 'Transfer funds to the eSewa ID above and enter the Transaction Code below.',
      isActive: true
    },
    {
      id: 'khalti',
      name: 'Khalti',
      accountName: 'PredictKit Nepal',
      accountNumber: '9860000000',
      instructions: 'Send money to our Khalti wallet and provide the Receipt ID.',
      isActive: true
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      accountName: 'PredictKit Pvt Ltd',
      accountNumber: '001002003004005 (Global IME)',
      instructions: 'Standard banking transfer. Usually verified within 3-4 hours.',
      isActive: true
    }
  ];

  quizzes: QuizQuestion[] = [
    {
      id: 'quiz_1',
      question: 'Which company is the largest producer of GPUs as of 2024?',
      options: ['Intel', 'NVIDIA', 'AMD', 'Apple'],
      correctIndex: 1,
      rewardCents: 2500, // 25.00 Rs
      activeTill: new Date(Date.now() + 86400000).toISOString()
    }
  ];
  quizAnswers: QuizAnswer[] = [];

  equityHistory: EquityPoint[] = this.generateInitialHistory();
  performance: PerformanceStats = {
    totalRealizedPnL: 0,
    allTimeVolume: 0,
    tradesCount: 0,
    winRate: 75,
    bestTrade: 150000
  };

  private generateInitialHistory(): EquityPoint[] {
    if (!this.user) return [];

    // Generate history based on ledger if available, otherwise fallback to smart simulation
    const history: EquityPoint[] = [];
    const now = Date.now();
    const days = 30;

    // Filter positions for current user
    const userPositions = this.positions.filter(p => !p.userId || p.userId === this.user!.id);

    // 1. Calculate current state (Endpoint)
    const currentHoldings = userPositions.reduce((acc, p) => {
      const m = this.getMarket(p.marketId);
      let price = 0;
      if (m) {
        if (p.outcomeId && m.outcomes) {
          const o = m.outcomes.find(oc => oc.id === p.outcomeId);
          if (o) price = p.side === Side.YES ? o.probability * 100 : (100 - o.probability) * 100;
        } else {
          price = p.side === Side.YES ? m.probability * 100 : (100 - m.probability) * 100;
        }
      }
      return acc + (price * p.quantity);
    }, 0);
    const currentEquity = this.user.balance + currentHoldings;

    // 2. Identify Start Point (30 days ago)
    // Assume 30 days ago, equity was roughly equal to what they had deposited back then?
    // For mock simplicity: Start at 'Total Deposited' - 'Total Withdrawn' (Net Invested)
    // If they have 0 deposited, start at 0.
    const startEquity = Math.max(0, this.user.totalDeposited - (this.user.totalWithdrawn || 0));

    // 3. Generate points interpolating from Start -> End with noise
    const currentDeposited = this.user.totalDeposited;
    const currentWithdrawn = this.user.totalWithdrawn || 0;

    for (let i = days; i >= 0; i--) {
      const time = new Date(now - i * 24 * 60 * 60 * 1000).toISOString();

      // Linear progress (0 to 1)
      const progress = 1 - (i / days);

      // Base Linear Interpolation
      let equity = startEquity + (currentEquity - startEquity) * progress;

      // Add Random Walk / Volatility
      // Volatility should be higher in the middle, lower at ends to ensure we hit targets roughly
      // But we MUST hit the exact currentEquity at i=0
      if (i > 0) {
        // If start and end are same, use very low volatility just to show life, unless balance is 0
        const spread = Math.abs(currentEquity - startEquity);
        let volatility = 0;

        if (spread === 0 && startEquity > 0) {
          volatility = startEquity * 0.005; // 0.5% fluctuation for flat line
        } else {
          volatility = (startEquity + currentEquity) / 2 * 0.05; // 5% volatility normal
        }

        const noise = (Math.random() - 0.5) * volatility * Math.sin(progress * Math.PI); // Sin wave envelope
        equity += noise;
      } else {
        equity = currentEquity; // Force exact match for 'now'
      }

      history.push({
        timestamp: time,
        equity: Math.max(0, Math.round(equity)),
        cash: Math.max(0, Math.round(equity * 0.8)), // Mock cash ratio
        holdings: Math.max(0, Math.round(equity * 0.2)),
        unrealizedPnL: 0,
        totalDeposited: currentDeposited,
        totalWithdrawn: currentWithdrawn
      });
    }

    return history;
  }

  recordEquity() {
    if (!this.user) return;
    const userPositions = this.positions.filter(p => p.userId === this.user!.id);

    const positionValue = userPositions.reduce((acc, p) => {
      const m = this.getMarket(p.marketId);
      let price = 0;
      if (m) {
        if (p.outcomeId && m.outcomes) {
          const o = m.outcomes.find(oc => oc.id === p.outcomeId);
          if (o) price = p.side === Side.YES ? o.probability * 100 : (100 - o.probability) * 100;
        } else {
          price = p.side === Side.YES ? m.probability * 100 : (100 - m.probability) * 100;
        }
      }
      return acc + (price * p.quantity);
    }, 0);

    const costBasis = userPositions.reduce((acc, p) => acc + (p.avgPrice * p.quantity), 0);
    const unrealizedPnL = positionValue - costBasis;
    const totalEquity = this.user.balance + positionValue;

    const newPoint: EquityPoint = {
      timestamp: new Date().toISOString(),
      equity: totalEquity,
      cash: this.user.balance,
      holdings: positionValue,
      unrealizedPnL: unrealizedPnL,
      totalDeposited: this.user.totalDeposited,
      totalWithdrawn: this.user.totalWithdrawn || 0
    };

    this.equityHistory = [...this.equityHistory, newPoint].slice(-100);
    notify();
  }

  // Admin: Update Deposit Methods
  adminUpdateDepositMethod(id: string, updates: Partial<DepositMethodConfig>) {
    const idx = this.depositMethods.findIndex(m => m.id === id);
    if (idx > -1) {
      this.depositMethods[idx] = { ...this.depositMethods[idx], ...updates };
      notify();
    }
  }

  userGetActiveQuiz() {
    return this.quizzes.find(q => new Date(q.activeTill) > new Date());
  }

  userGetQuizAnswer(quizId: string) {
    return this.quizAnswers.find(a => a.quizId === quizId);
  }

  userAnswerQuiz(quizId: string, selectedIndex: number) {
    const quiz = this.quizzes.find(q => q.id === quizId);
    if (!quiz) throw new Error("Quiz not found");
    const existing = this.userGetQuizAnswer(quizId);
    if (existing) throw new Error("Already answered");
    const isCorrect = selectedIndex === quiz.correctIndex;
    const reward = isCorrect ? quiz.rewardCents : 0;
    const answer: QuizAnswer = { quizId, selectedIndex, isCorrect, rewardCents: reward, timestamp: new Date().toISOString() };
    this.quizAnswers.push(answer);
    if (isCorrect) {
      this.user.balance += reward;
      this.user.withdrawableBalance += reward;
      this.ledger = [{ id: Math.random().toString(36).substr(2, 9), userId: this.user.id, amount: reward, currency: 'NPR', type: LedgerType.TRADE_PROFIT, description: `Quiz Reward: ${quiz.question}`, createdAt: new Date().toISOString(), status: 'COMPLETED' }, ...this.ledger];
      this.recordEquity();
    }
    notify();
    return answer;
  }

  // Helper to maintain state consistency
  private updateUser(userId: string, updater: (u: User) => Partial<User>) {
    const idx = this.users.findIndex(u => u.id === userId);
    if (idx === -1) return;

    const updates = updater(this.users[idx]);
    this.users[idx] = { ...this.users[idx], ...updates };

    // Sync active session user if it's the same person
    if (this.user.id === userId) {
      this.user = { ...this.users[idx] };
    }
    notify();
  }

  // Helper: Recalculate and normalize probabilities (sum to 100)
  private recalculateProbabilities(outcomes: any[], targetId: string, change: number): any[] {
    const target = outcomes.find(o => o.id === targetId);
    if (!target) return outcomes;

    let newTargetProb = target.probability + change;
    // Clamp between 1 and 99
    newTargetProb = Math.max(1, Math.min(99, newTargetProb));

    // If no change after clamping, return original
    if (newTargetProb === target.probability) return outcomes;

    const actualChange = newTargetProb - target.probability;
    const otherOutcomes = outcomes.filter(o => o.id !== targetId);
    const totalOtherProb = otherOutcomes.reduce((sum, o) => sum + o.probability, 0);

    return outcomes.map(o => {
      if (o.id === targetId) {
        return { ...o, probability: newTargetProb };
      } else {
        // Distribute the change proportionally among others
        // If target prob increases, others must decrease
        // New Prob = Old Prob * (Remaining % / Old Remaining %)
        // Simplification: Subtract proportional share of the change
        if (totalOtherProb === 0) return o; // Should not happen in healthy market
        const proportion = o.probability / totalOtherProb;
        let newProb = o.probability - (actualChange * proportion);
        return { ...o, probability: Math.max(0, newProb) }; // Allow 0 for others temporarily, though clamp 1-99 usually preferred
      }
    });
  }

  buy(marketId: string, side: Side, price: number, quantity: number, outcomeId?: string) {
    if (!this.user) throw new Error("User not authenticated");
    const cost = price * quantity;
    if (this.user.balance < cost) throw new Error("Insufficient funds");

    const market = this.getMarket(marketId);
    const commissionPercent = market?.commission || 0;
    const commissionAmount = Math.round((cost * commissionPercent) / 100);
    const tradingFee = this.config.value.tradingFee || 0;
    const totalCost = cost + commissionAmount + tradingFee; // Include commission and fixed fee

    if (this.user.balance < totalCost) throw new Error("Insufficient funds for trade and commission");

    // Deduct the full amount (cost + commission + fee) from user balance
    this.updateUser(this.user.id, (u) => ({
      balance: u.balance - totalCost,
      withdrawableBalance: u.withdrawableBalance - totalCost
    }));

    // Record the commission in ledger
    if (commissionAmount > 0) {
      this.ledger = [{
        id: Math.random().toString(36).substr(2, 9),
        userId: this.user.id,
        amount: commissionAmount,
        currency: 'NPR',
        type: LedgerType.TRADE_FEE,
        description: `Commission for buying ${quantity} shares of ${market?.title || 'Unknown Market'}`,
        createdAt: new Date().toISOString(),
        status: 'COMPLETED'
      }, ...this.ledger];
    }

    // Record the fixed trading fee in ledger
    if (tradingFee > 0) {
      this.ledger = [{
        id: Math.random().toString(36).substr(2, 9),
        userId: this.user.id,
        amount: tradingFee,
        currency: 'NPR',
        type: LedgerType.TRADE_FEE,
        description: `Fixed Trading Fee for buying ${quantity} shares`,
        createdAt: new Date().toISOString(),
        status: 'COMPLETED'
      }, ...this.ledger];
    }

    const outcomeTitle = outcomeId && market?.outcomes ? market.outcomes.find(o => o.id === outcomeId)?.name : undefined;

    const trade: Trade = { id: Math.random().toString(36).substr(2, 9), userId: this.user.id, marketId, marketTitle: market?.title || 'Unknown', side, price, shares: quantity, amount: cost, potentialWin: quantity * 10000, status: 'WAITING', type: 'BUY', createdAt: new Date().toISOString(), outcomeId, outcomeTitle };
    this.trades = [trade, ...this.trades];

    // Find Position specific to this USER
    const existingIdx = this.positions.findIndex(p => p.userId === this.user!.id && p.marketId === marketId && p.side === side && p.outcomeId === outcomeId);

    if (existingIdx > -1) {
      const p = this.positions[existingIdx];
      const newQty = p.quantity + quantity;
      // Update average price (Cost Basis) to include total cost (Price + Fees)
      const newAvg = Math.round(((p.avgPrice * p.quantity) + totalCost) / newQty);
      this.positions[existingIdx] = { ...p, quantity: newQty, avgPrice: newAvg };
    } else {
      // New position cost basis includes fees
      const avgPrice = Math.round(totalCost / quantity);
      this.positions.push({ userId: this.user.id, marketId, side, quantity, avgPrice, outcomeId });
    }

    // Update Probabilities
    const mktIdx = this.markets.findIndex(m => m.id === marketId);
    if (mktIdx > -1) {
      const m = this.markets[mktIdx];
      let newProb = m.probability;
      let outcomes = m.outcomes;

      // Magnitude of change based roughly on "impact" (simplified for mock store)
      // e.g. 1% change for every trade, or dynamic based on volume. 
      // Let's use a fixed 1% pressure for simplicity but robust enough for demo.
      const pressure = 1;

      if (outcomeId && outcomes) {
        // Multi-Outcome: Normalize
        // Buying YES -> Increases Prob
        // Buying NO -> Decreases Prob
        const change = side === Side.YES ? pressure : -pressure;
        outcomes = this.recalculateProbabilities(outcomes, outcomeId, change);
      } else {
        // Standard Binary
        newProb = side === Side.YES ? Math.min(99, m.probability + pressure) : Math.max(1, m.probability - pressure);
      }

      this.markets[mktIdx] = { ...this.markets[mktIdx], volume: this.markets[mktIdx].volume + cost, probability: newProb, outcomes };
    }
    this.performance.allTimeVolume += cost;
    this.performance.tradesCount += 1;
    this.recordEquity();
    return true;
  }



  adminGetStats() {
    // Calculate total commission earnings from ledger entries
    const totalCommission = this.ledger.filter(l => l.type === LedgerType.TRADE_FEE).reduce((sum, entry) => sum + entry.amount, 0);

    return {
      totalUsers: this.users.length,
      totalMarkets: this.markets.length,
      totalVolume: this.markets.reduce((acc, m) => acc + (m.volume || 0), 0),
      totalCommission: Math.round(totalCommission),
      pendingWithdrawals: this.ledger.filter(l => l.type === LedgerType.WITHDRAWAL && l.status === 'PENDING').length,
      pendingDeposits: this.ledger.filter(l => l.type === LedgerType.DEPOSIT && l.status === 'PENDING').length,
      pendingKyc: this.users.filter(u => u.kycStatus === KycStatus.PENDING).length,
      pendingResolutions: this.markets.filter(m => !m.outcome).length
    };
  }

  getMarket(id: string) { return this.markets.find(m => m.id === id); }
  getLedger() { return this.ledger; }
  getUserTrades() { return this.trades; }
  getPendingWithdrawals() { return this.ledger.filter(l => l.type === LedgerType.WITHDRAWAL && l.status === 'PENDING'); }
  getPendingDeposits() {
    const pending = this.ledger.filter(l => l.type === LedgerType.DEPOSIT && l.status === 'PENDING');
    console.log('getPendingDeposits called, returning:', pending.length, 'entries');
    if (pending.length > 0) {
      console.log('First pending deposit screenshotProof length:', pending[0].screenshotProof?.length);
    }
    return pending;
  }

  requestDeposit(amountCents: number, reference: string, method: string = 'Generic', screenshotProof?: string) {
    if (!this.user) throw new Error("User not authenticated");
    console.log('requestDeposit called with:', { amountCents, reference, method, screenshotProof: screenshotProof ? screenshotProof.substring(0, 100) + '...' : 'undefined' });
    const entry: LedgerEntry = {
      id: Math.random().toString(36).substr(2, 9),
      userId: this.user.id,
      amount: amountCents,
      currency: 'NPR',
      type: LedgerType.DEPOSIT,
      description: `${method} Deposit${screenshotProof ? ' with Screenshot Proof' : ` (Ref: ${reference})`}`,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
      screenshotProof: screenshotProof
    };
    console.log('Created entry with screenshotProof length:', entry.screenshotProof?.length);
    this.ledger = [entry, ...this.ledger];
    console.log('Ledger updated, total entries:', this.ledger.length);
    console.log('Pending deposits count:', this.getPendingDeposits().length);
    notify();
  }

  approveDeposit(id: string) {
    const entry = this.ledger.find(l => l.id === id);
    if (entry && entry.status === 'PENDING') {
      entry.status = 'COMPLETED';
      this.updateUser(entry.userId, (u) => ({
        balance: u.balance + entry.amount,
        withdrawableBalance: u.withdrawableBalance + entry.amount,
        totalDeposited: u.totalDeposited + entry.amount
      }));
      this.recordEquity();
      notify();
    }
  }

  rejectDeposit(id: string) {
    const entry = this.ledger.find(l => l.id === id);
    if (entry && entry.status === 'PENDING') {
      entry.status = 'REJECTED';
      notify();
    }
  }

  // Method to add a new saved address
  addSavedAddress(address: string, label: string, isDefault: boolean = false) {
    if (!address || !label) throw new Error("Address and label are required");

    // If setting as default, unset other defaults
    if (isDefault && this.user.savedAddresses) {
      this.user.savedAddresses = this.user.savedAddresses.map(addr => ({
        ...addr,
        isDefault: false
      }));
    }

    const newAddress = {
      id: 'addr_' + Math.random().toString(36).substr(2, 9),
      address,
      label,
      isDefault,
      createdAt: new Date().toISOString()
    };

    if (!this.user.savedAddresses) {
      this.user.savedAddresses = [];
    }

    this.user.savedAddresses.push(newAddress);

    // If no default address exists and this isn't set as default, set it as default
    if (!isDefault && (!this.user.savedAddresses.some(addr => addr.isDefault))) {
      newAddress.isDefault = true;
    }

    if (this.user.id === this.user.id) this.user = { ...this.user };
    notify();
  }

  // Method to update a saved address
  updateSavedAddress(id: string, updates: Partial<SavedAddress>) {
    if (!this.user.savedAddresses) return;

    const addrIndex = this.user.savedAddresses.findIndex(addr => addr.id === id);
    if (addrIndex === -1) return;

    if (updates.isDefault) {
      // Unset other defaults if setting this as default
      this.user.savedAddresses = this.user.savedAddresses.map(addr => ({
        ...addr,
        isDefault: addr.id === id ? true : false
      }));
    }

    this.user.savedAddresses[addrIndex] = { ...this.user.savedAddresses[addrIndex], ...updates };

    if (this.user.id === this.user.id) this.user = { ...this.user };
    notify();
  }

  // Method to remove a saved address
  removeSavedAddress(id: string) {
    if (!this.user.savedAddresses) return;

    const addrIndex = this.user.savedAddresses.findIndex(addr => addr.id === id);
    if (addrIndex === -1) return;

    // Don't allow removal of the last address if it's the default
    if (this.user.savedAddresses.length === 1 && this.user.savedAddresses[0].isDefault) {
      throw new Error("Cannot remove the last address");
    }

    this.user.savedAddresses.splice(addrIndex, 1);

    // If the removed address was the default and there are other addresses, set the first as default
    if (this.user.savedAddresses.length > 0 && !this.user.savedAddresses.some(addr => addr.isDefault)) {
      this.user.savedAddresses[0].isDefault = true;
    }

    if (this.user.id === this.user.id) this.user = { ...this.user };
    notify();
  }

  // Method to get the default address
  getDefaultAddress() {
    if (!this.user.savedAddresses) return null;
    return this.user.savedAddresses.find(addr => addr.isDefault);
  }

  requestWithdrawal(amountCents: number, destination: string, saveAsNewAddress?: { label: string, isDefault: boolean }) {
    if (this.user.withdrawableBalance < amountCents) throw new Error("Insufficient funds");

    // Optionally save the address if requested
    if (saveAsNewAddress) {
      this.addSavedAddress(destination, saveAsNewAddress.label, saveAsNewAddress.isDefault);
    }

    this.updateUser(this.user.id, (u) => ({
      balance: u.balance - amountCents,
      withdrawableBalance: u.withdrawableBalance - amountCents,
      totalWithdrawn: (u.totalWithdrawn || 0) + amountCents
    }));
    this.ledger = [{ id: Math.random().toString(36).substr(2, 9), userId: this.user.id, amount: -amountCents, currency: 'NPR', type: LedgerType.WITHDRAWAL, description: `Withdrawal to ${destination}`, createdAt: new Date().toISOString(), status: 'PENDING' }, ...this.ledger];
    this.recordEquity();
  }

  approveWithdrawal(id: string) {
    const entry = this.ledger.find(l => l.id === id);
    if (entry) { entry.status = 'COMPLETED'; notify(); }
  }

  rejectWithdrawal(id: string) {
    const entry = this.ledger.find(l => l.id === id);
    if (entry && entry.status === 'PENDING') {
      entry.status = 'REJECTED';
      const refund = Math.abs(entry.amount);
      this.updateUser(entry.userId, (u) => ({
        balance: u.balance + refund,
        withdrawableBalance: u.withdrawableBalance + refund,
        totalWithdrawn: u.totalWithdrawn - refund
      }));
      this.recordEquity();
    }
  }

  adminUpdateUserRole(userId: string, role: Role) {
    this.updateUser(userId, () => ({ role }));
  }

  adminAdjustBalance(userId: string, amount: number, description: string) {
    if (this.users.some(u => u.id === userId)) {
      this.updateUser(userId, (u) => ({
        balance: u.balance + amount,
        withdrawableBalance: u.withdrawableBalance + amount
      }));
      this.ledger = [{ id: Math.random().toString(36).substr(2, 9), userId, amount, currency: 'NPR', type: LedgerType.MANUAL_ADJUSTMENT, description, createdAt: new Date().toISOString(), status: 'COMPLETED' }, ...this.ledger];
      this.recordEquity();
    }
  }

  adminUpdateKycStatus(userId: string, status: KycStatus, reason?: string) {
    this.updateUser(userId, () => ({ kycStatus: status }));
  }

  adminUpdateMarketStatus(id: string, field: keyof Market, value: any) {
    const market = this.markets.find(m => m.id === id);
    if (market) { (market as any)[field] = value; notify(); }
  }

  adminUpdateConfig(value: any) {
    this.config = { ...this.config, value, updatedAt: new Date().toISOString(), updatedBy: this.user.name };
    notify();
  }

  adminCreateMarket(data: Partial<Market>) {
    const market: Market = { id: 'mkt_' + Math.random().toString(36).substr(2, 9), title: data.title || '', description: data.description || '', category: data.category || '', subcategory: data.subcategory, slug: data.slug, closeDate: data.closeDate || new Date().toISOString(), startDate: data.startDate, resolutionSource: data.resolutionSource || '', probability: data.probability || 50, volume: 0, imageUrl: data.imageUrl || '', commission: data.commission || 0, candidateA: data.candidateA, candidateB: data.candidateB, outcomes: data.outcomes };
    this.markets = [market, ...this.markets];
    notify();
  }

  adminResolveMarket(marketId: string, outcome: Outcome) {
    const market = this.markets.find(m => m.id === marketId);
    if (market) {
      market.outcome = outcome;
      this.trades = this.trades.map(t => {
        if (t.marketId === marketId && t.status === 'WAITING') {
          const won = (t.side === Side.YES && outcome === Outcome.YES) || (t.side === Side.NO && outcome === Outcome.NO);
          return { ...t, status: won ? 'WON' : 'LOST' };
        }
        return t;
      });
      this.recordEquity();
    }
  }

  // Admin Quiz Management
  // Added missing adminGetQuizzes method
  adminGetQuizzes() {
    return this.quizzes.map(q => ({
      ...q,
      answerCount: this.quizAnswers.filter(a => a.quizId === q.id).length
    }));
  }

  // Added missing adminDeleteQuiz method
  adminDeleteQuiz(id: string) {
    this.quizzes = this.quizzes.filter(q => q.id !== id);
    notify();
  }

  // Added missing adminEndQuizEarly method
  adminEndQuizEarly(id: string) {
    const quiz = this.quizzes.find(q => q.id === id);
    if (quiz) {
      quiz.activeTill = new Date(Date.now() - 1000).toISOString();
      notify();
    }
  }

  // Added missing adminCreateQuiz method
  adminCreateQuiz(question: string, options: string[], correctIndex: number, rewardCents: number) {
    const quiz: QuizQuestion = {
      id: 'quiz_' + Math.random().toString(36).substr(2, 9),
      question,
      options,
      correctIndex,
      rewardCents,
      activeTill: new Date(Date.now() + 86400000).toISOString()
    };
    this.quizzes.push(quiz);
    notify();
  }

  // ... (previous methods)

  // Added persistence
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('predictkit_store_v1');
      if (stored) {
        const data = JSON.parse(stored);
        this.user = data.user || this.user;
        this.users = data.users || this.users;
        this.markets = data.markets || this.markets;
        this.positions = data.positions || this.positions;
        this.trades = data.trades || this.trades;
        this.ledger = data.ledger || this.ledger;
        this.config = data.config || this.config;
        this.depositMethods = data.depositMethods || this.depositMethods;
        this.quizzes = data.quizzes || this.quizzes;
        this.quizAnswers = data.quizAnswers || this.quizAnswers;

        if (this.user) {
          this.equityHistory = this.generateInitialHistory();
        }
        console.log('Store state loaded from localStorage');
      }
    } catch (e) {
      console.error('Failed to load store from storage:', e);
    }
  }

  private saveToStorage() {
    try {
      const state = {
        user: this.user,
        users: this.users,
        markets: this.markets,
        positions: this.positions,
        trades: this.trades,
        ledger: this.ledger,
        config: this.config,
        depositMethods: this.depositMethods,
        quizzes: this.quizzes,
        quizAnswers: this.quizAnswers
      };
      localStorage.setItem('predictkit_store_v1', JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save store to storage (likely quota exceeded):', e);
      // Try saving without potential large objects like ledger screenshots if necessary
      // specific logic could be added here
    }
  }
}

export const store = new Store();
// Load initial state
(store as any).loadFromStorage();

// Test function to simulate deposit with screenshot
export const testDepositWithScreenshot = () => {
  // Using a public test image URL instead of base64 to avoid potential CORS issues
  const testScreenshot = 'https://placehold.co/600x400/png?text=Test+Payment+Proof&cachebuster=' + Date.now();
  console.log('Testing deposit with screenshot...');
  console.log('Screenshot URL:', testScreenshot);
  store.requestDeposit(10000, '', 'Test Method', testScreenshot);
  console.log('Test deposit created');

  // Also log the store state
  console.log('Store ledger length:', store.ledger.length);
  console.log('Pending deposits from store:', store.getPendingDeposits().length);
};

