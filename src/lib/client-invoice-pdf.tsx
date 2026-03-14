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
    fontSize: 10,
    color: "#333",
  },
  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
  },
  companyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#333",
  },
  invoiceTitle: {
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    color: "#333",
  },
  invoiceNumber: {
    fontSize: 12,
    textAlign: "right",
    color: "#888",
    marginTop: 2,
  },
  // Bill To + Date section
  metaSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  billTo: {
    flex: 1,
  },
  billToLabel: {
    fontSize: 9,
    color: "#888",
    marginBottom: 4,
  },
  billToName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  metaRight: {
    alignItems: "flex-end",
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 10,
    color: "#888",
    width: 80,
    textAlign: "right",
    marginRight: 10,
  },
  metaValue: {
    fontSize: 10,
    width: 100,
    textAlign: "right",
  },
  balanceDueRow: {
    flexDirection: "row",
    backgroundColor: "#444",
    padding: 8,
    marginTop: 4,
  },
  balanceDueLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#fff",
    width: 80,
    textAlign: "right",
    marginRight: 10,
  },
  balanceDueValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#fff",
    width: 100,
    textAlign: "right",
  },
  // Table
  table: {
    width: "100%",
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#444",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableHeaderText: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  colItem: { flex: 5 },
  colQty: { flex: 1.2, textAlign: "center" },
  colRate: { flex: 1.5, textAlign: "right" },
  colAmount: { flex: 1.5, textAlign: "right" },
  itemSubtext: {
    fontSize: 9,
    color: "#888",
    marginTop: 2,
  },
  // Totals
  totalsSection: {
    alignItems: "flex-end",
    marginTop: 20,
  },
  totalRow: {
    flexDirection: "row",
    width: 240,
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: "#888",
    textAlign: "right",
  },
  totalValue: {
    fontSize: 10,
    textAlign: "right",
  },
  totalRowBold: {
    flexDirection: "row",
    width: 240,
    justifyContent: "space-between",
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    marginTop: 4,
  },
  totalLabelBold: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  totalValueBold: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  // Notes
  notesSection: {
    marginTop: 60,
  },
  notesLabel: {
    fontSize: 10,
    color: "#888",
    marginBottom: 6,
  },
  notesText: {
    fontSize: 9,
    lineHeight: 1.6,
    color: "#555",
  },
});

export interface ClientInvoiceLineItem {
  description: string;
  subtitle?: string;
  quantity: number;
  rate: number;
}

export interface ClientInvoiceData {
  invoiceNumber: number;
  billTo: string;
  date: string;
  lineItems: ClientInvoiceLineItem[];
  taxPercent: number;
  notes: string;
}

function fmtUSD(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ClientInvoicePDF({ data }: { data: ClientInvoiceData }) {
  const subtotal = data.lineItems.reduce((s, item) => s + item.quantity * item.rate, 0);
  const tax = subtotal * (data.taxPercent / 100);
  const total = subtotal + tax;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.companyName}>KONTEMPLAY (PRIVATE) LIMITED</Text>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}># {data.invoiceNumber}</Text>
          </View>
        </View>

        {/* Bill To + Date + Balance Due */}
        <View style={styles.metaSection}>
          <View style={styles.billTo}>
            <Text style={styles.billToLabel}>Bill To:</Text>
            <Text style={styles.billToName}>{data.billTo}</Text>
          </View>
          <View style={styles.metaRight}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date:</Text>
              <Text style={styles.metaValue}>{fmtDate(data.date)}</Text>
            </View>
            <View style={styles.balanceDueRow}>
              <Text style={styles.balanceDueLabel}>Balance Due:</Text>
              <Text style={styles.balanceDueValue}>{fmtUSD(total)}</Text>
            </View>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colItem]}>Item</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Quantity</Text>
            <Text style={[styles.tableHeaderText, styles.colRate]}>Rate</Text>
            <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
          </View>

          {data.lineItems.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <View style={styles.colItem}>
                <Text>{item.description}</Text>
                {item.subtitle && (
                  <Text style={styles.itemSubtext}>{item.subtitle}</Text>
                )}
              </View>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colRate}>{fmtUSD(item.rate)}</Text>
              <Text style={styles.colAmount}>{fmtUSD(item.quantity * item.rate)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{fmtUSD(subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax ({data.taxPercent}%):</Text>
            <Text style={styles.totalValue}>{fmtUSD(tax)}</Text>
          </View>
          <View style={styles.totalRowBold}>
            <Text style={styles.totalLabelBold}>Total:</Text>
            <Text style={styles.totalValueBold}>{fmtUSD(total)}</Text>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
