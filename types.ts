
export enum Side {
  YES = 'YES',
  NO = 'NO'
}

export enum OrderStatus {
  OPEN = 'OPEN',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED'
}

export enum Outcome {
  YES = 'YES',
  NO = 'NO',
  CANCEL = 'CANCEL'
}

export enum KycStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export enum LedgerType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  TRADE_FEE = 'TRADE_FEE',
  TRADE_PROFIT = 'TRADE_PROFIT',
  TRADE_LOSS = 'TRADE_LOSS',
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
  ADMIN_ACTION = 'ADMIN_ACTION'
}

export interface LedgerEntry {
  id: string;
  userId: string;
  amount: number; // cents
  currency: string;
  type: LedgerType;
  description: string;
  createdAt: string;
  status?: 'PENDING' | 'COMPLETED' | 'REJECTED'; // Mainly for withdrawals
  refId?: string;
  screenshotProof?: string; // URL to uploaded screenshot proof of payment
}

export interface SavedAddress {
  id: string;
  address: string;
  label: string;
  isDefault: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  phone?: string;
  balance: number; // in cents
  totalDeposited: number;
  totalWithdrawn: number;
  withdrawableBalance: number;
  kycStatus: KycStatus;
  role: Role;
  savedAddresses?: SavedAddress[];
  password?: string;
}

export interface MarketCandidate {
  name: string;
  imageUrl: string;
  color?: string;
}

export interface MarketOutcome {
  id: string;
  name: string;
  probability: number; // 0-100
  color?: string;
}

export interface MarketDynamics {
  pricePreset: number;          // anchor probability (1-99)
  minProbability: number;       // floor — probability never drops below this
  maxProbability: number;       // ceiling — probability never exceeds this
  driftEnabled: boolean;        // whether time-based drift is active
  driftRate: number;            // % per hour
  driftDirection: 'up' | 'down' | 'none';
  driftStartTime: string | null;
  driftEndTime: string | null;
  lastDriftApplied: string | null;
}

export interface Market {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  slug?: string;
  closeDate: string;
  startDate?: string;
  resolutionSource: string;
  outcome?: Outcome;
  probability: number; // 0-100
  volume: number; // in cents
  imageUrl: string;
  isFlagged?: boolean;
  isLocked?: boolean;
  isTrending?: boolean;
  commission?: number; // percentage
  candidateA?: MarketCandidate; // Associated with YES
  candidateB?: MarketCandidate; // Associated with NO
  outcomes?: MarketOutcome[]; // For multi-choice markets
  dynamics?: MarketDynamics;  // Admin probability control preset
}

export interface Order {
  id: string;
  marketId: string;
  outcomeId?: string;
  side: Side;
  price: number; // 1-99 cents
  remainingQty: number;
  status: OrderStatus;
  createdAt: string;
}

export interface Position {
  userId?: string; // Optional for backward compatibility but should be used
  marketId: string;
  outcomeId?: string;
  side: Side;
  quantity: number;
  avgPrice: number;
}

export interface Comment {
  id: string;
  marketId: string;
  user: string;
  body: string;
  timestamp: string;
}

export interface Config {
  key: string;
  value: Record<string, any>;
  updatedAt: string;
  updatedBy: string;
}

export interface DepositMethodConfig {
  id: string;
  name: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
  isActive: boolean;
  qrUrl?: string;
}

export interface AuditLogEntry {
  id: string;
  adminUserId: string;
  action: string;
  targetId: string;
  payload: any;
  createdAt: string;
}

export interface Trade {
  id: string;
  userId: string;
  marketId: string;
  marketTitle: string;
  outcomeId?: string;
  outcomeTitle?: string; // Helper for display name of the outcome
  side: Side;
  price: number; // cents
  shares: number;
  amount: number; // total cost in cents
  potentialWin: number; // in cents
  status: 'WAITING' | 'WON' | 'LOST';
  type: 'BUY' | 'SELL';
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  rewardCents: number;
  activeTill: string;
}

export interface QuizAnswer {
  quizId: string;
  selectedIndex: number;
  isCorrect: boolean;
  rewardCents: number;
  timestamp: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;      // lucide icon name string, e.g. "Trophy"
  color?: string;     // hex colour for UI accents
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}
