import { NextRequest, NextResponse } from "next/server";
import { query, execute, uuid } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  await requireAuth();
  const rows = await query(
    "SELECT * FROM client_invoices ORDER BY invoice_number DESC"
  );
  return NextResponse.json(
    rows.map(r => ({
      ...r,
      line_items: typeof r.line_items === "string" ? JSON.parse(r.line_items as string) : r.line_items,
    }))
  );
}

export async function POST(req: NextRequest) {
  const { owner } = await requireAuth();
  const body = await req.json();
  const id = uuid();
  await execute(
    `INSERT INTO client_invoices (id, invoice_number, bill_to, date, invoice_month, status, due_date, line_items, tax_percent, subtotal, total, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, body.invoice_number, body.bill_to, body.date,
      body.invoice_month ?? null, body.status ?? "draft",
      body.due_date ?? null, JSON.stringify(body.line_items),
      body.tax_percent ?? 0, body.subtotal, body.total,
      body.notes ?? null, owner.id,
    ]
  );
  return NextResponse.json({ id });
}
