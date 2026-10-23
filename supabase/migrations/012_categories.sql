-- Migration 012: Dynamic Category Management
-- Creates a `categories` table so admins can manage market categories from the UI.

CREATE TABLE IF NOT EXISTS categories (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL UNIQUE,
  icon       text,                              -- lucide icon name string, e.g. "Trophy"
  color      text        NOT NULL DEFAULT '#6366f1',
  is_active  boolean     NOT NULL DEFAULT true,
  sort_order integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Row-level security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Everyone (including anonymous) can read active categories
CREATE POLICY "public_read_categories"
  ON categories FOR SELECT
  USING (is_active = true);

-- Admins can do anything
CREATE POLICY "admin_write_categories"
  ON categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'ADMIN'
    )
  );

-- Seed default categories (matches existing hardcoded sets in the app)
INSERT INTO categories (name, icon, color, sort_order) VALUES
  ('Politics',     'Landmark',     '#ef4444', 1),
  ('Crypto',       'Bitcoin',      '#f59e0b', 2),
  ('Sports',       'Trophy',       '#10b981', 3),
  ('Science',      'FlaskConical', '#8b5cf6', 4),
  ('Finance',      'BarChart3',    '#3b82f6', 5),
  ('Stock Market', 'TrendingUp',   '#06b6d4', 6),
  ('Culture',      'Music',        '#ec4899', 7)
ON CONFLICT (name) DO NOTHING;
