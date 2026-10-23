-- ============================================================
-- PredictKit — Migration 015: Performance Indexes
-- Apply in Supabase SQL Editor
-- ============================================================
--
-- Adds indexes on the most frequently queried columns to prevent
-- sequential scans on high-volume tables as data grows.

-- positions: admin and user position lookups by market
CREATE INDEX IF NOT EXISTS idx_positions_market_id
  ON public.positions (market_id);

-- positions: user-specific lookups (portfolio page)
CREATE INDEX IF NOT EXISTS idx_positions_user_id
  ON public.positions (user_id);

-- trades: user trade history (portfolio, trade feed)
CREATE INDEX IF NOT EXISTS idx_trades_user_id
  ON public.trades (user_id);

-- trades: per-market trade lookups (market detail page, settlement)
CREATE INDEX IF NOT EXISTS idx_trades_market_id
  ON public.trades (market_id);

-- trades: filtering by status (settlement only looks at WAITING)
CREATE INDEX IF NOT EXISTS idx_trades_status
  ON public.trades (status)
  WHERE status = 'WAITING';

-- ledger: user ledger history (portfolio/finance page)
CREATE INDEX IF NOT EXISTS idx_ledger_user_id
  ON public.ledger (user_id);

-- ledger: admin deposit/withdrawal queue (most common admin query)
CREATE INDEX IF NOT EXISTS idx_ledger_type_status
  ON public.ledger (type, status)
  WHERE status = 'PENDING';

-- ledger: chronological ordering (most queries sort by created_at DESC)
CREATE INDEX IF NOT EXISTS idx_ledger_created_at
  ON public.ledger (created_at DESC);

-- markets: category filtering (home page market list)
CREATE INDEX IF NOT EXISTS idx_markets_category
  ON public.markets (category);

-- markets: locked/outcome filtering (admin panels, trading guards)
CREATE INDEX IF NOT EXISTS idx_markets_outcome_locked
  ON public.markets (outcome, is_locked);

-- profiles: role filtering (admin lookup — is_admin() function)
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles (role)
  WHERE role = 'ADMIN';

-- profiles: banned user lookup
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned
  ON public.profiles (is_banned)
  WHERE is_banned = TRUE;

-- audit_logs: chronological admin audit feed
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs (created_at DESC);

-- quiz_answers: unique constraint already covers (user_id, quiz_id) lookups
-- quiz_questions: active quiz lookup by expiry
CREATE INDEX IF NOT EXISTS idx_quiz_questions_active_till
  ON public.quiz_questions (active_till DESC);
