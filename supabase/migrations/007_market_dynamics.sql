-- ============================================================
-- Migration 007: Market Dynamics Presets
-- ------------------------------------------------------------
-- Adds a `dynamics` JSONB column to markets so admins can
-- store probability control settings:
--   • pricePreset    — anchor/preset probability
--   • minProbability — floor (never go below this)
--   • maxProbability — ceiling (never exceed this)
--   • driftEnabled   — whether time-based drift is active
--   • driftRate      — % per hour
--   • driftDirection — 'up' | 'down' | 'none'
--   • driftStartTime — ISO timestamp
--   • driftEndTime   — ISO timestamp
--   • lastDriftApplied — ISO timestamp of most recent apply
-- ============================================================

ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS dynamics JSONB;
