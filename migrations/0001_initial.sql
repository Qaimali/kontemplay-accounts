-- Kontemplay Finance - D1 Schema (SQLite)

-- OWNERS (partners)
CREATE TABLE IF NOT EXISTS owners (
  id TEXT PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);

-- EMPLOYEES
CREATE TABLE IF NOT EXISTS employees (
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

-- DISTRIBUTIONS (monthly distribution runs)
CREATE TABLE IF NOT EXISTS distributions (
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
  created_by TEXT REFERENCES owners(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- INVOICES (one per employee per distribution)
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  distribution_id TEXT NOT NULL REFERENCES distributions(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES employees(id),
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

-- TRANSACTIONS (ledger)
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('client_payment','owner_investment','salary_payout','contractor_tax','owner_repayment','expense')),
  amount_pkr REAL NOT NULL,
  is_credit INTEGER NOT NULL,
  description TEXT,
  reference_month TEXT,
  distribution_id TEXT REFERENCES distributions(id),
  invoice_id TEXT REFERENCES invoices(id),
  employee_id TEXT REFERENCES employees(id),
  owner_id TEXT REFERENCES owners(id),
  created_by TEXT REFERENCES owners(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- CLIENT INVOICES
CREATE TABLE IF NOT EXISTS client_invoices (
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
  created_by TEXT REFERENCES owners(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_month ON transactions(reference_month);
CREATE INDEX IF NOT EXISTS idx_transactions_owner ON transactions(owner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_distribution ON invoices(distribution_id);
CREATE INDEX IF NOT EXISTS idx_invoices_employee ON invoices(employee_id);
CREATE INDEX IF NOT EXISTS idx_distributions_month ON distributions(reference_month);
CREATE INDEX IF NOT EXISTS idx_client_invoices_date ON client_invoices(date);
CREATE INDEX IF NOT EXISTS idx_owners_clerk ON owners(clerk_id);
