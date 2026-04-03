import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const rows = await query(
    `SELECT i.*, d.reference_month
     FROM invoices i
     JOIN distributions d ON d.id = i.distribution_id
     WHERE i.employee_id = ?
     ORDER BY i.created_at DESC`,
    [id]
  );
  return NextResponse.json(rows);
}
