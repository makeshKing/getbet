-- PredictKit — Migration 022: Secure Withdrawals

-- Drop existing if we are replacing it
DROP FUNCTION IF EXISTS public.request_withdrawal(integer, text, text);

CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount integer,
  p_destination text,
  p_currency text DEFAULT 'NPR'
) RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_profile record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal amount must be greater than 0';
  END IF;

  -- Lock the profile row for update to prevent race conditions
  SELECT balance, withdrawable_balance, total_withdrawn 
  INTO v_profile 
  FROM public.profiles 
  WHERE id = v_user_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_profile.withdrawable_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient withdrawable balance';
  END IF;

  -- Deduct from balances
  UPDATE public.profiles
  SET 
    balance = balance - p_amount,
    withdrawable_balance = withdrawable_balance - p_amount,
    total_withdrawn = total_withdrawn + p_amount,
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Insert pending withdrawal into ledger
  INSERT INTO public.ledger (
    user_id,
    amount,
    currency,
    type,
    description,
    status
  ) VALUES (
    v_user_id,
    -p_amount,
    p_currency,
    'WITHDRAWAL',
    'Withdrawal to ' || p_destination,
    'PENDING'
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
