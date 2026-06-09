/**
 * supabaseService.ts
 * ------------------
 * Complete backend service layer for PredictKit using Supabase.
 * Replaces services/mockStore.ts for all data operations.
 */

import { supabase } from '../lib/supabaseClient';
import {
  Market, User, Position, Trade, LedgerEntry, LedgerType,
  Side, Outcome, KycStatus, Role, DepositMethodConfig,
  QuizQuestion, QuizAnswer, Config, AuditLogEntry, SavedAddress,
  MarketOutcome, MarketDynamics, Category
} from '../types';

// ─────────────────────────────────────────────────────────────
// Type mappers: DB rows → App types
// ─────────────────────────────────────────────────────────────

function mapProfile(row: any): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    phone: row.phone,
    balance: row.balance,
    totalDeposited: row.total_deposited,
    totalWithdrawn: row.total_withdrawn,
    withdrawableBalance: row.withdrawable_balance,
    kycStatus: row.kyc_status as KycStatus,
    role: row.role as Role,
    savedAddresses: [], // loaded separately
  };
}

function mapMarket(row: any): Market {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    subcategory: row.subcategory,
    slug: row.slug,
    closeDate: row.close_date,
    startDate: row.start_date,
    resolutionSource: row.resolution_source,
    outcome: row.outcome as Outcome | undefined,
    probability: row.probability,
    volume: row.volume,
    imageUrl: row.image_url,
    isFlagged: row.is_flagged,
    isLocked: row.is_locked,
    isTrending: row.is_trending,
    commission: row.commission ? Number(row.commission) : 0,
    candidateA: row.candidate_a,
    candidateB: row.candidate_b,
    outcomes: row.outcomes as MarketOutcome[] | undefined,
    dynamics: row.dynamics as MarketDynamics | undefined,
  };
}

function mapPosition(row: any): Position {
  return {
    userId: row.user_id,
    marketId: row.market_id,
    outcomeId: row.outcome_id,
    side: row.side as Side,
    quantity: row.quantity,
    avgPrice: row.avg_price,
  };
}

function mapTrade(row: any): Trade {
  return {
    id: row.id,
    userId: row.user_id,
    marketId: row.market_id,
    marketTitle: row.market_title,
    outcomeId: row.outcome_id,
    outcomeTitle: row.outcome_title,
    side: row.side as Side,
    price: row.price,
    shares: row.shares,
    amount: row.amount,
    potentialWin: row.potential_win,
    status: row.status as 'WAITING' | 'WON' | 'LOST',
    type: row.type as 'BUY' | 'SELL',
    createdAt: row.created_at,
  };
}

function mapLedger(row: any): LedgerEntry {
  return {
    id: row.id,
    userId: row.user_id,
    amount: row.amount,
    currency: row.currency,
    type: row.type as LedgerType,
    description: row.description,
    createdAt: row.created_at,
    status: row.status as 'PENDING' | 'COMPLETED' | 'REJECTED',
    refId: row.ref_id,
    screenshotProof: row.screenshot_proof_url,
  };
}

function mapDepositMethod(row: any): DepositMethodConfig {
  return {
    id: row.id,
    name: row.name,
    accountName: row.account_name,
    accountNumber: row.account_number,
    instructions: row.instructions,
    isActive: row.is_active,
    qrUrl: row.qr_url,
  };
}

function mapQuizQuestion(row: any): QuizQuestion {
  return {
    id: row.id,
    question: row.question,
    options: row.options as string[],
    correctIndex: row.correct_index,
    rewardCents: row.reward_cents,
    activeTill: row.active_till,
  };
}

function mapQuizAnswer(row: any): QuizAnswer {
  return {
    quizId: row.quiz_id,
    selectedIndex: row.selected_index,
    isCorrect: row.is_correct,
    rewardCents: row.reward_cents,
    timestamp: row.created_at,
  };
}

function mapSavedAddress(row: any): SavedAddress {
  return {
    id: row.id,
    address: row.address,
    label: row.label,
    isDefault: row.is_default,
    createdAt: row.created_at,
  };
}

// ─────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────

export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw new Error(error.message);
  return data;
}

// Hardcoded admin email — always gets ADMIN role regardless of DB state
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL as string;
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD as string;

export async function signIn(email: string, password: string) {
  const isHardcodedAdmin =
    ADMIN_EMAIL && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  // If this is the hardcoded admin, try to sign in; if account doesn't exist yet, create it
  if (isHardcodedAdmin) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Account may not exist yet — auto-create it
      if (
        error.message.toLowerCase().includes('invalid login') ||
        error.message.toLowerCase().includes('user not found') ||
        error.message.toLowerCase().includes('email not confirmed') ||
        error.message.toLowerCase().includes('invalid credentials')
      ) {
        // Sign up the admin account
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: 'Admin' } },
        });
        if (signUpErr) throw new Error(signUpErr.message);
        if (!signUpData.user) throw new Error('Admin account creation failed');

        // Wait briefly for the trigger to create the profile row
        await new Promise(r => setTimeout(r, 800));

        // Force-set ADMIN role
        await supabase
          .from('profiles')
          .update({ role: 'ADMIN', updated_at: new Date().toISOString() })
          .eq('id', signUpData.user.id);

        // Now sign in with the freshly created account
        const { data: signInData, error: signInErr } =
          await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw new Error(signInErr.message);
        return signInData;
      }
      throw new Error(error.message);
    }

    // Account exists — ensure ADMIN role is set in DB (idempotent)
    if (data.user) {
      await supabase
        .from('profiles')
        .update({ role: 'ADMIN', updated_at: new Date().toISOString() })
        .eq('id', data.user.id);
    }
    return data;
  }

  // Regular user sign-in
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) return null;

  const user = mapProfile(data);

  // Load saved addresses
  const { data: addrs } = await supabase
    .from('saved_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  user.savedAddresses = (addrs || []).map(mapSavedAddress);

  return user;
}

export async function updateProfileName(userId: string, name: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function updateUserProfile(userId: string, updates: { name?: string, phone?: string, avatarUrl?: string }) {
  const payload: any = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;

  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/avatar_${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

// ─────────────────────────────────────────────────────────────
// SAVED ADDRESSES
// ─────────────────────────────────────────────────────────────

export async function addSavedAddress(
  userId: string,
  address: string,
  label: string,
  isDefault: boolean
): Promise<SavedAddress> {
  if (isDefault) {
    await supabase
      .from('saved_addresses')
      .update({ is_default: false })
      .eq('user_id', userId);
  }
  const { data, error } = await supabase
    .from('saved_addresses')
    .insert({ user_id: userId, address, label, is_default: isDefault })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapSavedAddress(data);
}

export async function updateSavedAddress(
  userId: string,
  id: string,
  updates: Partial<SavedAddress>
) {
  if (updates.isDefault) {
    await supabase
      .from('saved_addresses')
      .update({ is_default: false })
      .eq('user_id', userId);
  }
  const { error } = await supabase
    .from('saved_addresses')
    .update({
      address: updates.address,
      label: updates.label,
      is_default: updates.isDefault,
    })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function removeSavedAddress(userId: string, id: string) {
  const { error } = await supabase
    .from('saved_addresses')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────────────────────
// MARKETS
// ─────────────────────────────────────────────────────────────

export async function getMarkets(): Promise<Market[]> {
  const { data, error } = await supabase
    .from('markets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapMarket);
}

export async function getMarket(id: string): Promise<Market | null> {
  const { data, error } = await supabase
    .from('markets')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return mapMarket(data);
}

export async function adminCreateMarket(marketData: Partial<Market>): Promise<Market> {
  const payload: any = {
    title: marketData.title || '',
    description: marketData.description || '',
    category: marketData.category || '',
    subcategory: marketData.subcategory,
    slug: marketData.slug,
    close_date: marketData.closeDate,
    start_date: marketData.startDate,
    resolution_source: marketData.resolutionSource || '',
    probability: marketData.probability ?? 50,
    image_url: marketData.imageUrl || '',
    commission: marketData.commission ?? 0,
    candidate_a: marketData.candidateA || null,
    candidate_b: marketData.candidateB || null,
    outcomes: marketData.outcomes || null,
    is_trending: marketData.isTrending ?? false,
    is_locked: marketData.isLocked ?? false,
  };

  const { data, error } = await supabase
    .from('markets')
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapMarket(data);
}

export async function adminUpdateMarketField(
  id: string,
  field: string,
  value: any
) {
  const colMap: Record<string, string> = {
    isLocked: 'is_locked',
    isFlagged: 'is_flagged',
    isTrending: 'is_trending',
    probability: 'probability',
    outcome: 'outcome',
  };
  const col = colMap[field] || field;
  const { error } = await supabase
    .from('markets')
    .update({ [col]: value, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function adminResolveMarket(
  marketId: string,
  outcome: Outcome
): Promise<{
  winners: number;
  losers: number;
  cancelled: number;
  total_invested: number;
  total_paid: number;
  house_profit: number;
}> {
  const { data, error } = await supabase.rpc('resolve_market', {
    p_market_id: marketId,
    p_outcome: outcome,
  });
  if (error) throw new Error(error.message);
  return data as {
    winners: number;
    losers: number;
    cancelled: number;
    total_invested: number;
    total_paid: number;
    house_profit: number;
  };
}

/**
 * Fetch a real-time breakdown of YES/NO positions for a market
 * so the admin can see accurate projected payouts BEFORE resolving.
 */
export interface MarketResolutionPreview {
  yes_bettors: number;
  no_bettors: number;
  yes_shares: number;
  no_shares: number;
  yes_invested: number;   // cents — total cost basis on YES side
  no_invested: number;    // cents — total cost basis on NO  side
  total_invested: number; // cents
  yes_payout: number;     // cents — paid out if YES wins
  no_payout: number;      // cents — paid out if NO  wins
  house_if_yes: number;   // cents — house profit if YES wins
  house_if_no: number;    // cents — house profit if NO  wins
}

export async function getMarketResolutionPreview(
  marketId: string
): Promise<MarketResolutionPreview> {
  const { data, error } = await supabase.rpc('get_market_resolution_preview', {
    p_market_id: marketId,
  });
  if (error) {
    console.warn("RPC failed, using client-side calculation:", error.message);
    const { data: positions, error: posErr } = await supabase
      .from('positions')
      .select('*')
      .eq('market_id', marketId);
      
    if (posErr) throw new Error(posErr.message);
    
    let yes_bettors = 0, no_bettors = 0;
    let yes_shares = 0, no_shares = 0;
    let yes_invested = 0, no_invested = 0;
    
    for (const p of positions || []) {
      if (p.side === 'YES') {
        yes_bettors++;
        yes_shares += p.quantity;
        yes_invested += p.quantity * p.avg_price;
      } else if (p.side === 'NO') {
        no_bettors++;
        no_shares += p.quantity;
        no_invested += p.quantity * p.avg_price;
      }
    }
    
    const total_invested = yes_invested + no_invested;
    const yes_payout = yes_shares * 100;
    const no_payout = no_shares * 100;
    
    return {
      yes_bettors, no_bettors, yes_shares, no_shares,
      yes_invested, no_invested, total_invested,
      yes_payout, no_payout,
      house_if_yes: total_invested - yes_payout,
      house_if_no: total_invested - no_payout
    };
  }
  return data as MarketResolutionPreview;
}

export interface UserProfitPreview {
  user_id: string;
  user_name: string;
  user_email: string;
  avatar_url: string | null;
  side: string;
  invested: number;
  payout: number;
  profit: number;
}

export async function getMarketUserProfits(
  marketId: string
): Promise<UserProfitPreview[]> {
  const { data, error } = await supabase.rpc('get_market_user_profits', {
    p_market_id: marketId,
  });
  if (error) {
    console.warn("RPC get_market_user_profits failed, using fallback:", error.message);
    const { data: positions, error: posErr } = await supabase
      .from('positions')
      .select('*, profiles(name, email, avatar_url)')
      .eq('market_id', marketId);
      
    if (posErr) throw new Error(posErr.message);
    
    const profitsMap = new Map<string, UserProfitPreview>();
    
    for (const p of positions || []) {
      const key = `${p.user_id}_${p.side}`;
      if (!profitsMap.has(key)) {
        profitsMap.set(key, {
          user_id: p.user_id,
          user_name: (p.profiles as any)?.name || 'Unknown',
          user_email: (p.profiles as any)?.email || '',
          avatar_url: (p.profiles as any)?.avatar_url || null,
          side: p.side,
          invested: 0,
          payout: 0,
          profit: 0
        });
      }
      
      const userProf = profitsMap.get(key)!;
      userProf.invested += p.quantity * p.avg_price;
      userProf.payout += p.quantity * 100;
      userProf.profit = userProf.payout - userProf.invested;
    }
    
    return Array.from(profitsMap.values()).filter(p => p.profit > 0);
  }
  return data as UserProfitPreview[];
}

export interface RecentTrade {
  id: string;
  market_id: string;
  outcome_id: string | null;
  side: string;
  type: string;
  price: number;
  shares: number;
  amount: number;
  status: string;
  created_at: string;
  user_id: string;
  user_name: string;
  user_avatar_url: string | null;
}

export async function getMarketRecentTrades(
  marketId: string,
  limit: number = 50
): Promise<RecentTrade[]> {
  const { data, error } = await supabase.rpc('get_market_recent_trades', {
    p_market_id: marketId,
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return data as RecentTrade[];
}

// ─────────────────────────────────────────────────────────────
// TRADING
// ─────────────────────────────────────────────────────────────

export async function executeBuy(
  userId: string,
  marketId: string,
  side: Side,
  price: number,
  quantity: number,
  outcomeId?: string,
  commission: number = 0,
  tradingFee: number = 0
) {
  const { data, error } = await supabase.rpc('execute_buy', {
    p_user_id: userId,
    p_market_id: marketId,
    p_side: side,
    p_price: price,
    p_quantity: quantity,
    p_outcome_id: outcomeId || null,
    p_commission: commission,
    p_trading_fee: tradingFee,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function executeSell(
  userId: string,
  marketId: string,
  side: Side,
  price: number,
  quantity: number,
  outcomeId?: string,
  commission: number = 0,
  tradingFee: number = 0
) {
  const { data, error } = await supabase.rpc('execute_sell', {
    p_user_id: userId,
    p_market_id: marketId,
    p_side: side,
    p_price: price,
    p_quantity: quantity,
    p_outcome_id: outcomeId || null,
    p_commission: commission,
    p_trading_fee: tradingFee,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getPositions(userId: string): Promise<Position[]> {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return (data || []).map(mapPosition);
}

export async function getTrades(userId: string): Promise<Trade[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapTrade);
}

export async function getAllTrades(): Promise<Trade[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapTrade);
}

// ─────────────────────────────────────────────────────────────
// LEDGER / FINANCE
// ─────────────────────────────────────────────────────────────

export async function getLedger(userId: string): Promise<LedgerEntry[]> {
  const { data, error } = await supabase
    .from('ledger')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapLedger);
}

export async function getAllLedger(): Promise<LedgerEntry[]> {
  const { data, error } = await supabase
    .from('ledger')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapLedger);
}

export async function getPendingDeposits(): Promise<LedgerEntry[]> {
  const { data, error } = await supabase
    .from('ledger')
    .select('*')
    .eq('type', 'DEPOSIT')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapLedger);
}

export async function getPendingWithdrawals(): Promise<LedgerEntry[]> {
  const { data, error } = await supabase
    .from('ledger')
    .select('*')
    .eq('type', 'WITHDRAWAL')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapLedger);
}

export async function requestDeposit(
  userId: string,
  amountCents: number,
  reference: string,
  method: string,
  screenshotProofUrl?: string
) {
  const description = screenshotProofUrl
    ? `${method} Deposit with Screenshot Proof`
    : `${method} Deposit (Ref: ${reference})`;

  const { error } = await supabase.from('ledger').insert({
    user_id: userId,
    amount: amountCents,
    currency: 'NPR',
    type: 'DEPOSIT',
    description,
    status: 'PENDING',
    screenshot_proof_url: screenshotProofUrl || null,
  });
  if (error) throw new Error(error.message);
}

export async function approveDeposit(ledgerId: string) {
  const { error } = await supabase.rpc('approve_deposit', { p_ledger_id: ledgerId });
  if (error) throw new Error(error.message);
}

export async function rejectDeposit(ledgerId: string) {
  const { error } = await supabase.rpc('reject_deposit', { p_ledger_id: ledgerId });
  if (error) throw new Error(error.message);
}

export async function requestWithdrawal(
  userId: string,
  amountCents: number,
  destination: string
) {
  // First check withdrawable balance
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('balance, withdrawable_balance, total_withdrawn')
    .eq('id', userId)
    .single();
  if (profileErr) throw new Error(profileErr.message);
  if (profile.withdrawable_balance < amountCents)
    throw new Error('Insufficient withdrawable balance');

  // Deduct balance and create pending ledger entry
  const { error: balErr } = await supabase
    .from('profiles')
    .update({
      balance: profile.balance - amountCents,
      withdrawable_balance: profile.withdrawable_balance - amountCents,
      total_withdrawn: profile.total_withdrawn + amountCents,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (balErr) throw new Error(balErr.message);

  const { error } = await supabase.from('ledger').insert({
    user_id: userId,
    amount: -amountCents,
    currency: 'NPR',
    type: 'WITHDRAWAL',
    description: `Withdrawal to ${destination}`,
    status: 'PENDING',
  });
  if (error) throw new Error(error.message);
}

export async function approveWithdrawal(ledgerId: string) {
  const { error } = await supabase.rpc('approve_withdrawal', { p_ledger_id: ledgerId });
  if (error) throw new Error(error.message);
}

export async function rejectWithdrawal(ledgerId: string) {
  const { error } = await supabase.rpc('reject_withdrawal', { p_ledger_id: ledgerId });
  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────────────────────
// ADMIN — USER MANAGEMENT
// ─────────────────────────────────────────────────────────────

export async function adminGetAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapProfile);
}

export async function adminCreateUser(
  email: string,
  password: string,
  name: string,
  role: Role = Role.USER
) {
  // Use Supabase Admin API via service role — but from client we trigger via signUp
  // then update role immediately
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('User creation failed');

  // Update role if admin
  if (role === Role.ADMIN) {
    await supabase
      .from('profiles')
      .update({ role: 'ADMIN', balance: 0, total_deposited: 0, withdrawable_balance: 0 })
      .eq('id', data.user.id);
  } else {
    await supabase
      .from('profiles')
      .update({ balance: 0, total_deposited: 0, withdrawable_balance: 0 })
      .eq('id', data.user.id);
  }

  return data.user;
}

export async function adminUpdateUserRole(userId: string, role: Role) {
  const { error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function adminUpdateKycStatus(userId: string, status: KycStatus) {
  const { error } = await supabase
    .from('profiles')
    .update({ kyc_status: status, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function adminAdjustBalance(
  userId: string,
  amount: number,
  description: string
) {
  const { error } = await supabase.rpc('admin_adjust_balance', {
    p_user_id: userId,
    p_amount: amount,
    p_desc: description,
  });
  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────────────────────
// ADMIN — STATS
// ─────────────────────────────────────────────────────────────

export async function adminGetStats() {
  const [usersRes, marketsRes, ledgerRes] = await Promise.all([
    supabase.from('profiles').select('id, kyc_status', { count: 'exact' }),
    supabase.from('markets').select('id, volume, outcome', { count: 'exact' }),
    supabase.from('ledger').select('id, type, status, amount'),
  ]);

  const users = usersRes.data || [];
  const markets = marketsRes.data || [];
  const ledger = ledgerRes.data || [];

  const totalVolume = markets.reduce((s: number, m: any) => s + (m.volume || 0), 0);
  const totalCommission = ledger
    .filter((l: any) => l.type === 'TRADE_FEE')
    .reduce((s: number, l: any) => s + l.amount, 0);
  const pendingDeposits = ledger.filter(
    (l: any) => l.type === 'DEPOSIT' && l.status === 'PENDING'
  ).length;
  const pendingWithdrawals = ledger.filter(
    (l: any) => l.type === 'WITHDRAWAL' && l.status === 'PENDING'
  ).length;
  const pendingKyc = users.filter((u: any) => u.kyc_status === 'PENDING').length;
  const pendingResolutions = markets.filter((m: any) => !m.outcome).length;

  return {
    totalUsers: usersRes.count || users.length,
    totalMarkets: marketsRes.count || markets.length,
    totalVolume,
    totalCommission,
    pendingDeposits,
    pendingWithdrawals,
    pendingKyc,
    pendingResolutions,
  };
}

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────

export async function getConfig(): Promise<Config> {
  const { data, error } = await supabase
    .from('app_config')
    .select('*')
    .eq('key', 'app')
    .single();
  if (error || !data)
    return { key: 'app', value: { tradingFee: 0 }, updatedAt: '', updatedBy: '' };
  return {
    key: data.key,
    value: data.value,
    updatedAt: data.updated_at,
    updatedBy: data.updated_by,
  };
}

export async function adminUpdateConfig(updaterName: string, value: Record<string, any>) {
  const { error } = await supabase
    .from('app_config')
    .update({
      value,
      updated_at: new Date().toISOString(),
      updated_by: updaterName,
    })
    .eq('key', 'app');
  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────────────────────
// DEPOSIT METHODS
// ─────────────────────────────────────────────────────────────

export async function getDepositMethods(): Promise<DepositMethodConfig[]> {
  const { data, error } = await supabase
    .from('deposit_methods')
    .select('*')
    .order('id');
  if (error) throw new Error(error.message);
  return (data || []).map(mapDepositMethod);
}

export async function getActiveDepositMethods(): Promise<DepositMethodConfig[]> {
  const { data, error } = await supabase
    .from('deposit_methods')
    .select('*')
    .eq('is_active', true)
    .order('id');
  if (error) throw new Error(error.message);
  return (data || []).map(mapDepositMethod);
}

export async function adminUpdateDepositMethod(
  id: string,
  updates: Partial<DepositMethodConfig>
) {
  const payload: any = { updated_at: new Date().toISOString() };
  if (updates.accountName !== undefined) payload.account_name = updates.accountName;
  if (updates.accountNumber !== undefined) payload.account_number = updates.accountNumber;
  if (updates.instructions !== undefined) payload.instructions = updates.instructions;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;
  if (updates.qrUrl !== undefined) payload.qr_url = updates.qrUrl;
  if (updates.name !== undefined) payload.name = updates.name;

  const { error } = await supabase
    .from('deposit_methods')
    .update(payload)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function adminCreateDepositMethod(
  method: Omit<DepositMethodConfig, 'isActive'> & { isActive?: boolean }
) {
  const { error } = await supabase.from('deposit_methods').insert({
    id: method.id,
    name: method.name,
    account_name: method.accountName,
    account_number: method.accountNumber,
    instructions: method.instructions,
    is_active: method.isActive ?? true,
    qr_url: method.qrUrl || null,
  });
  if (error) throw new Error(error.message);
}

export async function adminDeleteDepositMethod(id: string) {
  const { error } = await supabase
    .from('deposit_methods')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────────────────────
// QUIZ
// ─────────────────────────────────────────────────────────────

export async function getActiveQuiz(): Promise<QuizQuestion | null> {
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('*')
    .gt('active_till', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return mapQuizQuestion(data);
}

export async function getUserQuizAnswer(
  userId: string,
  quizId: string
): Promise<QuizAnswer | null> {
  const { data } = await supabase
    .from('quiz_answers')
    .select('*')
    .eq('user_id', userId)
    .eq('quiz_id', quizId)
    .maybeSingle();
  return data ? mapQuizAnswer(data) : null;
}

export async function answerQuiz(
  userId: string,
  quizId: string,
  selectedIndex: number
): Promise<QuizAnswer> {
  // Get quiz
  const { data: quiz, error: qErr } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('id', quizId)
    .single();
  if (qErr || !quiz) throw new Error('Quiz not found');

  const isCorrect = selectedIndex === quiz.correct_index;
  const reward = isCorrect ? quiz.reward_cents : 0;

  const { data, error } = await supabase
    .from('quiz_answers')
    .insert({
      user_id: userId,
      quiz_id: quizId,
      selected_index: selectedIndex,
      is_correct: isCorrect,
      reward_cents: reward,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  // Credit reward
  if (reward > 0) {
    await supabase.rpc('admin_adjust_balance', {
      p_user_id: userId,
      p_amount: reward,
      p_desc: `Quiz Reward: ${quiz.question}`,
    });
  }

  return mapQuizAnswer(data);
}

export async function adminGetQuizzes() {
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('*, quiz_answers(count)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((q: any) => ({
    ...mapQuizQuestion(q),
    answerCount: q.quiz_answers?.[0]?.count || 0,
  }));
}

export async function adminCreateQuiz(
  question: string,
  options: string[],
  correctIndex: number,
  rewardCents: number
) {
  const { error } = await supabase.from('quiz_questions').insert({
    question,
    options,
    correct_index: correctIndex,
    reward_cents: rewardCents,
    active_till: new Date(Date.now() + 86400000).toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function adminDeleteQuiz(id: string) {
  const { error } = await supabase.from('quiz_questions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function adminEndQuizEarly(id: string) {
  const { error } = await supabase
    .from('quiz_questions')
    .update({ active_till: new Date(Date.now() - 1000).toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────────────────────

export async function addAuditLog(
  adminUserId: string,
  action: string,
  targetId: string,
  payload: any
) {
  await supabase.from('audit_logs').insert({
    admin_user_id: adminUserId,
    action,
    target_id: targetId,
    payload,
  });
}

export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({
    id: r.id,
    adminUserId: r.admin_user_id,
    action: r.action,
    targetId: r.target_id,
    payload: r.payload,
    createdAt: r.created_at,
  }));
}

// ─────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────

function mapCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

/** Fetch all active categories — usable by any authenticated or anonymous user */
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map(mapCategory);
}

/** Admin: fetch ALL categories including inactive */
export async function adminGetAllCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map(mapCategory);
}

/** Admin: create a new category */
export async function adminCreateCategory(
  name: string,
  icon?: string,
  color?: string
): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: name.trim(),
      icon: icon || null,
      color: color || '#6366f1',
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapCategory(data);
}

/** Admin: update a category */
export async function adminUpdateCategory(
  id: string,
  updates: { name?: string; icon?: string; color?: string; isActive?: boolean; sortOrder?: number }
) {
  const payload: any = {};
  if (updates.name      !== undefined) payload.name       = updates.name.trim();
  if (updates.icon      !== undefined) payload.icon       = updates.icon;
  if (updates.color     !== undefined) payload.color      = updates.color;
  if (updates.isActive  !== undefined) payload.is_active  = updates.isActive;
  if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;

  const { error } = await supabase.from('categories').update(payload).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Admin: delete a category */
export async function adminDeleteCategory(id: string) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
