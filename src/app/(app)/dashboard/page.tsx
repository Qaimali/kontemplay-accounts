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

function Tip({ text }: { text: string }) {
  return (
    <span className="relative group cursor-help ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-muted-foreground text-[10px] font-bold border">
      ?
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 rounded-md bg-foreground text-background text-xs leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 shadow-lg">
        {text}
      </span>
    </span>
  );
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  // Fetch transactions and owners in parallel
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

  // Owner name lookup
  const ownerNames: Record<string, string> = {};
  for (const o of allOwners) {
    ownerNames[o.id] = o.name;
  }

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

  const ownerLiabilities = Array.from(ownerMap.entries()).map(
    ([id, data]) => ({
      id,
      name: data.name,
      invested: data.invested,
      repaid: data.repaid,
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
            <CardTitle>
              Company Balance
              <Tip text="Sum of all money in (credits) minus all money out (debits). Includes client payments, owner investments, salary payouts, taxes, and expenses." />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total Credits
                <Tip text="Client payments + owner investments. All money that came into the company." />
              </span>
              <span className="font-medium text-green-600">
                {formatPKR(totalCredits)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total Debits
                <Tip text="Salary payouts + contractor tax + expenses + owner repayments. All money that went out." />
              </span>
              <span className="font-medium text-red-600">
                {formatPKR(totalDebits)}
              </span>
            </div>
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  Available Balance
                  <Tip text="Credits - Debits. Negative means the company has paid out more than it received." />
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
            <CardTitle>
              Owner Liabilities
              <Tip text="How much the company owes each partner. Calculated as: total invested by owner minus total repaid to owner." />
            </CardTitle>
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
                    <Tip
                      text={`Invested: ${formatPKR(owner.invested)} | Repaid: ${formatPKR(owner.repaid)} | Owed: ${formatPKR(owner.owed)}`}
                    />
                  </span>
                  <span className="font-medium">{formatPKR(owner.owed)}</span>
                </div>
              ))
            )}
            <div className="border-t pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  Total Owed
                  <Tip text="Sum of all outstanding owner loans. This is the total liability the company has to its partners." />
                </span>
                <span className="font-bold">{formatPKR(totalOwed)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  Net Position
                  <Tip text={`Available Balance (${formatPKR(availableBalance)}) minus Total Owed (${formatPKR(totalOwed)}). Shows the company's true financial position after accounting for owner debts.`} />
                </span>
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
