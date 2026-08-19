-- PredictKit — Migration 026: Add Staff Role

-- 1. Update the check constraint to include 'STAFF'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('USER', 'ADMIN', 'STAFF'));

-- 2. Create is_staff() helper function
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'STAFF'
  );
$$;

-- 3. Add policies for Staff on ledger (deposits & withdrawals only)
CREATE POLICY "ledger_select_staff" ON public.ledger
  FOR SELECT USING (
    public.is_staff() AND type IN ('DEPOSIT', 'WITHDRAWAL')
  );

CREATE POLICY "ledger_update_staff" ON public.ledger
  FOR UPDATE USING (
    public.is_staff() AND type IN ('DEPOSIT', 'WITHDRAWAL')
  );

-- 4. Update RPCs to allow both ADMIN and STAFF

-- Approve deposit
CREATE OR REPLACE FUNCTION public.approve_deposit(p_ledger_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_entry RECORD;
BEGIN
  IF NOT (public.is_admin() OR public.is_staff()) THEN RAISE EXCEPTION 'Admin or Staff required'; END IF;
  SELECT * INTO v_entry FROM public.ledger WHERE id = p_ledger_id AND status = 'PENDING' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deposit not found or already processed'; END IF;

  UPDATE public.ledger SET status = 'COMPLETED' WHERE id = p_ledger_id;

  UPDATE public.profiles
  SET balance = balance + v_entry.amount,
      withdrawable_balance = withdrawable_balance + v_entry.amount,
      total_deposited = total_deposited + v_entry.amount,
      updated_at = NOW()
  WHERE id = v_entry.user_id;
END;
$$;

-- Reject deposit
CREATE OR REPLACE FUNCTION public.reject_deposit(p_ledger_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_staff()) THEN RAISE EXCEPTION 'Admin or Staff required'; END IF;
  UPDATE public.ledger SET status = 'REJECTED' WHERE id = p_ledger_id AND status = 'PENDING';
END;
$$;

-- Approve withdrawal atomically
CREATE OR REPLACE FUNCTION public.approve_withdrawal(p_ledger_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_staff()) THEN RAISE EXCEPTION 'Admin or Staff required'; END IF;
  UPDATE public.ledger SET status = 'COMPLETED' WHERE id = p_ledger_id AND status = 'PENDING';
END;
$$;

-- Reject withdrawal (refund)
CREATE OR REPLACE FUNCTION public.reject_withdrawal(p_ledger_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_entry RECORD;
BEGIN
  IF NOT (public.is_admin() OR public.is_staff()) THEN RAISE EXCEPTION 'Admin or Staff required'; END IF;
  SELECT * INTO v_entry FROM public.ledger WHERE id = p_ledger_id AND status = 'PENDING' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found or already processed'; END IF;

  UPDATE public.ledger SET status = 'REJECTED' WHERE id = p_ledger_id;

  -- Refund
  UPDATE public.profiles
  SET balance = balance + ABS(v_entry.amount),
      withdrawable_balance = withdrawable_balance + ABS(v_entry.amount),
      total_withdrawn = total_withdrawn - ABS(v_entry.amount),
      updated_at = NOW()
  WHERE id = v_entry.user_id;
END;
$$;
