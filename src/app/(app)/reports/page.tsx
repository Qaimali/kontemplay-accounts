"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPKR, formatMonth } from "@/lib/format";
import { exportToCSV } from "@/lib/export";
import type { Transaction, TransactionType } from "@/lib/types";
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
  TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, FileDown, BarChart3 } from "lucide-react";
import { Tip } from "@/components/ui/tip";

const typeLabels: Record<TransactionType, string> = {
  client_payment: "Client Payment",
  owner_investment: "Owner Investment",
  salary_payout: "Salary Payout",
  contractor_tax: "Contractor Tax",
  owner_repayment: "Owner Repayment",
  expense: "Expense",
};

interface MonthlyPL {
  month: string;
  clientRevenue: number;
  salaryCost: number;
  contractorTax: number;
  companyMargin: number;
  expenses: number;
  ownerInvestments: number;
  ownerRepayments: number;
  transactions: Transaction[];
}

export default function ReportsPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<MonthlyPL[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .order("reference_month", { ascending: true });

    const transactions = (data as Transaction[] | null) ?? [];

    const monthMap = new Map<string, Transaction[]>();
    for (const txn of transactions) {
      const key = txn.reference_month ?? "no-month";
      if (!monthMap.has(key)) monthMap.set(key, []);
      monthMap.get(key)!.push(txn);
    }

    const plRows: MonthlyPL[] = [];
    for (const [month, txns] of monthMap) {
      if (month === "no-month") continue;

      let clientRevenue = 0;
      let salaryCost = 0;
      let contractorTax = 0;
      let expenses = 0;
      let ownerInvestments = 0;
      let ownerRepayments = 0;

      for (const txn of txns) {
        switch (txn.type) {
          case "client_payment":
            clientRevenue += txn.amount_pkr;
            break;
          case "salary_payout":
            salaryCost += txn.amount_pkr;
            break;
          case "contractor_tax":
            contractorTax += txn.amount_pkr;
            break;
          case "expense":
            expenses += txn.amount_pkr;
            break;
          case "owner_investment":
            ownerInvestments += txn.amount_pkr;
            break;
          case "owner_repayment":
            ownerRepayments += txn.amount_pkr;
            break;
        }
      }

      plRows.push({
        month,
        clientRevenue,
        salaryCost,
        contractorTax,
        companyMargin: clientRevenue - salaryCost - contractorTax,
        expenses,
        ownerInvestments,
        ownerRepayments,
        transactions: txns,
      });
    }

    plRows.sort((a, b) => b.month.localeCompare(a.month));
    setRows(plRows);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totals = rows.reduce(
    (acc, r) => ({
      clientRevenue: acc.clientRevenue + r.clientRevenue,
      salaryCost: acc.salaryCost + r.salaryCost,
      contractorTax: acc.contractorTax + r.contractorTax,
      companyMargin: acc.companyMargin + r.companyMargin,
      expenses: acc.expenses + r.expenses,
      ownerInvestments: acc.ownerInvestments + r.ownerInvestments,
      ownerRepayments: acc.ownerRepayments + r.ownerRepayments,
    }),
    {
      clientRevenue: 0,
      salaryCost: 0,
      contractorTax: 0,
      companyMargin: 0,
      expenses: 0,
      ownerInvestments: 0,
      ownerRepayments: 0,
    }
  );

  function handleExport() {
    const csvRows = rows.map((r) => ({
      Month: formatMonth(r.month),
      "Client Revenue": r.clientRevenue,
      "Salary Cost": r.salaryCost,
      "Contractor Tax": r.contractorTax,
      "Company Margin": r.companyMargin,
      Expenses: r.expenses,
      "Owner Investments": r.ownerInvestments,
      "Owner Repayments": r.ownerRepayments,
    }));
    exportToCSV(csvRows, "pl_report");
  }

  function toggleExpand(month: string) {
    setExpandedMonth((prev) => (prev === month ? null : month));
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Monthly P&L Report</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss by Month</CardTitle>
          <CardAction>
            {rows.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExport} className="transition-all duration-200">
                <FileDown className="size-3.5 mr-1.5" />
                Export CSV
              </Button>
            )}
          </CardAction>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/40">
                <BarChart3 className="size-7 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No transaction data available</p>
              <p className="mt-1 text-[13px] text-muted-foreground/60">
                Reports will appear here once you have transactions with reference months
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Salary Cost</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Contractor Tax</TableHead>
                  <TableHead className="text-right">
                    Margin
                    <Tip text="Margin = Revenue − Salary Cost − Contractor Tax&#10;&#10;This is the company's gross profit before expenses and owner movements. A negative margin means payroll exceeded client revenue for that month." />
                  </TableHead>
                  <TableHead className="text-right hidden md:table-cell">Expenses</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Investments</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Repayments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const isExpanded = expandedMonth === r.month;
                  return (
                    <>
                      <TableRow
                        key={r.month}
                        className="cursor-pointer transition-all duration-200"
                        onClick={() => toggleExpand(r.month)}
                      >
                        <TableCell>
                          <ChevronDown
                            className={`size-4 text-muted-foreground transition-transform duration-200 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatMonth(r.month)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-emerald-400 whitespace-nowrap">
                          {formatPKR(r.clientRevenue)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-red-400 hidden sm:table-cell whitespace-nowrap">
                          {formatPKR(r.salaryCost)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-red-400 hidden md:table-cell whitespace-nowrap">
                          {formatPKR(r.contractorTax)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                            r.companyMargin >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {formatPKR(r.companyMargin)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-red-400 hidden md:table-cell whitespace-nowrap">
                          {r.expenses > 0 ? formatPKR(r.expenses) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums hidden lg:table-cell whitespace-nowrap">
                          {r.ownerInvestments > 0 ? formatPKR(r.ownerInvestments) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums hidden lg:table-cell whitespace-nowrap">
                          {r.ownerRepayments > 0 ? formatPKR(r.ownerRepayments) : "-"}
                        </TableCell>
                      </TableRow>

                      {/* Expanded detail rows */}
                      {isExpanded && (
                        <TableRow key={`${r.month}-detail`}>
                          <TableCell colSpan={99} className="p-0">
                            <div className="bg-muted/20 px-6 py-4 border-y border-border/30">
                              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-3">
                                {formatMonth(r.month)} — {r.transactions.length} transaction{r.transactions.length !== 1 ? "s" : ""}
                              </p>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Credit</TableHead>
                                    <TableHead className="text-right">Debit</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {r.transactions.map((txn) => (
                                    <TableRow key={txn.id}>
                                      <TableCell className="text-xs whitespace-nowrap">
                                        {new Date(txn.created_at).toLocaleDateString("en-PK", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                        })}
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant={txn.is_credit ? "default" : "destructive"}
                                          className="text-xs"
                                        >
                                          {typeLabels[txn.type]}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="max-w-[250px] truncate text-sm">
                                        {txn.description ?? "-"}
                                      </TableCell>
                                      <TableCell className="text-right font-mono tabular-nums whitespace-nowrap">
                                        {txn.is_credit ? (
                                          <span className="text-emerald-400">{formatPKR(txn.amount_pkr)}</span>
                                        ) : "-"}
                                      </TableCell>
                                      <TableCell className="text-right font-mono tabular-nums whitespace-nowrap">
                                        {!txn.is_credit ? (
                                          <span className="text-red-400">{formatPKR(txn.amount_pkr)}</span>
                                        ) : "-"}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow className="font-bold">
                  <TableCell></TableCell>
                  <TableCell>All Time</TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-emerald-400 whitespace-nowrap">
                    {formatPKR(totals.clientRevenue)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-red-400 hidden sm:table-cell whitespace-nowrap">
                    {formatPKR(totals.salaryCost)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-red-400 hidden md:table-cell whitespace-nowrap">
                    {formatPKR(totals.contractorTax)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono tabular-nums whitespace-nowrap ${
                      totals.companyMargin >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {formatPKR(totals.companyMargin)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-red-400 hidden md:table-cell whitespace-nowrap">
                    {totals.expenses > 0 ? formatPKR(totals.expenses) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums hidden lg:table-cell whitespace-nowrap">
                    {totals.ownerInvestments > 0 ? formatPKR(totals.ownerInvestments) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums hidden lg:table-cell whitespace-nowrap">
                    {totals.ownerRepayments > 0 ? formatPKR(totals.ownerRepayments) : "-"}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
