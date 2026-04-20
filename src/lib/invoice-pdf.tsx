import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: "Helvetica",
    fontSize: 11,
  },
  title: {
    fontSize: 24,
    textAlign: "center",
    marginBottom: 30,
    fontFamily: "Helvetica-Bold",
  },
  date: {
    fontSize: 11,
    textAlign: "right",
    marginBottom: 30,
  },
  payTo: {
    fontSize: 11,
    marginBottom: 20,
  },
  payToLabel: {
    fontFamily: "Helvetica-Bold",
  },
  table: {
    width: "100%",
    marginBottom: 50,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#333333",
    padding: 10,
  },
  tableHeaderText: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#999999",
    padding: 8,
  },
  tableSectionRow: {
    flexDirection: "row",
    padding: 8,
  },
  tableFooter: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    padding: 12,
  },
  tableFooterText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
  },
  colLeft: {
    flex: 3,
  },
  colRight: {
    flex: 2,
    textAlign: "right",
  },
  footer: {
    fontSize: 9,
    color: "#999999",
    textAlign: "center",
    marginTop: 20,
  },
  sectionLabel: {
    fontFamily: "Helvetica-Bold",
  },
});

export interface BankDetails {
  title: string;
  number: string;
  iban: string;
  bank: string;
}

export interface InvoicePDFData {
  employeeName: string;
  bankDetails?: BankDetails;
  month: string;
  date: string;
  salaryUsd: number;
  exchangeRate: number;
  grossPkr: number;
  remittanceTaxPercent: number;
  remittanceTaxPkr: number;
  contractorTaxPercent: number;
  contractorTaxPkr: number;
  operationalCostPercent: number;
  operationalCostPkr: number;
  totalTaxPercent: number;
  totalTaxPkr: number;
  netPkr: number;
}

function fmtPKR(n: number) {
  return `Rs. ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtUSD(n: number) {
  return `$ ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InvoicePDF({ data }: { data: InvoicePDFData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>PAYMENT INVOICE</Text>
        <Text style={styles.date}>Date: {data.date}</Text>
        <Text style={styles.payTo}>
          <Text style={styles.payToLabel}>Pay To: </Text>
          {data.employeeName}
        </Text>
        {data.bankDetails && (data.bankDetails.title || data.bankDetails.number) && (
          <View style={{ marginBottom: 20, fontSize: 10 }}>
            {data.bankDetails.title ? (
              <Text style={{ marginBottom: 2 }}>
                <Text style={styles.payToLabel}>Account Title: </Text>
                {data.bankDetails.title}
              </Text>
            ) : null}
            {data.bankDetails.number ? (
              <Text style={{ marginBottom: 2 }}>
                <Text style={styles.payToLabel}>Account No: </Text>
                {data.bankDetails.number}
              </Text>
            ) : null}
            {data.bankDetails.iban ? (
              <Text style={{ marginBottom: 2 }}>
                <Text style={styles.payToLabel}>IBAN: </Text>
                {data.bankDetails.iban}
              </Text>
            ) : null}
            {data.bankDetails.bank ? (
              <Text>
                <Text style={styles.payToLabel}>Bank: </Text>
                {data.bankDetails.bank}
              </Text>
            ) : null}
          </View>
        )}

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colLeft]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.colRight]}>Amount</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.colLeft}>Salary (USD)</Text>
            <Text style={styles.colRight}>{fmtUSD(data.salaryUsd)}</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.colLeft}>Exchange Rate</Text>
            <Text style={styles.colRight}>{data.exchangeRate.toFixed(2)} PKR/USD</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.colLeft}>Gross Amount</Text>
            <Text style={styles.colRight}>{fmtPKR(data.grossPkr)}</Text>
          </View>

          <View style={styles.tableSectionRow}>
            <Text style={styles.colLeft}> </Text>
            <Text style={styles.colRight}> </Text>
          </View>

          <View style={styles.tableSectionRow}>
            <Text style={[styles.colLeft, styles.sectionLabel]}>Tax Deductions:</Text>
            <Text style={styles.colRight}> </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.colLeft}>{"  "}Remittance ({data.remittanceTaxPercent}%)</Text>
            <Text style={styles.colRight}>{fmtPKR(data.remittanceTaxPkr)}</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.colLeft}>{"  "}Contractor ({data.contractorTaxPercent}%)</Text>
            <Text style={styles.colRight}>{fmtPKR(data.contractorTaxPkr)}</Text>
          </View>

          {data.operationalCostPkr > 0 && (
            <View style={styles.tableRow}>
              <Text style={styles.colLeft}>{"  "}Operational Cost ({data.operationalCostPercent.toFixed(2)}%)</Text>
              <Text style={styles.colRight}>{fmtPKR(data.operationalCostPkr)}</Text>
            </View>
          )}

          <View style={styles.tableRow}>
            <Text style={styles.colLeft}>{"  "}Total Tax ({data.totalTaxPercent}%)</Text>
            <Text style={styles.colRight}>{fmtPKR(data.totalTaxPkr)}</Text>
          </View>

          <View style={styles.tableSectionRow}>
            <Text style={styles.colLeft}> </Text>
            <Text style={styles.colRight}> </Text>
          </View>

          <View style={styles.tableFooter}>
            <Text style={[styles.tableFooterText, styles.colLeft]}>NET PAYABLE</Text>
            <Text style={[styles.tableFooterText, styles.colRight]}>{fmtPKR(data.netPkr)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>This is a computer-generated invoice.</Text>
      </Page>
    </Document>
  );
}
