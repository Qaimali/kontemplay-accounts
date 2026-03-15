"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { InvoiceForm } from "../invoice-form";
import type { ClientInvoiceLineItem } from "@/lib/client-invoice-pdf";

const BANK_NOTES = `Bank Name: UNITED BANK LIMITED
Swift Code: UNILPKKA028
IBAN Number: PK44UNIL0109000346001228
Account Holder Name: Kontemplay (Private) Limited`;

const DEFAULT_ITEMS: ClientInvoiceLineItem[] = [
  {
    description: "YAU Platform Development Work: January 1 - January 31, 2025",
    subtitle: "(Resource 1)",
    quantity: 1,
    rate: 4000,
  },
  {
    description: "YAU Platform Development Work: January 1 - January 31, 2025",
    subtitle: "(Resource 2)",
    quantity: 1,
    rate: 3000,
  },
  {
    description: "YAU Website Development Work: January 1 - January 31, 2025",
    subtitle: "(Resource 3)",
    quantity: 1,
    rate: 3000,
  },
  {
    description: "YAU Email Templates ( 150 onwards )",
    quantity: 100,
    rate: 25,
  },
  {
    description: "Swift payment fee",
    quantity: 1,
    rate: 20,
  },
];

function monthToRange(ym: string): string {
  if (!ym) return "";
  const [year, m] = ym.split("-").map(Number);
  const month = new Date(year, m - 1).toLocaleDateString("en-US", { month: "long" });
  const lastDay = new Date(year, m, 0).getDate();
  return `${month} 1 - ${month} ${lastDay}, ${year}`;
}

function getDefaultMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function NewClientInvoicePage() {
  const supabase = createClient();
  const [nextNumber, setNextNumber] = useState<string | null>(null);
  const [nextMonth, setNextMonth] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("client_invoices")
      .select("invoice_number, line_items")
      .order("invoice_number", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const last = data?.[0];
        setNextNumber(String((last?.invoice_number ?? 0) + 1));

        // Derive next month from last invoice's line items
        let derivedMonth = "";
        if (last?.line_items) {
          for (const item of last.line_items as { description: string }[]) {
            if (item.description.includes("Development Work:")) {
              const match = item.description.match(/(\w+) 1 - \w+ \d+, (\d{4})/);
              if (match) {
                const d = new Date(`${match[1]} 1, ${match[2]}`);
                d.setMonth(d.getMonth() + 1);
                derivedMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
              }
              break;
            }
          }
        }
        setNextMonth(derivedMonth || getDefaultMonth());
      });
  }, []);

  if (nextNumber === null || nextMonth === null) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">New Client Invoice</h1>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const range = monthToRange(nextMonth);
  const lineItems = DEFAULT_ITEMS.map((item) => {
    if (item.description.includes("Development Work:")) {
      const prefix = item.description.split(":")[0];
      return { ...item, description: `${prefix}: ${range}` };
    }
    return { ...item };
  });

  // Default due date: 10th of the month after invoiceMonth
  const [ym, mm] = nextMonth.split("-").map(Number);
  const dueDateObj = new Date(ym, mm, 10); // mm is already 1-indexed, so this is next month
  const defaultDueDate = dueDateObj.toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">New Client Invoice</h1>
      <InvoiceForm
        editId={null}
        initialData={{
          invoiceNumber: nextNumber,
          billTo: "Youth Athletes United",
          date: new Date().toISOString().slice(0, 10),
          invoiceMonth: nextMonth,
          status: "draft",
          dueDate: defaultDueDate,
          taxPercent: "0",
          notes: BANK_NOTES,
          lineItems,
        }}
      />
    </div>
  );
}
