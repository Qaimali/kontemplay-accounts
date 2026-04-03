import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  await requireAuth();
  const rows = await query("SELECT * FROM owners ORDER BY name");
  return NextResponse.json(rows);
}
