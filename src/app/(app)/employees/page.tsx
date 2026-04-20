"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { Employee, Invoice, Distribution, Transaction } from "@/lib/types";
import { formatUSD, formatPKR, formatNumber, formatMonth } from "@/lib/format";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Printer, Trash2, Users, FileText, Banknote, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { pdf } from "@react-pdf/renderer";
import { InvoicePDF, type InvoicePDFData } from "@/lib/invoice-pdf";
import { TaxCertificatePDF, type TaxCertificateData } from "@/lib/tax-certificate-pdf";
import { deleteInvoiceAction } from "./actions";

type EmployeeForm = {
  name: string;
  cnic: string;
  bank_title: string;
  bank_number: string;
  bank_iban: string;
  bank_name: string;
  default_salary_usd: string;
  default_threshold: string;
  default_contractor_tax: string;
  default_remittance_tax: string;
  is_active: boolean;
};

const emptyForm: EmployeeForm = {
  name: "",
  cnic: "",
  bank_title: "",
  bank_number: "",
  bank_iban: "",
  bank_name: "",
  default_salary_usd: "",
  default_threshold: "",
  default_contractor_tax: "",
  default_remittance_tax: "",
  is_active: true,
};

function parseBankAccount(raw: string | null): { title: string; number: string; iban: string; bank: string } {
  if (!raw) return { title: "", number: "", iban: "", bank: "" };
  try {
    return JSON.parse(raw);
  } catch {
    return { title: "", number: "", iban: "", bank: raw };
  }
}

function formFromEmployee(emp: Employee): EmployeeForm {
  const bank = parseBankAccount(emp.bank_account);
  return {
    name: emp.name,
    cnic: emp.cnic ?? "",
    bank_title: bank.title,
    bank_number: bank.number,
    bank_iban: bank.iban,
    bank_name: bank.bank,
    default_salary_usd: String(emp.default_salary_usd),
    default_threshold: String(emp.default_threshold),
    default_contractor_tax: String(emp.default_contractor_tax),
    default_remittance_tax: String(emp.default_remittance_tax),
    is_active: emp.is_active,
  };
}

type DirectInvoiceForm = {
  currency: "usd" | "pkr";
  amount_usd: string;
  rate: string;
  amount_pkr: string;
  contractor_tax_pct: string;
  remittance_tax_pct: string;
  operational_cost_pct: string;
  description: string;
  reference_month: string;
};

const emptyDIForm: DirectInvoiceForm = {
  currency: "usd",
  amount_usd: "",
  rate: "",
  amount_pkr: "",
  contractor_tax_pct: "0",
  remittance_tax_pct: "0",
  operational_cost_pct: "0",
  description: "",
  reference_month: "",
};

type InvoiceWithMonth = Invoice & { reference_month: string };

function printInvoice(inv: InvoiceWithMonth, empName: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`
    <html><head><title>Invoice - ${empName} - ${inv.reference_month}</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 40px; color: #1a1a1a; max-width: 600px; margin: 0 auto; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e5e5; }
      th { font-size: 13px; color: #666; font-weight: 600; }
      td { font-size: 14px; font-family: monospace; text-align: right; }
      .header { margin-bottom: 24px; }
      .header h1 { font-size: 22px; margin: 0; }
      .header p { color: #666; margin: 4px 0 0; font-size: 14px; }
      .green { color: #059669; }
      .red { color: #dc2626; }
      .net td { font-size: 20px; font-weight: 700; border-top: 2px solid #1a1a1a; }
      .net th { border-top: 2px solid #1a1a1a; font-size: 14px; }
      .footer { margin-top: 40px; font-size: 11px; color: #aaa; }
    </style></head><body>
    <div class="header">
      <h1>Kontemplay Finance</h1>
      <p>Payment Invoice &mdash; ${inv.reference_month}</p>
    </div>
    <table>
      <tr><th>Employee</th><td style="font-family:sans-serif;font-weight:600">${empName}</td></tr>
      <tr><th>Salary (USD)</th><td>$${inv.salary_usd}</td></tr>
      <tr><th>Exchange Rate</th><td>${formatNumber(inv.rate_applied, 2)} PKR/USD</td></tr>
      <tr><th>Gross (PKR)</th><td>${formatPKR(inv.gross_pkr)}</td></tr>
      <tr><th>Contractor Tax (${inv.contractor_tax_percent}%)</th><td class="red">-${formatPKR(inv.contractor_tax_pkr)}</td></tr>
      <tr><th>Remittance Tax (${inv.remittance_tax_percent}%)</th><td class="red">-${formatPKR(inv.remittance_tax_pkr)}</td></tr>
      <tr><th>Total Tax</th><td class="red">-${formatPKR(inv.total_tax_pkr)}</td></tr>
      <tr class="net"><th>Net Payable</th><td class="green">${formatPKR(inv.net_pkr)}</td></tr>
    </table>
    <div class="footer">Generated by Kontemplay Finance on ${new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "long", year: "numeric" })}</div>
    </body></html>
  `);
  w.document.close();
  w.print();
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Direct invoice dialog
  const [diOpen, setDiOpen] = useState(false);
  const [diEmp, setDiEmp] = useState<Employee | null>(null);
  const [diForm, setDiForm] = useState<DirectInvoiceForm>(emptyDIForm);
  const [diSaving, setDiSaving] = useState(false);

  // Invoice expansion
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceWithMonth[]>([]);
  const [directPayments, setDirectPayments] = useState<Transaction[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const fetchEmployees = useCallback(async () => {
    const res = await fetch("/api/employees");
    const data = await res.json();
    setEmployees(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  async function fetchInvoices(employeeId: string) {
    setLoadingInvoices(true);

    // Distribution-based invoices
    const invRes = await fetch(`/api/employees/${employeeId}/invoices`);
    const invData = await invRes.json();
    const mapped = (invData ?? []).map((row: any) => ({
      ...row,
      reference_month: row.reference_month ?? "Unknown",
    }));
    setInvoices(mapped);

    // Direct transactions
    const txnRes = await fetch(`/api/employees/${employeeId}/transactions`);
    const txnData = await txnRes.json();
    setDirectPayments(txnData ?? []);

    setLoadingInvoices(false);
  }

  function toggleExpand(empId: string) {
    if (expandedId === empId) {
      setExpandedId(null);
      setInvoices([]);
      setDirectPayments([]);
    } else {
      setExpandedId(empId);
      fetchInvoices(empId);
    }
  }

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditingId(emp.id);
    setForm(formFromEmployee(emp));
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      cnic: form.cnic.trim() || null,
      bank_account: (form.bank_title || form.bank_number || form.bank_iban || form.bank_name)
        ? JSON.stringify({ title: form.bank_title.trim(), number: form.bank_number.trim(), iban: form.bank_iban.trim(), bank: form.bank_name.trim() })
        : null,
      default_salary_usd: parseFloat(form.default_salary_usd) || 0,
      default_threshold: parseFloat(form.default_threshold) || 0,
      default_contractor_tax: parseFloat(form.default_contractor_tax) || 0,
      default_remittance_tax: parseFloat(form.default_remittance_tax) || 0,
      is_active: form.is_active,
    };

    if (editingId) {
      await fetch(`/api/employees/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setSaving(false);
    setDialogOpen(false);
    await fetchEmployees();
  }

  async function toggleActive(emp: Employee) {
    await fetch(`/api/employees/${emp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !emp.is_active }),
    });
    await fetchEmployees();
  }

  function updateField(field: keyof EmployeeForm, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function deleteInvoice(inv: InvoiceWithMonth) {
    const confirmed = window.confirm(
      `Delete invoice for ${inv.reference_month} ($${inv.salary_usd})? This deletes the invoice and its linked transactions.`
    );
    if (!confirmed) return;

    const { error } = await deleteInvoiceAction(inv.id, inv.distribution_id);
    if (error) {
      toast.error(`Failed: ${error}`);
    } else {
      toast.success("Invoice deleted");
    }

    if (expandedId) fetchInvoices(expandedId);
  }

  // Direct invoice
  function openDirectInvoice(emp: Employee) {
    setDiEmp(emp);
    setDiForm({
      currency: "usd",
      amount_usd: "",
      rate: "",
      amount_pkr: "",
      contractor_tax_pct: String(emp.default_contractor_tax),
      remittance_tax_pct: String(emp.default_remittance_tax),
      operational_cost_pct: "0",
      description: "",
      reference_month: "",
    });
    setDiOpen(true);
  }

  function updateDIField(field: keyof DirectInvoiceForm, value: string) {
    setDiForm((prev) => ({ ...prev, [field]: value }));
  }

  const diCalc = useMemo(() => {
    const amountUsd = parseFloat(diForm.amount_usd) || 0;
    const rate = parseFloat(diForm.rate) || 0;
    const amountPkr = parseFloat(diForm.amount_pkr) || 0;
    const grossPkr = diForm.currency === "usd" ? amountUsd * rate : amountPkr;
    const contractorTaxPct = parseFloat(diForm.contractor_tax_pct) || 0;
    const remittanceTaxPct = parseFloat(diForm.remittance_tax_pct) || 0;
    const opCostPct = parseFloat(diForm.operational_cost_pct) || 0;
    const contractorTaxPkr = grossPkr * contractorTaxPct / 100;
    const remittanceTaxPkr = grossPkr * remittanceTaxPct / 100;
    const opCostPkr = grossPkr * opCostPct / 100;
    const totalTaxPkr = contractorTaxPkr + remittanceTaxPkr + opCostPkr;
    const netPkr = grossPkr - totalTaxPkr;
    return { grossPkr, contractorTaxPkr, remittanceTaxPkr, opCostPkr, totalTaxPkr, netPkr };
  }, [diForm]);

  async function handleSaveDirectInvoice() {
    if (!diEmp) return;
    setDiSaving(true);

    const salaryUsd = diForm.currency === "usd" ? (parseFloat(diForm.amount_usd) || 0) : 0;
    const rateApplied = diForm.currency === "usd" ? (parseFloat(diForm.rate) || 0) : 0;

    const res = await fetch(`/api/employees/${diEmp.id}/direct-invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salary_usd: salaryUsd,
        rate_applied: rateApplied,
        gross_pkr: diCalc.grossPkr,
        contractor_tax_percent: parseFloat(diForm.contractor_tax_pct) || 0,
        contractor_tax_pkr: diCalc.contractorTaxPkr,
        remittance_tax_percent: parseFloat(diForm.remittance_tax_pct) || 0,
        remittance_tax_pkr: diCalc.remittanceTaxPkr,
        total_tax_pkr: diCalc.totalTaxPkr,
        net_pkr: diCalc.netPkr,
        reference_month: diForm.reference_month || null,
        description: diForm.description || null,
      }),
    });

    setDiSaving(false);
    if (res.ok) {
      setDiOpen(false);
      toast.success("Direct invoice created");
      if (expandedId === diEmp.id) fetchInvoices(diEmp.id);
    } else {
      toast.error("Failed to create direct invoice");
    }
  }

  // PDF downloads
  function buildInvPDFData(inv: InvoiceWithMonth, emp: Employee): InvoicePDFData {
    const opCostPkr = Math.max(0, inv.total_tax_pkr - inv.contractor_tax_pkr - inv.remittance_tax_pkr);
    const opCostPct = inv.gross_pkr > 0 ? (opCostPkr / inv.gross_pkr) * 100 : 0;
    const totalTaxPct = inv.gross_pkr > 0 ? (inv.total_tax_pkr / inv.gross_pkr) * 100 : 0;

    return {
      employeeName: emp.name,
      bankDetails: emp.bank_account ? parseBankAccount(emp.bank_account) : undefined,
      month: inv.reference_month ? formatMonth(inv.reference_month) : "N/A",
      date: new Date(inv.created_at).toLocaleDateString("en-US", {
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
      operationalCostPercent: Math.round(opCostPct * 100) / 100,
      operationalCostPkr: opCostPkr,
      totalTaxPercent: Math.round(totalTaxPct * 100) / 100,
      totalTaxPkr: inv.total_tax_pkr,
      netPkr: inv.net_pkr,
    };
  }

  async function handleDownloadInvoicePDF(inv: InvoiceWithMonth, emp: Employee) {
    const data = buildInvPDFData(inv, emp);
    const blob = await pdf(<InvoicePDF data={data} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeName = emp.name.toLowerCase().replace(/\s+/g, "_");
    link.download = `invoice_${safeName}_${inv.reference_month ?? "direct"}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadTaxCert(inv: InvoiceWithMonth, emp: Employee) {
    const data: TaxCertificateData = {
      contractorName: emp.name,
      cnic: emp.cnic ?? undefined,
      month: inv.reference_month ? formatMonth(inv.reference_month) : "N/A",
      date: new Date(inv.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "2-digit",
        year: "numeric",
      }),
      grossPkr: inv.gross_pkr,
      contractorTaxPercent: inv.contractor_tax_percent,
      contractorTaxPkr: inv.contractor_tax_pkr,
    };
    const blob = await pdf(<TaxCertificatePDF data={data} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeName = emp.name.toLowerCase().replace(/\s+/g, "_");
    link.download = `tax_certificate_${safeName}_${inv.reference_month ?? "direct"}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const totalEarned = useMemo(
    () =>
      invoices.reduce((s, inv) => s + inv.net_pkr, 0) +
      directPayments.reduce((s, t) => s + t.amount_pkr, 0),
    [invoices, directPayments]
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
        <Button onClick={openAdd} className="shrink-0">Add Employee</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Employee" : "Add Employee"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[13px]">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnic" className="text-[13px]">CNIC</Label>
              <Input
                id="cnic"
                value={form.cnic}
                onChange={(e) => updateField("cnic", e.target.value)}
                placeholder="XXXXX-XXXXXXX-X"
              />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="bank_title" className="text-[13px]">Account Title</Label>
                <Input
                  id="bank_title"
                  value={form.bank_title}
                  onChange={(e) => updateField("bank_title", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_name" className="text-[13px]">Bank Name</Label>
                <Input
                  id="bank_name"
                  value={form.bank_name}
                  onChange={(e) => updateField("bank_name", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="bank_number" className="text-[13px]">Account Number</Label>
                <Input
                  id="bank_number"
                  value={form.bank_number}
                  onChange={(e) => updateField("bank_number", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_iban" className="text-[13px]">IBAN</Label>
                <Input
                  id="bank_iban"
                  value={form.bank_iban}
                  onChange={(e) => updateField("bank_iban", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="salary" className="text-[13px]">Default USD Salary</Label>
                <Input
                  id="salary"
                  type="number"
                  step="any"
                  value={form.default_salary_usd}
                  onChange={(e) =>
                    updateField("default_salary_usd", e.target.value)
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold" className="text-[13px]">Threshold (PKR)</Label>
                <Input
                  id="threshold"
                  type="number"
                  step="any"
                  value={form.default_threshold}
                  onChange={(e) =>
                    updateField("default_threshold", e.target.value)
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="contractor_tax" className="text-[13px]">Contractor Tax %</Label>
                <Input
                  id="contractor_tax"
                  type="number"
                  step="any"
                  value={form.default_contractor_tax}
                  onChange={(e) =>
                    updateField("default_contractor_tax", e.target.value)
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="remittance_tax" className="text-[13px]">Remittance Tax %</Label>
                <Input
                  id="remittance_tax"
                  type="number"
                  step="any"
                  value={form.default_remittance_tax}
                  onChange={(e) =>
                    updateField("default_remittance_tax", e.target.value)
                  }
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(val) => updateField("is_active", !!val)}
              />
              <Label htmlFor="is_active" className="text-[13px]">Active</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !form.name.trim()}>
                {saving ? "Saving..." : editingId ? "Update" : "Add"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Direct Invoice Dialog */}
      <Dialog open={diOpen} onOpenChange={setDiOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Direct Invoice {diEmp ? `- ${diEmp.name}` : ""}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveDirectInvoice();
            }}
            className="space-y-5"
          >
            {/* Currency toggle */}
            <div className="space-y-2">
              <Label className="text-[13px]">Currency</Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant={diForm.currency === "usd" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateDIField("currency", "usd")}
                >
                  USD
                </Button>
                <Button
                  type="button"
                  variant={diForm.currency === "pkr" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateDIField("currency", "pkr")}
                >
                  PKR
                </Button>
              </div>
            </div>

            {/* Amount fields */}
            {diForm.currency === "usd" ? (
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="di_usd" className="text-[13px]">Amount (USD)</Label>
                  <Input
                    id="di_usd"
                    type="number"
                    step="any"
                    value={diForm.amount_usd}
                    onChange={(e) => updateDIField("amount_usd", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="di_rate" className="text-[13px]">Exchange Rate</Label>
                  <Input
                    id="di_rate"
                    type="number"
                    step="any"
                    value={diForm.rate}
                    onChange={(e) => updateDIField("rate", e.target.value)}
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="di_pkr" className="text-[13px]">Amount (PKR)</Label>
                <Input
                  id="di_pkr"
                  type="number"
                  step="any"
                  value={diForm.amount_pkr}
                  onChange={(e) => updateDIField("amount_pkr", e.target.value)}
                  required
                />
              </div>
            )}

            {/* Tax fields */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="di_remittance" className="text-[13px]">Remittance Tax %</Label>
                <Input
                  id="di_remittance"
                  type="number"
                  step="any"
                  value={diForm.remittance_tax_pct}
                  onChange={(e) => updateDIField("remittance_tax_pct", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="di_contractor" className="text-[13px]">Contractor Tax %</Label>
                <Input
                  id="di_contractor"
                  type="number"
                  step="any"
                  value={diForm.contractor_tax_pct}
                  onChange={(e) => updateDIField("contractor_tax_pct", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="di_opcost" className="text-[13px]">Op. Cost %</Label>
                <Input
                  id="di_opcost"
                  type="number"
                  step="any"
                  value={diForm.operational_cost_pct}
                  onChange={(e) => updateDIField("operational_cost_pct", e.target.value)}
                />
              </div>
            </div>

            {/* Description & Month */}
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="di_desc" className="text-[13px]">Description</Label>
                <Input
                  id="di_desc"
                  value={diForm.description}
                  onChange={(e) => updateDIField("description", e.target.value)}
                  placeholder="e.g. Designer 20-30Nov"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="di_month" className="text-[13px]">Reference Month</Label>
                <Input
                  id="di_month"
                  type="month"
                  value={diForm.reference_month}
                  onChange={(e) => updateDIField("reference_month", e.target.value)}
                />
              </div>
            </div>

            {/* Calculated summary */}
            {diCalc.grossPkr > 0 && (
              <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gross PKR</span>
                  <span className="font-mono tabular-nums font-medium">{formatPKR(diCalc.grossPkr)}</span>
                </div>
                {diCalc.remittanceTaxPkr > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remittance Tax</span>
                    <span className="font-mono tabular-nums text-red-400">-{formatPKR(diCalc.remittanceTaxPkr)}</span>
                  </div>
                )}
                {diCalc.contractorTaxPkr > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Contractor Tax</span>
                    <span className="font-mono tabular-nums text-red-400">-{formatPKR(diCalc.contractorTaxPkr)}</span>
                  </div>
                )}
                {diCalc.opCostPkr > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Op. Cost</span>
                    <span className="font-mono tabular-nums text-red-400">-{formatPKR(diCalc.opCostPkr)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold border-t border-border/30 pt-1.5">
                  <span>Net Payable</span>
                  <span className="font-mono tabular-nums text-emerald-400">{formatPKR(diCalc.netPkr)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDiOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={diSaving || diCalc.grossPkr <= 0}>
                {diSaving ? "Creating..." : "Create Invoice"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/50 mb-4">
            <Users className="size-7 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No employees yet</p>
          <p className="text-[13px] text-muted-foreground/60 mt-1">Add your first employee to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {employees.map((emp) => {
            const isExpanded = expandedId === emp.id;
            return (
              <Card key={emp.id}>
                {/* Employee header row */}
                <button
                  type="button"
                  className={`flex w-full items-center gap-3 text-left transition-all duration-200 ${
                    isExpanded
                      ? "rounded-t-xl bg-muted/20 px-4 py-3"
                      : "rounded-xl bg-muted/20 px-4 py-3"
                  }`}
                  onClick={() => toggleExpand(emp.id)}
                >
                  <ChevronDown
                    className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{emp.name}</span>
                      {!emp.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <div className="text-[13px] text-muted-foreground mt-0.5">
                      <span className="font-mono tabular-nums">{formatUSD(emp.default_salary_usd)}</span>/mo
                      {emp.cnic ? ` · ${emp.cnic}` : ""}
                    </div>
                  </div>
                  <div className="text-right text-[13px] text-muted-foreground hidden sm:flex sm:items-center sm:gap-3">
                    <span className="font-mono tabular-nums">Tax: {emp.default_contractor_tax}% + {emp.default_remittance_tax}%</span>
                    <span className="text-muted-foreground/30">|</span>
                    <span className="font-mono tabular-nums">Threshold: {emp.default_threshold}</span>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-center">
                      <Checkbox
                        checked={emp.is_active}
                        onCheckedChange={() => toggleActive(emp)}
                      />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(emp)}>
                      Edit
                    </Button>
                  </div>
                </button>

                {/* Expanded invoice history */}
                {isExpanded && (
                  <CardContent className="pt-0 border-t border-border/30">
                    <div className="flex items-center justify-between mt-4 mb-3">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                        Invoice History
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDirectInvoice(emp);
                        }}
                      >
                        <Plus className="size-3.5 mr-1.5" />
                        Direct Invoice
                      </Button>
                    </div>

                    {loadingInvoices ? (
                      <p className="text-sm text-muted-foreground py-4">Loading invoices...</p>
                    ) : invoices.length === 0 && directPayments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/50 mb-4">
                          <FileText className="size-7 text-muted-foreground/60" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">No invoices yet</p>
                        <p className="text-[13px] text-muted-foreground/60 mt-1">
                          Invoices will appear here once distributions are processed.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Month</TableHead>
                              <TableHead className="text-right">USD</TableHead>
                              <TableHead className="text-right hidden sm:table-cell">Rate</TableHead>
                              <TableHead className="text-right hidden sm:table-cell">Gross PKR</TableHead>
                              <TableHead className="text-right hidden md:table-cell">Tax</TableHead>
                              <TableHead className="text-right">Net PKR</TableHead>
                              <TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {invoices.map((inv) => (
                              <TableRow key={inv.id} className="transition-all duration-200">
                                <TableCell>
                                  {formatMonth(inv.reference_month)}
                                </TableCell>
                                <TableCell className="text-right font-mono tabular-nums">
                                  ${inv.salary_usd}
                                </TableCell>
                                <TableCell className="text-right font-mono tabular-nums hidden sm:table-cell">
                                  {formatNumber(inv.rate_applied, 2)}
                                </TableCell>
                                <TableCell className="text-right font-mono tabular-nums hidden sm:table-cell">
                                  {formatPKR(inv.gross_pkr)}
                                </TableCell>
                                <TableCell className="text-right font-mono tabular-nums text-red-400 hidden md:table-cell">
                                  -{formatPKR(inv.total_tax_pkr)}
                                </TableCell>
                                <TableCell className="text-right font-mono tabular-nums font-semibold text-emerald-400">
                                  {formatPKR(inv.net_pkr)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon-xs"
                                      onClick={() => printInvoice(inv, emp.name)}
                                      title="Print invoice"
                                      className="transition-all duration-200"
                                    >
                                      <Printer className="size-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon-xs"
                                      onClick={() => handleDownloadInvoicePDF(inv, emp)}
                                      title="Download Invoice PDF"
                                      className="transition-all duration-200"
                                    >
                                      <Download className="size-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon-xs"
                                      onClick={() => handleDownloadTaxCert(inv, emp)}
                                      title="Download Tax Certificate"
                                      className="transition-all duration-200"
                                    >
                                      <FileText className="size-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon-xs"
                                      className="text-muted-foreground hover:text-red-400 transition-all duration-200"
                                      onClick={() => deleteInvoice(inv)}
                                      title="Delete invoice"
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
                        {directPayments.length > 0 && (
                          <>
                            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mt-5 mb-3">
                              Direct Payments
                            </p>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Month</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {directPayments.map((txn) => (
                                    <TableRow key={txn.id} className="transition-all duration-200">
                                      <TableCell className="whitespace-nowrap">
                                        {new Date(txn.created_at).toLocaleDateString("en-PK", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                        })}
                                      </TableCell>
                                      <TableCell>{txn.description ?? "-"}</TableCell>
                                      <TableCell>
                                        {txn.reference_month ? formatMonth(txn.reference_month) : "-"}
                                      </TableCell>
                                      <TableCell className="text-right font-mono tabular-nums font-semibold text-emerald-400">
                                        {formatPKR(txn.amount_pkr)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </>
                        )}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30 text-sm">
                          <span className="text-[13px] text-muted-foreground">
                            {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
                            {directPayments.length > 0 && ` + ${directPayments.length} direct payment${directPayments.length !== 1 ? "s" : ""}`}
                          </span>
                          <span className="font-mono tabular-nums font-semibold">
                            Total earned: <span className="text-emerald-400">{formatPKR(totalEarned)}</span>
                          </span>
                        </div>
                      </>
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
