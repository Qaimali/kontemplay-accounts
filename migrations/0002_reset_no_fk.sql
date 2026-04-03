-- Drop all tables
DROP TABLE IF EXISTS client_invoices;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS distributions;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS owners;

-- Recreate without FK constraints (app handles referential integrity)
CREATE TABLE owners (
  id TEXT PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cnic TEXT,
  default_salary_usd REAL DEFAULT 0,
  default_threshold REAL DEFAULT 2,
  default_contractor_tax REAL DEFAULT 1,
  default_remittance_tax REAL DEFAULT 0.25,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE distributions (
  id TEXT PRIMARY KEY,
  reference_month TEXT NOT NULL,
  total_usd REAL NOT NULL,
  distribute_usd REAL NOT NULL,
  amount_received_pkr REAL NOT NULL,
  remittance_tax_percent REAL NOT NULL,
  base_rate REAL NOT NULL,
  effective_rate REAL NOT NULL,
  threshold REAL NOT NULL,
  company_gross_pkr REAL,
  company_net_pkr REAL,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  distribution_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  salary_usd REAL NOT NULL,
  rate_applied REAL NOT NULL,
  threshold_applied REAL NOT NULL,
  contractor_tax_percent REAL NOT NULL,
  remittance_tax_percent REAL NOT NULL,
  gross_pkr REAL NOT NULL,
  contractor_tax_pkr REAL NOT NULL,
  remittance_tax_pkr REAL NOT NULL,
  total_tax_pkr REAL NOT NULL,
  net_pkr REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('client_payment','owner_investment','salary_payout','contractor_tax','owner_repayment','expense')),
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

CREATE TABLE client_invoices (
  id TEXT PRIMARY KEY,
  invoice_number INTEGER NOT NULL,
  bill_to TEXT NOT NULL DEFAULT 'Youth Athletes United',
  date TEXT NOT NULL,
  invoice_month TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','received','overdue')),
  due_date TEXT,
  line_items TEXT NOT NULL,
  tax_percent REAL DEFAULT 0,
  subtotal REAL NOT NULL,
  total REAL NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_month ON transactions(reference_month);
CREATE INDEX idx_transactions_owner ON transactions(owner_id);
CREATE INDEX idx_invoices_distribution ON invoices(distribution_id);
CREATE INDEX idx_invoices_employee ON invoices(employee_id);
CREATE INDEX idx_distributions_month ON distributions(reference_month);
CREATE INDEX idx_client_invoices_date ON client_invoices(date);
CREATE INDEX idx_owners_clerk ON owners(clerk_id);
