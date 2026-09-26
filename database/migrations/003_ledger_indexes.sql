-- Ledger filters by warehouse and by user (the other ledger indexes are in 001_schema.sql)
CREATE INDEX IF NOT EXISTS stock_ledger_warehouse_id_idx ON stock_ledger (warehouse_id);
CREATE INDEX IF NOT EXISTS stock_ledger_performed_by_idx ON stock_ledger (performed_by);
