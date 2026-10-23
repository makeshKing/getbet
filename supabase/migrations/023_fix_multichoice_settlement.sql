-- ============================================================
-- PredictKit — Migration 023: Fix Multi-Choice Settlement Logic
-- ============================================================
-- FIX: Migration 018 regressed the multi-outcome settlement logic
-- from 016. It only checks binary YES/NO win conditions:
--
--   (v_pos.side = 'YES' AND p_outcome = 'YES')
--   OR (v_pos.side = 'NO' AND p_outcome = 'NO')
--
-- This is WRONG for multi-choice markets. When the admin resolves
-- a multi-outcome market by picking outcome_id "B", the correct
-- win conditions are:
--
--   YES on B  → WON  (B happened — correct prediction)
--   NO  on A  → WON  (A did not happen — correct prediction)
--   NO  on C  → WON  (C did not happen — correct prediction)
--   YES on A  → LOST (A did not happen — wrong prediction)
--   NO  on B  → LOST (B happened — wrong prediction)
--   YES on C  → LOST (C did not happen — wrong prediction)
--
-- This migration restores the multi-outcome-aware logic from 016,
-- merged with:
--   • 017's trade payout/pnl column writes
--   • 018's position status tracking (update to won/lost vs delete)
--   • 016's total_invested + house_profit in return value
--   • 016's market row locking (FOR UPDATE)
--   • 016's outcome validation for multi-choice markets
-- ============================================================

CREATE OR REPLACE FUNCTION public.resolve_market(
  p_market_id TEXT,
  p_outcome   TEXT   -- 'YES', 'NO', 'CANCEL', or a multi-outcome outcome ID
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_market         RECORD;
  v_pos            RECORD;
  v_payout         BIGINT;
  v_cost_basis     BIGINT;
  v_total_paid     BIGINT  := 0;
  v_total_invested BIGINT  := 0;
  v_winners        INTEGER := 0;
  v_losers         INTEGER := 0;
  v_cancelled      INTEGER := 0;
  v_is_multi       BOOLEAN := FALSE;
  v_pos_wins       BOOLEAN;
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
  SET outcome          = p_outcome,
      status           = 'resolved',
      resolved_outcome = p_outcome,
      resolved_at      = NOW(),
      is_locked        = TRUE,
      updated_at       = NOW()
  WHERE id = p_market_id;

  -- ── 3. Mark all pending trades as WON / LOST ─────────────────
  IF p_outcome = 'CANCEL' THEN
    -- Cancelled: all trades treated as void; balance restored via positions loop
    UPDATE public.trades
    SET status = 'LOST',
        payout = 0,
        pnl    = -amount
    WHERE market_id = p_market_id AND status = 'WAITING';

  ELSIF v_is_multi THEN
    -- Multi-outcome: win if (YES on winner) OR (NO on any non-winner)
    UPDATE public.trades
    SET status = CASE
          WHEN side = 'YES' AND outcome_id = p_outcome                                    THEN 'WON'
          WHEN side = 'NO'  AND outcome_id IS NOT NULL AND outcome_id <> p_outcome         THEN 'WON'
          ELSE 'LOST'
        END,
        payout = CASE
          WHEN (side = 'YES' AND outcome_id = p_outcome)
            OR (side = 'NO' AND outcome_id IS NOT NULL AND outcome_id <> p_outcome)
          THEN amount / (price::decimal / 100)
          ELSE 0
        END,
        pnl = CASE
          WHEN (side = 'YES' AND outcome_id = p_outcome)
            OR (side = 'NO' AND outcome_id IS NOT NULL AND outcome_id <> p_outcome)
          THEN (amount / (price::decimal / 100)) - amount
          ELSE -amount
        END
    WHERE market_id = p_market_id AND status = 'WAITING';

  ELSE
    -- Binary / VS market: classic YES/NO resolution
    UPDATE public.trades
    SET status = CASE
          WHEN (side = 'YES' AND p_outcome = 'YES') OR
               (side = 'NO'  AND p_outcome = 'NO')  THEN 'WON'
          ELSE 'LOST'
        END,
        payout = CASE
          WHEN (side = 'YES' AND p_outcome = 'YES') OR (side = 'NO' AND p_outcome = 'NO')
          THEN amount / (price::decimal / 100)
          ELSE 0
        END,
        pnl = CASE
          WHEN (side = 'YES' AND p_outcome = 'YES') OR (side = 'NO' AND p_outcome = 'NO')
          THEN (amount / (price::decimal / 100)) - amount
          ELSE -amount
        END
    WHERE market_id = p_market_id AND status = 'WAITING';
  END IF;

  -- ── 4. Settle every open position ────────────────────────────
  FOR v_pos IN
    SELECT * FROM public.positions
    WHERE market_id = p_market_id AND status = 'open'
    FOR UPDATE
  LOOP
    v_cost_basis     := v_pos.quantity * v_pos.avg_price;
    v_total_invested := v_total_invested + v_cost_basis;

    IF p_outcome = 'CANCEL' THEN
      -- ── CANCEL: full cost-basis refund ─────────────────────────
      v_payout := v_cost_basis;

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

      UPDATE public.positions
      SET status = 'cancelled', payout = v_payout, pnl = 0, updated_at = NOW()
      WHERE id = v_pos.id;

      v_cancelled  := v_cancelled  + 1;
      v_total_paid := v_total_paid + v_payout;

    ELSE
      -- ── Determine win/loss for this position ─────────────────
      IF v_is_multi THEN
        -- Multi-outcome win conditions:
        --   YES on the winning outcome → WIN
        --   NO on any non-winning outcome → WIN (it didn't happen, correct!)
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

        UPDATE public.positions
        SET status = 'won', payout = v_payout, pnl = v_payout - v_cost_basis, updated_at = NOW()
        WHERE id = v_pos.id;

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

        UPDATE public.positions
        SET status = 'lost', payout = 0, pnl = -v_cost_basis, updated_at = NOW()
        WHERE id = v_pos.id;

        v_losers := v_losers + 1;
      END IF;
    END IF;
  END LOOP;

  -- ── 5. Return settlement summary ─────────────────────────────
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
