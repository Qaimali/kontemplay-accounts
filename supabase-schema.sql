-- Kontemplay Finance - Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- OWNERS (partners)
-- ============================================
create table owners (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  created_at timestamptz default now()
);

-- ============================================
-- EMPLOYEES
-- ============================================
create table employees (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  cnic text,
  default_salary_usd numeric(12,2) default 0,
  default_threshold numeric(8,2) default 2,
  default_contractor_tax numeric(5,2) default 1,
  default_remittance_tax numeric(5,2) default 0.25,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================
-- DISTRIBUTIONS (monthly distribution runs)
-- ============================================
create table distributions (
  id uuid primary key default uuid_generate_v4(),
  reference_month text not null, -- e.g. '2026-03'
  total_usd numeric(12,2) not null,
  distribute_usd numeric(12,2) not null,
  amount_received_pkr numeric(14,2) not null,
  remittance_tax_percent numeric(5,2) not null,
  base_rate numeric(10,4) not null,
  effective_rate numeric(10,4) not null,
  threshold numeric(8,2) not null,
  company_gross_pkr numeric(14,2),
  company_net_pkr numeric(14,2),
  created_by uuid references owners(id),
  created_at timestamptz default now()
);

-- ============================================
-- INVOICES (one per employee per distribution)
-- ============================================
create table invoices (
  id uuid primary key default uuid_generate_v4(),
  distribution_id uuid not null references distributions(id) on delete cascade,
  employee_id uuid not null references employees(id),
  salary_usd numeric(12,2) not null,
  rate_applied numeric(10,4) not null,
  threshold_applied numeric(8,2) not null,
  contractor_tax_percent numeric(5,2) not null,
  remittance_tax_percent numeric(5,2) not null,
  gross_pkr numeric(14,2) not null,
  contractor_tax_pkr numeric(14,2) not null,
  remittance_tax_pkr numeric(14,2) not null,
  total_tax_pkr numeric(14,2) not null,
  net_pkr numeric(14,2) not null,
  created_at timestamptz default now()
);

-- ============================================
-- TRANSACTIONS (ledger)
-- ============================================
create type transaction_type as enum (
  'client_payment',
  'owner_investment',
  'salary_payout',
  'contractor_tax',
  'owner_repayment',
  'expense'
);

create table transactions (
  id uuid primary key default uuid_generate_v4(),
  type transaction_type not null,
  amount_pkr numeric(14,2) not null, -- always positive
  is_credit boolean not null, -- true = money in, false = money out
  description text,
  reference_month text, -- e.g. '2026-03'
  distribution_id uuid references distributions(id),
  invoice_id uuid references invoices(id),
  employee_id uuid references employees(id),
  owner_id uuid references owners(id), -- for owner_investment / owner_repayment
  created_by uuid references owners(id),
  created_at timestamptz default now()
);

-- ============================================
-- CLIENT INVOICES (invoices sent to clients)
-- ============================================
create table client_invoices (
  id uuid primary key default uuid_generate_v4(),
  invoice_number integer not null,
  bill_to text not null default 'Youth Athletes United',
  date date not null,
  line_items jsonb not null, -- [{description, subtitle?, quantity, rate}]
  tax_percent numeric(5,2) default 0,
  subtotal numeric(14,2) not null,
  total numeric(14,2) not null,
  notes text,
  created_by uuid references owners(id),
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index idx_transactions_type on transactions(type);
create index idx_transactions_month on transactions(reference_month);
create index idx_transactions_owner on transactions(owner_id);
create index idx_invoices_distribution on invoices(distribution_id);
create index idx_invoices_employee on invoices(employee_id);
create index idx_distributions_month on distributions(reference_month);
create index idx_client_invoices_date on client_invoices(date);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table owners enable row level security;
alter table employees enable row level security;
alter table distributions enable row level security;
alter table invoices enable row level security;
alter table transactions enable row level security;
alter table client_invoices enable row level security;

-- All authenticated users (owners) can read/write everything
create policy "Owners can read all" on owners for select to authenticated using (true);
create policy "Owners can insert" on owners for insert to authenticated with check (true);
create policy "Owners can update" on owners for update to authenticated using (true);

create policy "Auth read employees" on employees for select to authenticated using (true);
create policy "Auth insert employees" on employees for insert to authenticated with check (true);
create policy "Auth update employees" on employees for update to authenticated using (true);
create policy "Auth delete employees" on employees for delete to authenticated using (true);

create policy "Auth read distributions" on distributions for select to authenticated using (true);
create policy "Auth insert distributions" on distributions for insert to authenticated with check (true);

create policy "Auth read invoices" on invoices for select to authenticated using (true);
create policy "Auth insert invoices" on invoices for insert to authenticated with check (true);

create policy "Auth read transactions" on transactions for select to authenticated using (true);
create policy "Auth insert transactions" on transactions for insert to authenticated with check (true);
create policy "Auth update transactions" on transactions for update to authenticated using (true);
create policy "Auth delete transactions" on transactions for delete to authenticated using (true);

create policy "Auth read client_invoices" on client_invoices for select to authenticated using (true);
create policy "Auth insert client_invoices" on client_invoices for insert to authenticated with check (true);
create policy "Auth update client_invoices" on client_invoices for update to authenticated using (true);
create policy "Auth delete client_invoices" on client_invoices for delete to authenticated using (true);

-- ============================================
-- SEED: Default employees
-- ============================================
insert into employees (name, cnic, default_salary_usd, default_threshold, default_contractor_tax, default_remittance_tax) values
  ('Qaim Ali',  '36302-7114950-7', 4000, 2, 1, 0.25),
  ('Fatima',    '35202-3649112-0', 0,    2, 1, 0.25),
  ('Zaki',      '36302-0561432-5', 2250, 2, 1, 0.25),
  ('Mubashir',  '',                1250, 2, 1, 0.25),
  ('Fitrus',    '',                3150, 2, 1, 0.25);
