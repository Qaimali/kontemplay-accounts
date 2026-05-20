import { NextRequest, NextResponse } from "next/server";
import { query, execute, uuid } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await requireAuth();
  const type = req.nextUrl.searchParams.get("type");
  const types = req.nextUrl.searchParams.get("types"); // comma-separated
  const distId = req.nextUrl.searchParams.get("distribution_id");
  const orderBy = req.nextUrl.searchParams.get("order_by") ?? "created_at";
  const order = req.nextUrl.searchParams.get("order") ?? "desc";

  let sql = "SELECT * FROM transactions";
  const where: string[] = [];
  const params: unknown[] = [];

  if (type) { where.push("type = ?"); params.push(type); }
  if (types) {
    const list = types.split(",");
    where.push(`type IN (${list.map(() => "?").join(",")})`);
    params.push(...list);
  }
  if (distId) { where.push("distribution_id = ?"); params.push(distId); }

  if (where.length) sql += " WHERE " + where.join(" AND ");
  sql += ` ORDER BY ${orderBy === "reference_month" ? "reference_month" : "created_at"} ${order === "asc" ? "ASC" : "DESC"}`;

  const rows = await query(sql, params);
  return NextResponse.json(rows.map(r => ({ ...r, is_credit: !!r.is_credit, is_transfer: !!r.is_transfer })));
}

export async function POST(req: NextRequest) {
  const { owner } = await requireAuth();
  const body = await req.json();

  // Support bulk insert (array) or single insert
  const items = Array.isArray(body) ? body : [body];
  const ids: string[] = [];

  for (const item of items) {
    const id = uuid();
    ids.push(id);
    // Determine defaults for source and is_transfer based on type
    const transferTypes = ["owner_withdrawal", "owner_return", "owner_investment"];
    const isTransfer = item.is_transfer ?? (transferTypes.includes(item.type) ? 1 : 0);
    const defaultSource = item.type === "expense" || item.type === "owner_investment"
      ? "owner_pocket"
      : "bank";

    await execute(
      `INSERT INTO transactions (id, type, amount_pkr, is_credit, description, reference_month, distribution_id, invoice_id, employee_id, owner_id, created_by, created_at, source, is_transfer)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, item.type, item.amount_pkr, item.is_credit ? 1 : 0,
        item.description ?? null, item.reference_month ?? null,
        item.distribution_id ?? null, item.invoice_id ?? null,
        item.employee_id ?? null, item.owner_id ?? null,
        item.created_by ?? owner.id,
        item.created_at ?? new Date().toISOString(),
        item.source ?? defaultSource,
        isTransfer ? 1 : 0,
      ]
    );
  }

  return NextResponse.json({ ids });
}
