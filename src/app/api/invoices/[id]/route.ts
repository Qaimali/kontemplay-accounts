import { NextRequest, NextResponse } from "next/server";
import { execute, queryOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  // Get invoice to find distribution_id
  const inv = await queryOne<{ distribution_id: string }>(
    "SELECT distribution_id FROM invoices WHERE id = ?",
    [id]
  );
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete linked transactions
  await execute("DELETE FROM transactions WHERE invoice_id = ?", [id]);

  // Delete the invoice
  await execute("DELETE FROM invoices WHERE id = ?", [id]);

  // Check if distribution has remaining invoices
  const remaining = await queryOne<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM invoices WHERE distribution_id = ?",
    [inv.distribution_id]
  );

  // Clean up empty distribution
  if (remaining && remaining.cnt === 0) {
    await execute("DELETE FROM transactions WHERE distribution_id = ?", [inv.distribution_id]);
    await execute("DELETE FROM distributions WHERE id = ?", [inv.distribution_id]);
  }

  return NextResponse.json({ ok: true });
}
