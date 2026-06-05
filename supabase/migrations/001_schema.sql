-- ============================================================
-- PredictKit — Supabase Production Schema
-- Run this in your Supabase SQL Editor (one-shot migration)
-- ============================================================

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- 1. PROFILES  (extends auth.users)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  name                TEXT NOT NULL DEFAULT '',
  avatar_url          TEXT,
  balance             BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),           -- in paise (cents)
  total_deposited     BIGINT NOT NULL DEFAULT 0 CHECK (total_deposited >= 0),
  total_withdrawn     BIGINT NOT NULL DEFAULT 0 CHECK (total_withdrawn >= 0),
  withdrawable_balance BIGINT NOT NULL DEFAULT 0 CHECK (withdrawable_balance >= 0),
  kyc_status          TEXT NOT NULL DEFAULT 'PENDING'
                        CHECK (kyc_status IN ('PENDING','APPROVED','REJECTED')),
  role                TEXT NOT NULL DEFAULT 'USER'
                        CHECK (role IN ('USER','ADMIN')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url, balance, total_deposited, withdrawable_balance)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    'https://ui-avatars.com/api/?name=' || COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)) || '&background=random',
    0,   -- No sign-up bonus
    0,
    0
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 2. SAVED ADDRESSES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.saved_addresses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  address     TEXT NOT NULL,
  label       TEXT NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 3. MARKETS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.markets (
  id                  TEXT PRIMARY KEY DEFAULT ('mkt_' || substr(uuid_generate_v4()::text, 1, 8)),
  title               TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  category            TEXT NOT NULL DEFAULT '',
  subcategory         TEXT,
  slug                TEXT UNIQUE,
  close_date          TIMESTAMPTZ NOT NULL,
  start_date          TIMESTAMPTZ,
  resolution_source   TEXT NOT NULL DEFAULT '',
  outcome             TEXT CHECK (outcome IN ('YES','NO','CANCEL')),
  probability         INTEGER NOT NULL DEFAULT 50 CHECK (probability BETWEEN 0 AND 100),
  volume              BIGINT NOT NULL DEFAULT 0,
  image_url           TEXT NOT NULL DEFAULT '',
  is_flagged          BOOLEAN NOT NULL DEFAULT FALSE,
  is_locked           BOOLEAN NOT NULL DEFAULT FALSE,
  is_trending         BOOLEAN NOT NULL DEFAULT FALSE,
  commission          NUMERIC(5,2) NOT NULL DEFAULT 0,
  candidate_a         JSONB,   -- { name, imageUrl, color }
  candidate_b         JSONB,
  outcomes            JSONB,   -- MarketOutcome[] for multi-choice
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 4. POSITIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.positions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  market_id   TEXT NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  outcome_id  TEXT,
  side        TEXT NOT NULL CHECK (side IN ('YES','NO')),
  quantity    INTEGER NOT NULL DEFAULT 0,
  avg_price   BIGINT NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, market_id, outcome_id, side)
);

-- ────────────────────────────────────────────────────────────
-- 5. TRADES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trades (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  market_id       TEXT NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  market_title    TEXT NOT NULL DEFAULT '',
  outcome_id      TEXT,
  outcome_title   TEXT,
  side            TEXT NOT NULL CHECK (side IN ('YES','NO')),
  price           BIGINT NOT NULL,
  shares          INTEGER NOT NULL,
  amount          BIGINT NOT NULL,
  potential_win   BIGINT NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING','WON','LOST')),
  type            TEXT NOT NULL CHECK (type IN ('BUY','SELL')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 6. LEDGER
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ledger (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount              BIGINT NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'NPR',
  type                TEXT NOT NULL CHECK (type IN (
                        'DEPOSIT','WITHDRAWAL','TRADE_FEE',
                        'TRADE_PROFIT','TRADE_LOSS','MANUAL_ADJUSTMENT','ADMIN_ACTION'
                      )),
  description         TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'COMPLETED'
                        CHECK (status IN ('PENDING','COMPLETED','REJECTED')),
  ref_id              TEXT,
  screenshot_proof_url TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 7. APP CONFIG
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_config (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  TEXT NOT NULL DEFAULT ''
);

-- Default config
INSERT INTO public.app_config (key, value) VALUES
  ('app', '{"tradingFee": 0}')
ON CONFLICT (key) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 8. DEPOSIT METHODS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deposit_methods (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  account_name    TEXT NOT NULL DEFAULT '',
  account_number  TEXT NOT NULL DEFAULT '',
  instructions    TEXT NOT NULL DEFAULT '',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  qr_url          TEXT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default methods
INSERT INTO public.deposit_methods (id, name, account_name, account_number, instructions) VALUES
  ('esewa', 'eSewa', 'PredictKit Admin', '9840000000',
   'Transfer funds to the eSewa ID above and enter the Transaction Code below.'),
  ('khalti', 'Khalti', 'PredictKit Nepal', '9860000000',
   'Send money to our Khalti wallet and provide the Receipt ID.'),
  ('bank', 'Bank Transfer', 'PredictKit Pvt Ltd', '001002003004005 (Global IME)',
   'Standard banking transfer. Usually verified within 3-4 hours.')
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 9. QUIZ QUESTIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question      TEXT NOT NULL,
  options       JSONB NOT NULL DEFAULT '[]',   -- string[]
  correct_index INTEGER NOT NULL DEFAULT 0,
  reward_cents  INTEGER NOT NULL DEFAULT 0,
  active_till   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 10. QUIZ ANSWERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_id         UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_index  INTEGER NOT NULL,
  is_correct      BOOLEAN NOT NULL DEFAULT FALSE,
  reward_cents    INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, quiz_id)
);

-- ────────────────────────────────────────────────────────────
-- 11. AUDIT LOGS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,
  target_id       TEXT NOT NULL DEFAULT '',
  payload         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs      ENABLE ROW LEVEL SECURITY;

-- Helper: is current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

-- ── PROFILES ──
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_insert_trigger" ON public.profiles
  FOR INSERT WITH CHECK (TRUE); -- trigger handles this

-- ── SAVED ADDRESSES ──
CREATE POLICY "addresses_all_own" ON public.saved_addresses
  FOR ALL USING (user_id = auth.uid() OR public.is_admin());

-- ── MARKETS ──
CREATE POLICY "markets_select_all" ON public.markets
  FOR SELECT USING (TRUE);

CREATE POLICY "markets_write_admin" ON public.markets
  FOR ALL USING (public.is_admin());

-- ── POSITIONS ──
CREATE POLICY "positions_select_own" ON public.positions
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "positions_write_own" ON public.positions
  FOR ALL USING (user_id = auth.uid() OR public.is_admin());

-- ── TRADES ──
CREATE POLICY "trades_select_own" ON public.trades
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "trades_insert_own" ON public.trades
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- ── LEDGER ──
CREATE POLICY "ledger_select_own" ON public.ledger
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "ledger_insert_own" ON public.ledger
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "ledger_update_admin" ON public.ledger
  FOR UPDATE USING (public.is_admin());

-- ── APP CONFIG ──
CREATE POLICY "config_select_auth" ON public.app_config
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "config_write_admin" ON public.app_config
  FOR ALL USING (public.is_admin());

-- ── DEPOSIT METHODS ──
CREATE POLICY "dm_select_auth" ON public.deposit_methods
  FOR SELECT USING (auth.uid() IS NOT NULL OR is_active = TRUE);

CREATE POLICY "dm_write_admin" ON public.deposit_methods
  FOR ALL USING (public.is_admin());

-- ── QUIZ QUESTIONS ──
CREATE POLICY "quiz_q_select_all" ON public.quiz_questions
  FOR SELECT USING (TRUE);

CREATE POLICY "quiz_q_write_admin" ON public.quiz_questions
  FOR ALL USING (public.is_admin());

-- ── QUIZ ANSWERS ──
CREATE POLICY "quiz_a_select_own" ON public.quiz_answers
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "quiz_a_insert_own" ON public.quiz_answers
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ── AUDIT LOGS ──
CREATE POLICY "audit_select_admin" ON public.audit_logs
  FOR SELECT USING (public.is_admin());

CREATE POLICY "audit_insert_admin" ON public.audit_logs
  FOR INSERT WITH CHECK (public.is_admin());

-- ════════════════════════════════════════════════════════════
-- POSTGRES RPC FUNCTIONS (atomic balance operations)
-- ════════════════════════════════════════════════════════════

-- Execute a BUY trade atomically
CREATE OR REPLACE FUNCTION public.execute_buy(
  p_user_id       UUID,
  p_market_id     TEXT,
  p_side          TEXT,
  p_price         BIGINT,
  p_quantity      INTEGER,
  p_outcome_id    TEXT DEFAULT NULL,
  p_commission    BIGINT DEFAULT 0,
  p_trading_fee   BIGINT DEFAULT 0
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cost          BIGINT;
  v_total_cost    BIGINT;
  v_user          RECORD;
  v_trade_id      UUID;
  v_market        RECORD;
BEGIN
  v_cost       := p_price * p_quantity;
  v_total_cost := v_cost + p_commission + p_trading_fee;

  -- Lock and fetch user
  SELECT * INTO v_user FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  IF v_user.balance < v_total_cost THEN RAISE EXCEPTION 'Insufficient funds'; END IF;

  UPDATE public.profiles
  SET balance = balance - v_total_cost,
      withdrawable_balance = GREATEST(0, withdrawable_balance - v_total_cost),
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Upsert position
  INSERT INTO public.positions (user_id, market_id, outcome_id, side, quantity, avg_price)
  VALUES (p_user_id, p_market_id, p_outcome_id, p_side, p_quantity,
          ROUND(v_total_cost::NUMERIC / p_quantity))
  ON CONFLICT (user_id, market_id, outcome_id, side)
  DO UPDATE SET
    avg_price  = ROUND(((positions.avg_price * positions.quantity) + v_total_cost)::NUMERIC
                       / (positions.quantity + p_quantity)),
    quantity   = positions.quantity + p_quantity,
    updated_at = NOW();

  -- Fetch market title
  SELECT title INTO v_market FROM public.markets WHERE id = p_market_id;

  -- Insert trade record
  INSERT INTO public.trades
    (user_id, market_id, market_title, outcome_id, side, price, shares, amount,
     potential_win, status, type)
  VALUES
    (p_user_id, p_market_id, COALESCE(v_market.title,''), p_outcome_id,
     p_side, p_price, p_quantity, v_cost, p_quantity * 10000, 'WAITING', 'BUY')
  RETURNING id INTO v_trade_id;

  -- Commission ledger entry
  IF p_commission > 0 THEN
    INSERT INTO public.ledger (user_id, amount, type, description, status)
    VALUES (p_user_id, p_commission, 'TRADE_FEE',
            'Commission for buying ' || p_quantity || ' shares of ' || COALESCE(v_market.title,''), 'COMPLETED');
  END IF;

  -- Fixed fee ledger entry
  IF p_trading_fee > 0 THEN
    INSERT INTO public.ledger (user_id, amount, type, description, status)
    VALUES (p_user_id, p_trading_fee, 'TRADE_FEE',
            'Fixed trading fee for buying ' || p_quantity || ' shares', 'COMPLETED');
  END IF;

  -- Update market volume
  UPDATE public.markets
  SET volume = volume + v_cost, updated_at = NOW()
  WHERE id = p_market_id;

  RETURN jsonb_build_object('success', true, 'trade_id', v_trade_id);
END;
$$;

-- Execute a SELL trade atomically
CREATE OR REPLACE FUNCTION public.execute_sell(
  p_user_id       UUID,
  p_market_id     TEXT,
  p_side          TEXT,
  p_price         BIGINT,
  p_quantity      INTEGER,
  p_outcome_id    TEXT DEFAULT NULL,
  p_commission    BIGINT DEFAULT 0,
  p_trading_fee   BIGINT DEFAULT 0
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_revenue       BIGINT;
  v_net_revenue   BIGINT;
  v_position      RECORD;
  v_cost_basis    BIGINT;
  v_pnl           BIGINT;
  v_trade_id      UUID;
  v_market        RECORD;
BEGIN
  v_revenue     := p_price * p_quantity;
  v_net_revenue := v_revenue - p_commission - p_trading_fee;

  -- Fetch and lock position
  SELECT * INTO v_position
  FROM public.positions
  WHERE user_id = p_user_id AND market_id = p_market_id
    AND side = p_side AND (outcome_id = p_outcome_id OR (outcome_id IS NULL AND p_outcome_id IS NULL))
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Position not found'; END IF;
  IF v_position.quantity < p_quantity THEN RAISE EXCEPTION 'Insufficient shares'; END IF;

  v_cost_basis := v_position.avg_price * p_quantity;
  v_pnl        := v_net_revenue - v_cost_basis;

  -- Credit balance
  UPDATE public.profiles
  SET balance = balance + v_net_revenue,
      withdrawable_balance = withdrawable_balance + v_net_revenue,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Update or delete position
  IF v_position.quantity = p_quantity THEN
    DELETE FROM public.positions WHERE id = v_position.id;
  ELSE
    UPDATE public.positions
    SET quantity = quantity - p_quantity, updated_at = NOW()
    WHERE id = v_position.id;
  END IF;

  -- Fetch market title
  SELECT title INTO v_market FROM public.markets WHERE id = p_market_id;

  -- Insert trade record
  INSERT INTO public.trades
    (user_id, market_id, market_title, outcome_id, side, price, shares, amount,
     potential_win, status, type)
  VALUES
    (p_user_id, p_market_id, COALESCE(v_market.title,''), p_outcome_id,
     p_side, p_price, p_quantity, v_revenue, 0,
     CASE WHEN v_pnl >= 0 THEN 'WON' ELSE 'LOST' END, 'SELL')
  RETURNING id INTO v_trade_id;

  -- Profit/loss ledger
  INSERT INTO public.ledger (user_id, amount, type, description, status)
  VALUES (p_user_id, v_pnl,
          CASE WHEN v_pnl >= 0 THEN 'TRADE_PROFIT' ELSE 'TRADE_LOSS' END,
          'Sold ' || p_quantity || ' shares of ' || COALESCE(v_market.title,''), 'COMPLETED');

  -- Commission ledger
  IF p_commission > 0 THEN
    INSERT INTO public.ledger (user_id, amount, type, description, status)
    VALUES (p_user_id, p_commission, 'TRADE_FEE',
            'Commission for selling ' || p_quantity || ' shares', 'COMPLETED');
  END IF;

  -- Fixed fee ledger
  IF p_trading_fee > 0 THEN
    INSERT INTO public.ledger (user_id, amount, type, description, status)
    VALUES (p_user_id, p_trading_fee, 'TRADE_FEE',
            'Fixed trading fee for selling ' || p_quantity || ' shares', 'COMPLETED');
  END IF;

  -- Update market volume
  UPDATE public.markets
  SET volume = volume + v_revenue, updated_at = NOW()
  WHERE id = p_market_id;

  RETURN jsonb_build_object('success', true, 'trade_id', v_trade_id, 'pnl', v_pnl);
END;
$$;

-- Approve deposit atomically
CREATE OR REPLACE FUNCTION public.approve_deposit(p_ledger_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_entry RECORD;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin required'; END IF;
  SELECT * INTO v_entry FROM public.ledger WHERE id = p_ledger_id AND status = 'PENDING' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deposit not found or already processed'; END IF;

  UPDATE public.ledger SET status = 'COMPLETED' WHERE id = p_ledger_id;

  UPDATE public.profiles
  SET balance = balance + v_entry.amount,
      withdrawable_balance = withdrawable_balance + v_entry.amount,
      total_deposited = total_deposited + v_entry.amount,
      updated_at = NOW()
  WHERE id = v_entry.user_id;
END;
$$;

-- Reject deposit
CREATE OR REPLACE FUNCTION public.reject_deposit(p_ledger_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin required'; END IF;
  UPDATE public.ledger SET status = 'REJECTED' WHERE id = p_ledger_id AND status = 'PENDING';
END;
$$;

-- Approve withdrawal atomically
CREATE OR REPLACE FUNCTION public.approve_withdrawal(p_ledger_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin required'; END IF;
  UPDATE public.ledger SET status = 'COMPLETED' WHERE id = p_ledger_id AND status = 'PENDING';
END;
$$;

-- Reject withdrawal (refund)
CREATE OR REPLACE FUNCTION public.reject_withdrawal(p_ledger_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_entry RECORD;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin required'; END IF;
  SELECT * INTO v_entry FROM public.ledger WHERE id = p_ledger_id AND status = 'PENDING' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found or already processed'; END IF;

  UPDATE public.ledger SET status = 'REJECTED' WHERE id = p_ledger_id;

  -- Refund
  UPDATE public.profiles
  SET balance = balance + ABS(v_entry.amount),
      withdrawable_balance = withdrawable_balance + ABS(v_entry.amount),
      total_withdrawn = total_withdrawn - ABS(v_entry.amount),
      updated_at = NOW()
  WHERE id = v_entry.user_id;
END;
$$;

-- Admin: adjust user balance
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
  p_user_id   UUID,
  p_amount    BIGINT,
  p_desc      TEXT
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin required'; END IF;

  UPDATE public.profiles
  SET balance = balance + p_amount,
      withdrawable_balance = withdrawable_balance + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO public.ledger (user_id, amount, type, description, status)
  VALUES (p_user_id, p_amount, 'MANUAL_ADJUSTMENT', p_desc, 'COMPLETED');
END;
$$;

-- Admin: resolve market and fully settle all positions with payouts
-- NOTE: See migration 002_settlement.sql for the current version of this function.
-- WIN:    user receives quantity × 100 cents (1 NPR per share)
-- LOSE:   loss ledger entry recorded (balance already deducted on buy)
-- CANCEL: full refund of quantity × avg_price
CREATE OR REPLACE FUNCTION public.resolve_market(
  p_market_id TEXT,
  p_outcome   TEXT  -- 'YES', 'NO', or 'CANCEL'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pos           RECORD;
  v_payout        BIGINT;
  v_cost_basis    BIGINT;
  v_total_paid    BIGINT  := 0;
  v_winners       INTEGER := 0;
  v_losers        INTEGER := 0;
  v_cancelled     INTEGER := 0;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin required'; END IF;

  UPDATE public.markets
  SET outcome = p_outcome, is_locked = TRUE, updated_at = NOW()
  WHERE id = p_market_id;

  IF p_outcome = 'CANCEL' THEN
    UPDATE public.trades SET status = 'LOST'
    WHERE market_id = p_market_id AND status = 'WAITING';
  ELSE
    UPDATE public.trades
    SET status = CASE
      WHEN (side = 'YES' AND p_outcome = 'YES') OR (side = 'NO' AND p_outcome = 'NO') THEN 'WON'
      ELSE 'LOST'
    END
    WHERE market_id = p_market_id AND status = 'WAITING';
  END IF;

  FOR v_pos IN SELECT * FROM public.positions WHERE market_id = p_market_id LOOP
    v_cost_basis := v_pos.quantity * v_pos.avg_price;

    IF p_outcome = 'CANCEL' THEN
      v_payout := v_cost_basis;
      UPDATE public.profiles
      SET balance = balance + v_payout, withdrawable_balance = withdrawable_balance + v_payout, updated_at = NOW()
      WHERE id = v_pos.user_id;
      INSERT INTO public.ledger (user_id, amount, currency, type, description, status)
      VALUES (v_pos.user_id, v_payout, 'NPR', 'MANUAL_ADJUSTMENT', 'Market cancelled — full refund for market ' || p_market_id, 'COMPLETED');
      v_cancelled := v_cancelled + 1; v_total_paid := v_total_paid + v_payout;

    ELSIF (v_pos.side = 'YES' AND p_outcome = 'YES') OR (v_pos.side = 'NO' AND p_outcome = 'NO') THEN
      v_payout := v_pos.quantity * 100;
      UPDATE public.profiles
      SET balance = balance + v_payout, withdrawable_balance = withdrawable_balance + v_payout, updated_at = NOW()
      WHERE id = v_pos.user_id;
      INSERT INTO public.ledger (user_id, amount, currency, type, description, status)
      VALUES (v_pos.user_id, v_payout, 'NPR', 'TRADE_PROFIT', 'Win payout: ' || v_pos.quantity || ' shares in market ' || p_market_id, 'COMPLETED');
      v_winners := v_winners + 1; v_total_paid := v_total_paid + v_payout;

    ELSE
      INSERT INTO public.ledger (user_id, amount, currency, type, description, status)
      VALUES (v_pos.user_id, -v_cost_basis, 'NPR', 'TRADE_LOSS', 'Loss: ' || v_pos.quantity || ' shares in market ' || p_market_id, 'COMPLETED');
      v_losers := v_losers + 1;
    END IF;
  END LOOP;

  DELETE FROM public.positions WHERE market_id = p_market_id;

  RETURN jsonb_build_object('success', true, 'outcome', p_outcome, 'winners', v_winners, 'losers', v_losers, 'cancelled', v_cancelled, 'total_paid', v_total_paid);
END;
$$;

-- ════════════════════════════════════════════════════════════
-- STORAGE BUCKET (run separately or add to dashboard)
-- ════════════════════════════════════════════════════════════
-- INSERT INTO storage.buckets (id, name, public) VALUES ('deposit-proofs', 'deposit-proofs', false);
-- NOTE: Create the 'deposit-proofs' bucket in Supabase Dashboard > Storage
-- and set policy: authenticated users can upload; admins can read all.
