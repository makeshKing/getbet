-- Add resolution tracking to markets table
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS resolved_outcome TEXT;
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add result tracking to positions table
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open'; -- 'open' | 'won' | 'lost'
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS payout BIGINT; -- in cents
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS pnl BIGINT; -- in cents

-- Drop the unused execute_sell function
DROP FUNCTION IF EXISTS public.execute_sell(UUID, TEXT, TEXT, BIGINT, INTEGER, TEXT, BIGINT, BIGINT);

-- Redefine resolve_market to update position status instead of deleting
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
      v_payout := v_pos.quantity * 100;
      
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
