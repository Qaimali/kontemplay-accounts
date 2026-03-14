import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatPKR, formatMonth } from "@/lib/format";
import type { Transaction, TransactionType } from "@/lib/types";
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

  // Fetch all transactions
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Transaction[]>();

  const allTxns = transactions ?? [];

  // --- Company Balance ---
  const totalCredits = allTxns
    .filter((t) => t.is_credit)
    .reduce((sum, t) => sum + t.amount_pkr, 0);

  const totalDebits = allTxns
    .filter((t) => !t.is_credit)
    .reduce((sum, t) => sum + t.amount_pkr, 0);

  const availableBalance = totalCredits - totalDebits;

  // --- Owner Liabilities ---
  const ownerMap = new Map<
    string,
    { name: string; invested: number; repaid: number }
  >();

  for (const t of allTxns) {
    if (t.type === "owner_investment" && t.is_credit && t.owner_id) {
      const entry = ownerMap.get(t.owner_id) ?? {
        name: t.owner?.name ?? "Unknown",
        invested: 0,
        repaid: 0,
      };
      entry.invested += t.amount_pkr;
      ownerMap.set(t.owner_id, entry);
    }
    if (t.type === "owner_repayment" && !t.is_credit && t.owner_id) {
      const entry = ownerMap.get(t.owner_id) ?? {
        name: t.owner?.name ?? "Unknown",
        invested: 0,
        repaid: 0,
      };
      entry.repaid += t.amount_pkr;
      ownerMap.set(t.owner_id, entry);
    }
  }

  const ownerLiabilities = Array.from(ownerMap.entries()).map(
    ([id, data]) => ({
      id,
      name: data.name,
      owed: data.invested - data.repaid,
    })
  );

  const totalOwed = ownerLiabilities.reduce((sum, o) => sum + o.owed, 0);
  const netPosition = availableBalance - totalOwed;

  // --- Recent Transactions ---
  const recentTxns = allTxns.slice(0, 10);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      {/* Balance Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Company Balance Card */}
        <Card>
          <CardHeader>
            <CardTitle>Company Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total Credits
              </span>
              <span className="font-medium text-green-600">
                {formatPKR(totalCredits)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total Debits
              </span>
              <span className="font-medium text-red-600">
                {formatPKR(totalDebits)}
              </span>
            </div>
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  Available Balance
                </span>
                <span
                  className={`text-lg font-bold ${
                    availableBalance >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatPKR(availableBalance)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Owner Liabilities Card */}
        <Card>
          <CardHeader>
            <CardTitle>Owner Liabilities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ownerLiabilities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No owner loans recorded.
              </p>
            ) : (
              ownerLiabilities.map((owner) => (
                <div
                  key={owner.id}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-muted-foreground">
                    {owner.name}
                  </span>
                  <span className="font-medium">{formatPKR(owner.owed)}</span>
                </div>
              ))
            )}
            <div className="border-t pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Total Owed</span>
                <span className="font-bold">{formatPKR(totalOwed)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Net Position</span>
                <span
                  className={`text-lg font-bold ${
                    netPosition >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatPKR(netPosition)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTxns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No transactions yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTxns.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>
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
                    <TableCell className="max-w-[300px] truncate">
                      {txn.description ??
                        (txn.reference_month
                          ? formatMonth(txn.reference_month)
                          : "-")}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          txn.is_credit ? "text-green-600" : "text-red-600"
                        }
                      >
                        {txn.is_credit ? "+" : "-"}
                        {formatPKR(txn.amount_pkr)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
