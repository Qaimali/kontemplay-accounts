-- Add source and is_transfer columns to transactions
-- source: tracks where money came from / went to ('bank', 'owner_pocket', 'owner_withdrawal')
-- is_transfer: 1 = transfer between accounts (not an expense/revenue), 0 = operational

ALTER TABLE transactions ADD COLUMN source TEXT DEFAULT 'bank';
ALTER TABLE transactions ADD COLUMN is_transfer INTEGER DEFAULT 0;

-- ============================================================
-- Set is_transfer: owner_withdrawal, owner_return, owner_investment are transfers
-- ============================================================

UPDATE transactions SET is_transfer = 1 WHERE type = 'owner_withdrawal';
UPDATE transactions SET is_transfer = 1 WHERE type = 'owner_return';
UPDATE transactions SET is_transfer = 1 WHERE type = 'owner_investment';

-- ============================================================
-- Set source for each transaction based on reconciliation data
-- Reference: reconciliation/bank-transactions.csv
-- ============================================================

-- Owner investments: all paid from owner pockets
UPDATE transactions SET source = 'owner_pocket' WHERE type = 'owner_investment';

-- Owner withdrawals: money left the company bank
UPDATE transactions SET source = 'bank' WHERE type = 'owner_withdrawal';

-- Owner returns: money returned to company bank
UPDATE transactions SET source = 'bank' WHERE type = 'owner_return';

-- Expenses: all paid from owner pockets (matched by investments)
UPDATE transactions SET source = 'owner_pocket' WHERE type = 'expense';

-- Client payments: received into company bank (default)
UPDATE transactions SET source = 'bank' WHERE type = 'client_payment';

-- Karim Farm payments went to Qaim's personal account, NOT company bank
UPDATE transactions SET source = 'owner_pocket'
WHERE type = 'client_payment' AND (description LIKE '%arim%' OR description LIKE '%ARIM%');

-- Owner repayments: Karim Farm transfers to Qaim's personal account, not from bank
UPDATE transactions SET source = 'owner_pocket' WHERE type = 'owner_repayment';

-- Dec 2025 salary_payout: paid from company bank (cheques from UBL account)
UPDATE transactions SET source = 'bank'
WHERE type = 'salary_payout' AND reference_month = '2025-12';

-- Dec 2025 contractor_tax: paid from Sanan's pocket (bank didn't have enough)
UPDATE transactions SET source = 'owner_pocket'
WHERE type = 'contractor_tax' AND reference_month = '2025-12';

-- Jan 2026 salary_payout + contractor_tax: Sanan withdrew 3,200,000 and distributed
UPDATE transactions SET source = 'owner_withdrawal'
WHERE type IN ('salary_payout', 'contractor_tax') AND reference_month = '2026-01';

-- Feb 2026 salary_payout + contractor_tax: Sanan withdrew 3,000,000 and distributed
UPDATE transactions SET source = 'owner_withdrawal'
WHERE type IN ('salary_payout', 'contractor_tax') AND reference_month = '2026-02';

-- Mar 2026 salary_payout: Sanan withdrew 3,300,000 and distributed salaries
UPDATE transactions SET source = 'owner_withdrawal'
WHERE type = 'salary_payout' AND reference_month = '2026-03';

-- Mar 2026 contractor_tax: paid directly from company bank (Rs 114,860 on May 20)
UPDATE transactions SET source = 'bank'
WHERE type = 'contractor_tax' AND reference_month = '2026-03';

-- Create index for source queries
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);
CREATE INDEX IF NOT EXISTS idx_transactions_is_transfer ON transactions(is_transfer);
