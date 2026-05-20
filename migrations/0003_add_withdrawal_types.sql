-- Add owner_withdrawal and owner_return transaction types
-- D1/SQLite does not support ALTER TABLE to modify CHECK constraints.
-- The CHECK on the transactions.type column will reject new types.
-- We need to recreate the table without the CHECK, or with an updated CHECK.

-- Step 1: Create new table with updated CHECK
CREATE TABLE transactions_new (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('client_payment','owner_investment','salary_payout','contractor_tax','owner_repayment','expense','owner_withdrawal','owner_return')),
  amount_pkr REAL NOT NULL,
  is_credit INTEGER NOT NULL,
  description TEXT,
  reference_month TEXT,
  distribution_id TEXT,
  invoice_id TEXT,
  employee_id TEXT,
  owner_id TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Step 2: Copy all data
INSERT INTO transactions_new SELECT * FROM transactions;

-- Step 3: Drop old table
DROP TABLE transactions;

-- Step 4: Rename new table
ALTER TABLE transactions_new RENAME TO transactions;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_reference_month ON transactions(reference_month);
CREATE INDEX IF NOT EXISTS idx_transactions_owner_id ON transactions(owner_id);
