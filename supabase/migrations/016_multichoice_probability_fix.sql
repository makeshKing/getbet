-- ============================================================
-- Migration 016: Multi-Outcome Probability Calculation Fix
-- ------------------------------------------------------------
-- Fixes the following critical issues in multi-outcome markets:
--
--   1. NORMALIZATION: Probabilities now always sum to exactly 100%.
--      Previously, bumping one outcome left all others unchanged,
--      causing the total to drift above 100%.
--
--   2. DOUBLE-UPDATE RACE: execute_buy now owns ALL probability
--      updates server-side. The corresponding client-side update
--      block in AppContext.buy() must be removed separately.
--
--   3. SIDE-AWARE BUMPS: YES buys increase probability; NO buys
--      decrease it. YES sells decrease probability; NO sells
--      increase it. Previously only YES buys on exactly 100 shares
--      moved the market.
--
--   4. RESOLVE MULTI-OUTCOME: resolve_market now correctly settles
--      positions for markets with an outcomes[] JSONB array, using
--      outcome_id matching instead of only the binary YES/NO check.
--
--   5. DYNAMICS BOUNDS: If a market has a dynamics preset with
--      minProbability / maxProbability, those bounds are respected
--      per-outcome when clamping the probability.
--
-- Compatibility:
--   • No schema changes beyond relaxing the markets.outcome column
--     constraint so multi-outcome winner IDs (non YES/NO/CANCEL)
--     can be stored.
--   • All existing binary/VS markets continue to work identically.
--   • execute_sell retains migration 008's server-side price
--     derivation logic (p_price is still accepted for backward
--     compatibility but is IGNORED internally).
-- ============================================================


-- ── Step 1: Relax the outcome column constraint ─────────────
-- The original CHECK only allows 'YES', 'NO', 'CANCEL'.
-- Multi-outcome resolution stores the winning outcome's ID.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.markets
  DROP CONSTRAINT IF EXISTS markets_outcome_check;

ALTER TABLE public.markets
  ADD CONSTRAINT markets_outcome_check
  CHECK (outcome IS NULL OR length(trim(outcome)) > 0);


-- ── Step 2: Helper — normalise multi-outcome probability array ──
-- Parameters:
--   p_outcomes    JSONB array of {id, probability, ...} objects
--   p_outcome_id  TEXT id of the outcome to bump
--   p_delta       INTEGER signed change to apply to that outcome
--                 (positive = increase, negative = decrease)
--   p_min         INTEGER minimum probability per outcome (default 1)
--   p_max         INTEGER maximum probability per outcome (default 99)
--
-- Returns: updated JSONB array where all probabilities sum to 100.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.adjust_outcome_probabilities(
  p_outcomes    JSONB,
  p_outcome_id  TEXT,
  p_delta       INTEGER,
  p_min         INTEGER DEFAULT 1,
  p_max         INTEGER DEFAULT 99
) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_n             INTEGER;
  v_i             INTEGER;
  v_outcome       JSONB;
  -- 1-based parallel arrays (PostgreSQL arrays are 1-indexed)
  v_probs         INTEGER[];
  v_ids           TEXT[];
  v_target_idx    INTEGER := 0;
  v_target_old    INTEGER;
  v_target_new    INTEGER;
  v_actual_delta  INTEGER;
  v_others_sum    NUMERIC := 0;
  v_remaining     INTEGER;
  v_sum_check     INTEGER;
  v_largest_idx   INTEGER := 0;
  v_largest_val   INTEGER := -1;
  v_result        JSONB   := '[]'::JSONB;
BEGIN
  v_n := jsonb_array_length(p_outcomes);

  -- Need at least 2 outcomes for meaningful normalisation.
  -- With 1 outcome it must stay at 100% — just clamp and return.
  IF v_n = 0 THEN
    RETURN p_outcomes;
  END IF;

  IF v_n = 1 THEN
    v_outcome := p_outcomes -> 0;
    v_outcome := jsonb_set(v_outcome, '{probability}', to_jsonb(100));
    RETURN jsonb_build_array(v_outcome);
  END IF;

  -- ── Parse the array into parallel 1-based arrays ────────────
  FOR v_i IN 1 .. v_n LOOP
    v_outcome      := p_outcomes -> (v_i - 1);
    v_ids[v_i]    := v_outcome ->> 'id';
    v_probs[v_i]  := COALESCE((v_outcome ->> 'probability')::INTEGER, 0);

    IF v_ids[v_i] = p_outcome_id THEN
      v_target_idx := v_i;
      v_target_old := v_probs[v_i];
    END IF;
  END LOOP;

  IF v_target_idx = 0 THEN
    -- Unknown outcome id — return unchanged (caller should handle)
    RETURN p_outcomes;
  END IF;

  -- ── Apply delta and clamp the target outcome ─────────────────
  v_target_new   := GREATEST(p_min, LEAST(p_max, v_target_old + p_delta));
  v_actual_delta := v_target_new - v_target_old;

  -- Nothing to do
  IF v_actual_delta = 0 THEN
    RETURN p_outcomes;
  END IF;

  v_probs[v_target_idx] := v_target_new;

  -- ── Compute the remaining probability budget for others ───────
  v_remaining := 100 - v_target_new;

  -- Sum of all other outcomes (before scaling)
  FOR v_i IN 1 .. v_n LOOP
    IF v_i <> v_target_idx THEN
      v_others_sum := v_others_sum + v_probs[v_i];
    END IF;
  END LOOP;

  -- ── Scale other outcomes proportionally ───────────────────────
  IF v_others_sum > 0 THEN
    FOR v_i IN 1 .. v_n LOOP
      IF v_i <> v_target_idx THEN
        v_probs[v_i] := GREATEST(
          p_min,
          ROUND(v_probs[v_i]::NUMERIC * v_remaining::NUMERIC / v_others_sum)::INTEGER
        );
      END IF;
    END LOOP;
  ELSE
    -- All other outcomes were 0 — distribute equally
    FOR v_i IN 1 .. v_n LOOP
      IF v_i <> v_target_idx THEN
        v_probs[v_i] := GREATEST(p_min, (v_remaining / (v_n - 1)));
      END IF;
    END LOOP;
  END IF;

  -- ── Fix rounding drift to ensure exact sum = 100 ─────────────
  v_sum_check := 0;
  FOR v_i IN 1 .. v_n LOOP
    v_sum_check := v_sum_check + v_probs[v_i];
    -- Track the largest non-target outcome to absorb remainder
    IF v_i <> v_target_idx AND v_probs[v_i] > v_largest_val THEN
      v_largest_val := v_probs[v_i];
      v_largest_idx := v_i;
    END IF;
  END LOOP;

  IF v_sum_check <> 100 AND v_largest_idx > 0 THEN
    v_probs[v_largest_idx] := GREATEST(
      p_min,
      LEAST(p_max, v_probs[v_largest_idx] + (100 - v_sum_check))
    );
  END IF;

  -- ── Rebuild the JSONB array with updated probabilities ────────
  FOR v_i IN 1 .. v_n LOOP
    v_outcome := jsonb_set(
      p_outcomes -> (v_i - 1),
      '{probability}',
      to_jsonb(v_probs[v_i])
    );
    v_result := v_result || jsonb_build_array(v_outcome);
  END LOOP;

  RETURN v_result;
END;
$$;


-- ── Step 3: Replace execute_buy ──────────────────────────────
-- Key changes vs migration 006:
--   • Lock market row FOR UPDATE to eliminate probability races.
--   • Bump is now proportional: floor(quantity / 100) points
--     (min 0), so any quantity >= 100 moves the market.
--   • YES buy → probability UP; NO buy → probability DOWN.
--   • Multi-outcome: call adjust_outcome_probabilities to
--     renormalise after every bump.
--   • Binary market: directly adjust market.probability with the
--     correct directional sign.
--   • Dynamics min/max are applied when present.
--   • The caller (AppContext.buy) MUST NOT perform a secondary
--     probability update — that block should be removed.
-- ─────────────────────────────────────────────────────────────
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
     price, shares, amount, potential_win, status, type)
  VALUES
    (p_user_id, p_market_id, COALESCE(v_market.title, ''), p_outcome_id,
     p_side, p_price, p_quantity, v_cost, p_quantity * 10000, 'WAITING', 'BUY')
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


-- ── Step 4: Replace execute_sell ─────────────────────────────
-- Key changes vs migration 008:
--   • Retains server-side price derivation from live market state.
--   • NOW ALSO updates market probability after a sell:
--       – Selling YES shares → probability decreases (reverse of buy).
--       – Selling NO shares  → probability increases.
--   • Multi-outcome: calls adjust_outcome_probabilities with the
--     reversed delta, then renormalises.
--   • Binary market: directly adjusts market.probability.
--   • Dynamics bounds honoured.
--   • Returns 'sell_price' so the client knows the actual price used.
-- ─────────────────────────────────────────────────────────────
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
  -- probability adjustment helpers
  v_bump          INTEGER;
  v_signed_delta  INTEGER;
  v_new_outcomes  JSONB;
  v_new_prob      INTEGER;
  -- dynamics bounds
  v_prob_min      INTEGER := 1;
  v_prob_max      INTEGER := 99;
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

  -- ── 3. Read dynamics bounds if set ───────────────────────────
  IF v_market.dynamics IS NOT NULL THEN
    IF v_market.dynamics ? 'minProbability' THEN
      v_prob_min := GREATEST(1, (v_market.dynamics ->> 'minProbability')::INTEGER);
    END IF;
    IF v_market.dynamics ? 'maxProbability' THEN
      v_prob_max := LEAST(99, (v_market.dynamics ->> 'maxProbability')::INTEGER);
    END IF;
  END IF;

  -- ── 4. Derive current sell price from live market state ───────
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

  -- ── 5. Calculate revenue ─────────────────────────────────────
  v_revenue     := v_current_price * p_quantity;
  v_net_revenue := v_revenue - p_commission - p_trading_fee;

  -- ── 6. Fetch and lock position ───────────────────────────────
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

  -- ── 7. Cost basis & P&L ──────────────────────────────────────
  v_cost_basis := v_position.avg_price * p_quantity;
  v_pnl        := v_net_revenue - v_cost_basis;

  -- ── 8. Credit user balance ───────────────────────────────────
  UPDATE public.profiles
  SET balance              = balance + v_net_revenue,
      withdrawable_balance = withdrawable_balance + v_net_revenue,
      updated_at           = NOW()
  WHERE id = p_user_id;

  -- ── 9. Update or delete position ─────────────────────────────
  IF v_position.quantity = p_quantity THEN
    DELETE FROM public.positions WHERE id = v_position.id;
  ELSE
    UPDATE public.positions
    SET quantity   = quantity - p_quantity,
        updated_at = NOW()
    WHERE id = v_position.id;
  END IF;

  -- ── 10. Insert trade record ──────────────────────────────────
  INSERT INTO public.trades
    (user_id, market_id, market_title, outcome_id, side,
     price, shares, amount, potential_win, status, type)
  VALUES
    (p_user_id, p_market_id, COALESCE(v_market.title, ''), p_outcome_id,
     p_side, v_current_price, p_quantity, v_revenue, 0,
     CASE WHEN v_pnl >= 0 THEN 'WON' ELSE 'LOST' END, 'SELL')
  RETURNING id INTO v_trade_id;

  -- ── 11. Profit/loss ledger entry ─────────────────────────────
  INSERT INTO public.ledger (user_id, amount, type, description, status)
  VALUES (p_user_id, v_pnl,
          CASE WHEN v_pnl >= 0 THEN 'TRADE_PROFIT' ELSE 'TRADE_LOSS' END,
          'Sold ' || p_quantity || ' ' || p_side || ' shares of '
          || COALESCE(v_market.title, '')
          || ' @ Rs.' || (v_current_price::NUMERIC / 100)::TEXT
          || '/share (cost Rs.' || (v_position.avg_price::NUMERIC / 100)::TEXT || ')',
          'COMPLETED');

  -- ── 12. Commission ledger entry ──────────────────────────────
  IF p_commission > 0 THEN
    INSERT INTO public.ledger (user_id, amount, type, description, status)
    VALUES (p_user_id, p_commission, 'TRADE_FEE',
            'Commission for selling ' || p_quantity || ' ' || p_side || ' shares',
            'COMPLETED');
  END IF;

  -- ── 13. Fixed trading-fee ledger entry ───────────────────────
  IF p_trading_fee > 0 THEN
    INSERT INTO public.ledger (user_id, amount, type, description, status)
    VALUES (p_user_id, p_trading_fee, 'TRADE_FEE',
            'Trading fee for selling ' || p_quantity || ' shares', 'COMPLETED');
  END IF;

  -- ── 14. Update market volume + probability ───────────────────
  -- Selling reverses the directional signal of buying:
  --   Sell YES → probability decreases (opposite of YES buy)
  --   Sell NO  → probability increases (opposite of NO buy)
  v_bump := GREATEST(0, FLOOR(p_quantity::NUMERIC / 100)::INTEGER);

  -- For a sell, the direction is opposite to a buy of the same side
  v_signed_delta := CASE p_side WHEN 'YES' THEN -v_bump ELSE v_bump END;

  IF v_bump > 0 THEN

    IF p_outcome_id IS NOT NULL AND v_market.outcomes IS NOT NULL THEN
      -- Multi-outcome market: normalise after reverse adjustment
      v_new_outcomes := public.adjust_outcome_probabilities(
        v_market.outcomes,
        p_outcome_id,
        v_signed_delta,
        v_prob_min,
        v_prob_max
      );

      UPDATE public.markets
      SET volume     = volume + v_revenue,
          outcomes   = v_new_outcomes,
          updated_at = NOW()
      WHERE id = p_market_id;

    ELSE
      -- Binary market: adjust overall probability
      v_new_prob := GREATEST(
        v_prob_min,
        LEAST(v_prob_max, v_market.probability + v_signed_delta)
      );

      UPDATE public.markets
      SET volume      = volume + v_revenue,
          probability = v_new_prob,
          updated_at  = NOW()
      WHERE id = p_market_id;
    END IF;

  ELSE
    -- No probability change — update volume only
    UPDATE public.markets
    SET volume     = volume + v_revenue,
        updated_at = NOW()
    WHERE id = p_market_id;
  END IF;

  -- ── 15. Return result ────────────────────────────────────────
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


-- ── Step 5: Replace resolve_market ───────────────────────────
-- Key changes vs migration 002:
--   • Detects multi-outcome markets (market.outcomes IS NOT NULL).
--   • Multi-outcome win condition:
--       – YES on winning outcome_id → WIN
--       – NO  on ANY other outcome_id → WIN (since the outcome
--         they bet "No" on did not win)
--   • Locks market row and all positions FOR UPDATE.
--   • Returns total_invested and house_profit for admin preview.
--   • Validates p_outcome is not empty.
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.resolve_market(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.resolve_market(
  p_market_id TEXT,
  p_outcome   TEXT   -- 'YES', 'NO', 'CANCEL', or a multi-outcome outcome ID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_market        RECORD;
  v_pos           RECORD;
  v_payout        BIGINT;
  v_cost_basis    BIGINT;
  v_total_paid    BIGINT  := 0;
  v_total_invested BIGINT := 0;
  v_winners       INTEGER := 0;
  v_losers        INTEGER := 0;
  v_cancelled     INTEGER := 0;
  v_is_multi      BOOLEAN := FALSE;
  v_pos_wins      BOOLEAN;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_outcome IS NULL OR trim(p_outcome) = '' THEN
    RAISE EXCEPTION 'Outcome must not be empty';
  END IF;

  -- ── 1. Lock & fetch market ────────────────────────────────────
  SELECT * INTO v_market
  FROM public.markets
  WHERE id = p_market_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Market % not found', p_market_id;
  END IF;

  IF v_market.outcome IS NOT NULL THEN
    RAISE EXCEPTION 'Market % is already resolved (outcome: %)', p_market_id, v_market.outcome;
  END IF;

  -- Detect multi-outcome market
  v_is_multi := (v_market.outcomes IS NOT NULL AND
                 jsonb_array_length(v_market.outcomes) > 0);

  -- For multi-outcome markets, validate the winning outcome ID exists
  IF v_is_multi AND p_outcome NOT IN ('CANCEL') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_market.outcomes) AS elem
      WHERE elem ->> 'id' = p_outcome
    ) THEN
      RAISE EXCEPTION 'Outcome "%" does not exist in market %', p_outcome, p_market_id;
    END IF;
  END IF;

  -- ── 2. Mark market as resolved & locked ──────────────────────
  UPDATE public.markets
  SET outcome    = p_outcome,
      is_locked  = TRUE,
      updated_at = NOW()
  WHERE id = p_market_id;

  -- ── 3. Mark all pending trades as WON / LOST ─────────────────
  IF p_outcome = 'CANCEL' THEN
    -- Cancelled: all trades treated as void; balance restored via positions loop
    UPDATE public.trades
    SET status = 'LOST'
    WHERE market_id = p_market_id AND status = 'WAITING';

  ELSIF v_is_multi THEN
    -- Multi-outcome: win if (YES on winner) OR (NO on any non-winner)
    UPDATE public.trades
    SET status = CASE
      WHEN side = 'YES' AND outcome_id = p_outcome                         THEN 'WON'
      WHEN side = 'NO'  AND outcome_id IS NOT NULL AND outcome_id <> p_outcome THEN 'WON'
      ELSE 'LOST'
    END
    WHERE market_id = p_market_id AND status = 'WAITING';

  ELSE
    -- Binary / VS market: classic YES/NO resolution
    UPDATE public.trades
    SET status = CASE
      WHEN (side = 'YES' AND p_outcome = 'YES') OR
           (side = 'NO'  AND p_outcome = 'NO')  THEN 'WON'
      ELSE 'LOST'
    END
    WHERE market_id = p_market_id AND status = 'WAITING';
  END IF;

  -- ── 4. Settle every open position ────────────────────────────
  FOR v_pos IN
    SELECT * FROM public.positions
    WHERE market_id = p_market_id
    FOR UPDATE
  LOOP
    v_cost_basis     := v_pos.quantity * v_pos.avg_price;
    v_total_invested := v_total_invested + v_cost_basis;

    IF p_outcome = 'CANCEL' THEN
      -- ── CANCEL: full cost-basis refund ─────────────────────────
      v_payout    := v_cost_basis;
      v_pos_wins  := TRUE;  -- used only for counter

      UPDATE public.profiles
      SET balance              = balance              + v_payout,
          withdrawable_balance = withdrawable_balance + v_payout,
          updated_at           = NOW()
      WHERE id = v_pos.user_id;

      INSERT INTO public.ledger
        (user_id, amount, currency, type, description, status)
      VALUES
        (v_pos.user_id, v_payout, 'NPR', 'MANUAL_ADJUSTMENT',
         'Market cancelled — full refund for ' || v_pos.quantity
         || ' ' || v_pos.side || ' shares in market ' || p_market_id,
         'COMPLETED');

      v_cancelled  := v_cancelled  + 1;
      v_total_paid := v_total_paid + v_payout;

    ELSE
      -- ── Determine win/loss for this position ─────────────────
      IF v_is_multi THEN
        -- Multi-outcome win conditions
        v_pos_wins :=
          (v_pos.side = 'YES' AND v_pos.outcome_id = p_outcome)
          OR
          (v_pos.side = 'NO'
           AND v_pos.outcome_id IS NOT NULL
           AND v_pos.outcome_id <> p_outcome);
      ELSE
        -- Binary win conditions
        v_pos_wins :=
          (v_pos.side = 'YES' AND p_outcome = 'YES')
          OR
          (v_pos.side = 'NO'  AND p_outcome = 'NO');
      END IF;

      IF v_pos_wins THEN
        -- ── WIN: pay 100 cents (Rs 1) per share ────────────────
        v_payout := v_pos.quantity * 100;

        UPDATE public.profiles
        SET balance              = balance              + v_payout,
            withdrawable_balance = withdrawable_balance + v_payout,
            updated_at           = NOW()
        WHERE id = v_pos.user_id;

        INSERT INTO public.ledger
          (user_id, amount, currency, type, description, status)
        VALUES
          (v_pos.user_id, v_payout, 'NPR', 'TRADE_PROFIT',
           'Win payout: ' || v_pos.quantity || ' × Rs.1 (' || v_pos.side
           || CASE WHEN v_pos.outcome_id IS NOT NULL
                   THEN ' on outcome ' || v_pos.outcome_id
                   ELSE '' END
           || ') in market ' || p_market_id,
           'COMPLETED');

        v_winners    := v_winners    + 1;
        v_total_paid := v_total_paid + v_payout;

      ELSE
        -- ── LOSS: record entry only; balance was deducted on buy ─
        INSERT INTO public.ledger
          (user_id, amount, currency, type, description, status)
        VALUES
          (v_pos.user_id, -v_cost_basis, 'NPR', 'TRADE_LOSS',
           'Loss: ' || v_pos.quantity || ' ' || v_pos.side
           || ' shares at avg Rs.' || (v_pos.avg_price::NUMERIC / 100)::TEXT
           || CASE WHEN v_pos.outcome_id IS NOT NULL
                   THEN ' (outcome ' || v_pos.outcome_id || ')'
                   ELSE '' END
           || ' in market ' || p_market_id,
           'COMPLETED');

        v_losers := v_losers + 1;
      END IF;
    END IF;
  END LOOP;

  -- ── 5. Delete all settled positions ──────────────────────────
  DELETE FROM public.positions WHERE market_id = p_market_id;

  -- ── 6. Return settlement summary ─────────────────────────────
  RETURN jsonb_build_object(
    'success',        true,
    'outcome',        p_outcome,
    'market_id',      p_market_id,
    'is_multi',       v_is_multi,
    'winners',        v_winners,
    'losers',         v_losers,
    'cancelled',      v_cancelled,
    'total_invested', v_total_invested,
    'total_paid',     v_total_paid,
    'house_profit',   v_total_invested - v_total_paid
  );
END;
$$;
