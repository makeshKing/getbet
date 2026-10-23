-- Migration: 011_market_recent_trades.sql
-- Function to get recent trading activity for a specific market, including user profiles

CREATE OR REPLACE FUNCTION public.get_market_recent_trades(p_market_id TEXT, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  market_id TEXT,
  outcome_id TEXT,
  side TEXT,
  type TEXT,
  price BIGINT,
  shares INTEGER,
  amount BIGINT,
  status TEXT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  user_name TEXT,
  user_avatar_url TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.market_id,
    t.outcome_id,
    t.side,
    t.type,
    t.price,
    t.shares,
    t.amount,
    t.status,
    t.created_at,
    pr.id AS user_id,
    pr.name AS user_name,
    pr.avatar_url AS user_avatar_url
  FROM public.trades t
  JOIN public.profiles pr ON t.user_id = pr.id
  WHERE t.market_id = p_market_id
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$$;
