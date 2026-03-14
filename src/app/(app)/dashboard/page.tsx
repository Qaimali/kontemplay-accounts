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

  // --- Meaningful metrics ---
  const sum = (type: TransactionType) =>
    allTxns.filter((t) => t.type === type).reduce((s, t) => s + t.amount_pkr, 0);

  const clientRevenue = sum("client_payment");
  const salaryPayouts = sum("salary_payout");
  const contractorTax = sum("contractor_tax");
  const ownerRepayments = sum("owner_repayment");
  const ownerInvestments = sum("owner_investment");
  const expenses = sum("expense");

  // Cash position: client money in - operating costs - repayments to owners
  // Owner investments & expenses cancel out (partners paid directly for company expenses)
  const operatingCost = salaryPayouts + contractorTax;
  const cashPosition = clientRevenue - operatingCost - ownerRepayments;

  // Owner liabilities
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Financial overview and recent activity
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Client Revenue
                <Tip text="Total payments received from clients. This is the actual income." />
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <TrendingUp className="size-4 text-emerald-400" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold font-mono tracking-tight text-emerald-400">
              {formatPKR(clientRevenue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Operating Cost
                <Tip text={`Salaries + contractor tax paid from client revenue.\n\n• Salaries: ${formatPKR(salaryPayouts)}\n• Contractor tax (FBR): ${formatPKR(contractorTax)}`} />
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-red-500/10">
                <TrendingDown className="size-4 text-red-400" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold font-mono tracking-tight text-red-400">
              {formatPKR(operatingCost)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Cash Position
                <Tip text={`What the company actually has (or owes).\n\nClient Revenue: ${formatPKR(clientRevenue)}\n- Operating Cost: ${formatPKR(operatingCost)}\n- Repaid to Owners: ${formatPKR(ownerRepayments)}\n= Cash: ${formatPKR(cashPosition)}\n\nNote: Owner investments & expenses cancel out (partners paid directly for things like domain, designer, etc.)`} />
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                <Wallet className="size-4 text-primary" />
              </div>
            </div>
            <p className={`mt-2 text-2xl font-bold font-mono tracking-tight ${cashPosition >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatPKR(cashPosition)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Owes to Partners
                <Tip text={`Total outstanding loans from partners. Partners paid for company expenses out of pocket — this is what the company still needs to pay back.\n\nTotal invested: ${formatPKR(ownerInvestments)}\nTotal repaid: ${formatPKR(ownerRepayments)}\nStill owed: ${formatPKR(totalOwed)}`} />
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10">
                <Scale className="size-4 text-amber-400" />
              </div>
            </div>
            <p className={`mt-2 text-2xl font-bold font-mono tracking-tight text-amber-400`}>
              {formatPKR(totalOwed)}
            </p>
          </CardContent>
        </Card>
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
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-muted/50">
                <ArrowDownRight className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
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
                      <TableCell className="max-w-[300px] truncate hidden sm:table-cell">
                        {txn.description ??
                          (txn.reference_month
                            ? formatMonth(txn.reference_month)
                            : "-")}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <span className={`font-mono font-medium ${txn.is_credit ? "text-emerald-400" : "text-red-400"}`}>
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
