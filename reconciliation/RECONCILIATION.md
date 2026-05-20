# Kontemplay Finance Reconciliation

**Date:** May 20, 2026
**Prepared by:** Qaim Ali & Claude
**Sources:** Company Bank Account (UBL) + Kontemplay Finance App (D1 Database)

---

## Context

Kontemplay got access to the UBL online banking portal on **May 20, 2026**. Before that, Sanan Babar managed salary distributions by withdrawing lump sums via cheque to his personal account and distributing from there. He also paid contractor taxes to FBR from his own pocket.

This document reconciles both sources and identifies what needs to be corrected in the database.

---

## Files

| File | Description |
|------|-------------|
| `bank-transactions.csv` | Company UBL bank account statement (20 transactions) |
| `db-transactions.csv` | All transactions from Kontemplay Finance D1 database (57 entries) |

---

## Owner IDs (for reference)

| Owner | DB ID |
|-------|-------|
| Qaim Ali | `1d146db6-866c-4fdf-9ea3-d5c9471f6a2c` |
| Arsalan Dogar | `7691530f-e0bf-40a4-93b3-be15c6bc0d23` |
| Sanan Babar | `aad1cfc5-5670-423e-9ae0-2790935aa162` |

---

## Complete Money Trail

### Pre-Revenue Period (Sep 2024 - Jan 2026)

All expenses paid by owners from their own pockets. No company bank activity.

| Date | What | Who Paid | Amount | In DB? |
|------|------|----------|--------|--------|
| Sep 2024 | Domain | Arsalan | 3,200 | Yes (investment + expense) |
| Jun 2025 | Logo payment | Sanan | 30,000 | Yes |
| Jun 2025 | Logo one cost | Qaim | 15,000 | Yes |
| Aug 2025 | Card fronts | Qaim | 3,750 | Yes |
| Oct 2025 | Kontemplay Domain | Arsalan | 2,888 | Yes |
| Nov 2025 | Designer 1sep-19nov | Sanan | 177,736 | Yes |
| Dec 2025 | SECP reg and advance | Sanan | 41,511 | Yes |
| Dec 2025 | FBR reg fee | Sanan | 20,000 | Yes |
| Dec 2025 | Designer 20-30Nov | Arsalan | 91,392 | Yes |
| Jan 2026 | Sanan 5k to open bank account | Sanan | 5,000 | Yes |

---

### December 2025 - First Invoice, Paid Directly from Company Bank

**Company Bank:**

| Date | Description | In | Out | Balance |
|------|-------------|----|-----|---------|
| 09-Feb | Dec 2025 Invoice (gross) | 3,252,911 | | 3,257,911 |
| 09-Feb | WHT 1% to FBR | | 32,529 | 3,225,382 |
| | **Net revenue = 3,220,382** | | | |
| 12-Feb | Sanan deposited (80k from Qaim) | 100,000 | | 3,325,382 |
| 12-Feb | Zaki salary (cheque) | | 592,498 | 2,732,884 |
| 13-Feb | Fatima salary (cheque) | | 349,389 | 2,383,495 |
| 13-Feb | Qaim + Fitrus salary (cheque) | | 1,890,426 | 493,069 |
| 13-Feb | Cheque return charges | | 1,000 | 492,069 |
| 13-Feb | Federal excise duty | | 160 | 491,909 |
| 18-Feb | Mubashir salary (cheque) | | 329,165 | 162,744 |

**Sanan's Side:**
- Paid Dec contractor tax (Rs 133,115) to FBR from own pocket
- Recorded in DB as owner_investment: **Yes**

**Status: Fully recorded in DB. All correct.**

---

### January 2026 - Sanan Starts Withdrawing

**Company Bank:**

| Date | Description | In | Out | Balance |
|------|-------------|----|-----|---------|
| 10-Mar | Jan 2026 Invoice (gross) | 3,199,954 | | 3,362,698 |
| 10-Mar | WHT 0.25% to FBR | | 8,000 | 3,354,698 |
| | **Net revenue = 3,191,954** | | | |
| 17-Mar | **Sanan withdrew (cheque to self)** | | **3,200,000** | 154,698 |

**Sanan's Side (from his account):**

| What | Amount | Source |
|------|--------|--------|
| Qaim Ali salary | 1,051,307 | From withdrawal |
| Zaki salary | 587,119 | From withdrawal |
| Mubashir salary | 652,355 | From withdrawal |
| Fitrus salary | 384,889 | From withdrawal |
| **Total salaries** | **2,675,670** | |
| Contractor tax to FBR | 113,556 | **From own pocket** |

- Withdrew: **3,200,000**
- Distributed (salaries): **2,675,670**
- **Sanan holding company money: Rs 524,330**
- Contractor tax paid from own pocket: Rs 113,556

**DB Issues:**
- Withdrawal of 3,200,000 from company bank: **NOT in DB**
- Owner investment for Jan contractor tax (113,556): **NOT in DB**

---

### February 2026 - Sanan Uses Jan Surplus

**Company Bank:**

| Date | Description | In | Out | Balance |
|------|-------------|----|-----|---------|
| 15-Apr | Feb 2026 Invoice (gross) | 3,486,875 | | 3,641,573 |
| 15-Apr | WHT 0.25% to FBR | | 8,717 | 3,632,856 |
| | **Net revenue = 3,478,158** | | | |
| 16-Apr | **Sanan withdrew (cheque to self)** | | **3,000,000** | 632,856 |

**Sanan's Side (from his account):**

| What | Amount | Source |
|------|--------|--------|
| Carried from Jan | 524,330 | Previous surplus |
| New withdrawal | 3,000,000 | Company bank |
| **Total available** | **3,524,330** | |
| Qaim Ali salary | 1,051,635 | From withdrawal |
| Zaki salary | 587,303 | From withdrawal |
| Mubashir salary | 652,559 | From withdrawal |
| Fitrus salary | 652,559 | From withdrawal |
| Fatima (direct invoice) | 144,909 | From withdrawal |
| **Total salaries** | **3,088,965** | |
| Contractor tax to FBR | 124,947 | **From own pocket** |
| Contractor tax (direct inv.) | 6,101 | **From own pocket** |

- Available: **3,524,330**
- Distributed (salaries): **3,088,965**
- **Sanan holding company money: Rs 435,365**
- Contractor tax paid from own pocket: Rs 131,048

**DB Issues:**
- Withdrawal of 3,000,000 from company bank: **NOT in DB**
- Owner investment for Feb contractor tax (131,048): **NOT in DB**
- Client payment reference_month says "2024-02" — should be "2026-02"

---

### March 2026 - Last Manual Month

**Company Bank:**

| Date | Description | In | Out | Balance |
|------|-------------|----|-----|---------|
| 30-Apr | Mar 2026 Invoice (gross) | 3,240,469 | | 3,873,325 |
| 30-Apr | WHT 0.25% to FBR | | 8,101 | 3,865,224 |
| | **Net revenue = 3,232,368** | | | |
| 11-May | **Sanan withdrew (cheque to self)** | | **3,300,000** | 565,224 |
| 20-May | Contractor tax paid from bank | | 114,860 | **450,364** |

**Sanan's Side (from his account):**

| What | Amount | Source |
|------|--------|--------|
| Carried from Jan+Feb | 435,365 | Previous surplus |
| New withdrawal | 3,300,000 | Company bank |
| **Total available** | **3,735,365** | |
| Qaim Ali salary | 1,048,053 | From withdrawal |
| Zaki salary | 585,289 | From withdrawal |
| Mubashir salary | 650,321 | From withdrawal |
| Fitrus salary | 422,709 | From withdrawal |
| **Total salaries** | **2,706,372** | |

- Available: **3,735,365**
- Distributed (salaries): **2,706,372**
- **Sanan holding company money: Rs 1,028,993**
- Contractor tax: paid from company bank (Rs 114,860) — not from Sanan this time

**DB Issues:**
- Withdrawal of 3,300,000 from company bank: **NOT in DB**

---

### Side Transactions (Karim Farm)

| Date | What | Amount | Net Effect |
|------|------|--------|------------|
| 10-Feb | Client payment (Karim farm) | +28,000 | |
| 10-Feb | Owner repayment to Qaim | -28,000 | 0 |
| 21-Apr | Client payment (Karim Farm P2) | +50,000 | |
| 10-May | Owner repayment to Qaim | -50,000 | 0 |

These cancel out. All recorded in DB.

---

## Summary: Current State (May 20, 2026)

### Company Bank Balance

```
Current UBL balance:                      Rs    450,364
```

### Dashboard Metrics (from DB)

```
Client Revenue:                           Rs 13,200,862
Operating Cost (salaries + tax):          Rs 12,125,064
Owner Repayments:                         Rs     78,000
Cash Position (formula):                  Rs    997,798
```

Cash Position (997,798) does NOT match bank balance (450,364) because
Sanan is holding Rs 1,028,993 of company money from excess withdrawals.

---

## Sanan's Account: What He Owes vs What He's Owed

### Sanan Owes Company (excess from withdrawals)

| Month | Withdrew | Salaries Distributed | Surplus |
|-------|----------|---------------------|---------|
| Jan 2026 | 3,200,000 | 2,675,670 | +524,330 |
| Feb 2026 | 3,000,000 | 3,088,965 | -88,965 |
| Mar 2026 | 3,300,000 | 2,706,372 | +593,628 |
| **Total** | **9,500,000** | **8,471,007** | **+1,028,993** |

**Sanan owes company: Rs 1,028,993**

### Company Owes Sanan (his investments)

**Recorded in DB:**

| Description | Amount | Owner ID |
|-------------|--------|----------|
| Sanan Account Starting Payment | 5,000 | Sanan |
| Sanan paid for FBR contractor tax (Dec) | 133,115 | Sanan |
| FBR (paid by owner) | 131,986 | Sanan |
| 15 lawyer + 20k bank transfer + 5.6k PSEB | 40,600 | Sanan |
| Fbr reg fee | 20,000 | Sanan |
| Secp reg and advance | 41,511 | Sanan |
| Designer 1sep - 19 nov | 177,736 | Sanan |
| Logo payment | 30,000 | Sanan |
| **Subtotal recorded** | **579,948** | |

**NOT recorded in DB (missing owner_investment entries):**

| Description | Amount | Needs Adding |
|-------------|--------|--------------|
| Sanan paid Jan 2026 contractor tax from own funds | 113,556 | YES |
| Sanan paid Feb 2026 contractor tax from own funds | 131,048 | YES |
| **Subtotal missing** | **244,604** | |

**Total company owes Sanan: Rs 824,552**

### Net Settlement

```
Sanan owes company:                       Rs  1,028,993
Company owes Sanan:                     - Rs    824,552
                                         ─────────────
Net Sanan owes:                           Rs    204,441
```

---

## DB Changes Needed

### 1. Add Missing Owner Investment Records (Sanan's contractor tax payments)

```
Type: owner_investment
Owner: Sanan Babar (aad1cfc5-5670-423e-9ae0-2790935aa162)
Amount: 113,556.30
Description: "Sanan paid Jan 2026 contractor tax (own funds)"
Reference Month: 2026-01
is_credit: 1
```

```
Type: owner_investment
Owner: Sanan Babar (aad1cfc5-5670-423e-9ae0-2790935aa162)
Amount: 131,048.12
Description: "Sanan paid Feb 2026 contractor tax (own funds)"
Reference Month: 2026-02
is_credit: 1
```

### 2. Consider Adding New Transaction Type: `owner_withdrawal`

To track the 3 lump-sum withdrawals Sanan made from the company bank:

| Date | Amount | Description |
|------|--------|-------------|
| 17-Mar-2026 | 3,200,000 | Sanan withdrew for Jan 2026 salary distribution |
| 16-Apr-2026 | 3,000,000 | Sanan withdrew for Feb 2026 salary distribution |
| 11-May-2026 | 3,300,000 | Sanan withdrew for Mar 2026 salary distribution |

**Important:** These must be excluded from the Cash Position / Operating Cost formula to avoid double-counting with salary_payout entries. They are bank-level movements, not operational costs.

### 3. Record Sanan's Return (when it happens)

When Sanan returns excess money, record as `owner_return` or similar:

```
Type: owner_return (new type) or client_payment with note
Amount: 1,028,993
Description: "Sanan returned excess from Jan-Mar 2026 salary distributions"
is_credit: 1
```

### 4. Fix Data Issue

The Feb 2026 client payment has `reference_month: "2024-02"` — should be `"2026-02"`.

---

## After All Settlements

```
Current bank balance:                     Rs    450,364
+ Sanan returns excess:                 + Rs  1,028,993
- Company repays Sanan investments:     - Rs    824,552
                                         ─────────────
Final bank balance:                       Rs    654,805
```

Or if handled in two steps:
1. Sanan returns Rs 1,028,993 → bank becomes Rs 1,479,357
2. Company repays Sanan Rs 824,552 → bank becomes Rs 654,805

---

## Going Forward (Post Portal Access)

Now that you have UBL online portal access (May 20, 2026):

1. **Pay salaries directly from company bank** — no more transfers to personal accounts
2. **Pay contractor taxes directly from company bank** to government account
3. **Record each transaction in Kontemplay Finance app** as it happens
4. **No more advance/withdrawal pattern** — everything goes direct
