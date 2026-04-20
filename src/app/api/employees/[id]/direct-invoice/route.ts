import { NextRequest, NextResponse } from "next/server";
import { execute, uuid } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { owner } = await requireAuth();
  const { id: employeeId } = await params;
  const body = await req.json();

  const {
    salary_usd,
    rate_applied,
    gross_pkr,
    contractor_tax_percent,
    contractor_tax_pkr,
    remittance_tax_percent,
    remittance_tax_pkr,
    total_tax_pkr,
    net_pkr,
    reference_month,
    description,
  } = body;

  const invoiceId = uuid();
  const now = new Date().toISOString();

  // Create invoice record (distribution_id = NULL for direct invoices)
  await execute(
    `INSERT INTO invoices (id, distribution_id, employee_id, salary_usd, rate_applied, threshold_applied, contractor_tax_percent, remittance_tax_percent, gross_pkr, contractor_tax_pkr, remittance_tax_pkr, total_tax_pkr, net_pkr, created_at)
     VALUES (?, NULL, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [invoiceId, employeeId, salary_usd, rate_applied, contractor_tax_percent, remittance_tax_percent, gross_pkr, contractor_tax_pkr, remittance_tax_pkr, total_tax_pkr, net_pkr, now]
  );

  // Create salary_payout transaction
  await execute(
    `INSERT INTO transactions (id, type, amount_pkr, is_credit, description, reference_month, distribution_id, invoice_id, employee_id, owner_id, created_by, created_at)
     VALUES (?, 'salary_payout', ?, 0, ?, ?, NULL, ?, ?, NULL, ?, ?)`,
    [uuid(), net_pkr, description ?? null, reference_month ?? null, invoiceId, employeeId, owner.id, now]
  );

  // Create contractor_tax transaction if applicable
  if (contractor_tax_pkr > 0) {
    await execute(
      `INSERT INTO transactions (id, type, amount_pkr, is_credit, description, reference_month, distribution_id, invoice_id, employee_id, owner_id, created_by, created_at)
       VALUES (?, 'contractor_tax', ?, 0, ?, ?, NULL, ?, ?, NULL, ?, ?)`,
      [uuid(), contractor_tax_pkr, `Contractor tax - ${description ?? "direct invoice"}`, reference_month ?? null, invoiceId, employeeId, owner.id, now]
    );
  }

  return NextResponse.json({ id: invoiceId });
}
