---
name: kontemplay-finance
description: Manage Kontemplay Finance app - Cloudflare D1 database operations, distribution calculations, invoice/tax certificate PDF generation, direct invoices, employee bank details, and transaction management. Use when working with the Kontemplay payment distribution system, employee salary calculations, PKR/USD conversions, client invoicing, or any financial feature in this codebase.
---

# Kontemplay Finance - Project Skill

## Project Overview
Kontemplay Finance is a payment distribution & invoice management app for Kontemplay (outsourcing company, 3 partners). It manages monthly USD-to-PKR salary distributions for Pakistani contractors, handles tax deductions (FBR), generates invoice & tax certificate PDFs, and tracks all financial transactions.

## Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend/DB**: Cloudflare D1 (SQLite via HTTP API)
- **Auth**: Clerk (NextJS 7)
- **UI**: shadcn/ui components (built on @base-ui/react + Radix), lucide-react icons, Sonner toasts
- **PDF**: @react-pdf/renderer (client-side generation)
- **Deploy**: Cloudflare Workers/Pages (wrangler CLI)

## Environment Variables

All stored in `.env.local` (gitignored):

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLOUDFLARE_ACCOUNT_ID=<account-id>
D1_DATABASE_ID=<database-uuid>
CLOUDFLARE_API_TOKEN=cfut_...
```

Never hardcode secrets. Use `process.env.*` in server-side code.

## Database (Cloudflare D1)

### Access Pattern
All DB access goes through `src/lib/db.ts` which wraps the Cloudflare D1 HTTP API:

```typescript
import { query, queryOne, execute, uuid } from "@/lib/db";

// Read rows
const rows = await query<Employee>("SELECT * FROM employees WHERE is_active = ?", [1]);

// Read single row
const emp = await queryOne<Employee>("SELECT * FROM employees WHERE id = ?", [id]);

// Write (INSERT/UPDATE/DELETE)
await execute("INSERT INTO employees (id, name) VALUES (?, ?)", [uuid(), "John"]);
```

All IDs are UUIDs generated via `uuid()` (crypto.randomUUID). All queries use parameterized `?` placeholders.

### Tables

#### owners
Partners of the company. Auto-created on first login via Clerk.
- `id` TEXT PK, `clerk_id` TEXT UNIQUE, `name` TEXT, `email` TEXT, `created_at` TEXT

#### employees
Contractors who receive salary distributions.
- `id` TEXT PK, `name` TEXT, `cnic` TEXT (national ID), `bank_account` TEXT (JSON)
- `default_salary_usd` REAL, `default_threshold` REAL, `default_contractor_tax` REAL, `default_remittance_tax` REAL
- `is_active` INTEGER (0/1), `created_at` TEXT

**Bank account** is stored as JSON: `{"title":"FATIMA MUNEER","number":"01951006644277","iban":"PK47ALFH...","bank":"Bank Alfalah"}`

#### distributions
Monthly distribution runs. One per month per batch of employees.
- `id` TEXT PK, `reference_month` TEXT (YYYY-MM), `total_usd` REAL, `distribute_usd` REAL
- `amount_received_pkr` REAL, `remittance_tax_percent` REAL, `base_rate` REAL, `effective_rate` REAL, `threshold` REAL
- `company_gross_pkr` REAL, `company_net_pkr` REAL, `created_by` TEXT, `created_at` TEXT

#### invoices
Per-employee salary breakdown. Links to a distribution (or NULL for direct invoices).
- `id` TEXT PK, `distribution_id` TEXT (nullable for direct invoices), `employee_id` TEXT
- `salary_usd` REAL, `rate_applied` REAL, `threshold_applied` REAL
- `contractor_tax_percent` REAL, `remittance_tax_percent` REAL
- `gross_pkr` REAL, `contractor_tax_pkr` REAL, `remittance_tax_pkr` REAL, `total_tax_pkr` REAL, `net_pkr` REAL
- `created_at` TEXT

#### transactions
General ledger. Every money movement is a transaction.
- `id` TEXT PK, `type` TEXT, `amount_pkr` REAL, `is_credit` INTEGER (0/1)
- `description` TEXT, `reference_month` TEXT (YYYY-MM)
- `distribution_id` TEXT, `invoice_id` TEXT, `employee_id` TEXT, `owner_id` TEXT
- `created_by` TEXT, `created_at` TEXT

#### client_invoices
Invoices sent to clients (primarily Youth Athletes United).
- `id` TEXT PK, `invoice_number` INTEGER, `bill_to` TEXT, `date` TEXT, `invoice_month` TEXT
- `status` TEXT (draft/sent/received/overdue), `due_date` TEXT
- `line_items` TEXT (JSON array), `tax_percent` REAL, `subtotal` REAL, `total` REAL
- `notes` TEXT, `created_by` TEXT, `created_at` TEXT

## Transaction Types
| Type | Credit/Debit | Description |
|---|---|---|
| client_payment | Credit | Client payment received (PKR) |
| owner_investment | Credit | Partner loans money to company |
| salary_payout | Debit | Employee net salary |
| contractor_tax | Debit | FBR contractor tax withheld |
| owner_repayment | Debit | Company repays partner |
| expense | Debit | General company expense |

## Distribution Logic

Located in `src/lib/distribution.ts` - `calculateDistribution()`:

1. **Original amount**: `received_pkr * (1 + remittance_tax_percent / 100)`
2. **Base rate**: `original_amount / total_usd`
3. **Effective rate**: `base_rate - threshold`
4. **Per employee**: `gross = salary_usd * (base_rate - employee_threshold)`, taxes deducted, `net = gross - total_tax`
5. **Company share**: leftover USD at base rate + threshold savings + operational cost - remittance tax
6. **Verification**: all payouts + taxes must equal original amount (is_balanced check)

## Direct Invoices

Employees can receive payments outside monthly distributions. Created via `POST /api/employees/[id]/direct-invoice`.

- Choose USD (with exchange rate) or PKR directly
- Apply contractor tax %, remittance tax %, operational cost %
- Creates an invoice record with `distribution_id = NULL`
- Creates salary_payout + contractor_tax transactions linked to the invoice
- Reference month comes from the transaction (not from a distribution)

The employee invoices API (`GET /api/employees/[id]/invoices`) uses LEFT JOIN to include both distribution and direct invoices, with a subquery fallback for reference_month.

## PDF Generation

Three PDF templates using @react-pdf/renderer:

### Invoice PDF (`src/lib/invoice-pdf.tsx`)
- Shows: employee name, CNIC, bank details (title, account#, IBAN, bank), salary USD, exchange rate, gross PKR
- Tax breakdown: remittance, contractor, operational cost
- Net payable amount
- Interface: `InvoicePDFData` (includes `bankDetails?: BankDetails`, `cnic?: string`)

### Tax Certificate PDF (`src/lib/tax-certificate-pdf.tsx`)
- FBR Section 153(1)(b) format
- Shows: contractor name, CNIC, gross amount, contractor tax rate, tax deducted
- Interface: `TaxCertificateData` (includes `cnic?: string`)

### Client Invoice PDF (`src/lib/client-invoice-pdf.tsx`)
- Shows: invoice number, bill-to, date, line items, tax, total

## File Structure
```
src/
├── app/
│   ├── (app)/                    # Protected routes (Clerk auth)
│   │   ├── dashboard/            # Financial overview, owner liabilities
│   │   ├── distribute/           # 4-step distribution wizard
│   │   ├── distributions/        # Distribution history, PDF downloads
│   │   ├── employees/            # Employee CRUD, direct invoices, invoice history
│   │   ├── transactions/         # Full ledger with filters
│   │   ├── owners/               # Partner investments & repayments
│   │   ├── client-invoices/      # Client invoice management
│   │   ├── reports/              # Reporting (skeleton)
│   │   └── layout.tsx            # Sidebar layout
│   ├── api/
│   │   ├── distributions/        # GET, POST, PATCH, DELETE
│   │   ├── employees/            # CRUD + /[id]/invoices, /[id]/direct-invoice, /[id]/transactions
│   │   ├── invoices/[id]/        # DELETE (cascade cleanup)
│   │   ├── transactions/         # CRUD + bulk-delete
│   │   ├── client-invoices/      # CRUD + /latest
│   │   └── owners/               # GET, /me
│   └── login/
├── lib/
│   ├── db.ts                     # D1 HTTP API client
│   ├── auth.ts                   # Clerk auth helpers (getOwner, requireAuth)
│   ├── types.ts                  # All TypeScript interfaces
│   ├── distribution.ts           # Core distribution calculation
│   ├── format.ts                 # formatPKR, formatUSD, formatNumber, formatMonth
│   ├── export.ts                 # CSV export
│   ├── invoice-pdf.tsx           # Employee invoice PDF
│   ├── tax-certificate-pdf.tsx   # Tax certificate PDF
│   └── client-invoice-pdf.tsx    # Client invoice PDF
├── components/ui/                # shadcn/ui components
└── middleware.ts                 # Clerk auth middleware
```

## Auth

Clerk middleware protects all routes except `/`, `/login`, `/sign-up`. API routes call `requireAuth()` from `src/lib/auth.ts` which returns `{ userId, owner }`. Owners are auto-created in the DB on first authenticated request.

## Partners
| Name | Role |
|---|---|
| Qaim Ali | Partner |
| Arsalan Dogar | Partner |
| Sanan Babar | Partner |

## Common Tasks

### Run dev server
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

### Run SQL against D1 directly
```bash
set -a && source .env.local && set +a && node -e "
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const dbId = process.env.D1_DATABASE_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
fetch('https://api.cloudflare.com/client/v4/accounts/'+accountId+'/d1/database/'+dbId+'/query', {
  method: 'POST',
  headers: { Authorization: 'Bearer '+token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ sql: 'SELECT count(*) FROM transactions' })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d.result[0].results, null, 2)));
"
```

### ALTER TABLE on D1
SQLite doesn't support ALTER COLUMN. To change a column constraint (e.g., make nullable), recreate the table:
1. CREATE TABLE new_table (with new schema, omit DEFAULT expressions that use functions)
2. INSERT INTO new_table SELECT * FROM old_table
3. DROP TABLE old_table
4. ALTER TABLE new_table RENAME TO old_table

### Add a new employee field
1. ALTER TABLE employees ADD COLUMN field_name TYPE via D1 SQL
2. Update `Employee` interface in `src/lib/types.ts`
3. Update employee form in `src/app/(app)/employees/page.tsx` (type, emptyForm, formFromEmployee, handleSave, JSX)
4. Update POST in `src/app/api/employees/route.ts` (PATCH handles any field dynamically)
5. If displayed in PDFs, update the PDF data interfaces and templates
