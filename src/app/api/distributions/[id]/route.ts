import { NextRequest, NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const body = await req.json();

  if (body.reference_month) {
    const oldMonth = body.old_reference_month;
    await execute(
      "UPDATE distributions SET reference_month = ? WHERE id = ?",
      [body.reference_month, id]
    );

    // Update linked transactions
    const txns = await query<{ id: string; description: string | null }>(
      "SELECT id, description FROM transactions WHERE distribution_id = ?",
      [id]
    );
    for (const txn of txns) {
      let desc = txn.description;
      if (desc && oldMonth && desc.includes(oldMonth)) {
        desc = desc.replace(oldMonth, body.reference_month);
      }
      await execute(
        "UPDATE transactions SET reference_month = ?, description = ? WHERE id = ?",
        [body.reference_month, desc, txn.id]
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;

  // Delete linked transactions first
  await execute("DELETE FROM transactions WHERE distribution_id = ?", [id]);
  // Delete invoices (cascade should handle, but be explicit)
  await execute("DELETE FROM invoices WHERE distribution_id = ?", [id]);
  // Delete distribution
  await execute("DELETE FROM distributions WHERE id = ?", [id]);

  return NextResponse.json({ ok: true });
}
