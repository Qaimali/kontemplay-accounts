"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { pdf } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/client";
import { ClientInvoicePDF } from "@/lib/client-invoice-pdf";
import type { ClientInvoice } from "@/lib/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Download, Trash2, Pencil } from "lucide-react";

function fmtUSD(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ClientInvoicesPage() {
  const supabase = createClient();
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("client_invoices")
      .select("*")
      .order("invoice_number", { ascending: false })
      .returns<ClientInvoice[]>();
    setInvoices(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  async function handleDownload(inv: ClientInvoice) {
    const blob = await pdf(
      <ClientInvoicePDF
        data={{
          invoiceNumber: inv.invoice_number,
          billTo: inv.bill_to,
          date: inv.date,
          lineItems: inv.line_items,
          taxPercent: inv.tax_percent,
          notes: inv.notes ?? "",
        }}
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kontemplay_invoice_${inv.invoice_number}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Delete this invoice? This cannot be undone.");
    if (!confirmed) return;
    await supabase.from("client_invoices").delete().eq("id", id);
    fetchInvoices();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Client Invoices</h1>

      <Card>
        <CardHeader>
          <CardTitle>
            Invoices
            {!loading && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({invoices.length})
              </span>
            )}
          </CardTitle>
          <CardAction>
            <Button render={<Link href="/client-invoices/new" />}>
              <Plus className="mr-1.5 size-4" />
              New Invoice
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">No invoices yet.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                render={<Link href="/client-invoices/new" />}
              >
                Create your first invoice
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">#</TableHead>
                  <TableHead>Bill To</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                    <TableCell>{inv.bill_to}</TableCell>
                    <TableCell className="hidden sm:table-cell whitespace-nowrap">
                      {new Date(inv.date + "T00:00:00").toLocaleDateString("en-US", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      {inv.line_items.length}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <span className="font-mono font-semibold text-emerald-400">
                        {fmtUSD(inv.total)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          render={<Link href={`/client-invoices/${inv.id}`} />}
                          title="Edit"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => handleDownload(inv)}
                          title="Download PDF"
                        >
                          <Download className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                          onClick={() => handleDelete(inv.id)}
                          title="Delete"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
