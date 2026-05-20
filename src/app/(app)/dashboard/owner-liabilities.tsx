"use client";

import { useState } from "react";
import { formatPKR } from "@/lib/format";
import type { Transaction } from "@/lib/types";
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
import { Scale, ChevronDown, ArrowDownLeft } from "lucide-react";

type OwnerLiability = {
  id: string;
  name: string;
  invested: number;
  repaid: number;
  owed: number;
  transactions: Array<
    Pick<Transaction, "id" | "type" | "amount_pkr" | "description" | "created_at">
  >;
};

type OwnerReceivable = {
  id: string;
  name: string;
  withdrawn: number;
  distributed: number;
  returned: number;
  balance: number;
};

export function OwnerLiabilities({
  owners,
  totalOwed,
  receivables = [],
}: {
  owners: OwnerLiability[];
  totalOwed: number;
  receivables?: OwnerReceivable[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (owners.length === 0 && receivables.length === 0) return null;

  const totalReceivable = receivables.reduce((s, r) => s + r.balance, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="size-4 text-muted-foreground" />
          Owner Liabilities
          <Tip text="How much the company owes each partner. Invested minus repaid." />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {owners.map((owner) => {
          const isExpanded = expandedId === owner.id;
          return (
            <div key={owner.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl bg-muted/20 px-4 py-3 transition-all duration-200 hover:bg-muted/40 cursor-pointer"
                onClick={() =>
                  setExpandedId((prev) => (prev === owner.id ? null : owner.id))
                }
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  {owner.name}
                  <Tip
                    text={`Invested: ${formatPKR(owner.invested)} | Repaid: ${formatPKR(owner.repaid)}`}
                  />
                </span>
                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono text-sm font-semibold tabular-nums ${
                      owner.owed > 0 ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {formatPKR(owner.owed)}
                  </span>
                  <ChevronDown
                    className={`size-4 text-muted-foreground transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {isExpanded && (
                <div className="mt-1.5 rounded-xl border border-border/20 bg-background/50 p-4">
                  {/* Summary */}
                  <div className="flex flex-wrap gap-6 mb-4">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Invested</p>
                      <p className="font-mono text-sm font-semibold text-emerald-400 tabular-nums">
                        {formatPKR(owner.invested)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Repaid</p>
                      <p className="font-mono text-sm font-semibold text-red-400 tabular-nums">
                        {formatPKR(owner.repaid)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                        Outstanding
                      </p>
                      <p
                        className={`font-mono text-sm font-semibold tabular-nums ${
                          owner.owed > 0
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {formatPKR(owner.owed)}
                      </p>
                    </div>
                  </div>

                  {/* Transactions */}
                  {owner.transactions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No transactions.
                    </p>
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
                        {owner.transactions.map((txn) => (
                          <TableRow key={txn.id}>
                            <TableCell className="text-muted-foreground whitespace-nowrap">
                              {new Date(txn.created_at).toLocaleDateString(
                                "en-PK",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  txn.type === "owner_investment"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {txn.type === "owner_investment"
                                  ? "Investment"
                                  : "Repayment"}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[250px] truncate hidden sm:table-cell text-muted-foreground">
                              {txn.description ?? "-"}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <span
                                className={`font-mono font-medium tabular-nums ${
                                  txn.type === "owner_investment"
                                    ? "text-emerald-400"
                                    : "text-red-400"
                                }`}
                              >
                                {txn.type === "owner_investment" ? "+" : "-"}
                                {formatPKR(txn.amount_pkr)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {owners.length > 0 && (
          <div className="border-t border-border/30 pt-3 mt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Total Owed</span>
              <span className="font-mono font-bold tabular-nums">{formatPKR(totalOwed)}</span>
            </div>
          </div>
        )}

        {/* Owner Receivables — what owners owe the company */}
        {receivables.length > 0 && (
          <div className="border-t border-amber-500/20 pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <ArrowDownLeft className="size-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-400">Owner Receivables</span>
              <Tip text="What owners owe the company. This is the unreturned balance from cash withdrawn from the company bank for salary distributions." />
            </div>
            {receivables.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl bg-amber-500/5 border border-amber-500/10 px-4 py-3 mb-2"
              >
                <div>
                  <span className="text-sm font-medium">{r.name}</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Withdrew {formatPKR(r.withdrawn)} • Distributed {formatPKR(r.distributed)}
                    {r.returned > 0 ? ` • Returned ${formatPKR(r.returned)}` : ""}
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold tabular-nums text-amber-400">
                  {formatPKR(r.balance)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-semibold text-amber-400">Total Receivable</span>
              <span className="font-mono font-bold tabular-nums text-amber-400">
                {formatPKR(totalReceivable)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
