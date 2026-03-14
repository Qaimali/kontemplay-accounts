"use client";

import { useCallback, useEffect, useState } from "react";
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

function isCreditType(type: TransactionType): boolean {
  return type === "client_payment" || type === "owner_investment";
}

export default function TransactionsPage() {
  const supabase = createClient();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formType, setFormType] = useState<TransactionType>("client_payment");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formReferenceMonth, setFormReferenceMonth] = useState("");
  const [formOwnerId, setFormOwnerId] = useState("");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (filterType) {
      query = query.eq("type", filterType);
    }
    if (filterMonth) {
      query = query.eq("reference_month", filterMonth);
    }

    const { data } = await query.returns<Transaction[]>();
    setTransactions(data ?? []);
    setLoading(false);
  }, [filterType, filterMonth]);

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

  const resetForm = () => {
    setFormType("client_payment");
    setFormAmount("");
    setFormDescription("");
    setFormReferenceMonth("");
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

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={filterType} onValueChange={(v) => setFilterType(v ?? "")}>
            <SelectTrigger className="w-[180px]">
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
          <Label>Reference Month</Label>
          <Input
            type="text"
            placeholder="YYYY-MM"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-[140px]"
          />
        </div>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
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
                  {/* Type */}
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

                  {/* Amount */}
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

                  {/* Description */}
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Input
                      type="text"
                      placeholder="Optional description"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                    />
                  </div>

                  {/* Reference Month */}
                  <div className="space-y-1.5">
                    <Label>Reference Month</Label>
                    <Input
                      type="text"
                      placeholder="YYYY-MM"
                      value={formReferenceMonth}
                      onChange={(e) => setFormReferenceMonth(e.target.value)}
                    />
                  </div>

                  {/* Owner (conditional) */}
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

                  {/* Credit / Debit indicator */}
                  <div className="text-sm text-muted-foreground">
                    This will be recorded as a{" "}
                    <span
                      className={
                        isCreditType(formType)
                          ? "font-medium text-green-600"
                          : "font-medium text-red-600"
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
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference Month</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn) => (
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
                      {txn.description ?? "-"}
                      {txn.owner ? (
                        <span className="ml-1 text-muted-foreground">
                          ({txn.owner.name})
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {txn.reference_month
                        ? formatMonth(txn.reference_month)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {txn.is_credit ? (
                        <span className="text-green-600">
                          {formatPKR(txn.amount_pkr)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!txn.is_credit ? (
                        <span className="text-red-600">
                          {formatPKR(txn.amount_pkr)}
                        </span>
                      ) : (
                        "-"
                      )}
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
