import type { EmployeeDistInput, EmployeeDistResult, DistributionResult } from "./types";

interface DistributionInput {
  amount_received_pkr: number;
  remittance_tax_percent: number;
  operational_cost_percent: number;
  total_usd: number;
  threshold: number; // default threshold
  base_rate: number;
  employees: EmployeeDistInput[];
}

export function calculateRates(
  amount_received_pkr: number,
  remittance_tax_percent: number,
  total_usd: number,
  threshold: number
) {
  const original_amount = amount_received_pkr * (1 + remittance_tax_percent / 100);
  const base_rate = original_amount / total_usd;
  const effective_rate = base_rate - threshold;

  return { original_amount, base_rate, effective_rate };
}

export function calculateDistribution(input: DistributionInput): DistributionResult {
  const included = input.employees.filter((e) => e.included);

  const original_amount = input.amount_received_pkr * (1 + input.remittance_tax_percent / 100);

  const employeeResults: EmployeeDistResult[] = [];
  let total_employee_gross = 0;
  let total_employee_net = 0;
  let total_employee_tax = 0;
  let total_contractor_tax = 0;
  let total_threshold_savings = 0;
  let total_operational_cost = 0;

  for (const emp of included) {
    const emp_rate = input.base_rate - emp.threshold;
    const gross_pkr = emp.salary_usd * emp_rate;

    const contractor_tax_pkr = gross_pkr * (emp.contractor_tax_percent / 100);
    const remittance_tax_pkr = gross_pkr * (emp.remittance_tax_percent / 100);
    const operational_cost_pkr = gross_pkr * (input.operational_cost_percent / 100);
    const total_tax = contractor_tax_pkr + remittance_tax_pkr + operational_cost_pkr;
    const net_pkr = gross_pkr - total_tax;
    const threshold_savings_pkr = emp.salary_usd * emp.threshold;

    total_threshold_savings += threshold_savings_pkr;

    employeeResults.push({
      employee_id: emp.employee_id,
      name: emp.name,
      salary_usd: emp.salary_usd,
      rate: emp_rate,
      threshold: emp.threshold,
      contractor_tax_percent: emp.contractor_tax_percent,
      remittance_tax_percent: emp.remittance_tax_percent,
      gross_pkr,
      threshold_savings_pkr,
      contractor_tax_pkr,
      remittance_tax_pkr,
      operational_cost_pkr,
      total_tax_pkr: total_tax,
      net_pkr,
    });

    total_employee_gross += gross_pkr;
    total_employee_net += net_pkr;
    total_employee_tax += total_tax;
    total_contractor_tax += contractor_tax_pkr;
    total_operational_cost += operational_cost_pkr;
  }

  // Company calculation
  const total_employee_usd = included.reduce((s, e) => s + e.salary_usd, 0);
  const company_usd = input.total_usd - total_employee_usd;
  const company_gross_from_usd = company_usd * input.base_rate;
  const company_total_before_tax = company_gross_from_usd + total_threshold_savings + total_operational_cost;

  // For grand total verification: op cost is a transfer from employees to company,
  // not new money — so exclude it from the employee tax bucket to avoid double-counting.
  const total_employee_tax_for_verification = total_employee_tax - total_operational_cost;
  const company_remittance_tax = company_total_before_tax * (input.remittance_tax_percent / 100);
  const company_net = company_total_before_tax - company_remittance_tax;

  const grand_total = total_employee_net + total_employee_tax_for_verification + company_net + company_remittance_tax;
  const difference = original_amount - grand_total;

  return {
    employees: employeeResults,
    company: {
      usd: company_usd,
      gross_from_usd: company_gross_from_usd,
      threshold_savings: total_threshold_savings,
      operational_cost: total_operational_cost,
      total_before_tax: company_total_before_tax,
      remittance_tax_amount: company_remittance_tax,
      net_pkr: company_net,
    },
    summary: {
      original_amount,
      total_employee_gross,
      total_employee_tax,
      total_employee_net,
      total_contractor_tax,
      company_net,
      grand_total,
      is_balanced: Math.abs(difference) < 1,
      difference,
    },
  };
}
