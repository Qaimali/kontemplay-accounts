"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPKR, formatUSD, formatMonth, formatNumber } from "@/lib/format";
import { exportToCSV } from "@/lib/export";
import type { Distribution, Invoice, Transaction } from "@/lib/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, Download, FileDown, Merge, Building2, History, Inbox, Pencil, Trash2 } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { InvoicePDF, type InvoicePDFData } from "@/lib/invoice-pdf";

interface DistributionWithInvoices extends Distribution {
  invoices: (Invoice & { employee: { name: string } })[];
}

export default function DistributionsPage() {
  const supabase = createClient();
  const [distributions, setDistributions] = useState<DistributionWithInvoices[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editDist, setEditDist] = useState<DistributionWithInvoices | null>(null);
  const [editMonth, setEditMonth] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteDist, setDeleteDist] = useState<DistributionWithInvoices | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteDist) return;
    setDeleting(true);

    // Delete linked transactions first
    await supabase
      .from("transactions")
      .delete()
      .eq("distribution_id", deleteDist.id);

    // Delete invoices
    await supabase
      .from("invoices")
      .delete()
      .eq("distribution_id", deleteDist.id);

    // Delete the distribution
    await supabase
      .from("distributions")
      .delete()
      .eq("id", deleteDist.id);

    setDeleting(false);
    setDeleteDist(null);
    setExpandedId(null);
    fetchDistributions();
  }

  async function handleUpdateMonth() {
    if (!editDist || !editMonth) return;
    setSaving(true);
    const oldMonth = editDist.reference_month;

    // Update the distribution's reference_month
    await supabase
      .from("distributions")
      .update({ reference_month: editMonth })
      .eq("id", editDist.id);

    // Update linked transactions reference_month and descriptions
    const { data: txns } = await supabase
      .from("transactions")
      .select("id, description")
      .eq("distribution_id", editDist.id);

    if (txns) {
      for (const txn of txns) {
        const updates: { reference_month: string; description?: string } = {
          reference_month: editMonth,
        };
        if (txn.description && txn.description.includes(oldMonth)) {
          updates.description = txn.description.replace(oldMonth, editMonth);
        }
        await supabase.from("transactions").update(updates).eq("id", txn.id);
      }
    }

    setSaving(false);
    setEditDist(null);
    fetchDistributions();
  }

  const fetchDistributions = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("distributions")
      .select("*, invoices(*, employee:employees(name))")
      .order("created_at", { ascending: false });
    setDistributions((data as DistributionWithInvoices[] | null) ?? []);
    setLoading(false);
  }, []);

  const fetchTransactions = useCallback(async (distributionId: string) => {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("distribution_id", distributionId)
      .order("created_at");
    setTransactions((data as Transaction[] | null) ?? []);
  }, []);

  useEffect(() => {
    fetchDistributions();
  }, [fetchDistributions]);

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      fetchTransactions(id);
    }
  }

  function buildInvoiceData(
    dist: DistributionWithInvoices,
    inv: Invoice & { employee: { name: string } }
  ): InvoicePDFData {
    const operationalCostPkr = inv.total_tax_pkr - inv.contractor_tax_pkr - inv.remittance_tax_pkr;
    const operationalCostPercent = inv.gross_pkr > 0 ? (operationalCostPkr / inv.gross_pkr) * 100 : 0;
    const totalTaxPercent = inv.gross_pkr > 0 ? (inv.total_tax_pkr / inv.gross_pkr) * 100 : 0;

    return {
      employeeName: inv.employee?.name ?? "Unknown",
      month: formatMonth(dist.reference_month),
      date: new Date(dist.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "2-digit",
        year: "numeric",
      }),
      salaryUsd: inv.salary_usd,
      exchangeRate: inv.rate_applied,
      grossPkr: inv.gross_pkr,
      remittanceTaxPercent: inv.remittance_tax_percent,
      remittanceTaxPkr: inv.remittance_tax_pkr,
      contractorTaxPercent: inv.contractor_tax_percent,
      contractorTaxPkr: inv.contractor_tax_pkr,
      operationalCostPercent: Math.round(operationalCostPercent * 100) / 100,
      operationalCostPkr: Math.max(0, operationalCostPkr),
      totalTaxPercent: Math.round(totalTaxPercent * 100) / 100,
      totalTaxPkr: inv.total_tax_pkr,
      netPkr: inv.net_pkr,
    };
  }

  async function handleDownloadPDF(
    dist: DistributionWithInvoices,
    inv: Invoice & { employee: { name: string } }
  ) {
    const data = buildInvoiceData(dist, inv);
    const blob = await pdf(<InvoicePDF data={data} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeName = (inv.employee?.name ?? "invoice").toLowerCase().replace(/\s+/g, "_");
    link.download = `invoice_${safeName}_${dist.reference_month}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadAllPDFs(dist: DistributionWithInvoices) {
    for (const inv of dist.invoices) {
      await handleDownloadPDF(dist, inv);
    }
  }

  function handleExportInvoices(dist: DistributionWithInvoices) {
    const rows = dist.invoices.map((inv) => ({
      Month: formatMonth(dist.reference_month),
      Employee: inv.employee?.name ?? "",
      "Salary USD": inv.salary_usd,
      "Rate Applied": inv.rate_applied,
      Threshold: inv.threshold_applied,
      "Gross PKR": inv.gross_pkr,
      "Contractor Tax PKR": inv.contractor_tax_pkr,
      "Remittance Tax PKR": inv.remittance_tax_pkr,
      "Total Tax PKR": inv.total_tax_pkr,
      "Net PKR": inv.net_pkr,
    }));
    exportToCSV(rows, `distribution_${dist.reference_month}`);
  }

  async function handleDownloadCombinedPDF(dist: DistributionWithInvoices) {
    // Find Qaim Ali and Fitrus invoices
    const qaimInv = dist.invoices.find((inv) =>
      inv.employee?.name?.toLowerCase().includes("qaim")
    );
    const fitrusInv = dist.invoices.find((inv) =>
      inv.employee?.name?.toLowerCase().includes("fitrus")
    );

    if (!qaimInv && !fitrusInv) return;

    const invoicesToCombine = [qaimInv, fitrusInv].filter(Boolean) as (Invoice & { employee: { name: string } })[];

    const totalSalaryUsd = invoicesToCombine.reduce((s, inv) => s + inv.salary_usd, 0);
    const totalGrossPkr = invoicesToCombine.reduce((s, inv) => s + inv.gross_pkr, 0);
    const totalRemittanceTaxPkr = invoicesToCombine.reduce((s, inv) => s + inv.remittance_tax_pkr, 0);
    const totalContractorTaxPkr = invoicesToCombine.reduce((s, inv) => s + inv.contractor_tax_pkr, 0);
    const totalTaxPkr = invoicesToCombine.reduce((s, inv) => s + inv.total_tax_pkr, 0);
    const totalNetPkr = invoicesToCombine.reduce((s, inv) => s + inv.net_pkr, 0);
    const totalOpCostPkr = Math.max(0, totalTaxPkr - totalContractorTaxPkr - totalRemittanceTaxPkr);

    // Blended exchange rate
    const blendedRate = totalSalaryUsd > 0 ? totalGrossPkr / totalSalaryUsd : 0;

    // Blended tax percentages
    const remittancePct = totalGrossPkr > 0 ? (totalRemittanceTaxPkr / totalGrossPkr) * 100 : 0;
    const contractorPct = totalGrossPkr > 0 ? (totalContractorTaxPkr / totalGrossPkr) * 100 : 0;
    const opCostPct = totalGrossPkr > 0 ? (totalOpCostPkr / totalGrossPkr) * 100 : 0;
    const totalTaxPct = totalGrossPkr > 0 ? (totalTaxPkr / totalGrossPkr) * 100 : 0;

    const data: InvoicePDFData = {
      employeeName: "Qaim Ali",
      month: formatMonth(dist.reference_month),
      date: new Date(dist.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "2-digit",
        year: "numeric",
      }),
      salaryUsd: totalSalaryUsd,
      exchangeRate: blendedRate,
      grossPkr: totalGrossPkr,
      remittanceTaxPercent: Math.round(remittancePct * 100) / 100,
      remittanceTaxPkr: totalRemittanceTaxPkr,
      contractorTaxPercent: Math.round(contractorPct * 100) / 100,
      contractorTaxPkr: totalContractorTaxPkr,
      operationalCostPercent: Math.round(opCostPct * 100) / 100,
      operationalCostPkr: totalOpCostPkr,
      totalTaxPercent: Math.round(totalTaxPct * 100) / 100,
      totalTaxPkr: totalTaxPkr,
      netPkr: totalNetPkr,
    };

    const blob = await pdf(<InvoicePDF data={data} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice_qaim_ali_combined_${dist.reference_month}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Distribution History</h1>

      {loading ? (
        <div className="flex items-center gap-3 py-12 justify-center">
          <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-[13px] text-muted-foreground">Loading distributions...</p>
        </div>
      ) : distributions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/50 mb-4">
            <Inbox className="size-7 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No distributions yet</p>
          <p className="text-[13px] text-muted-foreground/60 mt-1">
            Create one from the Distribute page to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {distributions.map((dist) => {
            const isExpanded = expandedId === dist.id;
            const employeeCount = dist.invoices.length;
            const totalNet = dist.invoices.reduce((sum, inv) => sum + inv.net_pkr, 0);

            return (
              <Card key={dist.id}>
                {/* Summary row */}
                <button
                  onClick={() => toggleExpand(dist.id)}
                  className="flex w-full flex-col gap-2 rounded-xl bg-muted/20 px-4 py-3 text-left transition-all duration-200 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <ChevronDown
                      className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                    <div>
                      <p className="font-medium">
                        {formatMonth(dist.reference_month)}
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                        {new Date(dist.created_at).toLocaleDateString("en-PK", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-1">
                      {employeeCount} employee{employeeCount !== 1 ? "s" : ""}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="ml-1"
                      title="Edit period"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditDist(dist);
                        setEditMonth(dist.reference_month);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="ml-0.5 text-red-400 hover:text-red-500"
                      title="Delete distribution"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteDist(dist);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-4 pl-7 text-right text-sm sm:gap-6 sm:pl-0">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Total USD</p>
                      <p className="font-mono tabular-nums font-medium">{formatUSD(dist.total_usd)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Employee Net</p>
                      <p className="font-mono tabular-nums font-medium">{formatPKR(totalNet)}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Company Share</p>
                      <p className="font-mono tabular-nums font-medium text-emerald-400">
                        {formatPKR(dist.company_net_pkr ?? 0)}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Detail view */}
                {isExpanded && (
                  <CardContent className="pt-0 border-t border-border/30">
                    {/* Distribution info */}
                    <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 mt-5 mb-6">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">Received PKR</p>
                        <p className="font-mono tabular-nums font-medium text-sm">{formatPKR(dist.amount_received_pkr)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">Base Rate</p>
                        <p className="font-mono tabular-nums font-medium text-sm">{formatNumber(dist.base_rate)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">Effective Rate</p>
                        <p className="font-mono tabular-nums font-medium text-sm">{formatNumber(dist.effective_rate)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">Threshold</p>
                        <p className="font-mono tabular-nums font-medium text-sm">{formatNumber(dist.threshold)} PKR</p>
                      </div>
                    </div>

                    {/* Invoices */}
                    <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Invoices</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadCombinedPDF(dist)}
                        >
                          <Merge className="size-3.5 mr-1.5" />
                          Combined PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadAllPDFs(dist)}
                        >
                          <Download className="size-3.5 mr-1.5" />
                          All PDFs
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportInvoices(dist)}
                        >
                          <FileDown className="size-3.5 mr-1.5" />
                          CSV
                        </Button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">USD</TableHead>
                          <TableHead className="text-right hidden md:table-cell">Rate</TableHead>
                          <TableHead className="text-right hidden md:table-cell">Gross PKR</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">Tax PKR</TableHead>
                          <TableHead className="text-right">Net PKR</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dist.invoices.map((inv) => (
                          <TableRow key={inv.id} className="transition-all duration-200">
                            <TableCell className="font-medium">
                              {inv.employee?.name ?? "Unknown"}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums hidden sm:table-cell">
                              {formatUSD(inv.salary_usd)}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums hidden md:table-cell">
                              {formatNumber(inv.rate_applied)}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums hidden md:table-cell">
                              {formatPKR(inv.gross_pkr)}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-red-400 hidden sm:table-cell">
                              {formatPKR(inv.total_tax_pkr)}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums font-semibold text-emerald-400 whitespace-nowrap">
                              {formatPKR(inv.net_pkr)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleDownloadPDF(dist, inv)}
                                title="Download PDF"
                              >
                                <Download className="size-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>

                    {/* Company share */}
                    <div className="rounded-xl bg-muted/20 px-4 py-3 mt-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 className="size-3.5 text-muted-foreground/50" />
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Company Share</p>
                      </div>
                      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
                        <div>
                          <p className="text-[13px] text-muted-foreground mb-0.5">Gross</p>
                          <p className="font-mono tabular-nums font-medium text-sm">{formatPKR(dist.company_gross_pkr ?? 0)}</p>
                        </div>
                        <div>
                          <p className="text-[13px] text-muted-foreground mb-0.5">Net</p>
                          <p className="font-mono tabular-nums font-medium text-sm text-emerald-400">
                            {formatPKR(dist.company_net_pkr ?? 0)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Linked transactions */}
                    {transactions.length > 0 && (
                      <div className="mt-5">
                        <div className="flex items-center gap-2 mb-3">
                          <History className="size-3.5 text-muted-foreground/50" />
                          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Linked Transactions</p>
                        </div>
                        <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {transactions.map((txn) => (
                              <TableRow key={txn.id} className="transition-all duration-200">
                                <TableCell>
                                  <Badge variant={txn.is_credit ? "default" : "destructive"}>
                                    {txn.type.replace(/_/g, " ")}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-[13px]">{txn.description ?? "-"}</TableCell>
                                <TableCell className="text-right">
                                  <span
                                    className={`font-mono tabular-nums font-medium ${
                                      txn.is_credit ? "text-emerald-400" : "text-red-400"
                                    }`}
                                  >
                                    {formatPKR(txn.amount_pkr)}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit period dialog */}
      <Dialog open={!!editDist} onOpenChange={(open) => !open && setEditDist(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Distribution Period</DialogTitle>
            <DialogDescription>
              Change the reference month for this distribution. This will also update linked transactions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-month">Reference Month</Label>
            <Input
              id="edit-month"
              type="month"
              value={editMonth}
              onChange={(e) => setEditMonth(e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button onClick={handleUpdateMonth} disabled={saving || !editMonth}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteDist} onOpenChange={(open) => !open && setDeleteDist(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Distribution</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the{" "}
              <span className="font-semibold text-foreground">
                {deleteDist ? formatMonth(deleteDist.reference_month) : ""}
              </span>{" "}
              distribution? This will permanently remove all {deleteDist?.invoices.length ?? 0} invoices
              and linked transactions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
