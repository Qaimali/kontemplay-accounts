import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await requireAuth();
  const { ids, distribution_id, invoice_id } = await req.json();

  if (ids && Array.isArray(ids)) {
    for (const id of ids) {
      await execute("DELETE FROM transactions WHERE id = ?", [id]);
    }
  }
  if (distribution_id) {
    await execute("DELETE FROM transactions WHERE distribution_id = ?", [distribution_id]);
  }
  if (invoice_id) {
    await execute("DELETE FROM transactions WHERE invoice_id = ?", [invoice_id]);
  }

  return NextResponse.json({ ok: true });
}
