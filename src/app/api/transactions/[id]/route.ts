import { NextRequest, NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const body = await req.json();
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(body)) {
    if (key === "is_credit") {
      sets.push(`${key} = ?`);
      values.push(val ? 1 : 0);
    } else {
      sets.push(`${key} = ?`);
      values.push(val);
    }
  }
  values.push(id);
  await execute(`UPDATE transactions SET ${sets.join(", ")} WHERE id = ?`, values);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  await execute("DELETE FROM transactions WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
