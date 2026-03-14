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

type Step = "input" | "employees" | "preview" | "done";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Distribute</h1>
        <div className="flex flex-wrap gap-2">
          {(["input", "employees", "preview", "done"] as Step[]).map((s, i) => (
            <Badge key={s} variant={step === s ? "default" : "outline"}>
              {i + 1}. {s === "input" ? "Payment" : s === "employees" ? "Employees" : s === "preview" ? "Preview" : "Invoices"}
            </Badge>
          ))}
        </div>
      </div>

      {/* Step 1: Payment Details */}
      {step === "input" && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Reference Month</Label>
                <Input
                  value={referenceMonth}
                  onChange={(e) => setReferenceMonth(e.target.value)}
                  placeholder="2026-03"
                />
              </div>
              <div className="space-y-2">
                <Label>Amount Received (PKR)</Label>
                <Input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="334800"
                />
              </div>
              <div className="space-y-2">
                <Label>Bank Remittance Tax (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={remittanceTax}
                  onChange={(e) => setRemittanceTax(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Total USD</Label>
                <Input
                  type="number"
                  value={totalUsd}
                  onChange={(e) => setTotalUsd(e.target.value)}
                  placeholder="1200"
                />
              </div>
              <div className="space-y-2">
                <Label>Default Threshold (PKR/USD)</Label>
                <Input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                />
              </div>
            </div>

            {rates && (
              <div className="mt-4 rounded-lg border p-4 bg-muted/50">
                <h3 className="font-semibold mb-2">Calculated Rates</h3>
                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <span className="text-muted-foreground">Original Amount:</span>
                    <p className="font-mono font-semibold">{formatPKR(rates.original_amount)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Base Rate:</span>
                    <p className="font-mono font-semibold">{formatNumber(rates.base_rate, 4)} PKR/USD</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Effective Rate:</span>
                    <p className="font-mono font-semibold">{formatNumber(rates.effective_rate, 4)} PKR/USD</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleStep1Next} disabled={!rates}>
                Next: Configure Employees
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
              <p className="text-sm text-muted-foreground">
                Base Rate: {formatNumber(rates.base_rate, 4)} PKR/USD | Default Threshold: {threshold} PKR
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
                  <TableRow key={emp.employee_id} className={!emp.included ? "opacity-50" : ""}>
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
                    <TableCell className="font-mono">
                      {emp.included && rates
                        ? formatNumber(rates.base_rate - emp.threshold, 2)
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              Total Employee USD:{" "}
              <strong>${formatNumber(employees.filter((e) => e.included).reduce((s, e) => s + e.salary_usd, 0), 0)}</strong>
              {" | "}Company USD:{" "}
              <strong>
                ${formatNumber(parseFloat(totalUsd) - employees.filter((e) => e.included).reduce((s, e) => s + e.salary_usd, 0), 0)}
              </strong>
            </div>

            <div className="flex flex-col-reverse gap-2 mt-4 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={() => setStep("input")}>
                Back
              </Button>
              <Button onClick={handleStep2Next}>Calculate & Preview</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && result && (
        <div className="space-y-6">
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
                    <TableRow key={emp.employee_id}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell className="text-right font-mono">
                        ${formatNumber(emp.salary_usd, 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono hidden sm:table-cell">
                        {formatNumber(emp.rate, 2)}
                      </TableCell>
                      <TableCell className="text-right font-mono hidden sm:table-cell">
                        {formatPKR(emp.gross_pkr)}
                      </TableCell>
                      <TableCell className="text-right font-mono hidden md:table-cell">
                        {formatPKR(emp.contractor_tax_pkr)}
                      </TableCell>
                      <TableCell className="text-right font-mono hidden md:table-cell">
                        {formatPKR(emp.remittance_tax_pkr)}
                      </TableCell>
                      <TableCell className="text-right font-mono hidden sm:table-cell">
                        {formatPKR(emp.total_tax_pkr)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatPKR(emp.net_pkr)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right font-mono">
                      ${formatNumber(result.employees.reduce((s, e) => s + e.salary_usd, 0), 0)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell"></TableCell>
                    <TableCell className="text-right font-mono hidden sm:table-cell">
                      {formatPKR(result.summary.total_employee_gross)}
                    </TableCell>
                    <TableCell className="text-right font-mono hidden md:table-cell">
                      {formatPKR(result.summary.total_contractor_tax)}
                    </TableCell>
                    <TableCell className="text-right font-mono hidden md:table-cell">
                      {formatPKR(result.summary.total_employee_tax - result.summary.total_contractor_tax)}
                    </TableCell>
                    <TableCell className="text-right font-mono hidden sm:table-cell">
                      {formatPKR(result.summary.total_employee_tax)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
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
              <CardTitle>Company Share (Kontemplay)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
                <div>USD Share:</div>
                <div className="text-right font-mono">${formatNumber(result.company.usd, 0)}</div>
                <div>Gross from USD (base rate):</div>
                <div className="text-right font-mono">{formatPKR(result.company.gross_from_usd)}</div>
                <div>Threshold Savings:</div>
                <div className="text-right font-mono">{formatPKR(result.company.threshold_savings)}</div>
                <div>Total before tax:</div>
                <div className="text-right font-mono">{formatPKR(result.company.total_before_tax)}</div>
                <div>Remittance tax ({remittanceTax}%):</div>
                <div className="text-right font-mono text-red-400">
                  -{formatPKR(result.company.remittance_tax_amount)}
                </div>
                <div className="font-bold">Company Net:</div>
                <div className="text-right font-mono font-bold">{formatPKR(result.company.net_pkr)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Verification */}
          <Card>
            <CardHeader>
              <CardTitle>Verification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
                <div>Employee Net:</div>
                <div className="text-right font-mono">{formatPKR(result.summary.total_employee_net)}</div>
                <div>Employee Tax:</div>
                <div className="text-right font-mono">{formatPKR(result.summary.total_employee_tax)}</div>
                <div>Company Net:</div>
                <div className="text-right font-mono">{formatPKR(result.summary.company_net)}</div>
                <div>Company Tax:</div>
                <div className="text-right font-mono">{formatPKR(result.company.remittance_tax_amount)}</div>
                <div className="border-t pt-2 font-bold">Grand Total:</div>
                <div className="border-t pt-2 text-right font-mono font-bold">
                  {formatPKR(result.summary.grand_total)}
                </div>
                <div className="font-bold">Original Amount:</div>
                <div className="text-right font-mono font-bold">
                  {formatPKR(result.summary.original_amount)}
                </div>
              </div>

              {result.summary.is_balanced ? (
                <Badge className="mt-4 bg-emerald-500">Balanced (diff: {formatNumber(result.summary.difference, 2)} PKR)</Badge>
              ) : (
                <Badge variant="destructive" className="mt-4">
                  UNBALANCED — Difference: {formatPKR(result.summary.difference)}
                </Badge>
              )}
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
                  <Label htmlFor="save-txns" className="text-sm">
                    Save as debit transactions (salary payouts + contractor tax)
                  </Label>
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <Button variant="outline" onClick={() => setStep("employees")}>
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
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoices Generated — {referenceMonth}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-sm text-muted-foreground mb-4">
                Distribution and {result.employees.length} invoices saved successfully. Print individual invoices below.
              </p>
            </CardContent>
          </Card>

          {/* Individual Invoice Cards */}
          {result.employees.map((emp) => (
            <Card key={emp.employee_id} className="print:break-inside-avoid">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{emp.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
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
                    Print
                  </Button>
                </div>
              </CardHeader>
              <CardContent id={`invoice-${emp.employee_id}`}>
                <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-sm">
                  <div className="text-muted-foreground">Salary (USD)</div>
                  <div className="text-right font-mono">${formatNumber(emp.salary_usd, 0)}</div>

                  <div className="text-muted-foreground">Exchange Rate</div>
                  <div className="text-right font-mono">{formatNumber(emp.rate, 2)} PKR/USD</div>

                  <div className="text-muted-foreground">Gross (PKR)</div>
                  <div className="text-right font-mono">{formatPKR(emp.gross_pkr)}</div>

                  <div className="text-muted-foreground">Contractor Tax ({emp.contractor_tax_percent}%)</div>
                  <div className="text-right font-mono text-red-400">-{formatPKR(emp.contractor_tax_pkr)}</div>

                  <div className="text-muted-foreground">Remittance Tax ({emp.remittance_tax_percent}%)</div>
                  <div className="text-right font-mono text-red-400">-{formatPKR(emp.remittance_tax_pkr)}</div>

                  <div className="text-muted-foreground">Total Tax</div>
                  <div className="text-right font-mono text-red-400">-{formatPKR(emp.total_tax_pkr)}</div>

                  <div className="border-t border-border/50 pt-3 font-semibold">Net Payable (PKR)</div>
                  <div className="border-t border-border/50 pt-3 text-right font-mono text-lg font-bold text-emerald-400">
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
                <div className="text-sm text-muted-foreground">
                  Total distributed: <span className="font-mono font-semibold text-foreground">{formatPKR(result.summary.total_employee_net)}</span> to {result.employees.length} employees
                </div>
                <Button
                  onClick={() => {
                    setStep("input");
                    setResult(null);
                    setSavedDistId(null);
                  }}
                >
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
