-- ============================================================
-- PredictKit — Migration 004: Remove Sign-up Bonus
-- Run this in your Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url, balance, total_deposited, withdrawable_balance)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    'https://ui-avatars.com/api/?name=' || COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)) || '&background=random',
    0,   -- No sign-up bonus
    0,
    0
  );
  RETURN NEW;
END;
$$;
