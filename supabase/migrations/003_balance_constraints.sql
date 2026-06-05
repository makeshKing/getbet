-- ============================================================
-- PredictKit — Migration 003: Non-Negative Balance Constraints
-- Run this in your Supabase SQL Editor
-- ============================================================
--
-- 1. Updates execute_buy to prevent withdrawable_balance from dropping below zero.
-- 2. Resets any currently negative balances to zero.
-- 3. Adds strict CHECK constraints to prevent balances from ever going negative.

-- 1. Update execute_buy function (only changing the withdrawable_balance deduction line)
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
  v_cost       := p_price * p_quantity;
  v_total_cost := v_cost + p_commission + p_trading_fee;

  -- Lock and fetch user
  SELECT * INTO v_user FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  IF v_user.balance < v_total_cost THEN RAISE EXCEPTION 'Insufficient funds'; END IF;

  -- Deduct balance, ensuring withdrawable_balance does not fall below zero
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
     p_side, p_price, p_quantity, v_cost, p_quantity * 100, 'WAITING', 'BUY')
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

-- 2. Reset existing negative balances to zero
UPDATE public.profiles SET balance = 0 WHERE balance < 0;
UPDATE public.profiles SET withdrawable_balance = 0 WHERE withdrawable_balance < 0;
UPDATE public.profiles SET total_deposited = 0 WHERE total_deposited < 0;
UPDATE public.profiles SET total_withdrawn = 0 WHERE total_withdrawn < 0;

-- 3. Add CHECK constraints to prevent negative values on balance fields
ALTER TABLE public.profiles
  ADD CONSTRAINT balance_non_negative CHECK (balance >= 0),
  ADD CONSTRAINT withdrawable_balance_non_negative CHECK (withdrawable_balance >= 0),
  ADD CONSTRAINT total_deposited_non_negative CHECK (total_deposited >= 0),
  ADD CONSTRAINT total_withdrawn_non_negative CHECK (total_withdrawn >= 0);
