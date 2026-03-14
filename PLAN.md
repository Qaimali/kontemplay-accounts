# Kontemplay Finance — Business Logic & System Plan

## 1. Company Overview

Kontemplay is an outsourcing company owned by **3 partners**. The company receives payments from international clients in **USD**, converts them to **PKR**, distributes salaries to employees, and retains a commission.

---

## 2. Business Flow (Monthly Cycle)

```
Client pays $1200 USD
        │
        ▼
┌─────────────────────────┐
│  Company receives PKR   │  (Bank converts USD → PKR, deducts remittance tax)
│  e.g., 3,34,800 PKR     │
└─────────────────────────┘
        │
        ▼
┌─────────────────────────┐
│  Company keeps commission│  e.g., $200 worth kept aside
│  (outsourcing fee)       │
└─────────────────────────┘
        │
        ▼
┌─────────────────────────┐
│  Distribute $1000 to    │  Remaining amount distributed to employees
│  employees in PKR       │  after tax deductions
└─────────────────────────┘
        │
        ▼
┌─────────────────────────┐
│  Generate PDF invoices  │  One per employee, showing breakdown
│  Record as transactions │  Each payout saved as a debit in ledger
└─────────────────────────┘
```

---

## 3. Rate Calculation Logic

When a USD payment is received, the bank converts it to PKR and deducts a remittance tax.

### Inputs
| Field               | Example     | Description                                    |
|---------------------|-------------|------------------------------------------------|
| Amount Received     | 3,34,800 PKR| What actually landed in the bank (after tax)   |
| Remittance Tax      | 0.25%       | Bank's remittance tax percentage               |
| Total USD           | 1,200       | The original USD amount from the client        |
| Rate Threshold      | 2 PKR       | Company's per-USD cut (spread)                 |

### Calculations
```
Original Amount  = Amount Received × (1 + Remittance Tax / 100)
                 = 3,34,800 × 1.0025
                 = 3,35,637 PKR

Base Rate        = Original Amount / Total USD
                 = 3,35,637 / 1,200
                 = 279.70 PKR/USD

Effective Rate   = Base Rate − Threshold
(for employees)  = 279.70 − 2
                 = 277.70 PKR/USD
```

**Key insight:** The threshold is how the company earns a spread on every employee dollar — employees get paid at the effective rate, but the full base rate was received. The difference (threshold × employee USD) accumulates as company revenue.

---

## 4. Employee Distribution Logic

### Per Employee
Each employee has their **own** tax rates and threshold (stored as defaults, overridable per month).

```
Employee: Qaim Ali
  Default: USD 4,000 | Threshold 2 PKR | Contractor 1% | Remittance 0.25%

Effective Rate  = Base Rate − Employee's Threshold
                = 279.70 − 2
                = 277.70 PKR/USD

Gross PKR       = Salary (USD) × Effective Rate
                = 4,000 × 277.70
                = 11,10,800 PKR

Tax Deductions (per-employee rates):
  Contractor Tax  = Gross × (employee's contractor_tax% / 100) = 11,10,800 × 0.01 = 11,108
  Remittance Tax  = Gross × (employee's remittance_tax% / 100) = 11,10,800 × 0.0025 = 2,777
  Total Tax       = 11,108 + 2,777 = 13,885

Net PKR          = Gross − Total Tax
                 = 11,10,800 − 13,885
                 = 10,96,915 PKR
```

### Per-Employee Overrides (at distribution time)
Each employee's defaults are pre-filled from DB but can be overridden for any specific month:
- **USD amount** — different salary this month
- **Threshold** — different company spread
- **Contractor tax %** — different rate
- **Remittance tax %** — different rate
- **Custom rate** — completely override the effective rate (bypasses threshold calc)

### Employee Default Configuration

Each employee has **per-employee defaults** stored in the DB. These are pre-filled during each monthly distribution but can be **overridden for any specific month**.

| Name     | Default USD | Threshold | Contractor Tax % | Remittance Tax % | CNIC               |
|----------|-------------|-----------|-------------------|-------------------|---------------------|
| Qaim Ali | $4,000      | 2 PKR     | 1%                | 0.25%             | 36302-7114950-7     |
| Fatima   | $0          | 2 PKR     | 1%                | 0.25%             | 35202-3649112-0     |
| Zaki     | $2,250      | 2 PKR     | 1%                | 0.25%             | 36302-0561432-5     |
| Mubashir | $1,250      | 2 PKR     | 1%                | 0.25%             | (CNIC needs fix)    |
| Fitrus   | $3,150      | 2 PKR     | 1%                | 0.25%             | (CNIC needs entry)  |

*(Values above are examples — actual rates may differ per employee)*

### Monthly Distribution Flow
```
Employee defaults loaded from DB
         │
         ▼
Pre-filled in distribution form
         │
         ▼
Owner reviews & overrides if needed (e.g., Zaki got a raise this month)
         │
         ▼
Calculate & generate invoices with that month's values
```

This means the system doesn't apply a single global tax rate — each employee can have **different contractor tax %, remittance tax %, and threshold**.

---

## 5. Company Share Calculation

```
Employee Total USD    = Sum of all employee salaries = $10,650
Company USD           = Total USD − Employee Total   = $1,200 − $10,650 = varies

Company Gross         = Company USD × Base Rate
                      + Threshold Savings (sum of: each employee USD × their threshold)

Company Tax           = Company Gross × (Remittance Tax / 100)
Company Net           = Company Gross − Company Tax
```

### Verification (must balance)
```
Employee Net Total + Employee Tax Total + Company Net + Company Tax = Original Amount (before bank tax)
```
If the difference is < 1 PKR, the distribution is considered balanced.

---

## 6. Transaction Types

All transactions are stored in **PKR**.

### Credits (money coming in)
| Type                | Description                                          | Example                      |
|---------------------|------------------------------------------------------|------------------------------|
| `client_payment`    | Payment received from client (converted USD → PKR)   | Received 3,34,800 PKR for March 2026 |
| `owner_investment`  | Partner loans money to the company                   | Owner X gave 50,000 PKR to company   |

### Debits (money going out)
| Type                | Description                                          | Example                      |
|---------------------|------------------------------------------------------|------------------------------|
| `salary_payout`     | Employee net salary (auto-created from invoices)     | Paid Zaki 5,50,000 PKR for March |
| `contractor_tax`    | Contractor tax owed to govt (deducted from employees, company must pay to FBR) | Contractor tax March: 45,000 PKR |
| `owner_repayment`   | Company pays back an owner's loan                    | Repaid Owner X 20,000 PKR          |
| `expense`           | General company expense                              | Office supplies, tools, etc.       |

### Tax Payment Flow (Important)
```
Employee invoice shows:
  Gross: 11,10,800 PKR
  Contractor Tax (1%): −11,108 PKR   ← deducted from employee
  Remittance Tax (0.25%): −2,777 PKR ← deducted from employee
  Net Payable: 10,96,915 PKR         ← employee receives this

What happens to the deducted taxes:
  salary_payout DEBIT:    10,96,915 PKR  (net paid to employee)
  contractor_tax DEBIT:   11,108 PKR     (company owes this to govt/FBR)

  The contractor tax is real money the company collected on behalf of the govt.
  It must be paid to FBR — so it's tracked as a separate debit transaction.

  Remittance tax is already deducted by the bank, so no separate payment needed.
```

When the "Save as debit transactions" checkbox is checked after distribution, the system creates:
1. **One `salary_payout` per employee** — the net PKR amount
2. **One `contractor_tax` transaction** — total contractor tax across all employees for that distribution (summed, since it's paid to govt as one payment)

---

## 7. Owner Investment (Loan) Logic

Partners invest personal money into the company to cover operational costs.

```
Owner X invests 50,000 PKR
  → Transaction: CREDIT 50,000 PKR (type: owner_investment, owner: X)
  → Company balance: +50,000 PKR
  → Liability to Owner X: +50,000 PKR

Company repays Owner X 20,000 PKR
  → Transaction: DEBIT 20,000 PKR (type: owner_repayment, owner: X)
  → Company balance: −20,000 PKR
  → Liability to Owner X: −20,000 PKR (now 30,000 remaining)
```

### Per-Owner Liability View
Each partner can see:
- Total invested (all time)
- Total repaid (all time)
- Outstanding balance (company still owes them)

---

## 8. Invoice Generation

PDF invoice generated per employee after distribution, containing:

```
┌──────────────────────────────────────┐
│          PAYMENT INVOICE             │
│                                      │
│  Date: March 14, 2026               │
│  Pay To: Qaim Ali                   │
│                                      │
│  ┌──────────────────┬───────────┐   │
│  │ Description      │ Amount    │   │
│  ├──────────────────┼───────────┤   │
│  │ Salary (USD)     │ $ 4,000   │   │
│  │ Exchange Rate    │ 277.70    │   │
│  │ Gross Amount     │ Rs. 11.1L │   │
│  │                  │           │   │
│  │ Tax Deductions:  │           │   │
│  │  Remittance 0.25%│ Rs. 2,777 │   │
│  │  Contractor 1%   │ Rs. 11,108│   │
│  │  Total Tax 1.25% │ Rs. 13,885│   │
│  │                  │           │   │
│  │ NET PAYABLE      │ Rs. 10.9L │   │
│  └──────────────────┴───────────┘   │
│                                      │
│  Computer-generated invoice          │
└──────────────────────────────────────┘
```

### Post-Invoice Workflow
After invoices are generated, a **checkbox** allows the user to:
> ☑ Save these as debit transactions

This auto-creates one `salary_payout` debit transaction per employee, linking to the invoice.

---

## 9. Dashboard

### Company Balance Card
```
┌─────────────────────────────────┐
│  Company Balance                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Total Credits:    15,00,000 PKR│
│  Total Debits:    −12,00,000 PKR│
│  ─────────────────────────────  │
│  Available Balance: 3,00,000 PKR│
│                                 │
│  Liabilities (Owner Loans):     │
│    Owner A:          50,000 PKR │
│    Owner B:          30,000 PKR │
│    Owner C:               0 PKR │
│  Total Owed:         80,000 PKR │
│                                 │
│  Net Position:      2,20,000 PKR│
│  (Balance − Liabilities)        │
└─────────────────────────────────┘
```

### Transaction History
| Date       | Type             | Description                  | Credit    | Debit     | Balance     |
|------------|------------------|------------------------------|-----------|-----------|-------------|
| 2026-03-01 | client_payment   | March payment from Client X  | 3,34,800  |           | 3,34,800    |
| 2026-03-05 | salary_payout    | Qaim Ali - March salary      |           | 10,96,915 | ...         |
| 2026-03-05 | salary_payout    | Zaki - March salary          |           | 6,17,013  | ...         |
| 2026-02-15 | owner_investment | Owner A invested             | 50,000    |           | ...         |

---

## 10. Tech Architecture

```
┌─────────────────────────────────────────────┐
│                  Vercel (Free)               │
│  ┌───────────────────────────────────────┐  │
│  │          Next.js App Router           │  │
│  │                                       │  │
│  │  /login         → Supabase Auth       │  │
│  │  /dashboard     → Balance + History   │  │
│  │  /transactions  → Add credit/debit    │  │
│  │  /distribute    → Run distribution    │  │
│  │  /invoices      → Generate PDFs       │  │
│  │  /owners        → Investment tracking │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│              Supabase (Free Tier)            │
│                                             │
│  Auth:  3 partner accounts (email/password) │
│                                             │
│  Tables:                                    │
│    owners        → partner profiles         │
│    employees     → employee master data     │
│    transactions  → all credits & debits     │
│    distributions → distribution runs        │
│    invoices      → generated invoice records│
│    owner_loans   → investment/repayment log │
└─────────────────────────────────────────────┘
```

### Supabase Tables (Draft Schema)

**owners**
| Column     | Type    | Description          |
|------------|---------|----------------------|
| id         | uuid    | PK, maps to auth.uid |
| name       | text    | Partner name         |
| email      | text    | Login email          |
| created_at | timestamp |                    |

**employees**
| Column              | Type    | Description                          |
|---------------------|---------|--------------------------------------|
| id                  | uuid    | PK                                   |
| name                | text    | Employee name                        |
| cnic                | text    | National ID                          |
| default_salary_usd  | decimal | Default monthly salary in USD        |
| default_threshold   | decimal | Default rate threshold (PKR per USD) |
| default_contractor_tax | decimal | Default contractor tax %          |
| default_remittance_tax | decimal | Default remittance tax %          |
| is_active           | boolean | Currently employed                   |
| created_at          | timestamp |                                    |

**transactions**
| Column          | Type    | Description                              |
|-----------------|---------|------------------------------------------|
| id              | uuid    | PK                                       |
| type            | enum    | client_payment, owner_investment, salary_payout, owner_repayment, expense |
| amount_pkr      | decimal | Transaction amount in PKR                |
| description     | text    | Human-readable note                      |
| reference_month | text    | e.g., "2026-03"                          |
| created_by      | uuid    | FK → owners.id (who entered it)          |
| distribution_id | uuid    | FK → distributions.id (if salary_payout) |
| owner_id        | uuid    | FK → owners.id (if owner_investment/repayment) |
| created_at      | timestamp |                                        |

**distributions**
| Column          | Type    | Description                         |
|-----------------|---------|--------------------------------------|
| id              | uuid    | PK                                   |
| reference_month | text    | e.g., "2026-03"                      |
| total_usd       | decimal | Total USD from client                |
| distribute_usd  | decimal | USD allocated to employees           |
| amount_received | decimal | PKR received from bank               |
| remittance_tax  | decimal | Bank remittance tax %                |
| base_rate       | decimal | Calculated base rate                 |
| effective_rate  | decimal | Rate after threshold                 |
| threshold       | decimal | Company threshold per USD            |
| created_by      | uuid    | FK → owners.id                       |
| created_at      | timestamp |                                    |

**invoices**
| Column          | Type    | Description                       |
|-----------------|---------|-------------------------------------|
| id              | uuid    | PK                                  |
| distribution_id | uuid    | FK → distributions.id              |
| employee_id     | uuid    | FK → employees.id                  |
| salary_usd      | decimal | USD amount for this employee       |
| rate_applied    | decimal | PKR/USD rate used                  |
| gross_pkr       | decimal | Before tax                         |
| total_tax_pkr   | decimal | Total tax deducted                 |
| tax_breakdown   | jsonb   | [{name, percent, amount}, ...]     |
| net_pkr         | decimal | Final payable amount               |
| pdf_url         | text    | Stored PDF link (optional)         |
| created_at      | timestamp |                                  |

---

## 11. Distribution Workflow (Web UI)

### Step 1: Enter Payment Details
```
┌──────────────────────────────────────┐
│  New Distribution — March 2026       │
│                                      │
│  Amount Received (PKR): [334,800]    │
│  Remittance Tax (%):    [0.25]       │
│  Total USD:             [1,200]      │
│  Rate Threshold (PKR):  [2]          │
│                                      │
│  ── Calculated ──                    │
│  Base Rate:     279.70 PKR/USD       │
│  Effective Rate: 277.70 PKR/USD      │
│                                      │
│  [Next →]                            │
└──────────────────────────────────────┘
```

### Step 2: Configure Employees
Defaults are **pre-filled from DB** — owner just verifies or overrides for this month.

```
┌─────────────────────────────────────────────────────────────────┐
│  Employee Distribution — March 2026                             │
│                                                                 │
│  Defaults loaded from employee settings (override any field)    │
│                                                                 │
│  ☑ Qaim Ali                                                     │
│     USD: [4,000]  Threshold: [2]  Contractor: [1%]  Remit: [0.25%] │
│     → Rate: 277.70  Gross: 11,10,800  Tax: 13,885  Net: 10,96,915  │
│                                                                 │
│  ☑ Zaki                                                         │
│     USD: [2,250]  Threshold: [2]  Contractor: [1%]  Remit: [0.25%] │
│     → Rate: 277.70  Gross: 6,24,825   Tax: 7,810   Net: 6,17,015   │
│                                                                 │
│  ☑ Mubashir                                                     │
│     USD: [1,250]  Threshold: [2]  Contractor: [4%]  Remit: [2%]    │
│     → Rate: 277.70  Gross: 3,47,125   Tax: 20,828  Net: 3,26,298   │
│                                                                 │
│  ☑ Fitrus                                                       │
│     USD: [3,150]  Threshold: [2]  Contractor: [1%]  Remit: [0.25%] │
│     → Rate: 277.70  Gross: 8,74,755   Tax: 10,934  Net: 8,63,821   │
│                                                                 │
│  ☐ Fatima  (unchecked — $0 default)                             │
│                                                                 │
│  [+ Add Employee]                                               │
│  [← Back]  [Calculate & Preview →]                              │
└─────────────────────────────────────────────────────────────────┘
```

Note: Each employee can have **different tax rates**. Mubashir above has 4% contractor + 2% remittance vs others at 1% + 0.25%. This is stored as defaults and overridable per month.

### Step 3: Review & Generate
```
┌──────────────────────────────────────────────────────────────┐
│  Distribution Preview — March 2026                           │
│                                                              │
│  Name      USD    Rate    Gross       Contr.Tax  Remit.Tax  Net        │
│  ─────────────────────────────────────────────────────────── │
│  Qaim Ali  4000   277.70  11,10,800   11,108     2,777      10,96,915 │
│  Zaki      2250   277.70   6,24,825    6,248     1,562       6,17,015 │
│  Mubashir  1250   277.70   3,47,125   13,885     6,943       3,26,298 │
│  Fitrus    3150   277.70   8,74,755    8,748     2,187       8,63,821 │
│  ─────────────────────────────────────────────────────────── │
│  TOTAL    10650           29,57,505   39,989     13,469     29,04,049 │
│                                                              │
│  Company Share: 1,23,456 PKR                                 │
│  ✓ Balanced                                                  │
│                                                              │
│  If saved as debit transactions:                             │
│    4× salary_payout debits    = 29,04,049 PKR (net to employees)  │
│    1× contractor_tax debit    =    39,989 PKR (owed to govt/FBR)  │
│                                                              │
│  ☑ Save as debit transactions                                │
│                                                              │
│  [← Back]  [Generate Invoices & Save]                        │
└──────────────────────────────────────────────────────────────┘
```

---

## 12. Pages Summary

| Page             | Purpose                                           |
|------------------|---------------------------------------------------|
| `/login`         | Partner login (Supabase Auth)                     |
| `/dashboard`     | Balance card, recent transactions, liabilities    |
| `/transactions`  | Full transaction history with filters             |
| `/transactions/new` | Add credit transaction (client payment)        |
| `/distribute`    | 3-step distribution wizard                        |
| `/owners`        | Owner investments, repayments, liability balances |
| `/employees`     | Manage employee master data (CRUD)                |
| `/settings`      | Tax rates, threshold defaults, employee defaults  |

---

## 13. Open Questions / Future

- **PDF Storage**: Store PDFs in Supabase Storage (free 1GB) or generate on-demand?
- **Multi-client support**: Currently assumes single client. Future: track which client paid.
- **Expense categories**: Just `expense` type for now, categorization later.
- **Audit log**: Supabase RLS + created_by field provides basic audit. Full audit trail later if needed.
