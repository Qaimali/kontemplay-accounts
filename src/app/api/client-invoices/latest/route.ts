import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  await requireAuth();
  const row = await queryOne(
    "SELECT invoice_number, line_items FROM client_invoices ORDER BY invoice_number DESC LIMIT 1"
  );
  if (!row) return NextResponse.json(null);
  return NextResponse.json({
    ...row,
    line_items: typeof row.line_items === "string" ? JSON.parse(row.line_items as string) : row.line_items,
  });
}
