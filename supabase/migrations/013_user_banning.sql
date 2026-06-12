-- Migration: 013_user_banning.sql
-- Adds is_banned column to the profiles table for user banning functionality.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;

-- Index for efficient lookups of banned users
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON profiles (is_banned);

COMMENT ON COLUMN profiles.is_banned IS 'When true, the user is banned and cannot access the application.';
