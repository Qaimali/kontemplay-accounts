"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPKR, formatMonth } from "@/lib/format";
import type { Transaction, TransactionType, Owner } from "@/lib/types";
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
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

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

const addableTypes: { value: TransactionType; label: string }[] = [
  { value: "client_payment", label: "Client Payment" },
  { value: "owner_investment", label: "Owner Investment" },
  { value: "owner_repayment", label: "Owner Repayment" },
  { value: "expense", label: "Expense" },
];

const allFilterTypes: { value: TransactionType; label: string }[] = [
  { value: "client_payment", label: "Client Payment" },
  { value: "owner_investment", label: "Owner Investment" },
  { value: "salary_payout", label: "Salary Payout" },
  { value: "contractor_tax", label: "Contractor Tax" },
  { value: "owner_repayment", label: "Owner Repayment" },
  { value: "expense", label: "Expense" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function isCreditType(type: TransactionType): boolean {
  return type === "client_payment" || type === "owner_investment";
}

export default function TransactionsPage() {
  const supabase = createClient();

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<string>("");
  const [filterYear, setFilterYear] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formType, setFormType] = useState<TransactionType>("client_payment");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formReferenceMonth, setFormReferenceMonth] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formOwnerId, setFormOwnerId] = useState("");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<Transaction[]>();
    setAllTransactions(data ?? []);
    setLoading(false);
  }, []);

  const fetchOwners = useCallback(async () => {
    const { data } = await supabase
      .from("owners")
      .select("*")
      .order("name")
      .returns<Owner[]>();
    setOwners(data ?? []);
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchOwners();
  }, [fetchOwners]);

  // Available years from data
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const t of allTransactions) {
      years.add(new Date(t.created_at).getFullYear().toString());
    }
    return Array.from(years).sort().reverse();
  }, [allTransactions]);

  // Filtered transactions
  const transactions = useMemo(() => {
    return allTransactions.filter((txn) => {
      if (filterType && txn.type !== filterType) return false;

      const d = new Date(txn.created_at);
      if (filterYear && d.getFullYear().toString() !== filterYear) return false;
      if (filterMonth && (d.getMonth() + 1).toString() !== filterMonth) return false;
      if (filterDateFrom && txn.created_at < filterDateFrom) return false;
      if (filterDateTo && txn.created_at > filterDateTo + "T23:59:59") return false;

      return true;
    });
  }, [allTransactions, filterType, filterYear, filterMonth, filterDateFrom, filterDateTo]);

  // Totals
  const totalCredits = useMemo(
    () => transactions.filter((t) => t.is_credit).reduce((s, t) => s + t.amount_pkr, 0),
    [transactions]
  );
  const totalDebits = useMemo(
    () => transactions.filter((t) => !t.is_credit).reduce((s, t) => s + t.amount_pkr, 0),
    [transactions]
  );
  const net = totalCredits - totalDebits;

  const resetForm = () => {
    setFormType("client_payment");
    setFormAmount("");
    setFormDescription("");
    setFormReferenceMonth("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormOwnerId("");
  };

  const handleSave = async () => {
    const amount = parseFloat(formAmount);
    if (!amount || amount <= 0) return;

    setSaving(true);

    const isCredit = isCreditType(formType);
    const needsOwner =
      formType === "owner_investment" || formType === "owner_repayment";

    const { error } = await supabase.from("transactions").insert({
      type: formType,
      amount_pkr: amount,
      is_credit: isCredit,
      description: formDescription || null,
      reference_month: formReferenceMonth || null,
      owner_id: needsOwner && formOwnerId ? formOwnerId : null,
      created_at: formDate ? `${formDate}T00:00:00+05:00` : undefined,
    });

    setSaving(false);

    if (!error) {
      setDialogOpen(false);
      resetForm();
      fetchTransactions();
    }
  };

  const showOwnerField =
    formType === "owner_investment" || formType === "owner_repayment";

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === transactions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(transactions.map((t) => t.id)));
    }
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return;
    const confirmed = window.confirm(
      `Delete ${selected.size} transaction${selected.size > 1 ? "s" : ""}? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    const { error } = await supabase
      .from("transactions")
      .delete()
      .in("id", Array.from(selected));

    if (!error) {
      setSelected(new Set());
      fetchTransactions();
    }
    setDeleting(false);
  }

  async function handleDeleteSingle(id: string) {
    const confirmed = window.confirm("Delete this transaction? This cannot be undone.");
    if (!confirmed) return;

    await supabase.from("transactions").delete().eq("id", id);
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    fetchTransactions();
  }

  function clearFilters() {
    setFilterType("");
    setFilterYear("");
    setFilterMonth("");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

  const hasFilters = filterType || filterYear || filterMonth || filterDateFrom || filterDateTo;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={filterType} onValueChange={(v) => setFilterType(v ?? "")}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All types</SelectItem>
              {allFilterTypes.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Year</Label>
          <Select value={filterYear} onValueChange={(v) => setFilterYear(v ?? "")}>
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All years</SelectItem>
              {availableYears.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Month</Label>
          <Select value={filterMonth} onValueChange={(v) => setFilterMonth(v ?? "")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All months</SelectItem>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>From</Label>
          <Input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="w-[150px]"
          />
        </div>

        <div className="space-y-1.5">
          <Label>To</Label>
          <Input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="w-[150px]"
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="mb-0.5">
            Clear filters
          </Button>
        )}
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteSelected}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : `Delete ${selected.size}`}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>
            Transaction History
            {!loading && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({transactions.length} transaction{transactions.length !== 1 ? "s" : ""})
              </span>
            )}
          </CardTitle>
          <CardAction>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger
                render={
                  <Button
                    onClick={() => {
                      resetForm();
                      setDialogOpen(true);
                    }}
                  />
                }
              >
                Add Transaction
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Transaction</DialogTitle>
                  <DialogDescription>
                    Record a new transaction in the ledger.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select
                      value={formType}
                      onValueChange={(v) => { if (v) setFormType(v as TransactionType); }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {addableTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Amount (PKR)</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Input
                      type="text"
                      placeholder="Optional description"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Transaction Date</Label>
                    <Input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Reference Month</Label>
                    <Input
                      type="text"
                      placeholder="YYYY-MM"
                      value={formReferenceMonth}
                      onChange={(e) => setFormReferenceMonth(e.target.value)}
                    />
                  </div>

                  {showOwnerField && (
                    <div className="space-y-1.5">
                      <Label>Owner</Label>
                      <Select
                        value={formOwnerId}
                        onValueChange={(v) => setFormOwnerId(v ?? "")}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select owner" />
                        </SelectTrigger>
                        <SelectContent>
                          {owners.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="text-sm text-muted-foreground">
                    This will be recorded as a{" "}
                    <span
                      className={
                        isCreditType(formType)
                          ? "font-medium text-emerald-400"
                          : "font-medium text-red-400"
                      }
                    >
                      {isCreditType(formType) ? "Credit" : "Debit"}
                    </span>
                  </div>
                </div>

                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>
                    Cancel
                  </DialogClose>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Transaction"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardAction>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">
              Loading transactions...
            </p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No transactions found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={transactions.length > 0 && selected.size === transactions.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn) => (
                  <TableRow key={txn.id} className={selected.has(txn.id) ? "bg-muted/50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(txn.id)}
                        onCheckedChange={() => toggleSelect(txn.id)}
                      />
                    </TableCell>
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
                      {txn.description ?? "-"}
                    </TableCell>
                    <TableCell>
                      {txn.reference_month
                        ? formatMonth(txn.reference_month)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {txn.is_credit ? (
                        <span className="font-mono text-emerald-400">
                          {formatPKR(txn.amount_pkr)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!txn.is_credit ? (
                        <span className="font-mono text-red-400">
                          {formatPKR(txn.amount_pkr)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-red-400 h-7 w-7 p-0"
                        onClick={() => handleDeleteSingle(txn.id)}
                      >
                        ×
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="text-right font-semibold">
                    Totals
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono font-semibold text-emerald-400">
                      {formatPKR(totalCredits)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono font-semibold text-red-400">
                      {formatPKR(totalDebits)}
                    </span>
                  </TableCell>
                  <TableCell />
                </TableRow>
                <TableRow>
                  <TableCell colSpan={5} className="text-right font-semibold">
                    Net
                  </TableCell>
                  <TableCell colSpan={2} className="text-right">
                    <span className={`font-mono font-bold text-base ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {net >= 0 ? "+" : ""}{formatPKR(net)}
                    </span>
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
