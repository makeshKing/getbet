-- ====================================================================
-- Defense in Depth: Prevent STAFF role from trading
-- Patching execute_buy to reject staff entirely.
-- ====================================================================

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
BEGIN
  -- Strict Staff restriction
  IF public.is_staff() THEN
    RAISE EXCEPTION 'Staff accounts are restricted from trading.';
  END IF;

  v_cost       := p_price * p_quantity;
  v_total_cost := v_cost + p_commission + p_trading_fee;

  -- Lock and fetch user
  SELECT * INTO v_user FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  
  -- Prevent banned users
  IF v_user.is_banned THEN RAISE EXCEPTION 'User is banned'; END IF;

  -- Ensure STAFF role cannot bypass the is_staff() check (e.g. if run as a different user context, we check the actual profile role)
  IF v_user.role = 'STAFF' THEN RAISE EXCEPTION 'Staff accounts are restricted from trading.'; END IF;

  IF v_user.balance < v_total_cost THEN RAISE EXCEPTION 'Insufficient funds'; END IF;

  -- Fetch market status
  SELECT * INTO v_market FROM public.markets WHERE id = p_market_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Market not found'; END IF;
  IF v_market.status != 'ACTIVE' THEN RAISE EXCEPTION 'Market is closed or resolved'; END IF;

  -- Update Balance
  UPDATE public.profiles
  SET balance = balance - v_total_cost,
      withdrawable_balance = GREATEST(0, withdrawable_balance - v_total_cost),
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Upsert position with weighted average face_value_cents
  INSERT INTO public.positions (user_id, market_id, outcome_id, side, quantity, avg_price, face_value_cents)
  VALUES (
    p_user_id, 
    p_market_id, 
    p_outcome_id, 
    p_side, 
    p_quantity,
    ROUND(v_total_cost::NUMERIC / p_quantity),
    100 -- Starting face value
  )
  ON CONFLICT (user_id, market_id, outcome_id, side)
  DO UPDATE SET
    avg_price  = ROUND(((positions.avg_price * positions.quantity) + v_total_cost)::NUMERIC
                       / (positions.quantity + p_quantity)),
    face_value_cents = ROUND(((COALESCE(positions.face_value_cents, 100) * positions.quantity) + (100 * p_quantity))::NUMERIC
                             / (positions.quantity + p_quantity)),
    quantity   = positions.quantity + p_quantity,
    updated_at = NOW();

  -- Insert trade record
  INSERT INTO public.trades (
    user_id, market_id, outcome_id, side, amount, shares, price, status
  ) VALUES (
    p_user_id, p_market_id, p_outcome_id, p_side, v_total_cost, p_quantity, p_price, 'COMPLETED'
  ) RETURNING id INTO v_trade_id;

  -- Increment market volume
  UPDATE public.markets
  SET volume = volume + v_cost,
      updated_at = NOW()
  WHERE id = p_market_id;

  RETURN jsonb_build_object(
    'success', true,
    'trade_id', v_trade_id,
    'cost', v_total_cost
  );
END;
$$;
