import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const rows = await query(
    `SELECT i.*, COALESCE(d.reference_month, (
       SELECT t.reference_month FROM transactions t
       WHERE t.invoice_id = i.id AND t.reference_month IS NOT NULL
       LIMIT 1
     )) as reference_month
     FROM invoices i
     LEFT JOIN distributions d ON d.id = i.distribution_id
     WHERE i.employee_id = ?
     ORDER BY i.created_at DESC`,
    [id]
  );
  return NextResponse.json(rows);
}
