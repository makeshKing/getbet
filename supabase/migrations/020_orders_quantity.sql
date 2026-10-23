-- Migration 020: Add quantity column to orders table
-- Required by the inline order book feature in MarketOutcomeList

ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity decimal(10,2) DEFAULT 1;

-- Also ensure orders with status 'open' exist in the system
-- (status values may be uppercase in the existing schema)
COMMENT ON COLUMN orders.quantity IS 'Number of contracts in this order';
