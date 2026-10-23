-- ============================================================
-- PredictKit — Migration 014: Security Hardening
-- Apply in Supabase SQL Editor
-- ============================================================
--
-- Fixes addressed:
--   C3 · Add is_banned guard to execute_buy and execute_sell
--   C4 · Fix profiles RLS — prevent users from elevating own role
--   C5 · Add market locked/resolved guard in execute_buy
--   H2 · Fix profiles_insert_trigger policy
--   H5 · Fix audit_logs NOT NULL + ON DELETE SET NULL contradiction
--   H7 · Guard execute_sell against negative net revenue

-- ────────────────────────────────────────────────────────────
-- C4 + H2: Fix profiles RLS policies
-- ────────────────────────────────────────────────────────────

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "profiles_update_own"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_trigger" ON public.profiles;

-- Users can update only their safe profile fields (name, phone, avatar_url).
-- They CANNOT change role, is_banned, balance, or kyc_status.
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id           = auth.uid()
    -- Ensure these security-critical columns are unchanged by the caller
    AND role         = (SELECT role         FROM public.profiles WHERE id = auth.uid())
    AND is_banned    = (SELECT is_banned    FROM public.profiles WHERE id = auth.uid())
    AND kyc_status   = (SELECT kyc_status   FROM public.profiles WHERE id = auth.uid())
    AND balance      = (SELECT balance      FROM public.profiles WHERE id = auth.uid())
    AND withdrawable_balance
                     = (SELECT withdrawable_balance FROM public.profiles WHERE id = auth.uid())
  );

-- Admins can update anything (role changes, banning, KYC approval etc.)
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE
  USING (public.is_admin());

-- Insert: only allow inserting a row for the authenticated user's own ID.
-- The trigger handle_new_user runs as SECURITY DEFINER so it bypasses RLS —
-- this policy only restricts direct INSERT calls from the client.
CREATE POLICY "profiles_insert_trigger" ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- H5: Fix audit_logs — remove NOT NULL from admin_user_id
--     (ON DELETE SET NULL cannot work with NOT NULL)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.audit_logs
  ALTER COLUMN admin_user_id DROP NOT NULL;

-- ────────────────────────────────────────────────────────────
-- C3 + C5: execute_buy — add is_banned and market-locked guards
-- ────────────────────────────────────────────────────────────
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
  v_user          RECORD;
  v_cost          BIGINT;
  v_total_cost    BIGINT;
  v_trade_id      UUID;
  v_market        RECORD;
BEGIN
  -- Basic input validation
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
  IF p_price    <= 0 THEN RAISE EXCEPTION 'Price must be positive';    END IF;

  v_cost       := p_price * p_quantity;
  v_total_cost := v_cost + p_commission + p_trading_fee;

  -- C3: Lock and fetch user — check banned status
  SELECT * INTO v_user FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  IF v_user.is_banned THEN RAISE EXCEPTION 'Account is suspended'; END IF;
  IF v_user.balance < v_total_cost THEN RAISE EXCEPTION 'Insufficient funds'; END IF;

  -- C5: Lock and fetch market — check locked/resolved status
  SELECT * INTO v_market FROM public.markets WHERE id = p_market_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Market not found'; END IF;
  IF v_market.is_locked THEN RAISE EXCEPTION 'Market is locked for new orders'; END IF;
  IF v_market.outcome IS NOT NULL THEN RAISE EXCEPTION 'Market has already been resolved'; END IF;

  -- Deduct balance, ensuring withdrawable_balance does not fall below zero
  UPDATE public.profiles
  SET balance              = balance - v_total_cost,
      withdrawable_balance = GREATEST(0, withdrawable_balance - v_total_cost),
      updated_at           = NOW()
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

  -- Insert trade record
  INSERT INTO public.trades
    (user_id, market_id, market_title, outcome_id, side, price, shares, amount,
     potential_win, status, type)
  VALUES
    (p_user_id, p_market_id, COALESCE(v_market.title, ''), p_outcome_id,
     p_side, p_price, p_quantity, v_cost, p_quantity * 100, 'WAITING', 'BUY')
  RETURNING id INTO v_trade_id;

  -- Commission ledger entry
  IF p_commission > 0 THEN
    INSERT INTO public.ledger (user_id, amount, type, description, status)
    VALUES (p_user_id, p_commission, 'TRADE_FEE',
            'Commission for buying ' || p_quantity || ' shares of ' || COALESCE(v_market.title, ''),
            'COMPLETED');
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

-- ────────────────────────────────────────────────────────────
-- C3 + H7: execute_sell — add is_banned guard + negative revenue guard
-- ────────────────────────────────────────────────────────────
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
  v_user          RECORD;
BEGIN
  -- Basic input validation
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;

  v_revenue     := p_price * p_quantity;
  v_net_revenue := v_revenue - p_commission - p_trading_fee;

  -- H7: Prevent fees from exceeding revenue (net would be negative, crediting
  --     negative amount and decrementing user's balance on a sell)
  IF v_net_revenue < 0 THEN
    RAISE EXCEPTION 'Fees exceed sell revenue — cannot process this sell';
  END IF;

  -- C3: Check user exists and is not banned
  SELECT * INTO v_user FROM public.profiles WHERE id = p_user_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  IF v_user.is_banned THEN RAISE EXCEPTION 'Account is suspended'; END IF;

  -- Fetch and lock position
  SELECT * INTO v_position
  FROM public.positions
  WHERE user_id  = p_user_id
    AND market_id = p_market_id
    AND side       = p_side
    AND (outcome_id = p_outcome_id OR (outcome_id IS NULL AND p_outcome_id IS NULL))
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Position not found'; END IF;
  IF v_position.quantity < p_quantity THEN RAISE EXCEPTION 'Insufficient shares'; END IF;

  v_cost_basis := v_position.avg_price * p_quantity;
  v_pnl        := v_net_revenue - v_cost_basis;

  -- Fetch market info
  SELECT title INTO v_market FROM public.markets WHERE id = p_market_id;

  -- Credit balance
  UPDATE public.profiles
  SET balance              = balance + v_net_revenue,
      withdrawable_balance = withdrawable_balance + v_net_revenue,
      updated_at           = NOW()
  WHERE id = p_user_id;

  -- Update or delete position
  IF v_position.quantity = p_quantity THEN
    DELETE FROM public.positions WHERE id = v_position.id;
  ELSE
    UPDATE public.positions
    SET quantity = quantity - p_quantity, updated_at = NOW()
    WHERE id = v_position.id;
  END IF;

  -- Insert trade record
  INSERT INTO public.trades
    (user_id, market_id, market_title, outcome_id, side, price, shares, amount,
     potential_win, status, type)
  VALUES
    (p_user_id, p_market_id, COALESCE(v_market.title, ''), p_outcome_id,
     p_side, p_price, p_quantity, v_revenue, 0,
     CASE WHEN v_pnl >= 0 THEN 'WON' ELSE 'LOST' END, 'SELL')
  RETURNING id INTO v_trade_id;

  -- Profit/loss ledger
  INSERT INTO public.ledger (user_id, amount, type, description, status)
  VALUES (p_user_id, v_pnl,
          CASE WHEN v_pnl >= 0 THEN 'TRADE_PROFIT' ELSE 'TRADE_LOSS' END,
          'Sold ' || p_quantity || ' shares of ' || COALESCE(v_market.title, ''), 'COMPLETED');

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
