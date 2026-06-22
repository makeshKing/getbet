-- ============================================================
-- Migration 019: Remove Probability Bump on Buy/Sell
-- ------------------------------------------------------------
-- Completely removes the automatic probability adjustments 
-- based on user purchase or sell volume.
-- Probabilities are now only set manually or via external feeds.
-- ============================================================

-- 1. Drop the unused normalisation helper
DROP FUNCTION IF EXISTS public.adjust_outcome_probabilities;

-- 2. Add explanatory comments to the table columns
COMMENT ON COLUMN public.markets.probability IS 'Manually set or fed from external market data. NOT automatically adjusted by user purchase volume.';
COMMENT ON COLUMN public.markets.outcomes IS 'Manually set or fed from external market data. Probabilities inside are NOT automatically adjusted by user purchase volume.';

-- 3. Replace execute_buy without probability adjustment
CREATE OR REPLACE FUNCTION public.execute_buy(
  p_user_id       UUID,
  p_market_id     TEXT,
  p_side          TEXT,       -- 'YES' or 'NO'
  p_price         BIGINT,     -- price in cents (1–99 scale × 100), used for cost
  p_quantity      INTEGER,
  p_outcome_id    TEXT    DEFAULT NULL,
  p_commission    BIGINT  DEFAULT 0,
  p_trading_fee   BIGINT  DEFAULT 0
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cost          BIGINT;
  v_total_cost    BIGINT;
  v_user          RECORD;
  v_trade_id      UUID;
  v_market        RECORD;
BEGIN
  -- ── 1. Validate side ─────────────────────────────────────────
  IF p_side NOT IN ('YES', 'NO') THEN
    RAISE EXCEPTION 'Invalid side "%": must be YES or NO', p_side;
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive, got %', p_quantity;
  END IF;

  -- ── 2. Deduct balance atomically ─────────────────────────────
  v_cost       := p_price * p_quantity;
  v_total_cost := v_cost + p_commission + p_trading_fee;

  SELECT * INTO v_user
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % not found', p_user_id;
  END IF;

  IF v_user.balance < v_total_cost THEN
    RAISE EXCEPTION 'Insufficient funds: need % have %', v_total_cost, v_user.balance;
  END IF;

  UPDATE public.profiles
  SET balance              = balance - v_total_cost,
      withdrawable_balance = GREATEST(0, withdrawable_balance - v_total_cost),
      updated_at           = NOW()
  WHERE id = p_user_id;

  -- ── 3. Upsert position ───────────────────────────────────────
  INSERT INTO public.positions
    (user_id, market_id, outcome_id, side, quantity, avg_price)
  VALUES
    (p_user_id, p_market_id, p_outcome_id, p_side, p_quantity,
     ROUND(v_total_cost::NUMERIC / p_quantity))
  ON CONFLICT (user_id, market_id, outcome_id, side)
  DO UPDATE SET
    avg_price  = ROUND(
                   (positions.avg_price * positions.quantity + v_total_cost)::NUMERIC
                   / (positions.quantity + p_quantity)),
    quantity   = positions.quantity + p_quantity,
    updated_at = NOW();

  -- ── 4. Lock market and read current state ────────────────────
  SELECT * INTO v_market
  FROM public.markets
  WHERE id = p_market_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Market % not found', p_market_id;
  END IF;

  IF v_market.is_locked THEN
    RAISE EXCEPTION 'Market is locked or already resolved';
  END IF;

  -- ── 5. Update market volume ONLY (no probability change) ──────
  UPDATE public.markets
  SET volume     = volume + v_cost,
      updated_at = NOW()
  WHERE id = p_market_id;

  -- ── 6. Insert trade record ───────────────────────────────────
  INSERT INTO public.trades
    (user_id, market_id, market_title, outcome_id, side,
     price, shares, amount, potential_win, status, type)
  VALUES
    (p_user_id, p_market_id, COALESCE(v_market.title, ''), p_outcome_id,
     p_side, p_price, p_quantity, v_cost, p_quantity * 10000, 'WAITING', 'BUY')
  RETURNING id INTO v_trade_id;

  -- ── 7. Commission ledger entry ───────────────────────────────
  IF p_commission > 0 THEN
    INSERT INTO public.ledger (user_id, amount, type, description, status)
    VALUES (p_user_id, p_commission, 'TRADE_FEE',
            'Commission for buying ' || p_quantity || ' ' || p_side
            || ' shares of ' || COALESCE(v_market.title, ''),
            'COMPLETED');
  END IF;

  -- ── 8. Fixed trading-fee ledger entry ───────────────────────
  IF p_trading_fee > 0 THEN
    INSERT INTO public.ledger (user_id, amount, type, description, status)
    VALUES (p_user_id, p_trading_fee, 'TRADE_FEE',
            'Trading fee for buying ' || p_quantity || ' shares', 'COMPLETED');
  END IF;

  RETURN jsonb_build_object(
    'success',    true,
    'trade_id',   v_trade_id
  );
END;
$$;

-- 4. Replace execute_sell without probability adjustment
CREATE OR REPLACE FUNCTION public.execute_sell(
  p_user_id       UUID,
  p_market_id     TEXT,
  p_side          TEXT,
  p_price         BIGINT,     -- kept for backward compatibility; IGNORED internally
  p_quantity      INTEGER,
  p_outcome_id    TEXT    DEFAULT NULL,
  p_commission    BIGINT  DEFAULT 0,
  p_trading_fee   BIGINT  DEFAULT 0
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_current_price BIGINT;       -- derived from live market state
  v_revenue       BIGINT;
  v_net_revenue   BIGINT;
  v_position      RECORD;
  v_cost_basis    BIGINT;
  v_pnl           BIGINT;
  v_trade_id      UUID;
  v_market        RECORD;
  -- multi-outcome helpers
  v_outcome_elem  JSONB;
  v_outcome_prob  INTEGER;
  v_found_outcome BOOLEAN := FALSE;
  v_elem          JSONB;
BEGIN
  -- ── 1. Validate inputs ───────────────────────────────────────
  IF p_side NOT IN ('YES', 'NO') THEN
    RAISE EXCEPTION 'Invalid side "%": must be YES or NO', p_side;
  END IF;

  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive, got %', p_quantity;
  END IF;

  -- ── 2. Lock & fetch market (atomic read of current probability)
  SELECT * INTO v_market
  FROM public.markets
  WHERE id = p_market_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Market % not found', p_market_id;
  END IF;

  IF v_market.is_locked THEN
    RAISE EXCEPTION 'Market is locked or already resolved';
  END IF;

  -- ── 3. Derive current sell price from live market state ───────
  IF p_outcome_id IS NOT NULL AND v_market.outcomes IS NOT NULL THEN
    -- Multi-outcome: find the matching outcome's current probability
    FOR v_elem IN SELECT value FROM jsonb_array_elements(v_market.outcomes) LOOP
      IF v_elem ->> 'id' = p_outcome_id THEN
        v_outcome_prob := (v_elem ->> 'probability')::INTEGER;
        IF p_side = 'YES' THEN
          v_current_price := v_outcome_prob::BIGINT * 100;
        ELSE
          v_current_price := (100 - v_outcome_prob)::BIGINT * 100;
        END IF;
        v_found_outcome := TRUE;
        EXIT;
      END IF;
    END LOOP;

    IF NOT v_found_outcome THEN
      RAISE EXCEPTION 'Outcome "%" not found in market %', p_outcome_id, p_market_id;
    END IF;
  ELSE
    -- Binary market: use the top-level probability field
    IF p_side = 'YES' THEN
      v_current_price := v_market.probability::BIGINT * 100;
    ELSE
      v_current_price := (100 - v_market.probability)::BIGINT * 100;
    END IF;
  END IF;

  -- ── 4. Calculate revenue ─────────────────────────────────────
  v_revenue     := v_current_price * p_quantity;
  v_net_revenue := v_revenue - p_commission - p_trading_fee;

  -- ── 5. Fetch and lock position ───────────────────────────────
  SELECT * INTO v_position
  FROM public.positions
  WHERE user_id  = p_user_id
    AND market_id = p_market_id
    AND side      = p_side
    AND (outcome_id = p_outcome_id
         OR (outcome_id IS NULL AND p_outcome_id IS NULL))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Position not found for user % in market % (side=%, outcome=%)',
      p_user_id, p_market_id, p_side, p_outcome_id;
  END IF;

  IF v_position.quantity < p_quantity THEN
    RAISE EXCEPTION 'Insufficient shares: have %, trying to sell %',
      v_position.quantity, p_quantity;
  END IF;

  -- ── 6. Cost basis & P&L ──────────────────────────────────────
  v_cost_basis := v_position.avg_price * p_quantity;
  v_pnl        := v_net_revenue - v_cost_basis;

  -- ── 7. Credit user balance ───────────────────────────────────
  UPDATE public.profiles
  SET balance              = balance + v_net_revenue,
      withdrawable_balance = withdrawable_balance + v_net_revenue,
      updated_at           = NOW()
  WHERE id = p_user_id;

  -- ── 8. Update or delete position ─────────────────────────────
  IF v_position.quantity = p_quantity THEN
    DELETE FROM public.positions WHERE id = v_position.id;
  ELSE
    UPDATE public.positions
    SET quantity   = quantity - p_quantity,
        updated_at = NOW()
    WHERE id = v_position.id;
  END IF;

  -- ── 9. Insert trade record ──────────────────────────────────
  INSERT INTO public.trades
    (user_id, market_id, market_title, outcome_id, side,
     price, shares, amount, potential_win, status, type)
  VALUES
    (p_user_id, p_market_id, COALESCE(v_market.title, ''), p_outcome_id,
     p_side, v_current_price, p_quantity, v_revenue, 0,
     CASE WHEN v_pnl >= 0 THEN 'WON' ELSE 'LOST' END, 'SELL')
  RETURNING id INTO v_trade_id;

  -- ── 10. Profit/loss ledger entry ─────────────────────────────
  INSERT INTO public.ledger (user_id, amount, type, description, status)
  VALUES (p_user_id, v_pnl,
          CASE WHEN v_pnl >= 0 THEN 'TRADE_PROFIT' ELSE 'TRADE_LOSS' END,
          'Sold ' || p_quantity || ' ' || p_side || ' shares of '
          || COALESCE(v_market.title, '')
          || ' @ Rs.' || (v_current_price::NUMERIC / 100)::TEXT
          || '/share (cost Rs.' || (v_position.avg_price::NUMERIC / 100)::TEXT || ')',
          'COMPLETED');

  -- ── 11. Commission ledger entry ──────────────────────────────
  IF p_commission > 0 THEN
    INSERT INTO public.ledger (user_id, amount, type, description, status)
    VALUES (p_user_id, p_commission, 'TRADE_FEE',
            'Commission for selling ' || p_quantity || ' ' || p_side || ' shares',
            'COMPLETED');
  END IF;

  -- ── 12. Fixed trading-fee ledger entry ───────────────────────
  IF p_trading_fee > 0 THEN
    INSERT INTO public.ledger (user_id, amount, type, description, status)
    VALUES (p_user_id, p_trading_fee, 'TRADE_FEE',
            'Trading fee for selling ' || p_quantity || ' shares', 'COMPLETED');
  END IF;

  -- ── 13. Update market volume ONLY (no probability change) ────
  UPDATE public.markets
  SET volume     = volume + v_revenue,
      updated_at = NOW()
  WHERE id = p_market_id;

  -- ── 14. Return result ────────────────────────────────────────
  RETURN jsonb_build_object(
    'success',    true,
    'trade_id',   v_trade_id,
    'pnl',        v_pnl,
    'sell_price', v_current_price,
    'revenue',    v_revenue,
    'cost_basis', v_cost_basis
  );
END;
$$;
