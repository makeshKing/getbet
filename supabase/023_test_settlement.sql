-- ============================================================
-- PredictKit — Test Script for Migration 023
-- ============================================================
-- Run this in the Supabase SQL Editor AFTER applying migration 023.
-- This script tests the corrected resolve_market logic for:
--   Test 1: Multi-choice market (3 outcomes)
--   Test 2: Binary market resolving NO
--   Test 3: No trades stuck in WAITING after resolution
--
-- NOTE: This script creates and cleans up its own test data.
--       It uses a service_role / admin context, so the is_admin()
--       check must pass. Run from the SQL Editor with service role.
-- ============================================================

-- ── Helpers ─────────────────────────────────────────────────────
-- We need a test user. Use an existing admin user or create temp data.

DO $$
DECLARE
  v_user1 UUID;
  v_user2 UUID;
  v_user3 UUID;
  v_market_id TEXT;
  v_outcome_a_id TEXT := 'test_outcome_a';
  v_outcome_b_id TEXT := 'test_outcome_b';
  v_outcome_c_id TEXT := 'test_outcome_c';
  v_result JSONB;
  v_pos RECORD;
  v_trade RECORD;
  v_count INTEGER;
  v_balance_before_1 BIGINT;
  v_balance_before_2 BIGINT;
  v_balance_before_3 BIGINT;
BEGIN
  -- ── Get 3 test users (use existing users) ────────────────────
  SELECT id INTO v_user1 FROM public.profiles ORDER BY created_at LIMIT 1;
  SELECT id INTO v_user2 FROM public.profiles ORDER BY created_at LIMIT 1 OFFSET 1;
  SELECT id INTO v_user3 FROM public.profiles ORDER BY created_at LIMIT 1 OFFSET 2;

  -- If we don't have 3 users, reuse user1
  IF v_user2 IS NULL THEN v_user2 := v_user1; END IF;
  IF v_user3 IS NULL THEN v_user3 := v_user1; END IF;

  RAISE NOTICE '=== TEST USERS ===';
  RAISE NOTICE 'User 1: %', v_user1;
  RAISE NOTICE 'User 2: %', v_user2;
  RAISE NOTICE 'User 3: %', v_user3;

  -- ════════════════════════════════════════════════════════════
  -- TEST 1: Multi-choice market (3 outcomes: A, B, C)
  --   Resolve with B as winner
  --   User 1: YES on B → should WIN
  --   User 2: NO on A  → should WIN (A didn't happen)
  --   User 3: YES on A → should LOSE
  -- ════════════════════════════════════════════════════════════
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE 'TEST 1: Multi-choice market';
  RAISE NOTICE '════════════════════════════════════════';

  v_market_id := 'test_multi_023';

  -- Clean up any previous test data
  DELETE FROM public.trades WHERE market_id = v_market_id;
  DELETE FROM public.positions WHERE market_id = v_market_id;
  DELETE FROM public.markets WHERE id = v_market_id;

  -- Create multi-outcome market
  INSERT INTO public.markets (id, title, description, category, close_date, probability, outcomes, image_url)
  VALUES (
    v_market_id,
    'TEST: Multi-choice settlement',
    'Test market for migration 023',
    'Test',
    NOW() + interval '1 day',
    33,
    jsonb_build_array(
      jsonb_build_object('id', v_outcome_a_id, 'name', 'Outcome A', 'probability', 33, 'color', '#ff0000'),
      jsonb_build_object('id', v_outcome_b_id, 'name', 'Outcome B', 'probability', 34, 'color', '#00ff00'),
      jsonb_build_object('id', v_outcome_c_id, 'name', 'Outcome C', 'probability', 33, 'color', '#0000ff')
    ),
    ''
  );

  -- Record balances before
  SELECT balance INTO v_balance_before_1 FROM public.profiles WHERE id = v_user1;
  SELECT balance INTO v_balance_before_2 FROM public.profiles WHERE id = v_user2;
  SELECT balance INTO v_balance_before_3 FROM public.profiles WHERE id = v_user3;

  -- User 1: YES on B (10 shares at 34 cents each = 340 cost)
  INSERT INTO public.positions (user_id, market_id, outcome_id, side, quantity, avg_price)
  VALUES (v_user1, v_market_id, v_outcome_b_id, 'YES', 10, 34);

  INSERT INTO public.trades (user_id, market_id, market_title, outcome_id, outcome_title, side, price, shares, amount, potential_win, status, type)
  VALUES (v_user1, v_market_id, 'TEST', v_outcome_b_id, 'Outcome B', 'YES', 34, 10, 340, 1000, 'WAITING', 'BUY');

  -- User 2: NO on A (10 shares at 67 cents each = 670 cost)
  INSERT INTO public.positions (user_id, market_id, outcome_id, side, quantity, avg_price)
  VALUES (v_user2, v_market_id, v_outcome_a_id, 'NO', 10, 67);

  INSERT INTO public.trades (user_id, market_id, market_title, outcome_id, outcome_title, side, price, shares, amount, potential_win, status, type)
  VALUES (v_user2, v_market_id, 'TEST', v_outcome_a_id, 'Outcome A', 'NO', 67, 10, 670, 1000, 'WAITING', 'BUY');

  -- User 3: YES on A (10 shares at 33 cents each = 330 cost)
  INSERT INTO public.positions (user_id, market_id, outcome_id, side, quantity, avg_price)
  VALUES (v_user3, v_market_id, v_outcome_a_id, 'YES', 10, 33);

  INSERT INTO public.trades (user_id, market_id, market_title, outcome_id, outcome_title, side, price, shares, amount, potential_win, status, type)
  VALUES (v_user3, v_market_id, 'TEST', v_outcome_a_id, 'Outcome A', 'YES', 33, 10, 330, 1000, 'WAITING', 'BUY');

  -- Resolve with B as winner
  v_result := public.resolve_market(v_market_id, v_outcome_b_id);
  RAISE NOTICE 'Resolution result: %', v_result;

  -- Verify User 1 (YES on B) → WON
  SELECT status INTO v_trade FROM public.trades
  WHERE market_id = v_market_id AND user_id = v_user1 AND outcome_id = v_outcome_b_id AND side = 'YES';
  IF v_trade.status = 'WON' THEN
    RAISE NOTICE '✅ User 1 (YES on B): WON — correct!';
  ELSE
    RAISE WARNING '❌ User 1 (YES on B): expected WON, got %', v_trade.status;
  END IF;

  -- Verify User 2 (NO on A) → WON
  SELECT status INTO v_trade FROM public.trades
  WHERE market_id = v_market_id AND user_id = v_user2 AND outcome_id = v_outcome_a_id AND side = 'NO';
  IF v_trade.status = 'WON' THEN
    RAISE NOTICE '✅ User 2 (NO on A): WON — correct!';
  ELSE
    RAISE WARNING '❌ User 2 (NO on A): expected WON, got %', v_trade.status;
  END IF;

  -- Verify User 3 (YES on A) → LOST
  SELECT status INTO v_trade FROM public.trades
  WHERE market_id = v_market_id AND user_id = v_user3 AND outcome_id = v_outcome_a_id AND side = 'YES';
  IF v_trade.status = 'LOST' THEN
    RAISE NOTICE '✅ User 3 (YES on A): LOST — correct!';
  ELSE
    RAISE WARNING '❌ User 3 (YES on A): expected LOST, got %', v_trade.status;
  END IF;

  -- Verify balance credited for winners
  DECLARE
    v_balance_after_1 BIGINT;
    v_balance_after_2 BIGINT;
    v_balance_after_3 BIGINT;
  BEGIN
    SELECT balance INTO v_balance_after_1 FROM public.profiles WHERE id = v_user1;
    SELECT balance INTO v_balance_after_2 FROM public.profiles WHERE id = v_user2;
    SELECT balance INTO v_balance_after_3 FROM public.profiles WHERE id = v_user3;

    IF v_balance_after_1 > v_balance_before_1 THEN
      RAISE NOTICE '✅ User 1 balance increased: % → % (+%)', v_balance_before_1, v_balance_after_1, v_balance_after_1 - v_balance_before_1;
    ELSE
      RAISE WARNING '❌ User 1 balance NOT increased: % → %', v_balance_before_1, v_balance_after_1;
    END IF;

    IF v_balance_after_2 > v_balance_before_2 THEN
      RAISE NOTICE '✅ User 2 balance increased: % → % (+%)', v_balance_before_2, v_balance_after_2, v_balance_after_2 - v_balance_before_2;
    ELSE
      RAISE WARNING '❌ User 2 balance NOT increased: % → %', v_balance_before_2, v_balance_after_2;
    END IF;

    -- User 3 balance should NOT increase (they lost)
    IF v_balance_after_3 = v_balance_before_3 THEN
      RAISE NOTICE '✅ User 3 balance unchanged (lost): %', v_balance_after_3;
    ELSE
      RAISE WARNING '❌ User 3 balance changed unexpectedly: % → %', v_balance_before_3, v_balance_after_3;
    END IF;
  END;

  -- ════════════════════════════════════════════════════════════
  -- TEST 2: Binary market resolving NO
  --   User 1: YES → should LOSE
  --   User 2: NO  → should WIN
  -- ════════════════════════════════════════════════════════════
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE 'TEST 2: Binary market resolving NO';
  RAISE NOTICE '════════════════════════════════════════';

  v_market_id := 'test_binary_023';

  -- Clean up
  DELETE FROM public.trades WHERE market_id = v_market_id;
  DELETE FROM public.positions WHERE market_id = v_market_id;
  DELETE FROM public.markets WHERE id = v_market_id;

  -- Create binary market (no outcomes JSONB array)
  INSERT INTO public.markets (id, title, description, category, close_date, probability, image_url)
  VALUES (
    v_market_id,
    'TEST: Binary market — Will X happen?',
    'Test binary market for migration 023',
    'Test',
    NOW() + interval '1 day',
    50,
    ''
  );

  -- Record balances before
  SELECT balance INTO v_balance_before_1 FROM public.profiles WHERE id = v_user1;
  SELECT balance INTO v_balance_before_2 FROM public.profiles WHERE id = v_user2;

  -- User 1: YES (10 shares at 50 cents each = 500 cost)
  INSERT INTO public.positions (user_id, market_id, side, quantity, avg_price)
  VALUES (v_user1, v_market_id, 'YES', 10, 50);

  INSERT INTO public.trades (user_id, market_id, market_title, side, price, shares, amount, potential_win, status, type)
  VALUES (v_user1, v_market_id, 'TEST', 'YES', 50, 10, 500, 1000, 'WAITING', 'BUY');

  -- User 2: NO (10 shares at 50 cents each = 500 cost)
  INSERT INTO public.positions (user_id, market_id, side, quantity, avg_price)
  VALUES (v_user2, v_market_id, 'NO', 10, 50);

  INSERT INTO public.trades (user_id, market_id, market_title, side, price, shares, amount, potential_win, status, type)
  VALUES (v_user2, v_market_id, 'TEST', 'NO', 50, 10, 500, 1000, 'WAITING', 'BUY');

  -- Resolve as NO (nothing happened)
  v_result := public.resolve_market(v_market_id, 'NO');
  RAISE NOTICE 'Resolution result: %', v_result;

  -- Verify User 1 (YES) → LOST
  SELECT status INTO v_trade FROM public.trades
  WHERE market_id = v_market_id AND user_id = v_user1 AND side = 'YES';
  IF v_trade.status = 'LOST' THEN
    RAISE NOTICE '✅ User 1 (YES): LOST — correct!';
  ELSE
    RAISE WARNING '❌ User 1 (YES): expected LOST, got %', v_trade.status;
  END IF;

  -- Verify User 2 (NO) → WON
  SELECT status INTO v_trade FROM public.trades
  WHERE market_id = v_market_id AND user_id = v_user2 AND side = 'NO';
  IF v_trade.status = 'WON' THEN
    RAISE NOTICE '✅ User 2 (NO): WON — correct!';
  ELSE
    RAISE WARNING '❌ User 2 (NO): expected WON, got %', v_trade.status;
  END IF;

  -- Verify balance changes
  DECLARE
    v_bal1 BIGINT;
    v_bal2 BIGINT;
  BEGIN
    SELECT balance INTO v_bal1 FROM public.profiles WHERE id = v_user1;
    SELECT balance INTO v_bal2 FROM public.profiles WHERE id = v_user2;

    IF v_bal1 = v_balance_before_1 THEN
      RAISE NOTICE '✅ User 1 balance unchanged (lost): %', v_bal1;
    ELSE
      RAISE WARNING '❌ User 1 balance changed unexpectedly: % → %', v_balance_before_1, v_bal1;
    END IF;

    IF v_bal2 > v_balance_before_2 THEN
      RAISE NOTICE '✅ User 2 balance increased: % → % (+%)', v_balance_before_2, v_bal2, v_bal2 - v_balance_before_2;
    ELSE
      RAISE WARNING '❌ User 2 balance NOT increased: % → %', v_balance_before_2, v_bal2;
    END IF;
  END;

  -- ════════════════════════════════════════════════════════════
  -- TEST 3: No trades stuck in WAITING after resolution
  -- ════════════════════════════════════════════════════════════
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE 'TEST 3: No trades stuck in WAITING';
  RAISE NOTICE '════════════════════════════════════════';

  SELECT count(*) INTO v_count
  FROM public.trades
  WHERE status = 'WAITING'
    AND market_id IN ('test_multi_023', 'test_binary_023');

  IF v_count = 0 THEN
    RAISE NOTICE '✅ No trades stuck in WAITING — all settled correctly!';
  ELSE
    RAISE WARNING '❌ % trades still stuck in WAITING!', v_count;
  END IF;

  -- Also check no open positions remain
  SELECT count(*) INTO v_count
  FROM public.positions
  WHERE status = 'open'
    AND market_id IN ('test_multi_023', 'test_binary_023');

  IF v_count = 0 THEN
    RAISE NOTICE '✅ No positions stuck in open status — all settled!';
  ELSE
    RAISE WARNING '❌ % positions still in open status!', v_count;
  END IF;

  -- ── Summary ─────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE 'ALL TESTS COMPLETE';
  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE 'Check NOTICE output above for ✅/❌ results.';
  RAISE NOTICE 'Clean up test data by running:';
  RAISE NOTICE '  DELETE FROM trades WHERE market_id IN (''test_multi_023'', ''test_binary_023'');';
  RAISE NOTICE '  DELETE FROM positions WHERE market_id IN (''test_multi_023'', ''test_binary_023'');';
  RAISE NOTICE '  DELETE FROM ledger WHERE description LIKE ''%%test_multi_023%%'' OR description LIKE ''%%test_binary_023%%'';';
  RAISE NOTICE '  DELETE FROM markets WHERE id IN (''test_multi_023'', ''test_binary_023'');';

END $$;
