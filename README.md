# Billing-Soft — Desktop FMCG Billing & GST Reporting System

A high-performance, offline-first desktop billing, invoice management, and GST reporting application tailored for FMCG distributors in Maharashtra, India.

---

## 1. Technology Architecture

- **Desktop Framework**: Electron 33+ (Secure IPC, `contextIsolation: true`, `nodeIntegration: false`)
- **Frontend UI**: React 18 + Tailwind CSS (Vanilla JS / JSX — strictly no TypeScript)
- **Database**: SQLite via `better-sqlite3` (WAL mode enabled, foreign keys enforced, atomic transactions)
- **Excel Engine**: ExcelJS (reproducing exact multi-worksheet GSTR-1 workbooks compatible with Swipe exports)
- **Icons & Typography**: Lucide React + Google Inter & JetBrains Mono
- **Test Framework**: Vitest (pure calculation engine, database transactions, and Excel generation testing)

---

## 2. Quickstart & Installation

### Prerequisites
- Node.js v20+
- npm v10+

### Setup Commands
```bash
# 1. Clone the repository
git clone https://github.com/omshinde04/soft-billing.git
cd soft-billing

# 2. Install dependencies
npm install

# 3. Build native better-sqlite3 for Electron
npm run rebuild

# 4. Build the React renderer assets
npm run build:renderer

# 5. Launch the desktop application
npm start
```

### Development Mode (Hot Reloading)
```bash
# Runs Vite dev server and Electron simultaneously
npm run dev
```

### Running Automated Test Suite
```bash
npm test
```
All 25 unit and integration tests will execute across:
1. `tests/calculations.test.js`: Financial calculation engine, tax decomposition, discounts, round-off, and INR words.
2. `tests/database.test.js`: Database migrations, atomic invoice numbering, rollback on failure, snapshot immutability, and sales returns.
3. `tests/reports.test.js`: Sales ledger aggregations and multi-sheet GSTR-1 Excel generation.

---

## 3. Core Business Features

### 3.1 Live Financial Calculation Engine
- Dedicated, testable calculation engine in `src/shared/calculations.js`.
- Supports both **Tax-Exclusive** and **Tax-Inclusive** (FMCG wholesale case/piece pricing) modes.
- Intra-state (CGST + SGST) and Inter-state (IGST) split based on Place of Supply.
- Integer paise precision avoiding floating point quirks.
- Final invoice-level round-off to the nearest whole Rupee.
- Converts numerical amounts to Indian Rupees words format (e.g., `INR Four Thousand Two Hundred Twenty-Seven Only`).

### 3.2 Invoice Creation & Reference Matching (`INV-1050`)
- Retailer selection with auto-populating address, GSTIN, and place of supply.
- Product picker with pack size hints, MRP, wholesale rates, and GST tax slabs (0%, 5%, 12%, 18%, 28%).
- Line-level discount support and live calculation updates.
- Atomic invoice numbering (`INV-1001`, `INV-1002`, etc.) with database transactions preventing duplicate issuance.
- Immutable snapshots of seller and retailer details, ensuring historical invoice records remain unchanged even if master product prices or retailer names are updated later.
- Printable / PDF preview matching the layout of reference invoice `INV-1050`.

### 3.3 GSTR-1 Excel Reporting (Swipe Compatible)
Exports multi-worksheet `.xlsx` workbooks matching Swipe's structure:
1. `GSTR1 Report`: Master sales ledger with distributor headers, invoice rows, and totals.
2. `b2cs`: Summary of B2C Small supplies grouped by place of supply and tax rate.
3. `b2b,sez,de`: Registered B2B invoices with recipient GSTINs.
4. `hsn(b2c)`: HSN summary of supplies grouped by UQC (`PCS-PIECES`, `OTH-OTHERS`).
5. `docs`: Table 13 document audit trail reporting invoice ranges (`Sr. No. From`, `Sr. No. To`), total counts, and cancelled bills.
6. `itemWiseSale`: Product-by-product quantity and turnover breakdown.
7. `itemWiseSaleReturn`: Sales returns audit log.
8. `itemSummary`: Total item turnover register.

### 3.4 Sales Returns Workflow
- Select an existing finalized invoice.
- Inspects remaining returnable item quantities, strictly preventing return quantities from exceeding remaining eligible units.
- Calculates proportional refund of taxable values and tax components.
- Generates a trackable return document (`RET-XXXX`) and incorporates adjustments into sales reports.

### 3.5 Database Backup & Demo Data Seeder
- **Safe SQLite Backup**: Generates an instant, non-blocking backup copy using SQLite's native backup API via Settings.
- **Isolated FMCG Demo Data**: In Settings, click **"Load FMCG Demo Data"** to populate realistic sample biscuits, snacks, generic kirana retailers, and trial bills for immediate evaluation.

---

## 4. Database Location & Backup Instructions

### Database Location
The production SQLite database is stored locally in the Electron user data directory:
- **macOS**: `~/Library/Application Support/soft-billing/billing_soft.db`
- **Windows**: `%APPDATA%\soft-billing\billing_soft.db`
- **Linux**: `~/.config/soft-billing/billing_soft.db`

### Backup Procedure
1. Navigate to **Settings** in the application sidebar.
2. Scroll to the **Database Maintenance** section.
3. Click **"Backup Database"** and choose a secure destination folder (e.g., an external drive or backup folder).
4. A file named `billing_soft_backup_<timestamp>.db` will be saved.

### Restore Procedure
1. Close the application.
2. Replace `billing_soft.db` in the application data directory with your backup file.
3. Relaunch Billing-Soft.

---

## 5. Manual Testing Checklist

| Step | Action | Expected Result |
|---|---|---|
| 1 | Launch app via `npm start` | Window opens with Dashboard showing zero or seeded records |
| 2 | Go to Settings -> Click "Load FMCG Demo Data" | Notification confirms seeding; sample products and retailers loaded |
| 3 | Go to Dashboard | Real SQLite metrics appear (Gross revenue, Invoices, GST, Master counts) |
| 4 | Go to Create Invoice -> Select Retailer -> Add Items | Real-time calculations update taxable, GST, round-off, and grand total |
| 5 | Click "Finalize & Generate Bill" | Invoice is saved atomically; print preview modal opens matching `INV-1050` |
| 6 | In Preview, click "Print" or "Save PDF" | Native print dialog or PDF save dialog opens |
| 7 | Go to Sales Returns -> Click "Record Sales Return" | Select invoice; enter return qty <= remaining; saves return document |
| 8 | Go to Reports & GSTR-1 -> Click "Export GSTR-1 Excel" | Prompts file save dialog; generates `.xlsx` with all 8 Swipe worksheets |
| 9 | In Settings -> Click "Backup Database" | Saves complete SQLite database backup file |

---

## 6. Phase 1 Completion Summary

- [x] Native Electron desktop app with secure IPC and React UI.
- [x] Pure JavaScript financial calculation engine with 10 unit tests.
- [x] SQLite schema with versioned migrations and transactional integrity.
- [x] Products and Retailers Master CRUD with GSTIN syntax validator.
- [x] Invoice creation, numbering, historical snapshots, and print modal.
- [x] Sales return recording with quantity boundary validation.
- [x] Dashboard with date range filtering and real database figures.
- [x] Multi-sheet GSTR-1 Excel export matching Swipe's export layout.
- [x] Automated test suite with 25 passing tests.
- [x] Isolated demo data seeder.
