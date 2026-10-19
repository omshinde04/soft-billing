# Swipe GSTR-1 Reference Workbook Mapping Specification

This document details the comparative mapping between the reference Swipe monthly report (`GSTR_1_Report_01-09-2026_to_30-09-2026.xls`) and Billing-Soft's ExcelJS generation engine (`src/services/excelExportService.js`).

---

## 1. Reference File Overview

- **Source File**: `GSTR_1_Report_01-09-2026_to_30-09-2026.xls`
- **Source Software**: Swipe (getswipe.in)
- **Period**: 01-09-2026 to 30-09-2026 (September 2026)
- **Format**: CDFV2 BIFF8 Microsoft Excel Workbook
- **Total Worksheets**: 16 worksheets

---

## 2. Worksheet-by-Worksheet Analysis & Billing-Soft Implementation

### 2.1 `GSTR1 Report` (Master Sales Register)
- **Purpose**: Comprehensive invoice-by-invoice sales ledger showing customer details, invoice numbers, tax slabs, taxable values, and component tax amounts.
- **Swipe Structure**:
  - Rows 1–2: Tax Period (`From Year`, `To Year`, `From Month`, `To Month`)
  - Rows 4–6: Registered Person Details (GSTIN, Legal Name, Trade Name)
  - Rows 7–8: Historical Turnover Placeholders
  - Rows 10–11: Two-row hierarchical header:
    - Row 10: `['GSTIN/UIN No.', 'Party Name', 'Transaction Type', 'Invoice', '', '', 'Rate', 'CESS Rate', 'Taxable Value', 'Reverse Charge', 'Amount', '', '', '', 'Place Of Supply']`
    - Row 11: `['GSTIN/UIN No.', 'Party Name', 'Transaction Type', 'No.', 'Date', 'Value', 'Rate', 'CESS Rate', 'Taxable Value', 'Reverse Charge', 'Integrated Tax', 'Central Tax', 'State/UT Tax', 'CESS', 'Place Of Supply']`
  - Rows 12–91: Invoices 314 to 393 (80 invoices)
  - Bottom Row: `Totals` summary
- **Billing-Soft Generation**:
  - Faithfully reproduces rows 1 through 11 with the distributor's configured GSTIN, legal name, and trade name.
  - Generates invoice records with genuine numeric amounts, Indian date format (`DD-MM-YYYY`), tax split (`CGST`/`SGST` for intra-state, `IGST` for inter-state), and auto-calculated column totals.

---

### 2.2 `b2cs` (B2C Small Supplies)
- **Purpose**: Statutory GSTR-1 Table 7 summary for intra-state and inter-state supplies to unregistered persons.
- **Swipe Structure**:
  - Row 1: Header title `Summary For B2CS(7)`
  - Rows 2–3: Aggregated `Total Taxable Value` and `Total Cess`
  - Row 4: Column headers: `['Type', 'Place Of Supply', 'Applicable % of Tax Rate', 'Rate', 'Taxable Value', 'Cess Amount', 'E-Commerce GSTIN']`
  - Rows 5+: Grouped by Type (`OE` - Other than E-commerce), Place of Supply (`27-Maharashtra`), Rate (`5.0%`), and Total Taxable Value.
- **Billing-Soft Generation**:
  - Automatically filters finalized invoices where retailer GSTIN is absent or unregistered.
  - Dynamically groups by Place of Supply and GST Tax Rate slab.

---

### 2.3 `b2b,sez,de` (Registered B2B Supplies)
- **Purpose**: Statutory GSTR-1 Table 4 summary for supplies to GST-registered businesses.
- **Swipe Structure**:
  - Headers: `['GSTIN/UIN of Recipient', 'Receiver Name', 'Invoice Number', 'Invoice date', 'Invoice Value', 'Place Of Supply', 'Reverse Charge', 'Applicable % of Tax Rate', 'Invoice Type', 'E-Commerce GSTIN', 'Rate', 'Taxable Value', 'Cess Amount']`
- **Billing-Soft Generation**:
  - Automatically identifies invoices with valid 15-character recipient GSTINs.
  - Computes recipient counts, invoice counts, and total taxable values.

---

### 2.4 `hsn(b2c)` (HSN Summary of Outward Supplies)
- **Purpose**: Statutory GSTR-1 Table 12 HSN summary of goods supplied.
- **Swipe Structure**:
  - Headers: `['HSN', 'Description', 'UQC', 'Total Quantity', 'Total Value', 'Rate', 'Taxable Value', 'Integrated Tax Amount', 'Central Tax Amount', 'State/UT Tax Amount', 'Cess Amount']`
  - In Swipe's export, products are grouped primarily by UQC (`PCS-PIECES`, `OTH-OTHERS`) and tax rate.
- **Billing-Soft Generation**:
  - Aggregates by product HSN, UQC, and tax rate slab.
  - Populates total quantities, taxable values, and central/state/integrated tax breakdown.

---

### 2.5 `docs` (Documents Issued Audit Table)
- **Purpose**: Statutory GSTR-1 Table 13 document audit trail reporting the serial ranges of invoices issued, total count, and cancellations.
- **Swipe Structure**:
  - Columns: `['Nature of Document', 'Sr. No. From', 'Sr. No. To', 'Total Number', 'Cancelled']`
  - Sample: `['Invoices for outward supply', '314', '393', 80.0, 0.0]`
- **Billing-Soft Generation**:
  - Dynamically inspects the earliest and latest invoice numbers issued in the selected date range.
  - Accurately counts total issued documents and documents marked as `cancelled`.

---

### 2.6 `itemWiseSale` & `itemSummary`
- **Purpose**: Internal management sales turnover report displaying item-by-item sales performance across the billing period.
- **Swipe Structure**:
  - Lists each distinct product with UQC, quantity sold, total value, rate, taxable value, and tax components.
- **Billing-Soft Generation**:
  - Generates itemized rows sorted by sales turnover descending, preserving product names, HSN codes, and UQC identifiers.

---

### 2.7 `itemWiseSaleReturn` & `cdnur`
- **Purpose**: Records goods returned by retailers and credit note adjustments.
- **Swipe Structure**:
  - Identical table headers to `itemWiseSale`. In the September 2026 Swipe reference, there were 0 returns.
- **Billing-Soft Generation**:
  - Connects to Billing-Soft's Sales Returns module to populate returned item quantities, taxable refund amounts, and tax adjustments when returns exist in the period.

---

## 3. Financial Reconciliation Notes

1. **Tax-Inclusive Pricing Formula**:
   $$\text{Taxable Value} = \text{round}\left(\frac{\text{Gross Amount}}{1 + \frac{\text{Tax Rate}}{100}}, 2\right)$$
2. **Rounding Deltas**:
   Across 80 invoices in Swipe's September 2026 ledger, a cumulative delta of ₹1.41 exists between the raw sum of line values and rounded invoice totals. Billing-Soft maintains strict line-level mathematical consistency: the invoice summary is the exact sum of its line items, with explicit round-off recorded to the nearest whole Rupee.
3. **Statutory Filing Disclaimer**:
   While Billing-Soft produces workbooks matching the worksheets and column structure of Swipe's export, GST laws and portal schemas update periodically. Filing figures should always be verified by an authorized tax consultant or Chartered Accountant prior to GSTR-1 submission.
