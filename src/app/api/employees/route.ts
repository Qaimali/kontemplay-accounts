import { NextRequest, NextResponse } from "next/server";
import { query, execute, uuid } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await requireAuth();
  const isActive = req.nextUrl.searchParams.get("is_active");
  let sql = "SELECT * FROM employees";
  const params: unknown[] = [];
  if (isActive !== null) {
    sql += " WHERE is_active = ?";
    params.push(isActive === "true" ? 1 : 0);
  }
  sql += " ORDER BY name";
  const rows = await query(sql, params);
  return NextResponse.json(rows.map(r => ({ ...r, is_active: !!r.is_active })));
}

export async function POST(req: NextRequest) {
  await requireAuth();
  const body = await req.json();
  const id = uuid();
  await execute(
    `INSERT INTO employees (id, name, cnic, bank_account, default_salary_usd, default_threshold, default_contractor_tax, default_remittance_tax, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, body.name, body.cnic || null, body.bank_account || null, body.default_salary_usd ?? 0, body.default_threshold ?? 0, body.default_contractor_tax ?? 0, body.default_remittance_tax ?? 0, body.is_active !== false ? 1 : 0]
  );
  return NextResponse.json({ id });
}
