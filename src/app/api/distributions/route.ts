import { NextRequest, NextResponse } from "next/server";
import { query, execute, uuid } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  await requireAuth();

  const dists = await query(
    "SELECT * FROM distributions ORDER BY created_at DESC"
  );

  // Fetch invoices with employee names for each distribution
  const result = [];
  for (const dist of dists) {
    const invoices = await query(
      `SELECT i.*, e.name as employee_name, e.cnic as employee_cnic, e.bank_account as employee_bank_account
       FROM invoices i
       LEFT JOIN employees e ON e.id = i.employee_id
       WHERE i.distribution_id = ?`,
      [dist.id]
    );
    result.push({
      ...dist,
      invoices: invoices.map(inv => {
        const r = inv as Record<string, unknown>;
        return {
          ...inv,
          employee: { name: r.employee_name as string, cnic: r.employee_cnic as string | null, bank_account: r.employee_bank_account as string | null },
        };
      }),
    });
  }

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const { owner } = await requireAuth();
  const body = await req.json();

  const distId = uuid();

  // 1. Create distribution
  await execute(
    `INSERT INTO distributions (id, reference_month, total_usd, distribute_usd, amount_received_pkr, remittance_tax_percent, base_rate, effective_rate, threshold, company_gross_pkr, company_net_pkr, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      distId, body.reference_month, body.total_usd, body.distribute_usd,
      body.amount_received_pkr, body.remittance_tax_percent,
      body.base_rate, body.effective_rate, body.threshold,
      body.company_gross_pkr ?? null, body.company_net_pkr ?? null,
      body.created_by ?? owner.id,
    ]
  );

  // 2. Create invoices
  const invoiceIds: string[] = [];
  if (body.invoices) {
    for (const inv of body.invoices) {
      const invId = uuid();
      invoiceIds.push(invId);
      await execute(
        `INSERT INTO invoices (id, distribution_id, employee_id, salary_usd, rate_applied, threshold_applied, contractor_tax_percent, remittance_tax_percent, gross_pkr, contractor_tax_pkr, remittance_tax_pkr, total_tax_pkr, net_pkr)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invId, distId, inv.employee_id, inv.salary_usd, inv.rate_applied,
          inv.threshold_applied, inv.contractor_tax_percent, inv.remittance_tax_percent,
          inv.gross_pkr, inv.contractor_tax_pkr, inv.remittance_tax_pkr,
          inv.total_tax_pkr, inv.net_pkr,
        ]
      );
    }
  }

  // 3. Create transactions
  if (body.transactions) {
    for (let i = 0; i < body.transactions.length; i++) {
      const txn = body.transactions[i];
      const txnId = uuid();
      await execute(
        `INSERT INTO transactions (id, type, amount_pkr, is_credit, description, reference_month, distribution_id, invoice_id, employee_id, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          txnId, txn.type, txn.amount_pkr, txn.is_credit ? 1 : 0,
          txn.description ?? null, txn.reference_month ?? null,
          distId, txn.invoice_index !== undefined ? invoiceIds[txn.invoice_index] : null,
          txn.employee_id ?? null, txn.created_by ?? owner.id,
          new Date().toISOString(),
        ]
      );
    }
  }

  return NextResponse.json({ id: distId, invoice_ids: invoiceIds });
}
