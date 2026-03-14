"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { InvoiceForm } from "../invoice-form";
import type { ClientInvoice } from "@/lib/types";

const BANK_NOTES = `Bank Name: UNITED BANK LIMITED
Swift Code: UNILPKKA028
IBAN Number: PK44UNIL0109000346001228
Account Holder Name: Kontemplay (Private) Limited`;

export default function EditClientInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [invoice, setInvoice] = useState<ClientInvoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("client_invoices")
      .select("*")
      .eq("id", id)
      .single<ClientInvoice>()
      .then(({ data }) => {
        setInvoice(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Edit Invoice</h1>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Edit Invoice</h1>
        <p className="text-sm text-muted-foreground">Invoice not found.</p>
      </div>
    );
  }

  // Try to derive invoice month from the first development work line item date range
  let invoiceMonth = "";
  for (const item of invoice.line_items) {
    if (item.description.includes("Development Work:")) {
      const match = item.description.match(/(\w+) 1 - \w+ \d+, (\d{4})/);
      if (match) {
        const monthIndex = new Date(`${match[1]} 1, ${match[2]}`).getMonth() + 1;
        invoiceMonth = `${match[2]}-${String(monthIndex).padStart(2, "0")}`;
      }
      break;
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Edit Invoice #{invoice.invoice_number}
      </h1>
      <InvoiceForm
        editId={invoice.id}
        initialData={{
          invoiceNumber: String(invoice.invoice_number),
          billTo: invoice.bill_to,
          date: invoice.date,
          invoiceMonth: invoice.invoice_month ?? invoiceMonth,
          status: invoice.status ?? "draft",
          dueDate: invoice.due_date ?? "",
          taxPercent: String(invoice.tax_percent),
          notes: invoice.notes ?? BANK_NOTES,
          lineItems: invoice.line_items,
        }}
      />
    </div>
  );
}
