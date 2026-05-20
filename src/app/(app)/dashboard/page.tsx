import { query } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { formatPKR, formatMonth } from "@/lib/format";
import type { Transaction, TransactionType, Owner } from "@/lib/types";
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
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { OwnerLiabilities } from "./owner-liabilities";
import { MetricCards, type MetricDef, type MetricSection, type DrilldownTxn } from "./metric-cards";

const typeLabels: Record<TransactionType, string> = {
  client_payment: "Client Payment",
  owner_investment: "Owner Investment",
  salary_payout: "Salary Payout",
  contractor_tax: "Contractor Tax",
  owner_repayment: "Owner Repayment",
  expense: "Expense",
  owner_withdrawal: "Owner Withdrawal",
  owner_return: "Owner Return",
};

const typeBadgeVariant: Record<
  TransactionType,
  "default" | "secondary" | "destructive" | "outline" | "warning"
> = {
  client_payment: "default",
  owner_investment: "secondary",
  salary_payout: "destructive",
  contractor_tax: "destructive",
  owner_repayment: "outline",
  expense: "destructive",
  owner_withdrawal: "warning",
  owner_return: "warning",
};

export default async function DashboardPage() {
  await requireAuth();

  const [rawTransactions, allOwners] = await Promise.all([
    query<Transaction & { is_credit: number }>("SELECT * FROM transactions ORDER BY created_at DESC"),
    query<Owner>("SELECT * FROM owners"),
  ]);

  const allTxns: Transaction[] = rawTransactions.map(t => {
    const txn = t as Record<string, unknown>;
    return { ...txn, is_credit: !!txn.is_credit, is_transfer: !!txn.is_transfer } as Transaction;
  });

  const ownerNames: Record<string, string> = {};
  for (const o of allOwners) {
    ownerNames[o.id] = o.name;
  }

  const sum = (type: TransactionType) =>
    allTxns.filter((t) => t.type === type).reduce((s, t) => s + t.amount_pkr, 0);

  const clientRevenue = sum("client_payment");
  const ownerRepayments = sum("owner_repayment");
  const ownerInvestments = sum("owner_investment");
  const ownerWithdrawals = sum("owner_withdrawal");
  const ownerReturns = sum("owner_return");

  // Total In / Out — exclude transfers (withdrawals, returns, investments)
  const totalIn = allTxns
    .filter((t) => t.is_credit && !t.is_transfer)
    .reduce((s, t) => s + t.amount_pkr, 0);
  const totalOut = allTxns
    .filter((t) => !t.is_credit && !t.is_transfer)
    .reduce((s, t) => s + t.amount_pkr, 0);

  // Bank Balance — use source column: only count bank-sourced transactions
  // plus withdrawals (bank outflow) and returns (bank inflow)
  const bankBalance = allTxns.reduce((s, t) => {
    if (t.source === "bank") return s + (t.is_credit ? t.amount_pkr : -t.amount_pkr);
    if (t.type === "owner_withdrawal") return s - t.amount_pkr;
    if (t.type === "owner_return") return s + t.amount_pkr;
    return s;
  }, 0);

  // Owner payback: what owner owes = withdrew - distributed from withdrawal - returned
  const distributedFromWithdrawals = allTxns
    .filter((t) => t.source === "owner_withdrawal" && !t.is_transfer)
    .reduce((s, t) => s + t.amount_pkr, 0);

  // Owner liabilities (what company owes owners)
  const ownerMap = new Map<
    string,
    { name: string; invested: number; repaid: number }
  >();

  for (const t of allTxns) {
    if (t.type === "owner_investment" && t.is_credit && t.owner_id) {
      const entry = ownerMap.get(t.owner_id) ?? {
        name: ownerNames[t.owner_id] || "Unknown",
        invested: 0,
        repaid: 0,
      };
      entry.invested += t.amount_pkr;
      ownerMap.set(t.owner_id, entry);
    }
    if (t.type === "owner_repayment" && !t.is_credit && t.owner_id) {
      const entry = ownerMap.get(t.owner_id) ?? {
        name: ownerNames[t.owner_id] || "Unknown",
        invested: 0,
        repaid: 0,
      };
      entry.repaid += t.amount_pkr;
      ownerMap.set(t.owner_id, entry);
    }
  }

  const ownerTxns = allTxns.filter(
    (t) => t.type === "owner_investment" || t.type === "owner_repayment"
  );

  const ownerLiabilities = Array.from(ownerMap.entries()).map(
    ([id, data]) => ({
      id,
      name: data.name,
      invested: data.invested,
      repaid: data.repaid,
      owed: data.invested - data.repaid,
      transactions: ownerTxns
        .filter((t) => t.owner_id === id)
        .map((t) => ({
          id: t.id,
          type: t.type,
          amount_pkr: t.amount_pkr,
          description: t.description,
          created_at: t.created_at,
        })),
    })
  );

  const totalOwed = ownerLiabilities.reduce((sum, o) => sum + o.owed, 0);

  // Per-owner receivables: withdrew - distributed from withdrawal - returned = excess held
  const ownerReceivableMap = new Map<
    string,
    { name: string; withdrawn: number; distributed: number; returned: number }
  >();
  for (const t of allTxns) {
    if (t.type === "owner_withdrawal" && t.owner_id) {
      const entry = ownerReceivableMap.get(t.owner_id) ?? {
        name: ownerNames[t.owner_id] || "Unknown",
        withdrawn: 0,
        distributed: 0,
        returned: 0,
      };
      entry.withdrawn += t.amount_pkr;
      ownerReceivableMap.set(t.owner_id, entry);
    }
    if (t.type === "owner_return" && t.owner_id) {
      const entry = ownerReceivableMap.get(t.owner_id) ?? {
        name: ownerNames[t.owner_id] || "Unknown",
        withdrawn: 0,
        distributed: 0,
        returned: 0,
      };
      entry.returned += t.amount_pkr;
      ownerReceivableMap.set(t.owner_id, entry);
    }
  }
  // Sum expenses funded from owner_withdrawal (source = 'owner_withdrawal')
  for (const t of allTxns) {
    if (t.source === "owner_withdrawal" && !t.is_transfer) {
      // Find which owner's withdrawal funded this (use withdrawal month matching)
      for (const [ownerId, entry] of ownerReceivableMap) {
        // All current withdrawals are Sanan's, but this is generic
        const ownerWithdrawalMonths = new Set(
          allTxns
            .filter((w) => w.type === "owner_withdrawal" && w.owner_id === ownerId && w.reference_month)
            .map((w) => w.reference_month!)
        );
        if (t.reference_month && ownerWithdrawalMonths.has(t.reference_month)) {
          entry.distributed += t.amount_pkr;
          break;
        }
      }
    }
  }
  const ownerReceivables = Array.from(ownerReceivableMap.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      withdrawn: data.withdrawn,
      distributed: data.distributed,
      returned: data.returned,
      balance: data.withdrawn - data.distributed - data.returned,
    }))
    .filter((r) => r.balance > 0);

  // Prepare drill-down sections for each metric card
  const pickTxn = (t: Transaction): DrilldownTxn => ({
    id: t.id,
    type: t.type,
    amount_pkr: t.amount_pkr,
    is_credit: t.is_credit,
    description: t.description,
    reference_month: t.reference_month,
    created_at: t.created_at,
    owner_id: t.owner_id,
  });

  const salaryPayouts = sum("salary_payout");
  const contractorTax = sum("contractor_tax");
  const expenses = sum("expense");

  const makeSection = (
    label: string,
    isCredit: boolean,
    filter: (t: Transaction) => boolean
  ): MetricSection => {
    const txns = allTxns.filter(filter);
    return {
      label,
      isCredit,
      total: txns.reduce((s, t) => s + t.amount_pkr, 0),
      transactions: txns.map(pickTxn),
    };
  };

  // Bank credits/debits for drill-down
  const bankCredits = allTxns.filter((t) => t.source === "bank" && t.is_credit);
  const bankDebits = allTxns.filter((t) => t.source === "bank" && !t.is_credit);
  const bankCreditTotal = bankCredits.reduce((s, t) => s + t.amount_pkr, 0);
  const bankDebitTotal = bankDebits.reduce((s, t) => s + t.amount_pkr, 0);

  const ownerPayback = ownerWithdrawals - distributedFromWithdrawals - ownerReturns;

  // Company Net Worth = what's in the bank + what owners owe back - what company owes partners
  const companyNetWorth = bankBalance + ownerPayback - totalOwed;

  const metricDefs: MetricDef[] = [
    {
      label: "Total In",
      value: totalIn,
      tip: `All operational revenue (excludes transfers like investments).\n\n\u2022 Client payments: ${formatPKR(clientRevenue)}`,
      icon: "in",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
      valueColor: "text-emerald-400",
      stripColor: "oklch(0.76 0.18 155)",
      sections: [
        makeSection("Client Payments", true, (t) => t.type === "client_payment"),
      ],
    },
    {
      label: "Total Out",
      value: totalOut,
      tip: `All expenses (excluding transfers like withdrawals/investments).\n\n\u2022 Salaries: ${formatPKR(salaryPayouts)}\n\u2022 Contractor tax: ${formatPKR(contractorTax)}\n\u2022 Expenses: ${formatPKR(expenses)}\n\u2022 Owner repayments: ${formatPKR(ownerRepayments)}`,
      icon: "out",
      iconBg: "bg-red-500/10",
      iconColor: "text-red-400",
      valueColor: "text-red-400",
      stripColor: "oklch(0.63 0.24 25)",
      sections: [
        makeSection("Salary Payouts", false, (t) => t.type === "salary_payout"),
        makeSection("Contractor Tax", false, (t) => t.type === "contractor_tax"),
        makeSection("Expenses", false, (t) => t.type === "expense"),
        makeSection("Owner Repayments", false, (t) => t.type === "owner_repayment"),
      ],
    },
    {
      label: "Bank Balance",
      value: bankBalance,
      tip: `Estimated company bank balance.\n\nBank credits (source=bank): +${formatPKR(bankCreditTotal)}\nBank debits (source=bank): -${formatPKR(bankDebitTotal)}\nOwner withdrawals: -${formatPKR(ownerWithdrawals)}\nOwner returns: +${formatPKR(ownerReturns)}\n= ${formatPKR(bankBalance)}`,
      icon: "bank",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      valueColor: bankBalance >= 0 ? "text-emerald-400" : "text-red-400",
      stripColor: "oklch(0.72 0.185 195)",
      sections: [
        {
          label: "Bank Credits",
          isCredit: true,
          total: bankCreditTotal,
          transactions: bankCredits.map(pickTxn),
        },
        {
          label: "Bank Debits",
          isCredit: false,
          total: bankDebitTotal,
          transactions: bankDebits.map(pickTxn),
        },
        makeSection("Owner Withdrawals", false, (t) => t.type === "owner_withdrawal"),
        makeSection("Owner Returns", true, (t) => t.type === "owner_return"),
      ],
    },
    {
      label: "Owes to Partners",
      value: totalOwed,
      tip: `What the company still owes partners for out-of-pocket expenses.\n\nTotal invested: ${formatPKR(ownerInvestments)}\nTotal repaid: ${formatPKR(ownerRepayments)}\nStill owed: ${formatPKR(totalOwed)}`,
      icon: "partners",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
      valueColor: "text-amber-400",
      stripColor: "oklch(0.78 0.16 85)",
      sections: [
        makeSection("Owner Investments", true, (t) => t.type === "owner_investment"),
        makeSection("Owner Repayments", false, (t) => t.type === "owner_repayment"),
      ],
    },
    {
      label: "Net Worth",
      value: companyNetWorth,
      tip: `What the company is actually worth today.\n\nBank Balance: ${formatPKR(bankBalance)}\n+ Owner Payback: ${formatPKR(ownerPayback)}\n\u2212 Owes to Partners: ${formatPKR(totalOwed)}\n= Net Worth: ${formatPKR(companyNetWorth)}`,
      subtitle: `Bank (${formatPKR(bankBalance)}) + Payback (${formatPKR(ownerPayback)}) \u2212 Owed (${formatPKR(totalOwed)})`,
      icon: "networth",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
      valueColor: companyNetWorth >= 0 ? "text-emerald-400" : "text-red-400",
      stripColor: "oklch(0.72 0.185 195)",
      sections: [
        { label: "Bank Balance", isCredit: true, total: bankBalance, transactions: [] },
        { label: "Owner Payback (Receivable)", isCredit: true, total: ownerPayback, transactions: [] },
        { label: "Owes to Partners", isCredit: false, total: totalOwed, transactions: [] },
      ],
    },
  ];

  const recentTxns = allTxns.slice(0, 10);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Financial overview and recent activity
        </p>
      </div>

      {/* Metric Cards with drill-down */}
      <MetricCards metrics={metricDefs} ownerNames={ownerNames} />

      {/* Owner Liabilities */}
      <OwnerLiabilities
        owners={ownerLiabilities}
        totalOwed={totalOwed}
        receivables={ownerReceivables}
      />

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpRight className="size-4 text-muted-foreground" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentTxns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/30">
                <ArrowDownRight className="size-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No transactions yet</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Transactions will appear here once recorded</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden sm:table-cell">Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTxns.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {new Date(txn.created_at).toLocaleDateString("en-PK", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={typeBadgeVariant[txn.type]}>
                          {typeLabels[txn.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate hidden sm:table-cell text-muted-foreground">
                        {txn.description ??
                          (txn.reference_month
                            ? formatMonth(txn.reference_month)
                            : "-")}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <span className={`font-mono font-medium tabular-nums ${txn.is_credit ? "text-emerald-400" : "text-red-400"}`}>
                          {txn.is_credit ? "+" : "-"}
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
      </Card>
    </div>
  );
}
