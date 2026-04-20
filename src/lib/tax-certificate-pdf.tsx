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
    fontSize: 22,
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    textAlign: "center",
    color: "#555555",
    marginBottom: 30,
  },
  date: {
    fontSize: 11,
    textAlign: "right",
    marginBottom: 4,
  },
  contractor: {
    fontSize: 11,
    marginBottom: 20,
    marginTop: 10,
  },
  contractorLabel: {
    fontFamily: "Helvetica-Bold",
  },
  table: {
    width: "100%",
    marginBottom: 30,
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
});

export interface TaxCertificateData {
  contractorName: string;
  cnic?: string;
  date: string;
  month: string;
  grossPkr: number;
  contractorTaxPercent: number;
  contractorTaxPkr: number;
}

function fmtPKR(n: number) {
  return `Rs. ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function TaxCertificatePDF({ data }: { data: TaxCertificateData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>CONTRACTOR TAX CERTIFICATE</Text>
        <Text style={styles.subtitle}>FBR Section 153(1)(b)</Text>

        <Text style={styles.date}>Date: {data.date}</Text>
        <Text style={styles.date}>Period: {data.month}</Text>

        <Text style={styles.contractor}>
          <Text style={styles.contractorLabel}>Contractor: </Text>
          {data.contractorName}
        </Text>
        {data.cnic && (
          <Text style={styles.contractor}>
            <Text style={styles.contractorLabel}>CNIC: </Text>
            {data.cnic}
          </Text>
        )}

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colLeft]}>Description</Text>
            <Text style={[styles.tableHeaderText, styles.colRight]}>Amount</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.colLeft}>Gross Amount (PKR)</Text>
            <Text style={styles.colRight}>{fmtPKR(data.grossPkr)}</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.colLeft}>Contractor Tax Rate</Text>
            <Text style={styles.colRight}>{data.contractorTaxPercent}%</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.colLeft}>Tax Deducted at Source (PKR)</Text>
            <Text style={styles.colRight}>{fmtPKR(data.contractorTaxPkr)}</Text>
          </View>

          <View style={styles.tableFooter}>
            <Text style={[styles.tableFooterText, styles.colLeft]}>TAX DEDUCTED</Text>
            <Text style={[styles.tableFooterText, styles.colRight]}>{fmtPKR(data.contractorTaxPkr)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>This is a computer-generated tax certificate.</Text>
      </Page>
    </Document>
  );
}
