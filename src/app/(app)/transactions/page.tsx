"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { formatPKR, formatMonth } from "@/lib/format";
import { exportToCSV } from "@/lib/export";
import type { Transaction, TransactionType, TransactionSource, Owner } from "@/lib/types";
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
import { Pencil, Trash2, Receipt, FileDown, X } from "lucide-react";

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

// Bank-movement types excluded from operational totals to avoid double-counting
const reconciliationTypes: TransactionType[] = ["owner_withdrawal", "owner_return"];

const addableTypes: { value: TransactionType; label: string }[] = [
  { value: "client_payment", label: "Client Payment" },
  { value: "owner_investment", label: "Owner Investment" },
  { value: "owner_repayment", label: "Owner Repayment" },
  { value: "expense", label: "Expense" },
  { value: "owner_withdrawal", label: "Owner Withdrawal" },
  { value: "owner_return", label: "Owner Return" },
];

const allFilterTypes: { value: TransactionType; label: string }[] = [
  { value: "client_payment", label: "Client Payment" },
  { value: "owner_investment", label: "Owner Investment" },
  { value: "salary_payout", label: "Salary Payout" },
  { value: "contractor_tax", label: "Contractor Tax" },
  { value: "owner_repayment", label: "Owner Repayment" },
  { value: "expense", label: "Expense" },
  { value: "owner_withdrawal", label: "Owner Withdrawal" },
  { value: "owner_return", label: "Owner Return" },
];

const allSourceTypes: { value: TransactionSource; label: string }[] = [
  { value: "bank", label: "Bank" },
  { value: "owner_pocket", label: "Owner Pocket" },
  { value: "owner_withdrawal", label: "From Withdrawal" },
];

const sourceLabels: Record<TransactionSource, string> = {
  bank: "Bank",
  owner_pocket: "Pocket",
  owner_withdrawal: "Withdrawal",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function isCreditType(type: TransactionType): boolean {
  return type === "client_payment" || type === "owner_investment" || type === "owner_return";
}

export default function TransactionsPage() {

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
  const [filterSource, setFilterSource] = useState<string>("");
  const [filterTransfer, setFilterTransfer] = useState<string>("");
  const [filterOwner, setFilterOwner] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [editType, setEditType] = useState<TransactionType>("client_payment");
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editReferenceMonth, setEditReferenceMonth] = useState("");
  const [editOwnerId, setEditOwnerId] = useState("");
  const [editSource, setEditSource] = useState<string>("bank");
  const [editIsTransfer, setEditIsTransfer] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // Form state
  const [formType, setFormType] = useState<TransactionType>("client_payment");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formReferenceMonth, setFormReferenceMonth] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formOwnerId, setFormOwnerId] = useState("");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/transactions");
    const data = await res.json();
    setAllTransactions(data ?? []);
    setLoading(false);
  }, []);

  const fetchOwners = useCallback(async () => {
    const res = await fetch("/api/owners");
    const data = await res.json();
    setOwners(data ?? []);
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchOwners();
  }, [fetchOwners]);

  const ownerNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const o of owners) map[o.id] = o.name;
    return map;
  }, [owners]);

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
      if (filterSource && txn.source !== filterSource) return false;
      if (filterTransfer === "yes" && !txn.is_transfer) return false;
      if (filterTransfer === "no" && txn.is_transfer) return false;
      if (filterOwner && txn.owner_id !== filterOwner) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const desc = (txn.description ?? "").toLowerCase();
        const typeLabel = typeLabels[txn.type].toLowerCase();
        if (!desc.includes(q) && !typeLabel.includes(q)) return false;
      }

      return true;
    });
  }, [allTransactions, filterType, filterYear, filterMonth, filterDateFrom, filterDateTo, filterSource, filterTransfer, filterOwner, searchQuery]);

  // Totals — exclude reconciliation types (owner_withdrawal/owner_return) from operational totals
  const totalCredits = useMemo(
    () => transactions.filter((t) => t.is_credit && !reconciliationTypes.includes(t.type)).reduce((s, t) => s + t.amount_pkr, 0),
    [transactions]
  );
  const totalDebits = useMemo(
    () => transactions.filter((t) => !t.is_credit && !reconciliationTypes.includes(t.type)).reduce((s, t) => s + t.amount_pkr, 0),
    [transactions]
  );
  const net = totalCredits - totalDebits;

  // Withdrawal/return totals shown separately
  const totalWithdrawals = useMemo(
    () => transactions.filter((t) => t.type === "owner_withdrawal").reduce((s, t) => s + t.amount_pkr, 0),
    [transactions]
  );
  const totalReturns = useMemo(
    () => transactions.filter((t) => t.type === "owner_return").reduce((s, t) => s + t.amount_pkr, 0),
    [transactions]
  );
  const distributedFromWithdrawals = useMemo(
    () => transactions.filter((t) => t.source === "owner_withdrawal" && !t.is_transfer).reduce((s, t) => s + t.amount_pkr, 0),
    [transactions]
  );
  const withdrawalBalance = totalWithdrawals - distributedFromWithdrawals - totalReturns;

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

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: formType,
        amount_pkr: amount,
        is_credit: isCredit,
        description: formDescription || null,
        reference_month: formReferenceMonth || null,
        owner_id: formOwnerId || null,
        created_at: formDate ? `${formDate}T00:00:00+05:00` : undefined,
      }),
    });
    const error = !res.ok;

    setSaving(false);

    if (!error) {
      setDialogOpen(false);
      resetForm();
      fetchTransactions();
    }
  };

  const showOwnerField = true;

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
    await fetch("/api/transactions/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });

    setSelected(new Set());
    fetchTransactions();
    setDeleting(false);
  }

  async function handleDeleteSingle(id: string) {
    const confirmed = window.confirm("Delete this transaction? This cannot be undone.");
    if (!confirmed) return;

    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    fetchTransactions();
  }

  function openEditDialog(txn: Transaction) {
    setEditingTxn(txn);
    setEditType(txn.type);
    setEditAmount(txn.amount_pkr.toString());
    setEditDescription(txn.description ?? "");
    setEditDate(new Date(txn.created_at).toISOString().slice(0, 10));
    setEditReferenceMonth(txn.reference_month ?? "");
    setEditOwnerId(txn.owner_id ?? "");
    setEditSource(txn.source ?? "bank");
    setEditIsTransfer(!!txn.is_transfer);
    setEditDialogOpen(true);
  }

  async function handleEditSave() {
    if (!editingTxn) return;
    const amount = parseFloat(editAmount);
    if (!amount || amount <= 0) return;

    setEditSaving(true);

    const isCredit = isCreditType(editType);

    const res = await fetch(`/api/transactions/${editingTxn.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: editType,
        amount_pkr: amount,
        is_credit: isCredit,
        description: editDescription || null,
        reference_month: editReferenceMonth || null,
        owner_id: editOwnerId || null,
        created_at: editDate ? `${editDate}T00:00:00+05:00` : undefined,
        source: editSource,
        is_transfer: editIsTransfer,
      }),
    });
    const error = !res.ok;

    setEditSaving(false);

    if (!error) {
      // Update in-place to preserve scroll position
      setAllTransactions((prev) =>
        prev.map((t) =>
          t.id === editingTxn.id
            ? {
                ...t,
                type: editType,
                amount_pkr: amount,
                is_credit: isCredit,
                description: editDescription || null,
                reference_month: editReferenceMonth || null,
                owner_id: editOwnerId || null,
                created_at: editDate ? `${editDate}T00:00:00+05:00` : t.created_at,
                source: editSource as TransactionSource,
                is_transfer: editIsTransfer,
              }
            : t
        )
      );
      setEditDialogOpen(false);
      setEditingTxn(null);
    }
  }

  function clearFilters() {
    setFilterType("");
    setFilterYear("");
    setFilterMonth("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterSource("");
    setFilterTransfer("");
    setFilterOwner("");
    setSearchQuery("");
  }

  const hasFilters = filterType || filterYear || filterMonth || filterDateFrom || filterDateTo || filterSource || filterTransfer || filterOwner || searchQuery;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-5 sm:flex sm:flex-wrap sm:items-end">
        <div className="col-span-2 space-y-1.5 sm:col-span-1">
          <Label className="text-[13px]">Search</Label>
          <Input
            type="text"
            placeholder="Search description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:w-[200px]"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[13px]">Type</Label>
          <Select value={filterType} onValueChange={(v) => setFilterType(v ?? "")}>
            <SelectTrigger className="sm:w-[170px]">
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
          <Label className="text-[13px]">Year</Label>
          <Select value={filterYear} onValueChange={(v) => setFilterYear(v ?? "")}>
            <SelectTrigger className="sm:w-[110px]">
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
          <Label className="text-[13px]">Month</Label>
          <Select value={filterMonth} onValueChange={(v) => setFilterMonth(v ?? "")}>
            <SelectTrigger className="sm:w-[140px]">
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
          <Label className="text-[13px]">Source</Label>
          <Select value={filterSource} onValueChange={(v) => setFilterSource(v ?? "")}>
            <SelectTrigger className="sm:w-[155px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All sources</SelectItem>
              {allSourceTypes.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[13px]">Transfer</Label>
          <Select value={filterTransfer} onValueChange={(v) => setFilterTransfer(v ?? "")}>
            <SelectTrigger className="sm:w-[130px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="yes">Transfers only</SelectItem>
              <SelectItem value="no">Non-transfers</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[13px]">Owner</Label>
          <Select value={filterOwner} onValueChange={(v) => setFilterOwner(v ?? "")}>
            <SelectTrigger className="sm:w-[150px]">
              <SelectValue placeholder="All">
                {filterOwner ? (ownerNames[filterOwner] ?? "All") : "All"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All owners</SelectItem>
              {owners.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[13px]">From</Label>
          <Input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="sm:w-[150px]"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[13px]">To</Label>
          <Input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="sm:w-[150px]"
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="mb-0.5 transition-all duration-200">
            <X className="mr-1 size-3.5" />
            Clear filters
          </Button>
        )}

        {transactions.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="mb-0.5 transition-all duration-200"
            onClick={() => {
              const rows = transactions.map((txn) => ({
                Date: new Date(txn.created_at).toLocaleDateString("en-PK"),
                Type: typeLabels[txn.type],
                Description: txn.description ?? "",
                "Reference Month": txn.reference_month ?? "",
                "Credit PKR": txn.is_credit ? txn.amount_pkr : "",
                "Debit PKR": !txn.is_credit ? txn.amount_pkr : "",
              }));
              exportToCSV(rows, "transactions");
            }}
          >
            <FileDown className="mr-1.5 size-3.5" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteSelected}
            disabled={deleting}
            className="transition-all duration-200"
          >
            <Trash2 className="mr-1.5 size-3.5" />
            {deleting ? "Deleting..." : `Delete ${selected.size}`}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelected(new Set())} className="transition-all duration-200">
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

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-[13px]">Type</Label>
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
                    <Label className="text-[13px]">Amount (PKR)</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[13px]">Description</Label>
                    <Input
                      type="text"
                      placeholder="Optional description"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[13px]">Transaction Date</Label>
                    <Input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[13px]">Reference Month</Label>
                    <Input
                      type="text"
                      placeholder="YYYY-MM"
                      value={formReferenceMonth}
                      onChange={(e) => setFormReferenceMonth(e.target.value)}
                    />
                  </div>

                  {showOwnerField && (
                    <div className="space-y-1.5">
                      <Label className="text-[13px]">Owner</Label>
                      <Select
                        value={formOwnerId}
                        onValueChange={(v) => setFormOwnerId(v ?? "")}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select owner">
                            {formOwnerId ? (ownerNames[formOwnerId] ?? "Select owner") : "Select owner"}
                          </SelectValue>
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
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/40">
                <Receipt className="size-7 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No transactions found</p>
              <p className="mt-1 text-[13px] text-muted-foreground/60">
                {hasFilters ? "Try adjusting your filters" : "Add your first transaction to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table containerClassName="max-h-[calc(100vh-22rem)]">
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
                    <TableHead className="hidden sm:table-cell">Description</TableHead>
                    <TableHead className="hidden md:table-cell">Month</TableHead>
                    <TableHead className="hidden lg:table-cell">Owner</TableHead>
                    <TableHead className="hidden lg:table-cell">Source</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="w-20"></TableHead>
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
                      <TableCell className="whitespace-nowrap">
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
                        {txn.description ?? "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {txn.reference_month
                          ? formatMonth(txn.reference_month)
                          : "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {txn.owner_id ? ownerNames[txn.owner_id] ?? "-" : "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {txn.source ? sourceLabels[txn.source] ?? txn.source : "-"}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {txn.is_credit ? (
                          <span className="font-mono tabular-nums text-emerald-400">
                            {formatPKR(txn.amount_pkr)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {!txn.is_credit ? (
                          <span className="font-mono tabular-nums text-red-400">
                            {formatPKR(txn.amount_pkr)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground h-7 w-7 p-0 transition-all duration-200"
                            onClick={() => openEditDialog(txn)}
                            title="Edit"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-red-400 h-7 w-7 p-0 transition-all duration-200"
                            onClick={() => handleDeleteSingle(txn.id)}
                            title="Delete"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-semibold sm:hidden">
                      Totals
                    </TableCell>
                    <TableCell colSpan={4} className="text-right font-semibold hidden sm:table-cell md:hidden">
                      Totals
                    </TableCell>
                    <TableCell colSpan={5} className="text-right font-semibold hidden md:table-cell lg:hidden">
                      Totals
                    </TableCell>
                    <TableCell colSpan={7} className="text-right font-semibold hidden lg:table-cell">
                      Totals
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <span className="font-mono tabular-nums font-semibold text-emerald-400">
                        {formatPKR(totalCredits)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <span className="font-mono tabular-nums font-semibold text-red-400">
                        {formatPKR(totalDebits)}
                      </span>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-semibold sm:hidden">
                      Net
                    </TableCell>
                    <TableCell colSpan={4} className="text-right font-semibold hidden sm:table-cell md:hidden">
                      Net
                    </TableCell>
                    <TableCell colSpan={5} className="text-right font-semibold hidden md:table-cell lg:hidden">
                      Net
                    </TableCell>
                    <TableCell colSpan={7} className="text-right font-semibold hidden lg:table-cell">
                      Net
                    </TableCell>
                    <TableCell colSpan={2} className="text-right whitespace-nowrap">
                      <span className={`font-mono tabular-nums font-bold text-base ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {net >= 0 ? "+" : ""}{formatPKR(net)}
                      </span>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                  {(totalWithdrawals > 0 || totalReturns > 0) && (
                    <>
                      <TableRow className="border-t border-amber-500/20">
                        <TableCell colSpan={3} className="text-right text-sm text-amber-500 sm:hidden">
                          Owner Withdrawals
                        </TableCell>
                        <TableCell colSpan={4} className="text-right text-sm text-amber-500 hidden sm:table-cell md:hidden">
                          Owner Withdrawals
                        </TableCell>
                        <TableCell colSpan={5} className="text-right text-sm text-amber-500 hidden md:table-cell lg:hidden">
                          Owner Withdrawals
                        </TableCell>
                        <TableCell colSpan={7} className="text-right text-sm text-amber-500 hidden lg:table-cell">
                          Owner Withdrawals
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {totalReturns > 0 && (
                            <span className="font-mono tabular-nums text-sm text-amber-500">
                              {formatPKR(totalReturns)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {totalWithdrawals > 0 && (
                            <span className="font-mono tabular-nums text-sm text-amber-500">
                              {formatPKR(totalWithdrawals)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                      {withdrawalBalance > 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-right text-sm font-medium text-amber-500 sm:hidden">
                            Owner Holds (to return)
                          </TableCell>
                          <TableCell colSpan={4} className="text-right text-sm font-medium text-amber-500 hidden sm:table-cell md:hidden">
                            Owner Holds (to return)
                          </TableCell>
                          <TableCell colSpan={5} className="text-right text-sm font-medium text-amber-500 hidden md:table-cell lg:hidden">
                            Owner Holds (to return)
                          </TableCell>
                          <TableCell colSpan={7} className="text-right text-sm font-medium text-amber-500 hidden lg:table-cell">
                            Owner Holds (to return)
                          </TableCell>
                          <TableCell colSpan={2} className="text-right whitespace-nowrap">
                            <span className="font-mono tabular-nums text-sm font-semibold text-amber-500">
                              {formatPKR(withdrawalBalance)}
                            </span>
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      )}
                    </>
                  )}
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Transaction Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Update the transaction details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Type</Label>
              <Select
                value={editType}
                onValueChange={(v) => { if (v) setEditType(v as TransactionType); }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={typeLabels[editType]} />
                </SelectTrigger>
                <SelectContent>
                  {allFilterTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">Amount (PKR)</Label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">Description</Label>
              <Input
                type="text"
                placeholder="Optional description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">Transaction Date</Label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">Reference Month</Label>
              <Input
                type="text"
                placeholder="YYYY-MM"
                value={editReferenceMonth}
                onChange={(e) => setEditReferenceMonth(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
                <Label className="text-[13px]">Owner</Label>
                <Select
                  value={editOwnerId}
                  onValueChange={(v) => setEditOwnerId(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select owner">
                      {editOwnerId ? (ownerNames[editOwnerId] ?? "Select owner") : "Select owner"}
                    </SelectValue>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[13px]">Source</Label>
                <Select value={editSource} onValueChange={(v) => setEditSource(v ?? "bank")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allSourceTypes.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Transfer?</Label>
                <Select value={editIsTransfer ? "yes" : "no"} onValueChange={(v) => setEditIsTransfer(v === "yes")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No (operational)</SelectItem>
                    <SelectItem value="yes">Yes (transfer)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              This will be recorded as a{" "}
              <span
                className={
                  isCreditType(editType)
                    ? "font-medium text-emerald-400"
                    : "font-medium text-red-400"
                }
              >
                {isCreditType(editType) ? "Credit" : "Debit"}
              </span>
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? "Saving..." : "Update Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
