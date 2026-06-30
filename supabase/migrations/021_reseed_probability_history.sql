-- Migration 021: Create probability_history and seed with dramatic random walk

CREATE TABLE IF NOT EXISTS public.probability_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id TEXT NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
    outcome_id TEXT NOT NULL,
    probability NUMERIC NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Delete existing data
TRUNCATE TABLE public.probability_history;

DO $$
DECLARE
  market_record RECORD;
  outcome_elem JSONB;
  o_id TEXT;
  o_prob float;
  i int;
  t timestamptz;
  p float;
  prev float;
  trend float;
  volatility float;
  jump_chance float;
BEGIN
  FOR market_record IN SELECT id, probability, outcomes FROM markets LOOP

    t := now() - interval '60 days';

    -- Check if market has multi-choice outcomes (JSONB array)
    IF market_record.outcomes IS NOT NULL AND jsonb_array_length(market_record.outcomes) > 0 THEN
      
      FOR outcome_elem IN SELECT * FROM jsonb_array_elements(market_record.outcomes)
      LOOP
        o_id := outcome_elem->>'id';
        o_prob := (outcome_elem->>'probability')::float;
        prev := COALESCE(o_prob, 50);
        trend := (random() - 0.5) * 0.3;
        volatility := 1.5 + random() * 3;

        FOR i IN 0..480 LOOP
          IF random() < 0.05 THEN trend := (random() - 0.5) * 0.4; END IF;
          jump_chance := random();
          IF jump_chance > 0.97 THEN p := prev + (random() * 15 + 5);
          ELSIF jump_chance < 0.03 THEN p := prev - (random() * 15 + 5);
          ELSE p := prev + trend + (random() - 0.5) * volatility; END IF;
          
          p := GREATEST(2, LEAST(97, p));
          prev := p;

          INSERT INTO probability_history (market_id, outcome_id, probability, recorded_at)
          VALUES (market_record.id, o_id, ROUND(p::numeric, 1), t + (i * 3 || ' hours')::interval);
        END LOOP;
      END LOOP;

    ELSE
      -- Binary market: use 'main' as outcome_id
      o_id := 'main';
      o_prob := COALESCE(market_record.probability, 50);
      prev := o_prob;
      trend := (random() - 0.5) * 0.3;
      volatility := 1.5 + random() * 3;

      FOR i IN 0..480 LOOP
        IF random() < 0.05 THEN trend := (random() - 0.5) * 0.4; END IF;
        jump_chance := random();
        IF jump_chance > 0.97 THEN p := prev + (random() * 15 + 5);
        ELSIF jump_chance < 0.03 THEN p := prev - (random() * 15 + 5);
        ELSE p := prev + trend + (random() - 0.5) * volatility; END IF;
        
        p := GREATEST(2, LEAST(97, p));
        prev := p;

        INSERT INTO probability_history (market_id, outcome_id, probability, recorded_at)
        VALUES (market_record.id, o_id, ROUND(p::numeric, 1), t + (i * 3 || ' hours')::interval);
      END LOOP;
    END IF;

  END LOOP;
END $$;
