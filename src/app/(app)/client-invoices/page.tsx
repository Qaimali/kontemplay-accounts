"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { pdf } from "@react-pdf/renderer";
import { ClientInvoicePDF } from "@/lib/client-invoice-pdf";
import { formatMonth } from "@/lib/format";
import type { ClientInvoice, ClientInvoiceStatus } from "@/lib/types";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Download, Trash2, Pencil, CheckCircle, FileText } from "lucide-react";

function fmtUSD(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const statusBadge: Record<ClientInvoiceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "outline" },
  sent: { label: "Sent", variant: "secondary" },
  received: { label: "Received", variant: "default" },
  overdue: { label: "Overdue", variant: "destructive" },
};

export default function ClientInvoicesPage() {
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Receive dialog
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [receivingInvoice, setReceivingInvoice] = useState<ClientInvoice | null>(null);
  const [receiveAmountPkr, setReceiveAmountPkr] = useState("");
  const [receiveProcessing, setReceiveProcessing] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/client-invoices");
    const data = await res.json();
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
    await fetch(`/api/client-invoices/${id}`, { method: "DELETE" });
    fetchInvoices();
  }

  async function cycleStatus(inv: ClientInvoice) {
    // draft -> sent -> received (opens dialog)
    if (inv.status === "draft" || inv.status === "overdue") {
      await fetch(`/api/client-invoices/${inv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sent" }),
      });
      fetchInvoices();
    } else if (inv.status === "sent") {
      openReceiveDialog(inv);
    }
    // received: no cycle, already final
  }

  function openReceiveDialog(inv: ClientInvoice) {
    setReceivingInvoice(inv);
    setReceiveAmountPkr("");
    setReceiveDialogOpen(true);
  }

  async function handleMarkReceived() {
    if (!receivingInvoice) return;
    const amount = parseFloat(receiveAmountPkr);
    if (!amount || amount <= 0) return;

    setReceiveProcessing(true);

    const month = receivingInvoice.invoice_month ?? undefined;

    // Create client_payment credit transaction
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "client_payment",
        amount_pkr: amount,
        is_credit: true,
        description: `Invoice #${receivingInvoice.invoice_number} - ${receivingInvoice.bill_to}${month ? ` (${month})` : ""}`,
        reference_month: month,
      }),
    });

    // Update invoice status to received
    await fetch(`/api/client-invoices/${receivingInvoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "received" }),
    });

    setReceiveProcessing(false);
    setReceiveDialogOpen(false);
    setReceivingInvoice(null);
    fetchInvoices();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Client Invoices</h1>

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
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/40">
                <FileText className="size-7 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No invoices yet</p>
              <p className="mt-1 text-[13px] text-muted-foreground/60">
                Create your first invoice to start tracking payments
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 transition-all duration-200"
                render={<Link href="/client-invoices/new" />}
              >
                <Plus className="mr-1.5 size-3.5" />
                Create your first invoice
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="hidden sm:table-cell">Bill To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Due</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-32"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => {
                    const st = statusBadge[inv.status] ?? statusBadge.draft;
                    const isOverdue =
                      inv.status !== "received" &&
                      inv.due_date &&
                      new Date(inv.due_date + "T00:00:00") < new Date();

                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium font-mono tabular-nums">{inv.invoice_number}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {inv.invoice_month ? formatMonth(inv.invoice_month) : "-"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{inv.bill_to}</TableCell>
                        <TableCell>
                          <Badge
                            variant={isOverdue ? "destructive" : st.variant}
                            className={inv.status !== "received" ? "cursor-pointer transition-all duration-200 hover:opacity-80" : ""}
                            onClick={() => inv.status !== "received" && cycleStatus(inv)}
                            title={inv.status === "draft" || inv.status === "overdue" ? "Click to mark as Sent" : inv.status === "sent" ? "Click to mark as Received" : ""}
                          >
                            {isOverdue ? "Overdue" : st.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell whitespace-nowrap">
                          {inv.due_date
                            ? new Date(inv.due_date + "T00:00:00").toLocaleDateString("en-US", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <span className="font-mono tabular-nums font-semibold text-emerald-400">
                            {fmtUSD(inv.total)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {inv.status !== "received" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-400 transition-all duration-200"
                                onClick={() => openReceiveDialog(inv)}
                                title="Mark as Received"
                              >
                                <CheckCircle className="size-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground transition-all duration-200"
                              render={<Link href={`/client-invoices/${inv.id}`} />}
                              title="Edit"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground transition-all duration-200"
                              onClick={() => handleDownload(inv)}
                              title="Download PDF"
                            >
                              <Download className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400 transition-all duration-200"
                              onClick={() => handleDelete(inv.id)}
                              title="Delete"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mark as Received Dialog */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Received</DialogTitle>
            <DialogDescription>
              Invoice #{receivingInvoice?.invoice_number} — {fmtUSD(receivingInvoice?.total ?? 0)}
              {receivingInvoice?.invoice_month && (
                <> for {formatMonth(receivingInvoice.invoice_month)}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Amount Received (PKR)</Label>
              <Input
                type="number"
                min={0}
                placeholder="Enter PKR amount received"
                value={receiveAmountPkr}
                onChange={(e) => setReceiveAmountPkr(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground/60">
                This will create a Client Payment credit transaction in the ledger.
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              onClick={handleMarkReceived}
              disabled={receiveProcessing || !receiveAmountPkr || parseFloat(receiveAmountPkr) <= 0}
            >
              {receiveProcessing ? "Processing..." : "Confirm Received"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
