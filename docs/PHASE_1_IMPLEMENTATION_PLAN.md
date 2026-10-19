# Billing-Soft Phase 1: Implementation Plan
**Desktop Billing, Invoice Management & GST Reporting System for FMCG Distributors**

---

## 1. Executive Summary & Repository Findings

### 1.1 Repository State
- **Workspace**: `/Users/omshinde/soft-billing`
- **Initial State**: Empty directory, clean slate. Initialized local git connected to remote `https://github.com/omshinde04/soft-billing`.
- **Target Platform**: Desktop-only (macOS arm64 development, packagable for Windows/macOS/Linux).
- **Core Technology Stack**:
  - Runtime & App Shell: **Electron**
  - Frontend: **React** (JavaScript / JSX — strict no-TypeScript requirement)
  - Styling: **Tailwind CSS** with a modern, high-contrast, professional desktop-first design
  - Local Database: **SQLite** (`better-sqlite3`) with versioned schema migrations
  - Excel Engine: **ExcelJS** for multi-worksheet GSTR-1 compatible report exports
  - Icons: **lucide-react**
  - Testing: **Vitest** for calculation engine, database persistence, and Excel generation testing

### 1.2 Inspection of Reference Files
Two authentic business reference files were located and thoroughly analyzed:

1. **Reference A: Tax Invoice PDF (`INV-1050_for_Avinash_Kirana_Nandgoan.pdf`)**
   - **Seller Profile**: FMCG Distributor located in Nashik, Maharashtra (GSTIN state code `27`).
   - **Recipient**: Local kirana store in Nandgaon, Maharashtra (Intra-state B2C/unregistered supply).
   - **Invoice Structure**:
     - Header: Business name, GSTIN, registered address, contact number, email, Parle distributor branding.
     - Invoice Details: Invoice Number (`INV-1050`), Invoice Date, Due Date, Place of Supply (`27-MAHARASHTRA`).
     - Line Items: Item name (with pack/MRP indication, e.g. `Parle G Gluco 10 MRP`), Rate per item, Quantity, Unit (`PCS`), Taxable Value, Tax Amount (`5%`), Line Total Amount.
     - Financial Summary: Taxable Amount (`₹4,026.17`), CGST 2.5% (`₹100.65`), SGST 2.5% (`₹100.65`), Round Off (`-0.48`), Invoice Total (`₹4,227.00`).
     - Footer: Bank details (Bank, Account #, IFSC, Branch), Authorized Signatory placeholder, computer-generated declaration.

2. **Reference B: Monthly GSTR-1 Workbook (`GSTR_1_Report_01-09-2026_to_30-09-2026.xls`)**
   - **Format**: CDFV2 BIFF8 Excel workbook exported by Swipe for September 2026.
   - **Worksheets Present**:
     - `GSTR1 Report` (93 rows): Master summary sheet with seller header (GSTIN, legal name, trade name, tax period) and detailed row-by-row invoice ledger (Invoices 314 to 393: Date, Customer, Taxable Value, Tax Rate, Central Tax, State/UT Tax, Invoice Value, Place of Supply).
     - `b2cs` (5 rows): Summary for B2C Small supplies grouped by Type (`OE`), Place of Supply (`27-Maharashtra`), Rate (`5.0%`), Total Taxable Value, Cess.
     - `hsn(b2c)` (7 rows): Aggregation by UQC (`PCS-PIECES`, `OTH-OTHERS`), Rate (`5.0%`), Total Quantity, Total Value, Taxable Value, Central Tax, State Tax.
     - `docs` (5 rows): Document issuance audit table (`Invoices for outward supply`, Serial From `314`, Serial To `393`, Total Number `80`, Cancelled `0`).
     - `itemWiseSale` (26 rows): Product-wise aggregated breakdown with Product Name, UQC, Total Quantity, Total Value, Tax Rate, Taxable Value, Central/State Tax.
     - `itemWiseSaleReturn` (4 rows): Template for sales returns with return quantities and refund tax values.
     - `itemSummary` (26 rows): Identical to `itemWiseSale` reflecting month-end product turnover.
     - Supporting standard GSTR-1 sheets: `b2b,sez,de`, `b2cl`, `cdnr`, `cdnur`, `exp`, `at`, `atadj`, `exemp`, `hsn(b2b)`.

---

## 2. Calculation Reconciliation & Mathematical Findings

### 2.1 Tax-Inclusive Pricing vs. Taxable Amount Decomposition
In FMCG distribution, wholesale price lists are frequently negotiated and quoted on an inclusive or per-case/per-piece basis (e.g. Parle-G 5MRP wholesale selling price ₹4.52/pc).
By analyzing the exact numbers in `INV-1050`:
- Line 2: Parle-G 5MRP: Qty = 144, Gross Line = ₹650.88 (which is $144 \times 4.52$).
- $\text{Taxable Value} = \frac{650.88}{1.05} = 619.8857\dots \approx ₹619.89$.
- $\text{Tax Amount} = 619.89 \times 0.05 = 30.9945 \approx ₹30.99$.
- Rate displayed = $\frac{619.8857}{144} \approx ₹4.30$.
- Line Total = $619.89 + 30.99 = ₹650.88$.

### 2.2 Line-Level vs. Invoice-Level Precision & Round-Off
- Sum of rounded line taxable values in `INV-1050`:
  $$618.51 + 619.89 + 813.71 + 206.17 + 617.14 + 206.17 + 205.71 + 408.11 + 124.57 + 206.17 = ₹4,026.15$$
- However, the invoice summary displays:
  $$\text{Taxable Amount} = ₹4,026.17$$
- **Root Cause**: The invoice summary calculates taxable amount from the sum of gross line items ($\frac{4227.48}{1.05} = 4026.1714 \approx 4026.17$), resulting in a ₹0.02 delta compared to summing pre-rounded lines.
- **Rule for Billing-Soft**:
  1. We will support both Tax-Inclusive and Tax-Exclusive pricing modes.
  2. For Tax-Exclusive mode: $\text{Taxable} = \text{round}(\text{Qty} \times \text{Rate} - \text{Discount}, 2)$.
  3. For Tax-Inclusive mode: $\text{Taxable} = \text{round}\left(\frac{\text{Qty} \times \text{GrossRate} - \text{Discount}}{1 + \frac{\text{TaxRate}}{100}}, 2\right)$.
  4. Line-level CGST and SGST are computed as $\text{round}\left(\frac{\text{Taxable} \times \text{TaxRate}}{2 \times 100}, 2\right)$.
  5. The invoice level totals represent the strict sum of itemized lines to maintain perfect mathematical auditability between table rows and total summaries.
  6. Final invoice round-off: $\text{RoundOff} = \text{round}(\text{GrandTotal}) - \text{GrandTotal}$, yielding the integer payable amount.

---

## 3. System Architecture & Security Model

```
+-----------------------------------------------------------------------+
|                            RENDERER PROCESS                           |
|       React 18 + Tailwind CSS + Lucide Icons + Print/PDF Views        |
|  - Dashboard      - Products Master   - Retailers Master              |
|  - Billing / POS  - Invoice List/View - Sales Returns  - Reports & XL |
+------------------------------------+----------------------------------+
                                     |
                          IPC (contextBridge API)
                       (window.electronAPI: strictly whitelisted)
                                     |
+------------------------------------+----------------------------------+
|                              MAIN PROCESS                             |
|  - Window Lifecycle & Native Dialogs                                  |
|  - Print to PDF Handler                                               |
|  - Export File Dialogs                                                |
|  - App Data Path Management                                           |
+------------------------------------+----------------------------------+
                                     |
+------------------------------------+----------------------------------+
|                            SERVICES LAYER                             |
|  - Financial Calculation Engine (pure JS, decimal/paise arithmetic)   |
|  - GSTR-1 & Sales Reports Generator (ExcelJS)                         |
|  - Invoice PDF Template Engine                                        |
+------------------------------------+----------------------------------+
                                     |
+------------------------------------+----------------------------------+
|                           DATABASE LAYER                              |
|  - SQLite (better-sqlite3) in userData directory                     |
|  - Foreign keys enabled, PRAGMA journal_mode = WAL                    |
|  - Transactional Invoice Finalization & Numbering                     |
|  - Versioned Migrations Runner                                        |
+-----------------------------------------------------------------------+
```

### 3.1 Security Principles
- `contextIsolation: true`
- `nodeIntegration: false`
- No direct database access or file system access from React components.
- Strict IPC whitelist with channel-based schema validation.
- Content Security Policy (CSP) headers blocking remote script injection.

---

## 4. Database Schema Design

The SQLite schema consists of 7 normalized tables with foreign keys and indexes:

### 4.1 `business_settings`
- `id` (INTEGER PRIMARY KEY)
- `legal_name` (TEXT NOT NULL)
- `trade_name` (TEXT)
- `gstin` (TEXT)
- `address` (TEXT NOT NULL)
- `state` (TEXT NOT NULL DEFAULT 'Maharashtra')
- `state_code` (TEXT NOT NULL DEFAULT '27')
- `pincode` (TEXT)
- `phone` (TEXT NOT NULL)
- `email` (TEXT)
- `bank_name` (TEXT)
- `bank_account_no` (TEXT)
- `bank_ifsc` (TEXT)
- `bank_branch` (TEXT)
- `invoice_prefix` (TEXT NOT NULL DEFAULT 'INV-')
- `next_invoice_number` (INTEGER NOT NULL DEFAULT 1001)
- `invoice_footer_notes` (TEXT)
- `default_pricing_mode` (TEXT NOT NULL DEFAULT 'exclusive') -- 'inclusive' | 'exclusive'
- `updated_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

### 4.2 `products`
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `name` (TEXT NOT NULL)
- `brand` (TEXT)
- `sku` (TEXT UNIQUE)
- `barcode` (TEXT)
- `hsn_code` (TEXT)
- `unit` (TEXT NOT NULL DEFAULT 'PCS') -- PCS, BOX, PACK, KG, OTH
- `pack_size` (INTEGER DEFAULT 1) -- e.g. 12, 24, 72 pcs
- `mrp` (REAL NOT NULL)
- `purchase_price` (REAL)
- `selling_rate` (REAL NOT NULL)
- `tax_rate` (REAL NOT NULL DEFAULT 5.0) -- 0, 5, 12, 18, 28
- `is_active` (INTEGER NOT NULL DEFAULT 1)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

### 4.3 `retailers`
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `shop_name` (TEXT NOT NULL)
- `contact_person` (TEXT)
- `phone` (TEXT)
- `address` (TEXT)
- `city` (TEXT)
- `state` (TEXT NOT NULL DEFAULT 'Maharashtra')
- `state_code` (TEXT NOT NULL DEFAULT '27')
- `pincode` (TEXT)
- `gstin` (TEXT)
- `is_active` (INTEGER NOT NULL DEFAULT 1)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

### 4.4 `invoices`
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `invoice_number` (TEXT NOT NULL UNIQUE)
- `invoice_date` (TEXT NOT NULL) -- YYYY-MM-DD
- `due_date` (TEXT)
- `retailer_id` (INTEGER REFERENCES retailers(id))
- `pricing_mode` (TEXT NOT NULL DEFAULT 'exclusive') -- 'inclusive' | 'exclusive'
- `seller_snapshot` (TEXT NOT NULL) -- JSON snapshot of business settings
- `retailer_snapshot` (TEXT NOT NULL) -- JSON snapshot of retailer details
- `place_of_supply` (TEXT NOT NULL) -- e.g. '27-Maharashtra'
- `is_inter_state` (INTEGER NOT NULL DEFAULT 0)
- `subtotal_taxable` (REAL NOT NULL)
- `total_cgst` (REAL NOT NULL DEFAULT 0.0)
- `total_sgst` (REAL NOT NULL DEFAULT 0.0)
- `total_igst` (REAL NOT NULL DEFAULT 0.0)
- `round_off` (REAL NOT NULL DEFAULT 0.0)
- `grand_total` (REAL NOT NULL)
- `status` (TEXT NOT NULL DEFAULT 'finalized') -- 'draft', 'finalized', 'cancelled'
- `notes` (TEXT)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

### 4.5 `invoice_items`
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `invoice_id` (INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE)
- `product_id` (INTEGER REFERENCES products(id))
- `item_name` (TEXT NOT NULL)
- `hsn_code` (TEXT)
- `unit` (TEXT NOT NULL DEFAULT 'PCS')
- `quantity` (REAL NOT NULL)
- `mrp` (REAL NOT NULL)
- `rate` (REAL NOT NULL) -- Base rate / Taxable rate
- `gross_rate` (REAL NOT NULL) -- Rate with tax if inclusive
- `discount_amount` (REAL NOT NULL DEFAULT 0.0)
- `taxable_amount` (REAL NOT NULL)
- `tax_rate` (REAL NOT NULL)
- `cgst_amount` (REAL NOT NULL DEFAULT 0.0)
- `sgst_amount` (REAL NOT NULL DEFAULT 0.0)
- `igst_amount` (REAL NOT NULL DEFAULT 0.0)
- `total_amount` (REAL NOT NULL)

### 4.6 `sales_returns`
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `return_number` (TEXT NOT NULL UNIQUE)
- `return_date` (TEXT NOT NULL)
- `invoice_id` (INTEGER NOT NULL REFERENCES invoices(id))
- `retailer_id` (INTEGER NOT NULL REFERENCES retailers(id))
- `reason` (TEXT)
- `total_refund_taxable` (REAL NOT NULL)
- `total_refund_tax` (REAL NOT NULL)
- `total_refund_amount` (REAL NOT NULL)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

### 4.7 `sales_return_items`
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `sales_return_id` (INTEGER NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE)
- `invoice_item_id` (INTEGER NOT NULL REFERENCES invoice_items(id))
- `product_id` (INTEGER REFERENCES products(id))
- `item_name` (TEXT NOT NULL)
- `return_qty` (REAL NOT NULL)
- `refund_taxable` (REAL NOT NULL)
- `refund_cgst` (REAL NOT NULL)
- `refund_sgst` (REAL NOT NULL)
- `refund_igst` (REAL NOT NULL)
- `refund_total` (REAL NOT NULL)

---

## 5. Implementation Milestones

### Milestone 1: Setup & Foundations (Completed)
- Inspect repository and reference files.
- Analyze math & exact GSTR-1 structures.
- Write implementation plan (`docs/PHASE_1_IMPLEMENTATION_PLAN.md`).

### Milestone 2: Desktop Infrastructure & Packaging
- Setup Vite + React (JavaScript) + Tailwind CSS + Electron.
- Configure `better-sqlite3` and database connection manager.
- Implement migration runner (`schema.sql`).
- Implement secure IPC channels (`ipcHandlers.js` & `preload.js`).

### Milestone 3: Master Data
- Business Settings UI & backend service.
- Products CRUD & search/filter UI.
- Retailers CRUD & search/filter UI.
- Master data validation (GSTIN syntax, numeric ranges).

### Milestone 4: Billing Engine & Invoice Management
- Pure JavaScript Financial Calculation Engine with tests.
- Invoice Creation Form with live line-level item addition, autocomplete, and calculations.
- Transactional atomic finalization with auto-incrementing serial invoice numbering.
- Invoice Listing with search, date filters, status pills.
- Invoice View & Printable/PDF preview matching `INV-1050`.

### Milestone 5: Reporting & GSTR-1 Excel Engine
- Real-time Dashboard with SQLite aggregates (monthly sales, GST summary, invoice counts).
- Reports Screen with date-range filters:
  - Invoice-wise Sales Ledger
  - Product-wise Sales Report
  - Retailer-wise Sales Report
  - GST Summary Report
  - Sales Return Report
- ExcelJS GSTR-1 Workbook Generator exporting exact Swipe-compatible worksheets:
  - `GSTR1 Report`, `b2cs`, `hsn(b2c)`, `docs`, `itemWiseSale`, `itemWiseSaleReturn`, `itemSummary`.

### Milestone 6: Sales Returns, Testing & Polish
- Sales Return workflow with validation against original remaining invoice quantities.
- Automated Test Suite (Calculation Engine, Database CRUD/Transactions, ExcelJS Workbook generation).
- Isolated Demo Data seeder button for testing.
- Backup & Restore instructions.
