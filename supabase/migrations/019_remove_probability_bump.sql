-- Should NOT contain 'v_bump' or 'probability =' logic:
SELECT prosrc FROM pg_proc WHERE proname = 'execute_buy';
SELECT prosrc FROM pg_proc WHERE proname = 'execute_sell';

-- Should return 0 rows (function was dropped):
SELECT proname FROM pg_proc WHERE proname = 'adjust_outcome_probabilities';
