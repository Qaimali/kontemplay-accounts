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
};

export default function OwnersPage() {
  const supabase = createClient();
  const [owners, setOwners] = useState<OwnerWithBalances[]>([]);
  const [rawOwners, setRawOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Owners</h1>
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
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="invest-owner">Owner</Label>
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
                  <Label htmlFor="invest-amount">Amount (PKR)</Label>
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
                  <Label htmlFor="invest-desc">Description</Label>
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
                  <Label htmlFor="invest-month">Reference Month</Label>
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
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="repay-owner">Owner</Label>
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
                  <Label htmlFor="repay-amount">Amount (PKR)</Label>
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
                  <Label htmlFor="repay-desc">Description</Label>
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
                  <Label htmlFor="repay-month">Reference Month</Label>
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
        <p className="text-sm text-muted-foreground">No owners found.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {owners.map((owner) => (
            <Card key={owner.id}>
              <CardHeader>
                <CardTitle>{owner.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{owner.email}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Invested
                  </span>
                  <span className="font-medium text-emerald-400">
                    {formatPKR(owner.totalInvested)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Repaid
                  </span>
                  <span className="font-medium text-red-400">
                    {formatPKR(owner.totalRepaid)}
                  </span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      Outstanding Balance
                    </span>
                    <span
                      className={`text-lg font-bold ${
                        owner.outstanding > 0
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {formatPKR(owner.outstanding)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
