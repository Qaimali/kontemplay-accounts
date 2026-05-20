"use client";

import { Fragment, useState } from "react";
import { formatPKR } from "@/lib/format";
import type { TransactionType } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tip } from "@/components/ui/tip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableFooter,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  Landmark,
  Scale,
  Crown,
  ChevronDown,
} from "lucide-react";

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

const iconMap = {
  in: TrendingUp,
  out: TrendingDown,
  bank: Landmark,
  partners: Scale,
  networth: Crown,
} as const;

export type DrilldownTxn = {
  id: string;
  type: TransactionType;
  amount_pkr: number;
  is_credit: boolean;
  description: string | null;
  reference_month: string | null;
  created_at: string;
  owner_id: string | null;
};

export type MetricSection = {
  label: string;
  isCredit: boolean;
  total: number;
  transactions: DrilldownTxn[];
};

export type MetricDef = {
  label: string;
  value: number;
  tip: string;
  subtitle?: string;
  icon: keyof typeof iconMap;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  stripColor: string;
  sections: MetricSection[];
};

export function MetricCards({
  metrics,
  ownerNames,
}: {
  metrics: MetricDef[];
  ownerNames: Record<string, string>;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const active = openIdx !== null ? metrics[openIdx] : null;

  function toggleSection(label: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function openCard(idx: number) {
    setOpenIdx(idx);
    setExpanded(new Set());
  }

  const totalTxnCount = active
    ? active.sections.reduce((s, sec) => s + sec.transactions.length, 0)
    : 0;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((m, idx) => {
          const Icon = iconMap[m.icon];
          return (
            <Card
              key={m.label}
              className="accent-strip-top group cursor-pointer transition-all duration-200 hover:ring-1 hover:ring-border/40"
              style={{ "--strip-color": m.stripColor } as React.CSSProperties}
              onClick={() => openCard(idx)}
            >
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
                      {m.label}
                      <span onClick={(e) => e.stopPropagation()}>
                        <Tip text={m.tip} />
                      </span>
                    </span>
                    <p
                      className={`mt-2 text-2xl font-bold font-mono tracking-tight ${m.valueColor}`}
                    >
                      {formatPKR(m.value)}
                    </p>
                    {m.subtitle && (
                      <p className="mt-1 text-[11px] leading-tight text-muted-foreground/70">
                        {m.subtitle}
                      </p>
                    )}
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

      <Dialog
        open={openIdx !== null}
        onOpenChange={(open) => {
          if (!open) setOpenIdx(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{active.label}</DialogTitle>
                <DialogDescription>
                  {totalTxnCount} transaction
                  {totalTxnCount !== 1 ? "s" : ""} across{" "}
                  {active.sections.length} categories
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-y-auto flex-1 -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Description
                      </TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {active.sections
                      .filter((sec) => sec.transactions.length > 0)
                      .map((section) => {
                        const isOpen = expanded.has(section.label);
                        return (
                          <Fragment key={section.label}>
                            {/* Section header — click to expand */}
                            <TableRow
                              className="bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors border-t border-border/30"
                              onClick={() => toggleSection(section.label)}
                            >
                              <TableCell
                                colSpan={3}
                                className="hidden sm:table-cell"
                              >
                                <span className="flex items-center gap-2 font-semibold text-sm">
                                  <ChevronDown
                                    className={`size-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                                  />
                                  {section.label}
                                  <span className="text-xs font-normal text-muted-foreground">
                                    ({section.transactions.length})
                                  </span>
                                </span>
                              </TableCell>
                              <TableCell
                                colSpan={2}
                                className="sm:hidden"
                              >
                                <span className="flex items-center gap-2 font-semibold text-sm">
                                  <ChevronDown
                                    className={`size-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                                  />
                                  {section.label}
                                  <span className="text-xs font-normal text-muted-foreground">
                                    ({section.transactions.length})
                                  </span>
                                </span>
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                <span
                                  className={`font-mono text-sm font-semibold tabular-nums ${section.isCredit ? "text-emerald-400" : "text-red-400"}`}
                                >
                                  {section.isCredit ? "+" : "-"}
                                  {formatPKR(section.total)}
                                </span>
                              </TableCell>
                            </TableRow>
                            {/* Expanded transactions */}
                            {isOpen &&
                              section.transactions.map((txn) => (
                                <TableRow key={txn.id}>
                                  <TableCell className="text-muted-foreground whitespace-nowrap text-sm pl-8">
                                    {new Date(
                                      txn.created_at
                                    ).toLocaleDateString("en-PK", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={typeBadgeVariant[txn.type]}
                                    >
                                      {typeLabels[txn.type]}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="max-w-[250px] truncate hidden sm:table-cell text-muted-foreground text-sm">
                                    {txn.description ??
                                      (txn.owner_id
                                        ? (ownerNames[txn.owner_id] ?? "-")
                                        : "-")}
                                  </TableCell>
                                  <TableCell className="text-right whitespace-nowrap">
                                    <span
                                      className={`font-mono text-sm font-medium tabular-nums ${txn.is_credit ? "text-emerald-400" : "text-red-400"}`}
                                    >
                                      {txn.is_credit ? "+" : "-"}
                                      {formatPKR(txn.amount_pkr)}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </Fragment>
                        );
                      })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-right font-semibold hidden sm:table-cell"
                      >
                        {active.label}
                      </TableCell>
                      <TableCell
                        colSpan={2}
                        className="text-right font-semibold sm:hidden"
                      >
                        {active.label}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <span
                          className={`font-mono tabular-nums font-bold text-base ${active.valueColor}`}
                        >
                          {formatPKR(active.value)}
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
