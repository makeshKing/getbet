-- Fix any positions that belong to resolved markets but are still 'open' or NULL.
-- This manually triggers the payouts for already resolved markets that didn't settle positions.

DO $$
DECLARE
  v_mkt RECORD;
  v_pos RECORD;
  v_payout BIGINT;
  v_cost_basis BIGINT;
BEGIN
  -- Find all markets that are resolved but have unsettled positions
  FOR v_mkt IN 
    SELECT id, outcome, resolved_outcome FROM public.markets WHERE status = 'resolved' OR outcome IS NOT NULL
  LOOP
    -- Iterate through stuck positions for this market
    FOR v_pos IN 
      SELECT * FROM public.positions 
      WHERE market_id = v_mkt.id AND (status = 'open' OR status IS NULL)
    LOOP
      v_cost_basis := v_pos.quantity * v_pos.avg_price;

      IF v_mkt.outcome = 'CANCEL' THEN
        v_payout := v_cost_basis;
        
        UPDATE public.profiles
        SET balance = balance + v_payout, withdrawable_balance = withdrawable_balance + v_payout, updated_at = NOW()
        WHERE id = v_pos.user_id;
        
        INSERT INTO public.ledger (user_id, amount, currency, type, description, status)
        VALUES (v_pos.user_id, v_payout, 'NPR', 'MANUAL_ADJUSTMENT', 'Market cancelled — full refund for market ' || v_mkt.id, 'COMPLETED');
        
        UPDATE public.positions
        SET status = 'cancelled', payout = v_payout, pnl = 0, updated_at = NOW()
        WHERE id = v_pos.id;

      ELSIF (v_pos.side = 'YES' AND v_mkt.outcome = 'YES') OR (v_pos.side = 'NO' AND v_mkt.outcome = 'NO') THEN
        v_payout := v_pos.quantity * 100;
        
        UPDATE public.profiles
        SET balance = balance + v_payout, withdrawable_balance = withdrawable_balance + v_payout, updated_at = NOW()
        WHERE id = v_pos.user_id;
        
        INSERT INTO public.ledger (user_id, amount, currency, type, description, status)
        VALUES (v_pos.user_id, v_payout, 'NPR', 'TRADE_PROFIT', 'Win payout: ' || v_pos.quantity || ' shares in market ' || v_mkt.id, 'COMPLETED');
        
        UPDATE public.positions
        SET status = 'won', payout = v_payout, pnl = v_payout - v_cost_basis, updated_at = NOW()
        WHERE id = v_pos.id;

      ELSE
        INSERT INTO public.ledger (user_id, amount, currency, type, description, status)
        VALUES (v_pos.user_id, -v_cost_basis, 'NPR', 'TRADE_LOSS', 'Loss: ' || v_pos.quantity || ' shares in market ' || v_mkt.id, 'COMPLETED');
        
        UPDATE public.positions
        SET status = 'lost', payout = 0, pnl = -v_cost_basis, updated_at = NOW()
        WHERE id = v_pos.id;
      END IF;
    END LOOP;
  END LOOP;
  
  -- Also ensure all NULL statuses are set to 'open' to prevent future issues
  UPDATE public.positions SET status = 'open' WHERE status IS NULL;
END;
$$;
