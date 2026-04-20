export interface Owner {
  id: string;
  clerk_id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Employee {
  id: string;
  name: string;
  cnic: string | null;
  bank_account: string | null;
  default_salary_usd: number;
  default_threshold: number;
  default_contractor_tax: number;
  default_remittance_tax: number;
  is_active: boolean;
  created_at: string;
}

export interface Distribution {
  id: string;
  reference_month: string;
  total_usd: number;
  distribute_usd: number;
  amount_received_pkr: number;
  remittance_tax_percent: number;
  base_rate: number;
  effective_rate: number;
  threshold: number;
  company_gross_pkr: number | null;
  company_net_pkr: number | null;
  created_by: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  distribution_id: string;
  employee_id: string;
  salary_usd: number;
  rate_applied: number;
  threshold_applied: number;
  contractor_tax_percent: number;
  remittance_tax_percent: number;
  gross_pkr: number;
  contractor_tax_pkr: number;
  remittance_tax_pkr: number;
  total_tax_pkr: number;
  net_pkr: number;
  created_at: string;
  // joined
  employee?: Employee;
}

export type TransactionType =
  | "client_payment"
  | "owner_investment"
  | "salary_payout"
  | "contractor_tax"
  | "owner_repayment"
  | "expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount_pkr: number;
  is_credit: boolean;
  description: string | null;
  reference_month: string | null;
  distribution_id: string | null;
  invoice_id: string | null;
  employee_id: string | null;
  owner_id: string | null;
  created_by: string | null;
  created_at: string;
  // joined
  owner?: Owner;
  employee?: Employee;
}

export type ClientInvoiceStatus = "draft" | "sent" | "received" | "overdue";

export interface ClientInvoice {
  id: string;
  invoice_number: number;
  bill_to: string;
  date: string;
  invoice_month: string | null;
  status: ClientInvoiceStatus;
  due_date: string | null;
  line_items: { description: string; subtitle?: string; quantity: number; rate: number }[];
  tax_percent: number;
  subtotal: number;
  total: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// Distribution calculator types
export interface EmployeeDistInput {
  employee_id: string;
  name: string;
  salary_usd: number;
  threshold: number;
  contractor_tax_percent: number;
  remittance_tax_percent: number;
  included: boolean;
}

export interface EmployeeDistResult {
  employee_id: string;
  name: string;
  salary_usd: number;
  rate: number;
  threshold: number;
  contractor_tax_percent: number;
  remittance_tax_percent: number;
  gross_pkr: number;
  threshold_savings_pkr: number;
  contractor_tax_pkr: number;
  remittance_tax_pkr: number;
  operational_cost_pkr: number;
  total_tax_pkr: number;
  net_pkr: number;
}

export interface DistributionResult {
  employees: EmployeeDistResult[];
  company: {
    usd: number;
    gross_from_usd: number;
    threshold_savings: number;
    operational_cost: number;
    total_before_tax: number;
    remittance_tax_amount: number;
    net_pkr: number;
  };
  summary: {
    original_amount: number;
    total_employee_gross: number;
    total_employee_tax: number;
    total_employee_net: number;
    total_contractor_tax: number;
    company_net: number;
    grand_total: number;
    is_balanced: boolean;
    difference: number;
  };
}
