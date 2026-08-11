-- PredictKit — Migration 025: Market Templates
-- Converts the 4 hardcoded Quick Templates into a database-backed, editable system.

-- 1. Create market_templates table
CREATE TABLE IF NOT EXISTS public.market_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon_url text,
  layout text NOT NULL DEFAULT 'STANDARD',  -- 'STANDARD' | 'VERSUS' | 'MULTI_CHOICE'
  category text,
  subcategory text,
  title_template text,
  resolution_source_template text,
  rules_template text,
  default_outcomes jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Auto-update updated_at on every row modification
CREATE OR REPLACE FUNCTION public.set_market_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_market_templates_updated_at
  BEFORE UPDATE ON public.market_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_market_template_updated_at();

-- 3. Enable RLS — admin-only for all operations (internal tooling, not public data)
ALTER TABLE public.market_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "market_templates_select_admin" ON public.market_templates
  FOR SELECT USING (public.is_admin());

CREATE POLICY "market_templates_insert_admin" ON public.market_templates
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "market_templates_update_admin" ON public.market_templates
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "market_templates_delete_admin" ON public.market_templates
  FOR DELETE USING (public.is_admin());

-- 4. Seed the 4 existing hardcoded templates so nothing breaks on first load
INSERT INTO public.market_templates (name, description, layout, category, subcategory, title_template, resolution_source_template, rules_template, default_outcomes) VALUES
(
  'Generic Election',
  'Standard Layout',
  'STANDARD',
  'Politics',
  'Elections',
  'Will [Candidate Name] win the upcoming General Election?',
  'Official Election Commission Website & AP Projections',
  'This market resolves to YES if the specified candidate wins the majority of votes or is declared the winner by the official Election Commission. This follows standard electoral guidelines.',
  NULL
),
(
  'Trump vs Melania',
  'Versus Layout',
  'VERSUS',
  'Politics',
  'Head-to-Head',
  'Trump vs Melania: Who wins the Electoral Count?',
  'Associated Press (AP)',
  'This market resolves to YES if Donald Trump secures more votes/points than Melania Trump in the official specified event poll.',
  '{
    "candidateA": { "name": "Donald Trump", "imageUrl": "https://picsum.photos/200?random=trump", "color": "#ef4444" },
    "candidateB": { "name": "Melania Trump", "imageUrl": "https://picsum.photos/200?random=melania", "color": "#3b82f6" }
  }'::jsonb
),
(
  'Crypto Spike',
  'Standard Layout',
  'STANDARD',
  'Crypto',
  'Bitcoin',
  'Will Bitcoin (BTC) price stay above $[Target] until the end of the month?',
  'Binance / CoinGecko Daily Close',
  'Resolves based on the closing price of Bitcoin as reported by major exchanges.',
  NULL
),
(
  'Sports Final',
  'Standard Layout',
  'STANDARD',
  'Sports',
  'Tournament',
  'Will [Team A] beat [Team B] in the upcoming tournament final?',
  'ESPN / Official League Website',
  'Market resolves based on the official final score including overtime.',
  NULL
);
