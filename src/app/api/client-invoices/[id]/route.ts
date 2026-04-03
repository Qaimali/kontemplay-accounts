import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const row = await queryOne("SELECT * FROM client_invoices WHERE id = ?", [id]);
  if (!row) return NextResponse.json(null, { status: 404 });
  return NextResponse.json({
    ...row,
    line_items: typeof row.line_items === "string" ? JSON.parse(row.line_items as string) : row.line_items,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const body = await req.json();

  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(body)) {
    if (key === "line_items") {
      sets.push(`${key} = ?`);
      values.push(JSON.stringify(val));
    } else {
      sets.push(`${key} = ?`);
      values.push(val);
    }
  }
  values.push(id);
  await execute(`UPDATE client_invoices SET ${sets.join(", ")} WHERE id = ?`, values);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  await execute("DELETE FROM client_invoices WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
