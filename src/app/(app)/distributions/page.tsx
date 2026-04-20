"use client";

import { useCallback, useEffect, useState } from "react";
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
import { ChevronDown, Download, FileDown, FileText, Merge, Building2, History, Inbox, Pencil, Trash2 } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { InvoicePDF, type InvoicePDFData, type BankDetails } from "@/lib/invoice-pdf";
import { TaxCertificatePDF, type TaxCertificateData } from "@/lib/tax-certificate-pdf";

interface DistributionWithInvoices extends Distribution {
  invoices: (Invoice & { employee: { name: string; cnic?: string | null; bank_account?: string | null } })[];
}

function parseBankJson(raw: string): BankDetails | undefined {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export default function DistributionsPage() {
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

    await fetch(`/api/distributions/${deleteDist.id}`, { method: "DELETE" });

    setDeleting(false);
    setDeleteDist(null);
    setExpandedId(null);
    fetchDistributions();
  }

  async function handleUpdateMonth() {
    if (!editDist || !editMonth) return;
    setSaving(true);

    await fetch(`/api/distributions/${editDist.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference_month: editMonth, old_reference_month: editDist.reference_month }),
    });

    setSaving(false);
    setEditDist(null);
    fetchDistributions();
  }

  const fetchDistributions = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/distributions");
    const data = await res.json();
    setDistributions(data ?? []);
    setLoading(false);
  }, []);

  const fetchTransactions = useCallback(async (distributionId: string) => {
    const res = await fetch(`/api/transactions?distribution_id=${distributionId}`);
    const data = await res.json();
    setTransactions(data ?? []);
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
    inv: Invoice & { employee: { name: string; cnic?: string | null; bank_account?: string | null } }
  ): InvoicePDFData {
    const operationalCostPkr = inv.total_tax_pkr - inv.contractor_tax_pkr - inv.remittance_tax_pkr;
    const operationalCostPercent = inv.gross_pkr > 0 ? (operationalCostPkr / inv.gross_pkr) * 100 : 0;
    const totalTaxPercent = inv.gross_pkr > 0 ? (inv.total_tax_pkr / inv.gross_pkr) * 100 : 0;

    return {
      employeeName: inv.employee?.name ?? "Unknown",
      cnic: inv.employee?.cnic ?? undefined,
      bankDetails: inv.employee?.bank_account ? parseBankJson(inv.employee.bank_account) : undefined,
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
    inv: Invoice & { employee: { name: string; cnic?: string | null; bank_account?: string | null } }
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
      "Threshold Saving PKR": inv.salary_usd * inv.threshold_applied,
      "Contractor Tax PKR": inv.contractor_tax_pkr,
      "Remittance Tax PKR": inv.remittance_tax_pkr,
      "Operational Cost PKR": Math.max(0, inv.total_tax_pkr - inv.contractor_tax_pkr - inv.remittance_tax_pkr),
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

    const invoicesToCombine = [qaimInv, fitrusInv].filter(Boolean) as (Invoice & { employee: { name: string; cnic?: string | null; bank_account?: string | null } })[];

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

    const qaimBank = qaimInv?.employee?.bank_account ? parseBankJson(qaimInv.employee.bank_account) : undefined;
    const data: InvoicePDFData = {
      employeeName: "Qaim Ali",
      cnic: qaimInv?.employee?.cnic ?? undefined,
      bankDetails: qaimBank,
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

  function buildTaxCertData(
    dist: DistributionWithInvoices,
    inv: Invoice & { employee: { name: string; cnic?: string | null; bank_account?: string | null } }
  ): TaxCertificateData {
    return {
      contractorName: inv.employee?.name ?? "Unknown",
      cnic: inv.employee?.cnic ?? undefined,
      month: formatMonth(dist.reference_month),
      date: new Date(dist.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "2-digit",
        year: "numeric",
      }),
      grossPkr: inv.gross_pkr,
      contractorTaxPercent: inv.contractor_tax_percent,
      contractorTaxPkr: inv.contractor_tax_pkr,
    };
  }

  async function handleDownloadTaxCert(
    dist: DistributionWithInvoices,
    inv: Invoice & { employee: { name: string; cnic?: string | null; bank_account?: string | null } }
  ) {
    const data = buildTaxCertData(dist, inv);
    const blob = await pdf(<TaxCertificatePDF data={data} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeName = (inv.employee?.name ?? "cert").toLowerCase().replace(/\s+/g, "_");
    link.download = `tax_certificate_${safeName}_${dist.reference_month}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadAllTaxCerts(dist: DistributionWithInvoices) {
    for (const inv of dist.invoices) {
      await handleDownloadTaxCert(dist, inv);
    }
  }

  async function handleDownloadCombinedTaxCert(dist: DistributionWithInvoices) {
    const qaimInv = dist.invoices.find((inv) =>
      inv.employee?.name?.toLowerCase().includes("qaim")
    );
    const fitrusInv = dist.invoices.find((inv) =>
      inv.employee?.name?.toLowerCase().includes("fitrus")
    );

    if (!qaimInv && !fitrusInv) return;

    const invoicesToCombine = [qaimInv, fitrusInv].filter(Boolean) as (Invoice & { employee: { name: string; cnic?: string | null; bank_account?: string | null } })[];

    const totalGrossPkr = invoicesToCombine.reduce((s, inv) => s + inv.gross_pkr, 0);
    const totalContractorTaxPkr = invoicesToCombine.reduce((s, inv) => s + inv.contractor_tax_pkr, 0);
    const contractorPct = totalGrossPkr > 0 ? (totalContractorTaxPkr / totalGrossPkr) * 100 : 0;

    const data: TaxCertificateData = {
      contractorName: "Qaim Ali",
      cnic: qaimInv?.employee?.cnic ?? undefined,
      month: formatMonth(dist.reference_month),
      date: new Date(dist.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "2-digit",
        year: "numeric",
      }),
      grossPkr: totalGrossPkr,
      contractorTaxPercent: Math.round(contractorPct * 100) / 100,
      contractorTaxPkr: totalContractorTaxPkr,
    };

    const blob = await pdf(<TaxCertificatePDF data={data} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tax_certificate_qaim_ali_combined_${dist.reference_month}.pdf`;
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

                    {/* Fund flow summary */}
                    {(() => {
                      const received = dist.amount_received_pkr;
                      const employeeNet = dist.invoices.reduce((s, inv) => s + inv.net_pkr, 0);
                      const contractorTax = dist.invoices.reduce((s, inv) => s + inv.contractor_tax_pkr, 0);
                      const companyRetained = received - employeeNet - contractorTax;
                      const pctEmp = (employeeNet / received) * 100;
                      const pctTax = (contractorTax / received) * 100;
                      const pctCompany = (companyRetained / received) * 100;

                      return (
                    <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-4 mb-6">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-3">Fund Flow</p>
                      <div className="flex justify-between text-sm font-medium mb-3">
                        <span className="text-muted-foreground">Amount Received</span>
                        <span className="font-mono tabular-nums">{formatPKR(received)}</span>
                      </div>
                      {/* Visual bar */}
                      <div className="flex h-3 rounded-full overflow-hidden mb-3">
                        <div className="bg-emerald-500/80" style={{ width: `${pctEmp}%` }} title={`Employee Payouts: ${pctEmp.toFixed(1)}%`} />
                        <div className="bg-red-400/80" style={{ width: `${pctTax}%` }} title={`Contractor Tax: ${pctTax.toFixed(1)}%`} />
                        <div className="bg-blue-500/80" style={{ width: `${pctCompany}%` }} title={`Company: ${pctCompany.toFixed(1)}%`} />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className="size-2.5 rounded-full bg-emerald-500/80 inline-block" />
                            <span className="text-muted-foreground">Employee Payouts</span>
                          </span>
                          <span className="flex items-center gap-3">
                            <span className="font-mono tabular-nums text-emerald-400">{formatPKR(employeeNet)}</span>
                            <span className="text-[11px] text-muted-foreground/60 w-12 text-right">{pctEmp.toFixed(1)}%</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className="size-2.5 rounded-full bg-red-400/80 inline-block" />
                            <span className="text-muted-foreground">Contractor Tax (FBR)</span>
                          </span>
                          <span className="flex items-center gap-3">
                            <span className="font-mono tabular-nums text-red-400">{formatPKR(contractorTax)}</span>
                            <span className="text-[11px] text-muted-foreground/60 w-12 text-right">{pctTax.toFixed(1)}%</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className="size-2.5 rounded-full bg-blue-500/80 inline-block" />
                            <span className="text-muted-foreground">Company Retained</span>
                          </span>
                          <span className="flex items-center gap-3">
                            <span className="font-mono tabular-nums text-blue-400">{formatPKR(companyRetained)}</span>
                            <span className="text-[11px] text-muted-foreground/60 w-12 text-right">{pctCompany.toFixed(1)}%</span>
                          </span>
                        </div>
                      </div>
                    </div>
                      );
                    })()}

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
                          Qaim + Fitrus Invoice
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadCombinedTaxCert(dist)}
                        >
                          <FileText className="size-3.5 mr-1.5" />
                          Qaim + Fitrus Tax Cert
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
                          onClick={() => handleDownloadAllTaxCerts(dist)}
                        >
                          <FileText className="size-3.5 mr-1.5" />
                          All Tax Certs
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
                    {(() => {
                      // Compute derived per-invoice values and totals
                      const invoiceData = dist.invoices.map((inv) => {
                        const thresholdSaving = inv.salary_usd * inv.threshold_applied;
                        const operationalCost = inv.total_tax_pkr - inv.contractor_tax_pkr - inv.remittance_tax_pkr;
                        return { ...inv, thresholdSaving, operationalCost: Math.max(0, operationalCost) };
                      });
                      const totals = {
                        usd: invoiceData.reduce((s, i) => s + i.salary_usd, 0),
                        gross: invoiceData.reduce((s, i) => s + i.gross_pkr, 0),
                        thresholdSaving: invoiceData.reduce((s, i) => s + i.thresholdSaving, 0),
                        contractorTax: invoiceData.reduce((s, i) => s + i.contractor_tax_pkr, 0),
                        remittanceTax: invoiceData.reduce((s, i) => s + i.remittance_tax_pkr, 0),
                        opCost: invoiceData.reduce((s, i) => s + i.operationalCost, 0),
                        totalTax: invoiceData.reduce((s, i) => s + i.total_tax_pkr, 0),
                        net: invoiceData.reduce((s, i) => s + i.net_pkr, 0),
                      };

                      return (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">USD</TableHead>
                          <TableHead className="text-right hidden md:table-cell">Rate</TableHead>
                          <TableHead className="text-right hidden md:table-cell">Gross PKR</TableHead>
                          <TableHead className="text-right hidden lg:table-cell">Threshold Saving</TableHead>
                          <TableHead className="text-right hidden md:table-cell">Contractor Tax</TableHead>
                          <TableHead className="text-right hidden md:table-cell">Remittance Tax</TableHead>
                          <TableHead className="text-right hidden md:table-cell">Op. Cost</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">Total Tax</TableHead>
                          <TableHead className="text-right">Net PKR</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceData.map((inv) => (
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
                            <TableCell className="text-right font-mono tabular-nums text-red-400 hidden lg:table-cell">
                              {formatPKR(inv.thresholdSaving)}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-red-400 hidden md:table-cell">
                              {formatPKR(inv.contractor_tax_pkr)}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-red-400 hidden md:table-cell">
                              {formatPKR(inv.remittance_tax_pkr)}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-red-400 hidden md:table-cell">
                              {formatPKR(inv.operationalCost)}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-red-400 hidden sm:table-cell">
                              {formatPKR(inv.total_tax_pkr)}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums font-semibold text-emerald-400 whitespace-nowrap">
                              {formatPKR(inv.net_pkr)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => handleDownloadPDF(dist, inv)}
                                  title="Download Invoice"
                                >
                                  <Download className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => handleDownloadTaxCert(dist, inv)}
                                  title="Download Tax Certificate"
                                >
                                  <FileText className="size-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Totals row */}
                        <TableRow className="border-t-2 border-border/50 font-semibold bg-muted/10">
                          <TableCell>TOTAL</TableCell>
                          <TableCell className="text-right font-mono tabular-nums hidden sm:table-cell">
                            {formatUSD(totals.usd)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell" />
                          <TableCell className="text-right font-mono tabular-nums hidden md:table-cell">
                            {formatPKR(totals.gross)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-red-400 hidden lg:table-cell">
                            {formatPKR(totals.thresholdSaving)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-red-400 hidden md:table-cell">
                            {formatPKR(totals.contractorTax)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-red-400 hidden md:table-cell">
                            {formatPKR(totals.remittanceTax)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-red-400 hidden md:table-cell">
                            {formatPKR(totals.opCost)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-red-400 hidden sm:table-cell">
                            {formatPKR(totals.totalTax)}
                          </TableCell>
                          <TableCell className="text-right font-mono tabular-nums text-emerald-400 whitespace-nowrap">
                            {formatPKR(totals.net)}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                      );
                    })()}
                    </div>

                    {/* Company share breakdown */}
                    {(() => {
                      const companyUsd = dist.total_usd - dist.distribute_usd;
                      const grossFromUsd = companyUsd * dist.base_rate;
                      const thresholdSavings = dist.invoices.reduce(
                        (s, inv) => s + inv.salary_usd * inv.threshold_applied, 0
                      );
                      const operationalCost = dist.invoices.reduce(
                        (s, inv) => s + Math.max(0, inv.total_tax_pkr - inv.contractor_tax_pkr - inv.remittance_tax_pkr), 0
                      );
                      const totalBeforeTax = dist.company_gross_pkr ?? 0;
                      const remittanceTax = totalBeforeTax - (dist.company_net_pkr ?? 0);
                      const companyNet = dist.company_net_pkr ?? 0;

                      return (
                    <div className="rounded-xl bg-muted/20 px-4 py-4 mt-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Building2 className="size-3.5 text-muted-foreground/50" />
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Company Share (Kontemplay)</p>
                      </div>
                      <div className="space-y-2 max-w-md">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">USD Share</span>
                          <span className="font-mono tabular-nums font-medium">{formatUSD(companyUsd)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Gross from USD (base rate)</span>
                          <span className="font-mono tabular-nums font-medium">{formatPKR(grossFromUsd)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Threshold Savings</span>
                          <span className="font-mono tabular-nums font-medium text-emerald-400">{formatPKR(thresholdSavings)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Operational Cost (1.5%)</span>
                          <span className="font-mono tabular-nums font-medium text-emerald-400">{formatPKR(operationalCost)}</span>
                        </div>
                        <div className="border-t border-border/30 pt-2 flex justify-between text-sm">
                          <span className="text-muted-foreground">Total before tax</span>
                          <span className="font-mono tabular-nums font-medium">{formatPKR(totalBeforeTax)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Remittance tax ({formatNumber(dist.remittance_tax_percent)}%)</span>
                          <span className="font-mono tabular-nums font-medium text-red-400">-{formatPKR(remittanceTax)}</span>
                        </div>
                        <div className="border-t border-border/30 pt-2 flex justify-between text-sm font-semibold">
                          <span>Company Net</span>
                          <span className="font-mono tabular-nums text-emerald-400">{formatPKR(companyNet)}</span>
                        </div>
                      </div>
                    </div>
                      );
                    })()}

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
