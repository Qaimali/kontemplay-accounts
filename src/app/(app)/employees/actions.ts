"use server";

import { requireAuth } from "@/lib/auth";
import { execute, queryOne } from "@/lib/db";

export async function deleteInvoiceAction(invoiceId: string, distributionId: string) {
  try {
    await requireAuth();
  } catch {
    return { error: "Not authenticated" };
  }

  // 1. Delete linked transactions
  await execute("DELETE FROM transactions WHERE invoice_id = ?", [invoiceId]);

  // 2. Delete the invoice
  await execute("DELETE FROM invoices WHERE id = ?", [invoiceId]);

  // 3. Check if distribution has remaining invoices
  const remaining = await queryOne<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM invoices WHERE distribution_id = ?",
    [distributionId]
  );

  // 4. Clean up empty distribution
  if (remaining && remaining.cnt === 0) {
    await execute("DELETE FROM transactions WHERE distribution_id = ?", [distributionId]);
    await execute("DELETE FROM distributions WHERE id = ?", [distributionId]);
  }

  return { error: null };
}
