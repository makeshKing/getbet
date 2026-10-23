-- ============================================================
-- Migration 006: Probability bump on 100-share purchases
-- ------------------------------------------------------------
-- When exactly 100 shares are bought in a single trade:
--   • Standard binary market  → probability += 1 (capped at 99)
--   • Multi-outcome market     → the purchased outcome's probability
--                                inside the `outcomes` JSONB += 1 (capped at 99)
-- ============================================================

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
  v_cost          BIGINT;
  v_total_cost    BIGINT;
  v_user          RECORD;
  v_trade_id      UUID;
  v_market        RECORD;
  -- multi-outcome probability bump helpers
  v_outcomes      JSONB;
  v_outcome       JSONB;
  v_new_outcomes  JSONB;
  v_i             INTEGER;
BEGIN
  v_cost       := p_price * p_quantity;
  v_total_cost := v_cost + p_commission + p_trading_fee;

  -- Lock and fetch user
  SELECT * INTO v_user FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  IF v_user.balance < v_total_cost THEN RAISE EXCEPTION 'Insufficient funds'; END IF;

  -- Deduct balance
  UPDATE public.profiles
  SET balance              = balance - v_total_cost,
      withdrawable_balance = GREATEST(0, withdrawable_balance - v_total_cost),
      updated_at           = NOW()
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

  -- Fetch market info (title + outcomes array for multi-choice markets)
  SELECT title, outcomes INTO v_market FROM public.markets WHERE id = p_market_id;

  -- Insert trade record
  INSERT INTO public.trades
    (user_id, market_id, market_title, outcome_id, side, price, shares, amount,
     potential_win, status, type)
  VALUES
    (p_user_id, p_market_id, COALESCE(v_market.title, ''), p_outcome_id,
     p_side, p_price, p_quantity, v_cost, p_quantity * 10000, 'WAITING', 'BUY')
  RETURNING id INTO v_trade_id;

  -- Commission ledger entry
  IF p_commission > 0 THEN
    INSERT INTO public.ledger (user_id, amount, type, description, status)
    VALUES (p_user_id, p_commission, 'TRADE_FEE',
            'Commission for buying ' || p_quantity || ' shares of ' || COALESCE(v_market.title, ''),
            'COMPLETED');
  END IF;

  -- Fixed trading-fee ledger entry
  IF p_trading_fee > 0 THEN
    INSERT INTO public.ledger (user_id, amount, type, description, status)
    VALUES (p_user_id, p_trading_fee, 'TRADE_FEE',
            'Fixed trading fee for buying ' || p_quantity || ' shares',
            'COMPLETED');
  END IF;

  -- ── Update market volume + probability (if exactly 100 shares bought) ──────
  IF p_quantity = 100 THEN

    -- Multi-outcome market: bump only the purchased outcome's probability
    IF p_outcome_id IS NOT NULL AND v_market.outcomes IS NOT NULL THEN
      v_outcomes     := v_market.outcomes;
      v_new_outcomes := '[]'::JSONB;

      FOR v_i IN 0 .. jsonb_array_length(v_outcomes) - 1 LOOP
        v_outcome := v_outcomes -> v_i;

        IF v_outcome ->> 'id' = p_outcome_id THEN
          -- Bump this outcome's probability by +1, cap at 99
          v_outcome := jsonb_set(
            v_outcome,
            '{probability}',
            to_jsonb(LEAST(99, (v_outcome ->> 'probability')::INTEGER + 1))
          );
        END IF;

        v_new_outcomes := v_new_outcomes || jsonb_build_array(v_outcome);
      END LOOP;

      UPDATE public.markets
      SET volume     = volume + v_cost,
          outcomes   = v_new_outcomes,
          updated_at = NOW()
      WHERE id = p_market_id;

    ELSE
      -- Standard binary market: bump overall probability by +1, cap at 99
      UPDATE public.markets
      SET volume      = volume + v_cost,
          probability = LEAST(99, probability + 1),
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
  -- ─────────────────────────────────────────────────────────────────────────────

  RETURN jsonb_build_object('success', true, 'trade_id', v_trade_id);
END;
$$;
