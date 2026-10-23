-- ============================================================
-- Migration 008: Dynamic Sell Price from Current Market Probability
-- ------------------------------------------------------------
-- Replaces execute_sell so it derives the sell price SERVER-SIDE
-- from the market's current probability (binary) or the specific
-- outcome probability (multi-outcome JSONB), rather than trusting
-- the client-supplied p_price.
--
-- Key changes vs. the original (001_schema.sql):
--   1. Locks the market row FOR UPDATE to read a consistent probability
--   2. Rejects sells on locked/resolved markets
--   3. Computes v_current_price from market.probability or outcomes JSONB
--   4. p_price parameter is KEPT for backward compat but IGNORED
--   5. Returns 'sell_price' in the response so the client knows the
--      actual price the server used
-- ============================================================

CREATE OR REPLACE FUNCTION public.execute_sell(
  p_user_id       UUID,
  p_market_id     TEXT,
  p_side          TEXT,
  p_price         BIGINT,       -- kept for backward compatibility; IGNORED internally
  p_quantity      INTEGER,
  p_outcome_id    TEXT DEFAULT NULL,
  p_commission    BIGINT DEFAULT 0,
  p_trading_fee   BIGINT DEFAULT 0
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_current_price BIGINT;       -- derived from live market probability
  v_revenue       BIGINT;
  v_net_revenue   BIGINT;
  v_position      RECORD;
  v_cost_basis    BIGINT;
  v_pnl           BIGINT;
  v_trade_id      UUID;
  v_market        RECORD;
  -- multi-outcome helpers
  v_outcome       JSONB;
  v_i             INTEGER;
  v_found_outcome BOOLEAN := FALSE;
BEGIN
  -- ── 1. Lock & fetch market (atomic read of current probability) ──
  SELECT * INTO v_market
  FROM public.markets
  WHERE id = p_market_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Market not found';
  END IF;

  IF v_market.is_locked THEN
    RAISE EXCEPTION 'Market is locked or already resolved';
  END IF;

  -- ── 2. Derive current sell price from live market state ──────────
  IF p_outcome_id IS NOT NULL AND v_market.outcomes IS NOT NULL THEN
    -- Multi-outcome market: find the matching outcome's probability
    FOR v_i IN 0 .. jsonb_array_length(v_market.outcomes) - 1 LOOP
      v_outcome := v_market.outcomes -> v_i;
      IF v_outcome ->> 'id' = p_outcome_id THEN
        IF p_side = 'YES' THEN
          v_current_price := (v_outcome ->> 'probability')::INTEGER * 100;
        ELSE
          v_current_price := (100 - (v_outcome ->> 'probability')::INTEGER) * 100;
        END IF;
        v_found_outcome := TRUE;
        EXIT;
      END IF;
    END LOOP;

    IF NOT v_found_outcome THEN
      RAISE EXCEPTION 'Outcome "%" not found in market outcomes', p_outcome_id;
    END IF;
  ELSE
    -- Binary market: use the top-level probability field
    IF p_side = 'YES' THEN
      v_current_price := v_market.probability * 100;
    ELSE
      v_current_price := (100 - v_market.probability) * 100;
    END IF;
  END IF;

  -- ── 3. Calculate revenue from current market price ──────────────
  v_revenue     := v_current_price * p_quantity;
  v_net_revenue := v_revenue - p_commission - p_trading_fee;

  -- ── 4. Fetch and lock position ──────────────────────────────────
  SELECT * INTO v_position
  FROM public.positions
  WHERE user_id = p_user_id AND market_id = p_market_id
    AND side = p_side
    AND (outcome_id = p_outcome_id OR (outcome_id IS NULL AND p_outcome_id IS NULL))
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Position not found'; END IF;
  IF v_position.quantity < p_quantity THEN RAISE EXCEPTION 'Insufficient shares'; END IF;

  -- ── 5. Cost basis & P&L ─────────────────────────────────────────
  v_cost_basis := v_position.avg_price * p_quantity;
  v_pnl        := v_net_revenue - v_cost_basis;

  -- ── 6. Credit user balance ──────────────────────────────────────
  UPDATE public.profiles
  SET balance              = balance + v_net_revenue,
      withdrawable_balance = withdrawable_balance + v_net_revenue,
      updated_at           = NOW()
  WHERE id = p_user_id;

  -- ── 7. Update or delete position ────────────────────────────────
  IF v_position.quantity = p_quantity THEN
    DELETE FROM public.positions WHERE id = v_position.id;
  ELSE
    UPDATE public.positions
    SET quantity = quantity - p_quantity, updated_at = NOW()
    WHERE id = v_position.id;
  END IF;

  -- ── 8. Insert trade record (uses v_current_price, not p_price) ──
  INSERT INTO public.trades
    (user_id, market_id, market_title, outcome_id, side, price, shares, amount,
     potential_win, status, type)
  VALUES
    (p_user_id, p_market_id, COALESCE(v_market.title, ''), p_outcome_id,
     p_side, v_current_price, p_quantity, v_revenue, 0,
     CASE WHEN v_pnl >= 0 THEN 'WON' ELSE 'LOST' END, 'SELL')
  RETURNING id INTO v_trade_id;

  -- ── 9. Profit/loss ledger entry ─────────────────────────────────
  INSERT INTO public.ledger (user_id, amount, type, description, status)
  VALUES (p_user_id, v_pnl,
          CASE WHEN v_pnl >= 0 THEN 'TRADE_PROFIT' ELSE 'TRADE_LOSS' END,
          'Sold ' || p_quantity || ' ' || p_side || ' shares of '
          || COALESCE(v_market.title, '')
          || ' @ Rs.' || (v_current_price::NUMERIC / 100)::TEXT
          || '/share (cost Rs.' || (v_position.avg_price::NUMERIC / 100)::TEXT || ')',
          'COMPLETED');

  -- ── 10. Commission ledger entry ─────────────────────────────────
  IF p_commission > 0 THEN
    INSERT INTO public.ledger (user_id, amount, type, description, status)
    VALUES (p_user_id, p_commission, 'TRADE_FEE',
            'Commission for selling ' || p_quantity || ' shares', 'COMPLETED');
  END IF;

  -- ── 11. Fixed trading fee ledger entry ──────────────────────────
  IF p_trading_fee > 0 THEN
    INSERT INTO public.ledger (user_id, amount, type, description, status)
    VALUES (p_user_id, p_trading_fee, 'TRADE_FEE',
            'Fixed trading fee for selling ' || p_quantity || ' shares', 'COMPLETED');
  END IF;

  -- ── 12. Update market volume ────────────────────────────────────
  UPDATE public.markets
  SET volume     = volume + v_revenue,
      updated_at = NOW()
  WHERE id = p_market_id;

  -- ── 13. Return result with actual sell price ────────────────────
  RETURN jsonb_build_object(
    'success',    true,
    'trade_id',   v_trade_id,
    'pnl',        v_pnl,
    'sell_price',  v_current_price,
    'revenue',    v_revenue,
    'cost_basis', v_cost_basis
  );
END;
$$;
