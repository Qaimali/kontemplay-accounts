"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Employee } from "@/lib/types";
import { formatUSD } from "@/lib/format";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type EmployeeForm = {
  name: string;
  cnic: string;
  default_salary_usd: string;
  default_threshold: string;
  default_contractor_tax: string;
  default_remittance_tax: string;
  is_active: boolean;
};

const emptyForm: EmployeeForm = {
  name: "",
  cnic: "",
  default_salary_usd: "",
  default_threshold: "",
  default_contractor_tax: "",
  default_remittance_tax: "",
  is_active: true,
};

function formFromEmployee(emp: Employee): EmployeeForm {
  return {
    name: emp.name,
    cnic: emp.cnic ?? "",
    default_salary_usd: String(emp.default_salary_usd),
    default_threshold: String(emp.default_threshold),
    default_contractor_tax: String(emp.default_contractor_tax),
    default_remittance_tax: String(emp.default_remittance_tax),
    is_active: emp.is_active,
  };
}

export default function EmployeesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase
      .from("employees")
      .select("*")
      .order("name")
      .returns<Employee[]>();
    setEmployees(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditingId(emp.id);
    setForm(formFromEmployee(emp));
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      cnic: form.cnic.trim() || null,
      default_salary_usd: parseFloat(form.default_salary_usd) || 0,
      default_threshold: parseFloat(form.default_threshold) || 0,
      default_contractor_tax: parseFloat(form.default_contractor_tax) || 0,
      default_remittance_tax: parseFloat(form.default_remittance_tax) || 0,
      is_active: form.is_active,
    };

    if (editingId) {
      await supabase.from("employees").update(payload).eq("id", editingId);
    } else {
      await supabase.from("employees").insert(payload);
    }

    setSaving(false);
    setDialogOpen(false);
    await fetchEmployees();
  }

  async function toggleActive(emp: Employee) {
    await supabase
      .from("employees")
      .update({ is_active: !emp.is_active })
      .eq("id", emp.id);
    await fetchEmployees();
  }

  function updateField(field: keyof EmployeeForm, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
        <Button onClick={openAdd}>Add Employee</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Employee" : "Add Employee"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnic">CNIC</Label>
              <Input
                id="cnic"
                value={form.cnic}
                onChange={(e) => updateField("cnic", e.target.value)}
                placeholder="XXXXX-XXXXXXX-X"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary">Default USD Salary</Label>
                <Input
                  id="salary"
                  type="number"
                  step="any"
                  value={form.default_salary_usd}
                  onChange={(e) =>
                    updateField("default_salary_usd", e.target.value)
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold">Threshold (PKR)</Label>
                <Input
                  id="threshold"
                  type="number"
                  step="any"
                  value={form.default_threshold}
                  onChange={(e) =>
                    updateField("default_threshold", e.target.value)
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contractor_tax">Contractor Tax %</Label>
                <Input
                  id="contractor_tax"
                  type="number"
                  step="any"
                  value={form.default_contractor_tax}
                  onChange={(e) =>
                    updateField("default_contractor_tax", e.target.value)
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="remittance_tax">Remittance Tax %</Label>
                <Input
                  id="remittance_tax"
                  type="number"
                  step="any"
                  value={form.default_remittance_tax}
                  onChange={(e) =>
                    updateField("default_remittance_tax", e.target.value)
                  }
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(val) => updateField("is_active", !!val)}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !form.name.trim()}>
                {saving ? "Saving..." : editingId ? "Update" : "Add"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : employees.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No employees yet. Add one to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>CNIC</TableHead>
                  <TableHead className="text-right">USD Salary</TableHead>
                  <TableHead className="text-right">Threshold</TableHead>
                  <TableHead className="text-right">Contractor Tax</TableHead>
                  <TableHead className="text-right">Remittance Tax</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow
                    key={emp.id}
                    className="cursor-pointer"
                    onClick={() => openEdit(emp)}
                  >
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>{emp.cnic ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      {formatUSD(emp.default_salary_usd)}
                    </TableCell>
                    <TableCell className="text-right">
                      {emp.default_threshold.toLocaleString()} PKR
                    </TableCell>
                    <TableCell className="text-right">
                      {emp.default_contractor_tax}%
                    </TableCell>
                    <TableCell className="text-right">
                      {emp.default_remittance_tax}%
                    </TableCell>
                    <TableCell className="text-center">
                      <div
                        className="flex justify-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={emp.is_active}
                          onCheckedChange={() => toggleActive(emp)}
                        />
                      </div>
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
