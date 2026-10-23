-- ============================================================
-- PredictKit — Migration 002: Market Settlement Fix
-- Run this in your Supabase SQL Editor
-- ============================================================
--
-- Replaces the existing resolve_market function with a version
-- that actually settles user positions and distributes payouts.
--
-- Payout logic:
--   WIN:    user receives quantity × 100 cents (1 NPR per share)
--   LOSE:   no balance change (money already deducted on buy);
--           a TRADE_LOSS ledger entry is recorded for transparency
--   CANCEL: user receives full refund of quantity × avg_price cents

DROP FUNCTION IF EXISTS public.resolve_market(TEXT, TEXT);

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

  -- ── 1. Mark market as resolved ─────────────────────────────
  UPDATE public.markets
  SET outcome    = p_outcome,
      is_locked  = TRUE,
      updated_at = NOW()
  WHERE id = p_market_id;

  -- ── 2. Mark all WAITING trades as WON / LOST / CANCELLED ──
  IF p_outcome = 'CANCEL' THEN
    UPDATE public.trades
    SET status = 'LOST'   -- treated as void; refunds handled via positions
    WHERE market_id = p_market_id AND status = 'WAITING';
  ELSE
    UPDATE public.trades
    SET status = CASE
      WHEN (side = 'YES' AND p_outcome = 'YES') OR
           (side = 'NO'  AND p_outcome = 'NO')
      THEN 'WON'
      ELSE 'LOST'
    END
    WHERE market_id = p_market_id AND status = 'WAITING';
  END IF;

  -- ── 3. Settle every open position for this market ──────────
  FOR v_pos IN
    SELECT * FROM public.positions WHERE market_id = p_market_id
  LOOP
    v_cost_basis := v_pos.quantity * v_pos.avg_price;

    IF p_outcome = 'CANCEL' THEN
      -- ── CANCEL: full refund ───────────────────────────────
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
         'Market cancelled — full refund for position in market ' || p_market_id,
         'COMPLETED');

      v_cancelled := v_cancelled + 1;
      v_total_paid := v_total_paid + v_payout;

    ELSIF (v_pos.side = 'YES' AND p_outcome = 'YES') OR
          (v_pos.side = 'NO'  AND p_outcome = 'NO') THEN
      -- ── WIN: pay out 1 NPR per share ─────────────────────
      v_payout := v_pos.quantity * 100;  -- 100 cents = 1 NPR per share

      UPDATE public.profiles
      SET balance              = balance              + v_payout,
          withdrawable_balance = withdrawable_balance + v_payout,
          updated_at           = NOW()
      WHERE id = v_pos.user_id;

      INSERT INTO public.ledger
        (user_id, amount, currency, type, description, status)
      VALUES
        (v_pos.user_id, v_payout, 'NPR', 'TRADE_PROFIT',
         'Win payout: ' || v_pos.quantity || ' shares × Rs. 1 in market ' || p_market_id,
         'COMPLETED');

      v_winners    := v_winners    + 1;
      v_total_paid := v_total_paid + v_payout;

    ELSE
      -- ── LOSE: record loss only (balance already deducted on buy) ──
      INSERT INTO public.ledger
        (user_id, amount, currency, type, description, status)
      VALUES
        (v_pos.user_id, -v_cost_basis, 'NPR', 'TRADE_LOSS',
         'Loss: ' || v_pos.quantity || ' shares at avg price ' ||
         v_pos.avg_price || ' in market ' || p_market_id,
         'COMPLETED');

      v_losers := v_losers + 1;
    END IF;

  END LOOP;

  -- ── 4. Delete all settled positions for this market ────────
  DELETE FROM public.positions WHERE market_id = p_market_id;

  RETURN jsonb_build_object(
    'success',     true,
    'outcome',     p_outcome,
    'market_id',   p_market_id,
    'winners',     v_winners,
    'losers',      v_losers,
    'cancelled',   v_cancelled,
    'total_paid',  v_total_paid
  );
END;
$$;
