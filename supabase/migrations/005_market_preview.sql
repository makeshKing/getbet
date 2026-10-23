-- ============================================================
-- PredictKit — Migration 005: Market Resolution Preview & Fix
-- Run this in your Supabase SQL Editor
-- ============================================================
--
-- 1. Adds get_market_resolution_preview() RPC so the admin UI
--    can show accurate YES/NO volume, bettor counts, projected
--    payouts and house profit BEFORE resolving.
--
-- 2. Replaces resolve_market() with a version that:
--    - Correctly pays winners: quantity × 100 cents (1 NPR/share)
--    - Records the actual cost_basis (invested amount) in loss entries
--    - Returns enriched stats: total_invested, house_profit, avg_win_price
--
-- Payout model recap:
--   Each share has a face value of Rs. 1 (100 cents).
--   A user who buys N YES-shares at avg price P cents/share has
--   invested  N × P  cents.
--   If YES wins  → they receive  N × 100  cents  (profit = N×(100-P))
--   If YES loses → they receive  0         cents  (loss   = N×P, already deducted on buy)
--   House profit (if YES wins) = total_invested - YES_payout
--                               = (yes_invested + no_invested) - (yes_shares × 100)
-- ============================================================

-- ── 1. Preview function ──────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_market_resolution_preview(TEXT);

CREATE OR REPLACE FUNCTION public.get_market_resolution_preview(p_market_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_yes_bettors   BIGINT := 0;
  v_no_bettors    BIGINT := 0;
  v_yes_shares    BIGINT := 0;
  v_no_shares     BIGINT := 0;
  v_yes_invested  BIGINT := 0;   -- sum(quantity × avg_price) for YES side
  v_no_invested   BIGINT := 0;   -- sum(quantity × avg_price) for NO  side
  v_total_invested BIGINT := 0;
  v_yes_payout    BIGINT := 0;   -- what winners receive if YES resolves
  v_no_payout     BIGINT := 0;   -- what winners receive if NO  resolves
  v_house_if_yes  BIGINT := 0;
  v_house_if_no   BIGINT := 0;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin required'; END IF;

  SELECT
    COUNT(*)          FILTER (WHERE side = 'YES'),
    COUNT(*)          FILTER (WHERE side = 'NO'),
    COALESCE(SUM(quantity)              FILTER (WHERE side = 'YES'), 0),
    COALESCE(SUM(quantity)              FILTER (WHERE side = 'NO'),  0),
    COALESCE(SUM(quantity * avg_price)  FILTER (WHERE side = 'YES'), 0),
    COALESCE(SUM(quantity * avg_price)  FILTER (WHERE side = 'NO'),  0)
  INTO
    v_yes_bettors, v_no_bettors,
    v_yes_shares,  v_no_shares,
    v_yes_invested, v_no_invested
  FROM public.positions
  WHERE market_id = p_market_id;

  v_total_invested := v_yes_invested + v_no_invested;

  -- Each winning share pays out exactly Rs. 1 (100 cents)
  v_yes_payout   := v_yes_shares * 100;
  v_no_payout    := v_no_shares  * 100;

  -- House keeps what's left after paying winners
  -- (Negative means house subsidises — should not happen in a healthy market)
  v_house_if_yes := v_total_invested - v_yes_payout;
  v_house_if_no  := v_total_invested - v_no_payout;

  RETURN jsonb_build_object(
    'yes_bettors',    v_yes_bettors,
    'no_bettors',     v_no_bettors,
    'yes_shares',     v_yes_shares,
    'no_shares',      v_no_shares,
    'yes_invested',   v_yes_invested,
    'no_invested',    v_no_invested,
    'total_invested', v_total_invested,
    'yes_payout',     v_yes_payout,
    'no_payout',      v_no_payout,
    'house_if_yes',   v_house_if_yes,
    'house_if_no',    v_house_if_no
  );
END;
$$;

-- ── 2. Corrected resolve_market ──────────────────────────────
DROP FUNCTION IF EXISTS public.resolve_market(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.resolve_market(
  p_market_id TEXT,
  p_outcome   TEXT   -- 'YES', 'NO', or 'CANCEL'
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pos             RECORD;
  v_payout          BIGINT;
  v_cost_basis      BIGINT;
  v_total_invested  BIGINT  := 0;
  v_total_paid      BIGINT  := 0;
  v_house_profit    BIGINT  := 0;
  v_winners         INTEGER := 0;
  v_losers          INTEGER := 0;
  v_cancelled       INTEGER := 0;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin required'; END IF;

  -- ── 1. Mark market resolved & locked ────────────────────────
  UPDATE public.markets
  SET outcome    = p_outcome,
      is_locked  = TRUE,
      updated_at = NOW()
  WHERE id = p_market_id;

  -- ── 2. Update trade statuses ─────────────────────────────────
  IF p_outcome = 'CANCEL' THEN
    UPDATE public.trades
    SET status = 'LOST'    -- void; individual refunds handled below
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

  -- ── 3. Settle every open position ────────────────────────────
  FOR v_pos IN
    SELECT * FROM public.positions WHERE market_id = p_market_id
  LOOP
    -- Cost basis = what the user actually paid (avg_price already includes commission)
    v_cost_basis     := v_pos.quantity * v_pos.avg_price;
    v_total_invested := v_total_invested + v_cost_basis;

    IF p_outcome = 'CANCEL' THEN
      -- ── CANCEL: full refund of invested amount ──────────────
      v_payout := v_cost_basis;

      UPDATE public.profiles
      SET balance              = balance              + v_payout,
          withdrawable_balance = withdrawable_balance + v_payout,
          updated_at           = NOW()
      WHERE id = v_pos.user_id;

      INSERT INTO public.ledger (user_id, amount, currency, type, description, status)
      VALUES (
        v_pos.user_id, v_payout, 'NPR', 'MANUAL_ADJUSTMENT',
        'Market cancelled — refund of Rs. ' || (v_payout::NUMERIC / 100)::TEXT ||
        ' for ' || v_pos.quantity || ' shares in market ' || p_market_id,
        'COMPLETED'
      );

      v_cancelled  := v_cancelled  + 1;
      v_total_paid := v_total_paid + v_payout;

    ELSIF (v_pos.side = 'YES' AND p_outcome = 'YES') OR
          (v_pos.side = 'NO'  AND p_outcome = 'NO')  THEN
      -- ── WIN: each share pays Rs. 1 (100 cents) ─────────────
      -- Winner invested v_cost_basis, receives v_payout; net profit = v_payout - v_cost_basis
      v_payout := v_pos.quantity * 100;

      UPDATE public.profiles
      SET balance              = balance              + v_payout,
          withdrawable_balance = withdrawable_balance + v_payout,
          updated_at           = NOW()
      WHERE id = v_pos.user_id;

      INSERT INTO public.ledger (user_id, amount, currency, type, description, status)
      VALUES (
        v_pos.user_id, v_payout, 'NPR', 'TRADE_PROFIT',
        'Win: ' || v_pos.quantity || ' shares × Rs. 1 = Rs. ' ||
        (v_payout::NUMERIC / 100)::TEXT ||
        ' (invested Rs. ' || (v_cost_basis::NUMERIC / 100)::TEXT ||
        ', profit Rs. ' || ((v_payout - v_cost_basis)::NUMERIC / 100)::TEXT ||
        ') — market ' || p_market_id,
        'COMPLETED'
      );

      v_winners    := v_winners    + 1;
      v_total_paid := v_total_paid + v_payout;

    ELSE
      -- ── LOSE: record the loss amount (balance already deducted on buy) ──
      INSERT INTO public.ledger (user_id, amount, currency, type, description, status)
      VALUES (
        v_pos.user_id, -v_cost_basis, 'NPR', 'TRADE_LOSS',
        'Loss: ' || v_pos.quantity || ' shares at avg Rs. ' ||
        (v_pos.avg_price::NUMERIC / 100)::TEXT ||
        ' (total Rs. ' || (v_cost_basis::NUMERIC / 100)::TEXT ||
        ') — market ' || p_market_id,
        'COMPLETED'
      );

      v_losers := v_losers + 1;
    END IF;

  END LOOP;

  -- ── 4. Delete all settled positions ──────────────────────────
  DELETE FROM public.positions WHERE market_id = p_market_id;

  -- House profit = total invested by all bettors minus total paid to winners
  v_house_profit := v_total_invested - v_total_paid;

  RETURN jsonb_build_object(
    'success',         true,
    'outcome',         p_outcome,
    'market_id',       p_market_id,
    'winners',         v_winners,
    'losers',          v_losers,
    'cancelled',       v_cancelled,
    'total_invested',  v_total_invested,
    'total_paid',      v_total_paid,
    'house_profit',    v_house_profit
  );
END;
$$;
