import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const rows = await query(
    `SELECT * FROM transactions
     WHERE employee_id = ? AND invoice_id IS NULL AND distribution_id IS NULL
     ORDER BY created_at DESC`,
    [id]
  );
  return NextResponse.json(rows.map(r => ({ ...r, is_credit: !!r.is_credit })));
}
