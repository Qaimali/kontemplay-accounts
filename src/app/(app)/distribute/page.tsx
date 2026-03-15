"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { calculateRates, calculateDistribution } from "@/lib/distribution";
import type { Employee, EmployeeDistInput, DistributionResult } from "@/lib/types";
import { formatPKR, formatNumber } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowLeft,
  Calculator,
  CheckCircle,
  Users,
  FileText,
  Receipt,
  Printer,
  RotateCcw,
  ShieldCheck,
  Building2,
  Banknote,
} from "lucide-react";

type Step = "input" | "employees" | "preview" | "done";

const STEP_META: Record<Step, { label: string; icon: React.ElementType }> = {
  input: { label: "Payment", icon: Banknote },
  employees: { label: "Employees", icon: Users },
  preview: { label: "Preview", icon: FileText },
  done: { label: "Invoices", icon: Receipt },
};

export default function DistributePage() {
  const supabase = createClient();

  // Step tracking
  const [step, setStep] = useState<Step>("input");

  // Step 1: Payment details
  const [amountReceived, setAmountReceived] = useState("");
  const [remittanceTax, setRemittanceTax] = useState("0.25");
  const [totalUsd, setTotalUsd] = useState("");
  const [threshold, setThreshold] = useState("2");
  const [referenceMonth, setReferenceMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Calculated rates
  const [rates, setRates] = useState<{
    original_amount: number;
    base_rate: number;
    effective_rate: number;
  } | null>(null);

  // Step 2: Employees
  const [employees, setEmployees] = useState<EmployeeDistInput[]>([]);

  // Step 3: Results
  const [result, setResult] = useState<DistributionResult | null>(null);
  const [saveAsTransactions, setSaveAsTransactions] = useState(true);
  const [saving, setSaving] = useState(false);

  // Step 4: Done - saved distribution ID
  const [savedDistId, setSavedDistId] = useState<string | null>(null);

  // Load employees on mount
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("employees")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (data) {
        setEmployees(
          data.map((emp: Employee) => ({
            employee_id: emp.id,
            name: emp.name,
            salary_usd: emp.default_salary_usd,
            threshold: emp.default_threshold,
            contractor_tax_percent: emp.default_contractor_tax,
            remittance_tax_percent: emp.default_remittance_tax,
            included: emp.default_salary_usd > 0,
          }))
        );
      }
    }
    load();
  }, []);

  // Calculate rates when inputs change
  useEffect(() => {
    const amt = parseFloat(amountReceived);
    const tax = parseFloat(remittanceTax);
    const usd = parseFloat(totalUsd);
    const thr = parseFloat(threshold);

    if (amt > 0 && tax >= 0 && usd > 0 && thr >= 0) {
      setRates(calculateRates(amt, tax, usd, thr));
    } else {
      setRates(null);
    }
  }, [amountReceived, remittanceTax, totalUsd, threshold]);

  function handleStep1Next() {
    if (!rates) {
      toast.error("Please fill all fields correctly");
      return;
    }
    setStep("employees");
  }

  function handleStep2Next() {
    const included = employees.filter((e) => e.included);
    if (included.length === 0) {
      toast.error("Select at least one employee");
      return;
    }

    const res = calculateDistribution({
      amount_received_pkr: parseFloat(amountReceived),
      remittance_tax_percent: parseFloat(remittanceTax),
      total_usd: parseFloat(totalUsd),
      threshold: parseFloat(threshold),
      base_rate: rates!.base_rate,
      employees,
    });

    setResult(res);
    setStep("preview");
  }

  function updateEmployee(index: number, field: keyof EmployeeDistInput, value: unknown) {
    setEmployees((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  async function handleSave() {
    if (!result || !rates) return;
    setSaving(true);

    try {
      // Get current user's owner id
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: owner } = await supabase
        .from("owners")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      const ownerId = owner?.id;

      // 1. Create distribution record
      const totalEmployeeUsd = result.employees.reduce((s, e) => s + e.salary_usd, 0);
      const { data: dist, error: distError } = await supabase
        .from("distributions")
        .insert({
          reference_month: referenceMonth,
          total_usd: parseFloat(totalUsd),
          distribute_usd: totalEmployeeUsd,
          amount_received_pkr: parseFloat(amountReceived),
          remittance_tax_percent: parseFloat(remittanceTax),
          base_rate: rates.base_rate,
          effective_rate: rates.effective_rate,
          threshold: parseFloat(threshold),
          company_gross_pkr: result.company.total_before_tax,
          company_net_pkr: result.company.net_pkr,
          created_by: ownerId,
        })
        .select()
        .single();

      if (distError) throw distError;

      // 2. Create invoices
      const invoiceRows = result.employees.map((emp) => ({
        distribution_id: dist.id,
        employee_id: emp.employee_id,
        salary_usd: emp.salary_usd,
        rate_applied: emp.rate,
        threshold_applied: emp.threshold,
        contractor_tax_percent: emp.contractor_tax_percent,
        remittance_tax_percent: emp.remittance_tax_percent,
        gross_pkr: emp.gross_pkr,
        contractor_tax_pkr: emp.contractor_tax_pkr,
        remittance_tax_pkr: emp.remittance_tax_pkr,
        total_tax_pkr: emp.total_tax_pkr,
        net_pkr: emp.net_pkr,
      }));

      const { data: invoices, error: invError } = await supabase
        .from("invoices")
        .insert(invoiceRows)
        .select();

      if (invError) throw invError;

      // 3. Save as transactions if checked
      if (saveAsTransactions) {
        const txns = [];

        // Salary payout debits
        for (let i = 0; i < result.employees.length; i++) {
          const emp = result.employees[i];
          const invoice = invoices[i];
          txns.push({
            type: "salary_payout" as const,
            amount_pkr: emp.net_pkr,
            is_credit: false,
            description: `${emp.name} - salary ${referenceMonth}`,
            reference_month: referenceMonth,
            distribution_id: dist.id,
            invoice_id: invoice.id,
            employee_id: emp.employee_id,
            created_by: ownerId,
          });
        }

        // Contractor tax debit (summed)
        if (result.summary.total_contractor_tax > 0) {
          txns.push({
            type: "contractor_tax" as const,
            amount_pkr: result.summary.total_contractor_tax,
            is_credit: false,
            description: `Contractor tax - ${referenceMonth}`,
            reference_month: referenceMonth,
            distribution_id: dist.id,
            created_by: ownerId,
          });
        }

        const { error: txnError } = await supabase.from("transactions").insert(txns);
        if (txnError) throw txnError;
      }

      setSavedDistId(dist.id);
      setStep("done");
      toast.success("Distribution saved! Invoices created.");
    } catch (err) {
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  const steps: Step[] = ["input", "employees", "preview", "done"];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="space-y-8">
      {/* Page header with step indicator */}
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Distribute</h1>

        {/* Wizard step indicator */}
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((s, i) => {
            const meta = STEP_META[s];
            const Icon = meta.icon;
            const isActive = step === s;
            const isCompleted = currentStepIndex > i;

            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && (
                  <div
                    className={`hidden h-px w-6 sm:block ${
                      isCompleted ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
                <div
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : isCompleted
                        ? "bg-primary/15 text-primary"
                        : "bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <span
                    className={`flex size-5 items-center justify-center rounded-full text-[11px] font-bold ${
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : isCompleted
                          ? "bg-primary/20 text-primary"
                          : "bg-muted-foreground/15 text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="size-3" /> : i + 1}
                  </span>
                  <span className="hidden sm:inline">{meta.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Payment Details */}
      {step === "input" && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[13px]">Reference Month</Label>
                <Input
                  value={referenceMonth}
                  onChange={(e) => setReferenceMonth(e.target.value)}
                  placeholder="2026-03"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Amount Received (PKR)</Label>
                <Input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="334800"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Bank Remittance Tax (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={remittanceTax}
                  onChange={(e) => setRemittanceTax(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Total USD</Label>
                <Input
                  type="number"
                  value={totalUsd}
                  onChange={(e) => setTotalUsd(e.target.value)}
                  placeholder="1200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Default Threshold (PKR/USD)</Label>
                <Input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                />
              </div>
            </div>

            {rates && (
              <div className="rounded-xl border border-border/50 bg-muted/30 p-5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-3">
                  Calculated Rates
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <span className="text-[13px] text-muted-foreground">Original Amount</span>
                    <p className="font-mono tabular-nums font-semibold mt-0.5">{formatPKR(rates.original_amount)}</p>
                  </div>
                  <div>
                    <span className="text-[13px] text-muted-foreground">Base Rate</span>
                    <p className="font-mono tabular-nums font-semibold mt-0.5">{formatNumber(rates.base_rate, 4)} PKR/USD</p>
                  </div>
                  <div>
                    <span className="text-[13px] text-muted-foreground">Effective Rate</span>
                    <p className="font-mono tabular-nums font-semibold mt-0.5">{formatNumber(rates.effective_rate, 4)} PKR/USD</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleStep1Next} disabled={!rates}>
                Next: Configure Employees
                <ArrowRight className="size-4 ml-1.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Employees */}
      {step === "employees" && (
        <Card>
          <CardHeader>
            <CardTitle>Employee Configuration</CardTitle>
            {rates && (
              <p className="text-[13px] text-muted-foreground mt-1">
                Base Rate: <span className="font-mono tabular-nums font-medium text-foreground">{formatNumber(rates.base_rate, 4)}</span> PKR/USD
                <span className="mx-2 text-border">|</span>
                Default Threshold: <span className="font-mono tabular-nums font-medium text-foreground">{threshold}</span> PKR
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>USD</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Contractor %</TableHead>
                  <TableHead>Remittance %</TableHead>
                  <TableHead>Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp, i) => (
                  <TableRow key={emp.employee_id} className={`transition-all duration-200 ${!emp.included ? "opacity-40" : ""}`}>
                    <TableCell>
                      <Checkbox
                        checked={emp.included}
                        onCheckedChange={(v) => updateEmployee(i, "included", !!v)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-24"
                        value={emp.salary_usd}
                        onChange={(e) => updateEmployee(i, "salary_usd", parseFloat(e.target.value) || 0)}
                        disabled={!emp.included}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-20"
                        value={emp.threshold}
                        onChange={(e) => updateEmployee(i, "threshold", parseFloat(e.target.value) || 0)}
                        disabled={!emp.included}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        className="w-20"
                        value={emp.contractor_tax_percent}
                        onChange={(e) =>
                          updateEmployee(i, "contractor_tax_percent", parseFloat(e.target.value) || 0)
                        }
                        disabled={!emp.included}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        className="w-20"
                        value={emp.remittance_tax_percent}
                        onChange={(e) =>
                          updateEmployee(i, "remittance_tax_percent", parseFloat(e.target.value) || 0)
                        }
                        disabled={!emp.included}
                      />
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {emp.included && rates
                        ? formatNumber(rates.base_rate - emp.threshold, 2)
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>

            <div className="mt-5 rounded-xl bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Total Employee USD:{" "}
              <span className="font-mono tabular-nums font-semibold text-foreground">
                ${formatNumber(employees.filter((e) => e.included).reduce((s, e) => s + e.salary_usd, 0), 0)}
              </span>
              <span className="mx-2 text-border">|</span>
              Company USD:{" "}
              <span className="font-mono tabular-nums font-semibold text-foreground">
                ${formatNumber(parseFloat(totalUsd) - employees.filter((e) => e.included).reduce((s, e) => s + e.salary_usd, 0), 0)}
              </span>
            </div>

            <div className="flex flex-col-reverse gap-2 mt-6 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={() => setStep("input")}>
                <ArrowLeft className="size-4 mr-1.5" />
                Back
              </Button>
              <Button onClick={handleStep2Next}>
                <Calculator className="size-4 mr-1.5" />
                Calculate & Preview
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && result && (
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Distribution Preview — {referenceMonth}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">USD</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Rate</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Gross PKR</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Contractor Tax</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Remittance Tax</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Total Tax</TableHead>
                    <TableHead className="text-right">Net PKR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.employees.map((emp) => (
                    <TableRow key={emp.employee_id} className="transition-all duration-200">
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        ${formatNumber(emp.salary_usd, 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums hidden sm:table-cell">
                        {formatNumber(emp.rate, 2)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums hidden sm:table-cell">
                        {formatPKR(emp.gross_pkr)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-red-400 hidden md:table-cell">
                        {formatPKR(emp.contractor_tax_pkr)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-red-400 hidden md:table-cell">
                        {formatPKR(emp.remittance_tax_pkr)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-red-400 hidden sm:table-cell">
                        {formatPKR(emp.total_tax_pkr)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums font-semibold text-emerald-400">
                        {formatPKR(emp.net_pkr)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      ${formatNumber(result.employees.reduce((s, e) => s + e.salary_usd, 0), 0)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell"></TableCell>
                    <TableCell className="text-right font-mono tabular-nums hidden sm:table-cell">
                      {formatPKR(result.summary.total_employee_gross)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums hidden md:table-cell">
                      {formatPKR(result.summary.total_contractor_tax)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums hidden md:table-cell">
                      {formatPKR(result.summary.total_employee_tax - result.summary.total_contractor_tax)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums hidden sm:table-cell">
                      {formatPKR(result.summary.total_employee_tax)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatPKR(result.summary.total_employee_net)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>

          {/* Company Share */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground" />
                <CardTitle>Company Share (Kontemplay)</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3 text-sm">
                <div className="text-muted-foreground">USD Share</div>
                <div className="text-right font-mono tabular-nums font-medium">${formatNumber(result.company.usd, 0)}</div>
                <div className="text-muted-foreground">Gross from USD (base rate)</div>
                <div className="text-right font-mono tabular-nums font-medium">{formatPKR(result.company.gross_from_usd)}</div>
                <div className="text-muted-foreground">Threshold Savings</div>
                <div className="text-right font-mono tabular-nums font-medium text-emerald-400">{formatPKR(result.company.threshold_savings)}</div>
                <div className="text-muted-foreground">Total before tax</div>
                <div className="text-right font-mono tabular-nums font-medium">{formatPKR(result.company.total_before_tax)}</div>
                <div className="text-muted-foreground">Remittance tax ({remittanceTax}%)</div>
                <div className="text-right font-mono tabular-nums font-medium text-red-400">
                  -{formatPKR(result.company.remittance_tax_amount)}
                </div>
                <div className="border-t border-border/50 pt-3 font-semibold">Company Net</div>
                <div className="border-t border-border/50 pt-3 text-right font-mono tabular-nums text-base font-bold text-emerald-400">
                  {formatPKR(result.company.net_pkr)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verification */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-muted-foreground" />
                <CardTitle>Verification</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3 text-sm">
                <div className="text-muted-foreground">Employee Net</div>
                <div className="text-right font-mono tabular-nums font-medium">{formatPKR(result.summary.total_employee_net)}</div>
                <div className="text-muted-foreground">Employee Tax</div>
                <div className="text-right font-mono tabular-nums font-medium text-red-400">{formatPKR(result.summary.total_employee_tax)}</div>
                <div className="text-muted-foreground">Company Net</div>
                <div className="text-right font-mono tabular-nums font-medium">{formatPKR(result.summary.company_net)}</div>
                <div className="text-muted-foreground">Company Tax</div>
                <div className="text-right font-mono tabular-nums font-medium text-red-400">{formatPKR(result.company.remittance_tax_amount)}</div>
                <div className="border-t border-border/50 pt-3 font-semibold">Grand Total</div>
                <div className="border-t border-border/50 pt-3 text-right font-mono tabular-nums font-bold">
                  {formatPKR(result.summary.grand_total)}
                </div>
                <div className="font-semibold">Original Amount</div>
                <div className="text-right font-mono tabular-nums font-bold">
                  {formatPKR(result.summary.original_amount)}
                </div>
              </div>

              <div className="mt-5">
                {result.summary.is_balanced ? (
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
                    <CheckCircle className="size-3 mr-1" />
                    Balanced (diff: {formatNumber(result.summary.difference, 2)} PKR)
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    UNBALANCED — Difference: {formatPKR(result.summary.difference)}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="save-txns"
                    checked={saveAsTransactions}
                    onCheckedChange={(v) => setSaveAsTransactions(!!v)}
                  />
                  <Label htmlFor="save-txns" className="text-[13px]">
                    Save as debit transactions (salary payouts + contractor tax)
                  </Label>
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <Button variant="outline" onClick={() => setStep("employees")}>
                    <ArrowLeft className="size-4 mr-1.5" />
                    Back
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save & Generate Invoices"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Invoices */}
      {step === "done" && result && (
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Invoices Generated — {referenceMonth}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/20">
                  <CheckCircle className="size-4 text-emerald-400" />
                </div>
                <p className="text-[13px] text-muted-foreground">
                  Distribution and <span className="font-medium text-foreground">{result.employees.length} invoices</span> saved successfully. Print individual invoices below.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Individual Invoice Cards */}
          {result.employees.map((emp) => (
            <Card key={emp.employee_id} className="print:break-inside-avoid">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{emp.name}</CardTitle>
                    <p className="text-[13px] text-muted-foreground mt-1">
                      Invoice for {referenceMonth}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const el = document.getElementById(`invoice-${emp.employee_id}`);
                      if (el) {
                        const w = window.open("", "_blank");
                        if (w) {
                          w.document.write(`
                            <html><head><title>Invoice - ${emp.name} - ${referenceMonth}</title>
                            <style>
                              body { font-family: system-ui, sans-serif; padding: 40px; color: #1a1a1a; }
                              table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                              th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e5e5; }
                              th { font-size: 12px; color: #666; font-weight: 600; }
                              td { font-size: 14px; }
                              .mono { font-family: monospace; }
                              .right { text-align: right; }
                              .bold { font-weight: 700; }
                              .green { color: #059669; }
                              .red { color: #dc2626; }
                              .header { margin-bottom: 24px; }
                              .header h1 { font-size: 24px; margin: 0; }
                              .header p { color: #666; margin: 4px 0 0; }
                              .divider { border-top: 2px solid #1a1a1a; margin: 16px 0; }
                              .net-row td { font-size: 18px; font-weight: 700; border-top: 2px solid #1a1a1a; }
                              .footer { margin-top: 32px; font-size: 12px; color: #999; }
                            </style></head><body>
                            <div class="header">
                              <h1>Kontemplay Finance</h1>
                              <p>Payment Invoice</p>
                            </div>
                            <table>
                              <tr><th>Employee</th><td class="bold">${emp.name}</td></tr>
                              <tr><th>Period</th><td>${referenceMonth}</td></tr>
                              <tr><th>Salary (USD)</th><td class="mono">$${formatNumber(emp.salary_usd, 0)}</td></tr>
                              <tr><th>Exchange Rate</th><td class="mono">${formatNumber(emp.rate, 2)} PKR/USD</td></tr>
                              <tr><th>Gross (PKR)</th><td class="mono">${formatPKR(emp.gross_pkr)}</td></tr>
                              <tr><th>Contractor Tax (${emp.contractor_tax_percent}%)</th><td class="mono red">-${formatPKR(emp.contractor_tax_pkr)}</td></tr>
                              <tr><th>Remittance Tax (${emp.remittance_tax_percent}%)</th><td class="mono red">-${formatPKR(emp.remittance_tax_pkr)}</td></tr>
                              <tr><th>Total Tax</th><td class="mono red">-${formatPKR(emp.total_tax_pkr)}</td></tr>
                              <tr class="net-row"><th>Net Payable (PKR)</th><td class="mono green">${formatPKR(emp.net_pkr)}</td></tr>
                            </table>
                            <div class="footer">
                              <p>Generated by Kontemplay Finance on ${new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "long", year: "numeric" })}</p>
                            </div>
                            </body></html>
                          `);
                          w.document.close();
                          w.print();
                        }
                      }
                    }}
                  >
                    <Printer className="size-3.5 mr-1.5" />
                    Print
                  </Button>
                </div>
              </CardHeader>
              <CardContent id={`invoice-${emp.employee_id}`}>
                <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3 text-sm">
                  <div className="text-muted-foreground">Salary (USD)</div>
                  <div className="text-right font-mono tabular-nums font-medium">${formatNumber(emp.salary_usd, 0)}</div>

                  <div className="text-muted-foreground">Exchange Rate</div>
                  <div className="text-right font-mono tabular-nums font-medium">{formatNumber(emp.rate, 2)} PKR/USD</div>

                  <div className="text-muted-foreground">Gross (PKR)</div>
                  <div className="text-right font-mono tabular-nums font-medium">{formatPKR(emp.gross_pkr)}</div>

                  <div className="text-muted-foreground">Contractor Tax ({emp.contractor_tax_percent}%)</div>
                  <div className="text-right font-mono tabular-nums font-medium text-red-400">-{formatPKR(emp.contractor_tax_pkr)}</div>

                  <div className="text-muted-foreground">Remittance Tax ({emp.remittance_tax_percent}%)</div>
                  <div className="text-right font-mono tabular-nums font-medium text-red-400">-{formatPKR(emp.remittance_tax_pkr)}</div>

                  <div className="text-muted-foreground">Total Tax</div>
                  <div className="text-right font-mono tabular-nums font-medium text-red-400">-{formatPKR(emp.total_tax_pkr)}</div>

                  <div className="border-t border-border/50 pt-3 font-semibold">Net Payable (PKR)</div>
                  <div className="border-t border-border/50 pt-3 text-right font-mono tabular-nums text-lg font-bold text-emerald-400">
                    {formatPKR(emp.net_pkr)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Summary + New Distribution */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[13px] text-muted-foreground">
                  Total distributed: <span className="font-mono tabular-nums font-semibold text-emerald-400">{formatPKR(result.summary.total_employee_net)}</span> to {result.employees.length} employees
                </div>
                <Button
                  onClick={() => {
                    setStep("input");
                    setResult(null);
                    setSavedDistId(null);
                  }}
                >
                  <RotateCcw className="size-4 mr-1.5" />
                  New Distribution
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
