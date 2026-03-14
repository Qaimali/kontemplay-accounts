---
name: kontemplay-finance
description: Manage Kontemplay Finance app - Supabase DB operations, distribution calculations, invoice data imports, and transaction management. Use when working with the Kontemplay payment distribution system.
---

# Kontemplay Finance - Project Skill

## Project Overview
Kontemplay Finance is a payment distribution & invoice management app for Kontemplay (outsourcing company, 3 partners). Built with Next.js + Supabase + shadcn/ui, deployed on Vercel.

## Tech Stack
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend/DB**: Supabase (Postgres + Auth + RLS)
- **PDF**: React-PDF (client-side generation)
- **Deploy**: Vercel (free tier)

## Environment Variables
Sensitive keys are stored in `~/.zshrc`:
- `SUPABASE_ACCESS_TOKEN` - Management API token
- `SUPABASE_PROJECT_REF` - Project reference ID (zbqcecdxgazrvxyauivu)
- `SUPABASE_DB_PASSWORD` - Direct DB password

App env vars in `web/.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Supabase Management API
For DB operations (schema changes, data imports, queries), use the Management API:
```javascript
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;

async function runSQL(query) {
  const res = await fetch(`${API}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  return JSON.parse(await res.text());
}
```

## Database Schema

### Tables
- **owners** - 3 partners (Qaim Ali, Arsalan Dogar, Sanan Babar), linked to auth.users
- **employees** - Staff with per-employee defaults (salary_usd, threshold, contractor_tax%, remittance_tax%)
- **distributions** - Monthly distribution runs with rate calculations
- **invoices** - Per-employee invoice records per distribution
- **transactions** - Ledger (credits/debits) with types: client_payment, owner_investment, salary_payout, contractor_tax, owner_repayment, expense

### Key Relationships
- distributions → invoices (one-to-many)
- invoices → employees (many-to-one)
- transactions → distributions, invoices, employees, owners (optional FKs)
- owners → auth.users (via auth_id)

### RLS
All tables have RLS enabled. All authenticated users (partners) can read/write everything.

## Distribution Logic
Located in `web/src/lib/distribution.ts`:
1. **Rate Calculation**: `original_amount = received × (1 + remittance_tax%)`, `base_rate = original / total_usd`, `effective_rate = base_rate - threshold`
2. **Per Employee**: `gross = usd × (base_rate - employee_threshold)`, taxes deducted from gross, `net = gross - taxes`
3. **Company**: gets leftover USD at base rate + threshold savings - remittance tax
4. **Verification**: all distributions + taxes must equal original amount

## Transaction Types
| Type | Credit/Debit | Description |
|---|---|---|
| client_payment | Credit | Client payment received (PKR) |
| owner_investment | Credit | Partner loans money to company |
| salary_payout | Debit | Employee net salary |
| contractor_tax | Debit | Contractor tax owed to govt (FBR) |
| owner_repayment | Debit | Company repays partner |
| expense | Debit | General company expense |

## File Structure
```
web/
├── src/
│   ├── app/
│   │   ├── (app)/          # Authenticated routes
│   │   │   ├── dashboard/  # Balance, liabilities, recent txns
│   │   │   ├── distribute/ # 3-step distribution wizard
│   │   │   ├── employees/  # Employee CRUD
│   │   │   ├── owners/     # Owner investments/repayments
│   │   │   └── transactions/ # Full ledger
│   │   ├── login/
│   │   └── auth/callback/
│   ├── lib/
│   │   ├── supabase/       # Client, server, middleware
│   │   ├── distribution.ts # Core calculation logic
│   │   ├── format.ts       # PKR/USD formatters
│   │   └── types.ts        # TypeScript interfaces
│   └── components/ui/      # shadcn/ui components
├── supabase-schema.sql     # Full DB schema
└── PLAN.md                 # Business logic documentation
```

## Partners
| Name | Email | Auth UID |
|---|---|---|
| Qaim Ali | qaimali239@gmail.com | 9f6c7265-96de-4ed8-a921-11236a81b263 |
| Arsalan Dogar | arsalan.dogar@yahoo.com | b3acdc56-50fd-41ed-b8a5-3470a84a6439 |
| Sanan Babar | sananbabar245@gmail.com | 461a04d5-7b97-4edc-a12c-71434ffc6ed7 |

## Common Tasks

### Import data via Management API
Write a Node.js `.mjs` script using `runSQL()` pattern above. Use `process.env.SUPABASE_ACCESS_TOKEN` and `process.env.SUPABASE_PROJECT_REF` — never hardcode secrets.

### Run dev server
```bash
cd web && npm run dev
```

### Build for production
```bash
cd web && npm run build
```

### Query DB quickly
```bash
node -e "
const r = await fetch('https://api.supabase.com/v1/projects/'+process.env.SUPABASE_PROJECT_REF+'/database/query', {
  method: 'POST',
  headers: { Authorization: 'Bearer '+process.env.SUPABASE_ACCESS_TOKEN, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'SELECT count(*) FROM transactions' })
});
console.log(await r.json());
"
```
