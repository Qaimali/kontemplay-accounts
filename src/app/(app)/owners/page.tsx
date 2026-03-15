"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Owner, Transaction } from "@/lib/types";
import { formatPKR } from "@/lib/format";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronDown, Landmark, Receipt } from "lucide-react";

type TransactionForm = {
  owner_id: string;
  amount: string;
  description: string;
  reference_month: string;
};

const emptyForm: TransactionForm = {
  owner_id: "",
  amount: "",
  description: "",
  reference_month: "",
};

type OwnerWithBalances = Owner & {
  totalInvested: number;
  totalRepaid: number;
  outstanding: number;
  transactions: Transaction[];
};

export default function OwnersPage() {
  const supabase = createClient();
  const [owners, setOwners] = useState<OwnerWithBalances[]>([]);
  const [rawOwners, setRawOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [investDialogOpen, setInvestDialogOpen] = useState(false);
  const [repayDialogOpen, setRepayDialogOpen] = useState(false);
  const [investForm, setInvestForm] = useState<TransactionForm>(emptyForm);
  const [repayForm, setRepayForm] = useState<TransactionForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const [{ data: ownersData }, { data: txnData }] = await Promise.all([
      supabase.from("owners").select("*").order("name").returns<Owner[]>(),
      supabase
        .from("transactions")
        .select("*")
        .in("type", ["owner_investment", "owner_repayment"])
        .order("created_at", { ascending: false })
        .returns<Transaction[]>(),
    ]);

    const ownersList = ownersData ?? [];
    const txns = txnData ?? [];

    setRawOwners(ownersList);

    const enriched: OwnerWithBalances[] = ownersList.map((owner) => {
      const ownerTxns = txns.filter((t) => t.owner_id === owner.id);

      const totalInvested = ownerTxns
        .filter((t) => t.type === "owner_investment")
        .reduce((sum, t) => sum + t.amount_pkr, 0);

      const totalRepaid = ownerTxns
        .filter((t) => t.type === "owner_repayment")
        .reduce((sum, t) => sum + t.amount_pkr, 0);

      return {
        ...owner,
        totalInvested,
        totalRepaid,
        outstanding: totalInvested - totalRepaid,
        transactions: ownerTxns,
      };
    });

    setOwners(enriched);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleInvestmentSave() {
    if (!investForm.owner_id || !investForm.amount) return;
    setSaving(true);

    const { error } = await supabase.from("transactions").insert({
      type: "owner_investment",
      is_credit: true,
      owner_id: investForm.owner_id,
      amount_pkr: parseFloat(investForm.amount),
      description: investForm.description.trim() || null,
      reference_month: investForm.reference_month || null,
    });

    setSaving(false);

    if (error) {
      toast.error("Failed to save investment");
      return;
    }

    toast.success("Investment recorded");
    setInvestDialogOpen(false);
    setInvestForm(emptyForm);
    await fetchData();
  }

  async function handleRepaymentSave() {
    if (!repayForm.owner_id || !repayForm.amount) return;
    setSaving(true);

    const { error } = await supabase.from("transactions").insert({
      type: "owner_repayment",
      is_credit: false,
      owner_id: repayForm.owner_id,
      amount_pkr: parseFloat(repayForm.amount),
      description: repayForm.description.trim() || null,
      reference_month: repayForm.reference_month || null,
    });

    setSaving(false);

    if (error) {
      toast.error("Failed to save repayment");
      return;
    }

    toast.success("Repayment recorded");
    setRepayDialogOpen(false);
    setRepayForm(emptyForm);
    await fetchData();
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Owners</h1>
        <div className="flex gap-2">
          <Dialog open={investDialogOpen} onOpenChange={setInvestDialogOpen}>
            <DialogTrigger
              render={<Button variant="outline" />}
              onClick={() => {
                setInvestForm(emptyForm);
                setInvestDialogOpen(true);
              }}
            >
              Add Investment
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Record Owner Investment</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleInvestmentSave();
                }}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="invest-owner" className="text-[13px]">Owner</Label>
                  <Select
                    value={investForm.owner_id}
                    onValueChange={(val) =>
                      setInvestForm((prev) => ({
                        ...prev,
                        owner_id: val ?? "",
                      }))
                    }
                  >
                    <SelectTrigger className="w-full" id="invest-owner">
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {rawOwners.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invest-amount" className="text-[13px]">Amount (PKR)</Label>
                  <Input
                    id="invest-amount"
                    type="number"
                    step="any"
                    value={investForm.amount}
                    onChange={(e) =>
                      setInvestForm((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invest-desc" className="text-[13px]">Description</Label>
                  <Input
                    id="invest-desc"
                    value={investForm.description}
                    onChange={(e) =>
                      setInvestForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Optional description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invest-month" className="text-[13px]">Reference Month</Label>
                  <Input
                    id="invest-month"
                    type="month"
                    value={investForm.reference_month}
                    onChange={(e) =>
                      setInvestForm((prev) => ({
                        ...prev,
                        reference_month: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setInvestDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      saving || !investForm.owner_id || !investForm.amount
                    }
                  >
                    {saving ? "Saving..." : "Save Investment"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={repayDialogOpen} onOpenChange={setRepayDialogOpen}>
            <DialogTrigger
              render={<Button />}
              onClick={() => {
                setRepayForm(emptyForm);
                setRepayDialogOpen(true);
              }}
            >
              Add Repayment
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Record Owner Repayment</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRepaymentSave();
                }}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="repay-owner" className="text-[13px]">Owner</Label>
                  <Select
                    value={repayForm.owner_id}
                    onValueChange={(val) =>
                      setRepayForm((prev) => ({
                        ...prev,
                        owner_id: val ?? "",
                      }))
                    }
                  >
                    <SelectTrigger className="w-full" id="repay-owner">
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {rawOwners.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="repay-amount" className="text-[13px]">Amount (PKR)</Label>
                  <Input
                    id="repay-amount"
                    type="number"
                    step="any"
                    value={repayForm.amount}
                    onChange={(e) =>
                      setRepayForm((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="repay-desc" className="text-[13px]">Description</Label>
                  <Input
                    id="repay-desc"
                    value={repayForm.description}
                    onChange={(e) =>
                      setRepayForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Optional description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="repay-month" className="text-[13px]">Reference Month</Label>
                  <Input
                    id="repay-month"
                    type="month"
                    value={repayForm.reference_month}
                    onChange={(e) =>
                      setRepayForm((prev) => ({
                        ...prev,
                        reference_month: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRepayDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      saving || !repayForm.owner_id || !repayForm.amount
                    }
                  >
                    {saving ? "Saving..." : "Save Repayment"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : owners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/50 mb-4">
            <Landmark className="size-7 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No owners found</p>
          <p className="text-[13px] text-muted-foreground/60 mt-1">Owners will appear here once added to the system.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {owners.map((owner) => {
            const isExpanded = expandedId === owner.id;
            return (
              <Card key={owner.id}>
                <button
                  type="button"
                  className="w-full rounded-xl bg-muted/20 px-4 py-3 text-left transition-all duration-200"
                  onClick={() => toggleExpand(owner.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{owner.name}</CardTitle>
                      <p className="text-[13px] text-muted-foreground mt-0.5">
                        {owner.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                          Outstanding
                        </p>
                        <p
                          className={`text-lg font-bold font-mono tabular-nums ${
                            owner.outstanding > 0
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {formatPKR(owner.outstanding)}
                        </p>
                      </div>
                      <ChevronDown
                        className={`size-5 text-muted-foreground transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-4">
                    {/* Summary row */}
                    <div className="flex flex-wrap gap-5 rounded-xl bg-muted/30 px-4 py-3 sm:gap-6 mt-1">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                          Invested
                        </p>
                        <p className="font-mono tabular-nums font-semibold text-emerald-400">
                          {formatPKR(owner.totalInvested)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                          Repaid
                        </p>
                        <p className="font-mono tabular-nums font-semibold text-red-400">
                          {formatPKR(owner.totalRepaid)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                          Outstanding
                        </p>
                        <p
                          className={`font-mono tabular-nums font-semibold ${
                            owner.outstanding > 0
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {formatPKR(owner.outstanding)}
                        </p>
                      </div>
                    </div>

                    {/* Transaction history */}
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                      Transaction History
                    </p>
                    {owner.transactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/50 mb-4">
                          <Receipt className="size-7 text-muted-foreground/60" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">No transactions recorded</p>
                        <p className="text-[13px] text-muted-foreground/60 mt-1">
                          Record an investment or repayment to see it here.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="hidden sm:table-cell">Description</TableHead>
                            <TableHead className="text-right">
                              Amount
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {owner.transactions.map((txn) => (
                            <TableRow key={txn.id} className="transition-all duration-200">
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
                                      ? "default"
                                      : "outline"
                                  }
                                >
                                  {txn.type === "owner_investment"
                                    ? "Investment"
                                    : "Repayment"}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[300px] truncate hidden sm:table-cell">
                                {txn.description ?? "-"}
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                <span
                                  className={`font-mono tabular-nums font-medium ${
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
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
