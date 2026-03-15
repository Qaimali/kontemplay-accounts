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
import { Scale, ChevronDown } from "lucide-react";

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

export function OwnerLiabilities({
  owners,
  totalOwed,
}: {
  owners: OwnerLiability[];
  totalOwed: number;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (owners.length === 0) return null;

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
        <div className="border-t border-border/30 pt-3 mt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Total Owed</span>
            <span className="font-mono font-bold tabular-nums">{formatPKR(totalOwed)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
