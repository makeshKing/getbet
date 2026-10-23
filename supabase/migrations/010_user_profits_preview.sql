-- Migration: 010_user_profits_preview.sql
-- Function to get projected profit details for all users in a market.

CREATE OR REPLACE FUNCTION public.get_market_user_profits(p_market_id TEXT)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  avatar_url TEXT,
  side TEXT,
  invested BIGINT,
  payout BIGINT,
  profit BIGINT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin required'; END IF;
  
  RETURN QUERY
  SELECT 
    p.user_id,
    pr.name as user_name,
    pr.email as user_email,
    pr.avatar_url,
    p.side,
    CAST(SUM(p.quantity * p.avg_price) AS BIGINT) as invested,
    CAST(SUM(p.quantity * 100) AS BIGINT) as payout,
    CAST(SUM(p.quantity * 100) - SUM(p.quantity * p.avg_price) AS BIGINT) as profit
  FROM public.positions p
  JOIN public.profiles pr ON p.user_id = pr.id
  WHERE p.market_id = p_market_id
  GROUP BY p.user_id, pr.name, pr.email, pr.avatar_url, p.side
  HAVING (SUM(p.quantity * 100) - SUM(p.quantity * p.avg_price)) > 0;
END;
$$;
