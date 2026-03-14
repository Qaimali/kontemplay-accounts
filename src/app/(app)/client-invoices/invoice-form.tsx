"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/client";
import {
  ClientInvoicePDF,
  type ClientInvoiceLineItem,
} from "@/lib/client-invoice-pdf";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Download, Save } from "lucide-react";

function monthToRange(ym: string): string {
  if (!ym) return "";
  const [year, m] = ym.split("-").map(Number);
  const month = new Date(year, m - 1).toLocaleDateString("en-US", { month: "long" });
  const lastDay = new Date(year, m, 0).getDate();
  return `${month} 1 - ${month} ${lastDay}, ${year}`;
}

function fmtUSD(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface InvoiceFormProps {
  /** null for new invoice, string for editing existing */
  editId: string | null;
  initialData: {
    invoiceNumber: string;
    billTo: string;
    date: string;
    invoiceMonth: string;
    status: string;
    dueDate: string;
    taxPercent: string;
    notes: string;
    lineItems: ClientInvoiceLineItem[];
  };
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "received", label: "Received" },
  { value: "overdue", label: "Overdue" },
];

export function InvoiceForm({ editId, initialData }: InvoiceFormProps) {
  const supabase = createClient();
  const router = useRouter();

  const [invoiceNumber, setInvoiceNumber] = useState(initialData.invoiceNumber);
  const [billTo, setBillTo] = useState(initialData.billTo);
  const [date, setDate] = useState(initialData.date);
  const [invoiceMonth, setInvoiceMonth] = useState(initialData.invoiceMonth);
  const [status, setStatus] = useState(initialData.status);
  const [dueDate, setDueDate] = useState(initialData.dueDate);
  const [taxPercent, setTaxPercent] = useState(initialData.taxPercent);
  const [notes, setNotes] = useState(initialData.notes);
  const [lineItems, setLineItems] = useState<ClientInvoiceLineItem[]>(initialData.lineItems);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const updateItem = useCallback(
    (index: number, field: keyof ClientInvoiceLineItem, value: string | number) => {
      setLineItems((prev) =>
        prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
      );
    },
    []
  );

  const removeItem = useCallback((index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addItem = useCallback(() => {
    setLineItems((prev) => [...prev, { description: "", quantity: 1, rate: 0 }]);
  }, []);

  const subtotal = lineItems.reduce((s, item) => s + item.quantity * item.rate, 0);
  const tax = (subtotal * (parseFloat(taxPercent) || 0)) / 100;
  const total = subtotal + tax;

  function handleMonthChange(ym: string) {
    setInvoiceMonth(ym);
    if (!ym) return;
    const range = monthToRange(ym);
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.description.includes("Development Work:")) {
          const prefix = item.description.split(":")[0];
          return { ...item, description: `${prefix}: ${range}` };
        }
        return item;
      })
    );
  }

  async function saveToDb() {
    const payload = {
      invoice_number: parseInt(invoiceNumber) || 1,
      bill_to: billTo,
      date,
      invoice_month: invoiceMonth || null,
      status,
      due_date: dueDate || null,
      line_items: lineItems,
      tax_percent: parseFloat(taxPercent) || 0,
      subtotal,
      total,
      notes: notes || null,
    };

    if (editId) {
      const { error } = await supabase
        .from("client_invoices")
        .update(payload)
        .eq("id", editId);
      return !error;
    } else {
      const { error } = await supabase.from("client_invoices").insert(payload);
      return !error;
    }
  }

  async function handleSave() {
    if (lineItems.length === 0) return;
    setSaving(true);
    const ok = await saveToDb();
    setSaving(false);
    if (ok) router.push("/client-invoices");
  }

  async function handleDownload() {
    if (lineItems.length === 0) return;
    setGenerating(true);
    try {
      await saveToDb();

      const blob = await pdf(
        <ClientInvoicePDF
          data={{
            invoiceNumber: parseInt(invoiceNumber) || 1,
            billTo,
            date,
            lineItems,
            taxPercent: parseFloat(taxPercent) || 0,
            notes,
          }}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kontemplay_invoice_${invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      router.push("/client-invoices");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex gap-6">
      {/* Form */}
      <div className="min-w-0 flex-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs">Invoice #</Label>
                <Input
                  type="number"
                  min={1}
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Invoice Month</Label>
                <Input
                  type="month"
                  value={invoiceMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Invoice Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bill To</Label>
                <Input
                  type="text"
                  value={billTo}
                  onChange={(e) => setBillTo(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={(v) => { if (v) setStatus(v); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={STATUS_OPTIONS.find((s) => s.value === status)?.label ?? "Draft"} />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tax %</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="mr-1 size-3" />
                  Add
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {lineItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-1.5 rounded-lg border p-2.5"
                  >
                    <Input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItem(i, "description", e.target.value)}
                      className="text-xs h-7"
                    />
                    <Input
                      type="text"
                      placeholder="Subtitle (optional)"
                      value={item.subtitle ?? ""}
                      onChange={(e) => updateItem(i, "subtitle", e.target.value)}
                      className="text-xs text-muted-foreground h-7"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Qty</Label>
                        <Input
                          type="number"
                          min={0}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(i, "quantity", parseFloat(e.target.value) || 0)
                          }
                          className="h-7 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Rate ($)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.rate}
                          onChange={(e) =>
                            updateItem(i, "rate", parseFloat(e.target.value) || 0)
                          }
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-red-400 h-6 w-6 p-0"
                        onClick={() => removeItem(i)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                      <span className="text-xs font-semibold tabular-nums">
                        {fmtUSD(item.quantity * item.rate)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notes (bank details)</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Mobile summary + actions */}
            <div className="border-t pt-4 space-y-3 md:hidden">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{fmtUSD(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tax ({taxPercent}%)</span>
                <span className="font-mono">{fmtUSD(tax)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="font-semibold">Total</span>
                <span className="font-mono font-bold text-emerald-400">
                  {fmtUSD(total)}
                </span>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || lineItems.length === 0}
                >
                  <Save className="mr-1.5 size-3.5" />
                  {saving ? "Saving..." : editId ? "Update" : "Save"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  size="sm"
                  onClick={handleDownload}
                  disabled={generating || lineItems.length === 0}
                >
                  <Download className="mr-1.5 size-3.5" />
                  {generating ? "..." : "PDF"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Sidebar Summary */}
      <div className="hidden w-[260px] shrink-0 md:block">
        <div className="sticky top-6 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice #</span>
                  <span className="font-medium">{invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bill To</span>
                  <span className="font-medium truncate ml-2">{billTo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items</span>
                  <span className="font-medium">{lineItems.length}</span>
                </div>
              </div>

              <div className="border-t pt-2 space-y-1.5 text-xs">
                {lineItems.map((item, i) => (
                  <div key={i} className="flex justify-between gap-1">
                    <span className="text-muted-foreground truncate">
                      {item.subtitle || item.description.slice(0, 20) || "Item"}
                    </span>
                    <span className="font-mono shrink-0">
                      {fmtUSD(item.quantity * item.rate)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-2 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono">{fmtUSD(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax ({taxPercent}%)</span>
                  <span className="font-mono">{fmtUSD(tax)}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5">
                  <span className="font-semibold text-sm">Total</span>
                  <span className="font-mono font-bold text-sm text-emerald-400">
                    {fmtUSD(total)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  className="w-full"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || lineItems.length === 0}
                >
                  <Save className="mr-1.5 size-3.5" />
                  {saving ? "Saving..." : editId ? "Update Invoice" : "Save Invoice"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  size="sm"
                  onClick={handleDownload}
                  disabled={generating || lineItems.length === 0}
                >
                  <Download className="mr-1.5 size-3.5" />
                  {generating ? "Generating..." : "Download PDF"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
