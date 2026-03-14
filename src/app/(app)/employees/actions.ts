"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function deleteInvoiceAction(invoiceId: string, distributionId: string) {
  const supabase = await createServerSupabaseClient();

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // 1. Delete linked transactions
  await supabase.from("transactions").delete().eq("invoice_id", invoiceId);

  // 2. Delete the invoice
  const { error: invErr } = await supabase.from("invoices").delete().eq("id", invoiceId);
  if (invErr) return { error: invErr.message };

  // 3. Check if distribution has remaining invoices
  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("distribution_id", distributionId);

  // 4. Clean up empty distribution
  if (count === 0) {
    await supabase.from("transactions").delete().eq("distribution_id", distributionId);
    await supabase.from("distributions").delete().eq("id", distributionId);
  }

  return { error: null };
}
