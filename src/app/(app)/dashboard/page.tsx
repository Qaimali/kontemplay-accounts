import { createServerSupabaseClient } from "@/lib/supabase/server";
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
import { Tip } from "@/components/ui/tip";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { OwnerLiabilities } from "./owner-liabilities";

const typeLabels: Record<TransactionType, string> = {
  client_payment: "Client Payment",
  owner_investment: "Owner Investment",
  salary_payout: "Salary Payout",
  contractor_tax: "Contractor Tax",
  owner_repayment: "Owner Repayment",
  expense: "Expense",
};

const typeBadgeVariant: Record<
  TransactionType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  client_payment: "default",
  owner_investment: "secondary",
  salary_payout: "destructive",
  contractor_tax: "destructive",
  owner_repayment: "outline",
  expense: "destructive",
};

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const [{ data: transactions }, { data: owners }] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<Transaction[]>(),
    supabase.from("owners").select("*").returns<Owner[]>(),
  ]);

  const allTxns = transactions ?? [];
  const allOwners = owners ?? [];

  const ownerNames: Record<string, string> = {};
  for (const o of allOwners) {
    ownerNames[o.id] = o.name;
  }

  const sum = (type: TransactionType) =>
    allTxns.filter((t) => t.type === type).reduce((s, t) => s + t.amount_pkr, 0);

  const clientRevenue = sum("client_payment");
  const salaryPayouts = sum("salary_payout");
  const contractorTax = sum("contractor_tax");
  const ownerRepayments = sum("owner_repayment");
  const ownerInvestments = sum("owner_investment");
  const expenses = sum("expense");

  const operatingCost = salaryPayouts + contractorTax;
  const cashPosition = clientRevenue - operatingCost - ownerRepayments;

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

  const recentTxns = allTxns.slice(0, 10);

  const metrics = [
    {
      label: "Client Revenue",
      value: formatPKR(clientRevenue),
      tip: "Total payments received from clients. This is the actual income.",
      icon: TrendingUp,
      color: "emerald",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
      valueColor: "text-emerald-400",
      stripColor: "oklch(0.76 0.18 155)",
    },
    {
      label: "Operating Cost",
      value: formatPKR(operatingCost),
      tip: `Salaries + contractor tax paid from client revenue.\n\n\u2022 Salaries: ${formatPKR(salaryPayouts)}\n\u2022 Contractor tax (FBR): ${formatPKR(contractorTax)}`,
      icon: TrendingDown,
      color: "red",
      iconBg: "bg-red-500/10",
      iconColor: "text-red-400",
      valueColor: "text-red-400",
      stripColor: "oklch(0.63 0.24 25)",
    },
    {
      label: "Cash Position",
      value: formatPKR(cashPosition),
      tip: `What the company actually has (or owes).\n\nClient Revenue: ${formatPKR(clientRevenue)}\n- Operating Cost: ${formatPKR(operatingCost)}\n- Repaid to Owners: ${formatPKR(ownerRepayments)}\n= Cash: ${formatPKR(cashPosition)}\n\nNote: Owner investments & expenses cancel out (partners paid directly for things like domain, designer, etc.)`,
      icon: Wallet,
      color: "primary",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      valueColor: cashPosition >= 0 ? "text-emerald-400" : "text-red-400",
      stripColor: "oklch(0.72 0.185 195)",
    },
    {
      label: "Owes to Partners",
      value: formatPKR(totalOwed),
      tip: `Total outstanding loans from partners. Partners paid for company expenses out of pocket \u2014 this is what the company still needs to pay back.\n\nTotal invested: ${formatPKR(ownerInvestments)}\nTotal repaid: ${formatPKR(ownerRepayments)}\nStill owed: ${formatPKR(totalOwed)}`,
      icon: Scale,
      color: "amber",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
      valueColor: "text-amber-400",
      stripColor: "oklch(0.78 0.16 85)",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Financial overview and recent activity
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Card
              key={m.label}
              className="accent-strip-top"
              style={{ "--strip-color": m.stripColor } as React.CSSProperties}
            >
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
                      {m.label}
                      <Tip text={m.tip} />
                    </span>
                    <p className={`mt-2 text-2xl font-bold font-mono tracking-tight ${m.valueColor}`}>
                      {m.value}
                    </p>
                  </div>
                  <div className={`flex size-10 items-center justify-center rounded-xl ${m.iconBg}`}>
                    <Icon className={`size-5 ${m.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Owner Liabilities */}
      <OwnerLiabilities owners={ownerLiabilities} totalOwed={totalOwed} />

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
