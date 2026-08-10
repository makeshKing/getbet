-- ============================================================
-- PredictKit — Migration 024: Power Trader Face Value
-- ============================================================

-- 1. Add tier tracking to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contract_face_value BIGINT NOT NULL DEFAULT 100;

-- 2. Add locked-in face value to trades and positions
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS face_value_cents BIGINT NOT NULL DEFAULT 100;
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS face_value_cents BIGINT NOT NULL DEFAULT 100;

-- 3. Replace execute_buy to lock in and weighted-average face_value_cents
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
  -- probability bump helpers
  v_bump          INTEGER;          -- unsigned bump magnitude (0, 1, 2, …)
  v_signed_delta  INTEGER;          -- signed delta applied to outcome/market
  v_new_outcomes  JSONB;
  v_new_prob      INTEGER;
  -- dynamics bounds
  v_prob_min      INTEGER := 1;
  v_prob_max      INTEGER := 99;
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
    (user_id, market_id, outcome_id, side, quantity, avg_price, face_value_cents)
  VALUES
    (p_user_id, p_market_id, p_outcome_id, p_side, p_quantity,
     ROUND(v_total_cost::NUMERIC / p_quantity), COALESCE(v_user.contract_face_value, 100))
  ON CONFLICT (user_id, market_id, outcome_id, side)
  DO UPDATE SET
    avg_price  = ROUND(
                   (positions.avg_price * positions.quantity + v_total_cost)::NUMERIC
                   / (positions.quantity + p_quantity)),
    face_value_cents = ROUND(
                   ((positions.quantity * positions.face_value_cents)::NUMERIC +
                    (EXCLUDED.quantity * EXCLUDED.face_value_cents)::NUMERIC)
                   / (positions.quantity + EXCLUDED.quantity)),
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

  -- ── 5. Read dynamics bounds if set ───────────────────────────
  IF v_market.dynamics IS NOT NULL THEN
    IF v_market.dynamics ? 'minProbability' THEN
      v_prob_min := GREATEST(1, (v_market.dynamics ->> 'minProbability')::INTEGER);
    END IF;
    IF v_market.dynamics ? 'maxProbability' THEN
      v_prob_max := LEAST(99, (v_market.dynamics ->> 'maxProbability')::INTEGER);
    END IF;
  END IF;

  -- ── 6. Compute probability bump ──────────────────────────────
  -- 1 percentage point per 100 shares, rounded down; 0 for < 100.
  v_bump := GREATEST(0, FLOOR(p_quantity::NUMERIC / 100)::INTEGER);

  -- YES → increase probability; NO → decrease probability
  v_signed_delta := CASE p_side WHEN 'YES' THEN v_bump ELSE -v_bump END;

  -- ── 7. Update market probability ─────────────────────────────
  IF v_bump > 0 THEN

    IF p_outcome_id IS NOT NULL AND v_market.outcomes IS NOT NULL THEN
      -- ── Multi-outcome market ──────────────────────────────────
      -- Validate that the given outcome exists in the array
      IF NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_market.outcomes) AS elem
        WHERE elem ->> 'id' = p_outcome_id
      ) THEN
        RAISE EXCEPTION 'Outcome "%" not found in market %', p_outcome_id, p_market_id;
      END IF;

      v_new_outcomes := public.adjust_outcome_probabilities(
        v_market.outcomes,
        p_outcome_id,
        v_signed_delta,
        v_prob_min,
        v_prob_max
      );

      UPDATE public.markets
      SET volume     = volume + v_cost,
          outcomes   = v_new_outcomes,
          updated_at = NOW()
      WHERE id = p_market_id;

    ELSE
      -- ── Binary / VS market ────────────────────────────────────
      v_new_prob := GREATEST(
        v_prob_min,
        LEAST(v_prob_max, v_market.probability + v_signed_delta)
      );

      UPDATE public.markets
      SET volume      = volume + v_cost,
          probability = v_new_prob,
          updated_at  = NOW()
      WHERE id = p_market_id;
    END IF;

  ELSE
    -- No probability change — update volume only
    UPDATE public.markets
    SET volume     = volume + v_cost,
        updated_at = NOW()
    WHERE id = p_market_id;
  END IF;

  -- ── 8. Insert trade record ───────────────────────────────────
  INSERT INTO public.trades
    (user_id, market_id, market_title, outcome_id, side,
     price, shares, amount, potential_win, status, type, face_value_cents)
  VALUES
    (p_user_id, p_market_id, COALESCE(v_market.title, ''), p_outcome_id,
     p_side, p_price, p_quantity, v_cost, p_quantity * COALESCE(v_user.contract_face_value, 100), 'WAITING', 'BUY', COALESCE(v_user.contract_face_value, 100))
  RETURNING id INTO v_trade_id;

  -- ── 9. Commission ledger entry ───────────────────────────────
  IF p_commission > 0 THEN
    INSERT INTO public.ledger (user_id, amount, type, description, status)
    VALUES (p_user_id, p_commission, 'TRADE_FEE',
            'Commission for buying ' || p_quantity || ' ' || p_side
            || ' shares of ' || COALESCE(v_market.title, ''),
            'COMPLETED');
  END IF;

  -- ── 10. Fixed trading-fee ledger entry ───────────────────────
  IF p_trading_fee > 0 THEN
    INSERT INTO public.ledger (user_id, amount, type, description, status)
    VALUES (p_user_id, p_trading_fee, 'TRADE_FEE',
            'Trading fee for buying ' || p_quantity || ' shares', 'COMPLETED');
  END IF;

  RETURN jsonb_build_object(
    'success',    true,
    'trade_id',   v_trade_id,
    'prob_bump',  v_signed_delta
  );
END;
$$;


-- 4. Redefine resolve_market to use position's locked-in face value
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
  SET outcome = p_outcome, status = 'resolved', resolved_outcome = p_outcome, resolved_at = NOW(), is_locked = TRUE, updated_at = NOW()
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

  FOR v_pos IN SELECT * FROM public.positions WHERE market_id = p_market_id AND status = 'open' LOOP
    v_cost_basis := v_pos.quantity * v_pos.avg_price;

    IF p_outcome = 'CANCEL' THEN
      v_payout := v_cost_basis;
      
      UPDATE public.profiles
      SET balance = balance + v_payout, withdrawable_balance = withdrawable_balance + v_payout, updated_at = NOW()
      WHERE id = v_pos.user_id;
      
      INSERT INTO public.ledger (user_id, amount, currency, type, description, status)
      VALUES (v_pos.user_id, v_payout, 'NPR', 'MANUAL_ADJUSTMENT', 'Market cancelled — full refund for market ' || p_market_id, 'COMPLETED');
      
      UPDATE public.positions
      SET status = 'cancelled', payout = v_payout, pnl = 0, updated_at = NOW()
      WHERE id = v_pos.id;

      v_cancelled := v_cancelled + 1; 
      v_total_paid := v_total_paid + v_payout;

    ELSIF (v_pos.side = 'YES' AND p_outcome = 'YES') OR (v_pos.side = 'NO' AND p_outcome = 'NO') THEN
      v_payout := v_pos.quantity * COALESCE(v_pos.face_value_cents, 100);
      
      UPDATE public.profiles
      SET balance = balance + v_payout, withdrawable_balance = withdrawable_balance + v_payout, updated_at = NOW()
      WHERE id = v_pos.user_id;
      
      INSERT INTO public.ledger (user_id, amount, currency, type, description, status)
      VALUES (v_pos.user_id, v_payout, 'NPR', 'TRADE_PROFIT', 'Win payout: ' || v_pos.quantity || ' shares in market ' || p_market_id, 'COMPLETED');
      
      UPDATE public.positions
      SET status = 'won', payout = v_payout, pnl = v_payout - v_cost_basis, updated_at = NOW()
      WHERE id = v_pos.id;

      v_winners := v_winners + 1; 
      v_total_paid := v_total_paid + v_payout;

    ELSE
      INSERT INTO public.ledger (user_id, amount, currency, type, description, status)
      VALUES (v_pos.user_id, -v_cost_basis, 'NPR', 'TRADE_LOSS', 'Loss: ' || v_pos.quantity || ' shares in market ' || p_market_id, 'COMPLETED');
      
      UPDATE public.positions
      SET status = 'lost', payout = 0, pnl = -v_cost_basis, updated_at = NOW()
      WHERE id = v_pos.id;

      v_losers := v_losers + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'outcome', p_outcome, 'winners', v_winners, 'losers', v_losers, 'cancelled', v_cancelled, 'total_paid', v_total_paid);
END;
$$;
