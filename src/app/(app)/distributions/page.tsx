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
import { ChevronDown, Download, FileDown } from "lucide-react";
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
      totalTaxPercent: inv.remittance_tax_percent + inv.contractor_tax_percent,
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Distribution History</h1>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : distributions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No distributions yet. Create one from the Distribute page.
        </p>
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
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
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
                      <p className="text-xs text-muted-foreground">
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
                  </div>
                  <div className="flex items-center gap-6 text-right text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Total USD</p>
                      <p className="font-mono font-medium">{formatUSD(dist.total_usd)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Employee Net</p>
                      <p className="font-mono font-medium">{formatPKR(totalNet)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Company Share</p>
                      <p className="font-mono font-medium text-emerald-400">
                        {formatPKR(dist.company_net_pkr ?? 0)}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Detail view */}
                {isExpanded && (
                  <CardContent className="pt-0 border-t border-border/30">
                    {/* Distribution info */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm mt-4 mb-6">
                      <div>
                        <p className="text-xs text-muted-foreground">Received PKR</p>
                        <p className="font-mono font-medium">{formatPKR(dist.amount_received_pkr)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Base Rate</p>
                        <p className="font-mono font-medium">{formatNumber(dist.base_rate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Effective Rate</p>
                        <p className="font-mono font-medium">{formatNumber(dist.effective_rate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Threshold</p>
                        <p className="font-mono font-medium">{formatNumber(dist.threshold)} PKR</p>
                      </div>
                    </div>

                    {/* Invoices */}
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold">Invoices</h3>
                      <div className="flex gap-2">
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
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead className="text-right">USD</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Gross PKR</TableHead>
                          <TableHead className="text-right">Tax PKR</TableHead>
                          <TableHead className="text-right">Net PKR</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dist.invoices.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium">
                              {inv.employee?.name ?? "Unknown"}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatUSD(inv.salary_usd)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatNumber(inv.rate_applied)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatPKR(inv.gross_pkr)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-red-400">
                              {formatPKR(inv.total_tax_pkr)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold text-emerald-400">
                              {formatPKR(inv.net_pkr)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
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

                    {/* Company share */}
                    <div className="rounded-md bg-muted/30 p-4 mt-4">
                      <h3 className="text-sm font-semibold mb-2">Company Share</h3>
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Gross</p>
                          <p className="font-mono font-medium">{formatPKR(dist.company_gross_pkr ?? 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Net</p>
                          <p className="font-mono font-medium text-emerald-400">
                            {formatPKR(dist.company_net_pkr ?? 0)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Linked transactions */}
                    {transactions.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-sm font-semibold mb-2">Linked Transactions</h3>
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
                              <TableRow key={txn.id}>
                                <TableCell>
                                  <Badge variant={txn.is_credit ? "default" : "destructive"}>
                                    {txn.type.replace(/_/g, " ")}
                                  </Badge>
                                </TableCell>
                                <TableCell>{txn.description ?? "-"}</TableCell>
                                <TableCell className="text-right">
                                  <span
                                    className={`font-mono ${
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
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
