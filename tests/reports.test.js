import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { initDatabase, closeDatabase } from '../src/database/db.js';
import { seedDemoData } from '../src/services/sampleDataService.js';
import {
  getInvoiceWiseReport,
  getProductWiseReport,
  getRetailerWiseReport,
  getGSTSummaryReport,
  getDocumentsSummaryReport
} from '../src/services/reportsService.js';
import { generateGSTR1Workbook } from '../src/services/excelExportService.js';

const TEST_DB_PATH = path.resolve(process.cwd(), '.data/test_reports.db');

describe('Reporting & ExcelJS Export Engine', () => {
  beforeEach(() => {
    closeDatabase();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    initDatabase(TEST_DB_PATH);
    seedDemoData();
  });

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it('aggregates invoice-wise report correctly', () => {
    const report = getInvoiceWiseReport();
    expect(report.rows.length).toBeGreaterThan(0);
    expect(report.summary.activeCount).toBe(report.rows.length);
    expect(report.summary.totalTaxable).toBeGreaterThan(0);
    expect(report.summary.totalTax).toBeGreaterThan(0);
    expect(report.summary.totalAmount).toBeGreaterThan(0);
  });

  it('aggregates product-wise report with correct UQC and tax breakdown', () => {
    const products = getProductWiseReport();
    expect(products.length).toBeGreaterThan(0);

    const first = products[0];
    expect(first.item_name).toBeDefined();
    expect(first.uqc).toBe('PCS-PIECES');
    expect(first.total_quantity).toBeGreaterThan(0);
    expect(first.total_amount).toBeGreaterThan(0);
  });

  it('aggregates retailer-wise sales report', () => {
    const retailers = getRetailerWiseReport();
    expect(retailers.length).toBeGreaterThan(0);
    expect(retailers[0].retailer_name).toBeDefined();
    expect(retailers[0].total_sales).toBeGreaterThan(0);
  });

  it('aggregates GST summary across tax rate slabs', () => {
    const gstSummary = getGSTSummaryReport();
    expect(gstSummary.length).toBeGreaterThan(0);
    // Verifies 5% slab exists from our seeded invoices
    const slab5 = gstSummary.find(s => s.tax_rate === 5);
    expect(slab5).toBeDefined();
    expect(slab5.central_tax).toBeGreaterThan(0);
    expect(slab5.state_tax).toBeGreaterThan(0);
    expect(slab5.central_tax).toBe(slab5.state_tax); // Equal split for intra-state
  });

  it('generates document summary audit for outward supplies', () => {
    const docs = getDocumentsSummaryReport();
    expect(docs.docType).toBe('Invoices for outward supply');
    expect(docs.totalCount).toBeGreaterThan(0);
    expect(docs.cancelledCount).toBe(0);
    expect(docs.srFrom).toMatch(/^INV-/);
    expect(docs.srTo).toMatch(/^INV-/);
  });

  it('generates full multi-sheet GSTR-1 Excel workbook compatible with Swipe structure', async () => {
    const result = await generateGSTR1Workbook();
    expect(result.success).toBe(true);
    expect(result.buffer).toBeDefined();

    // Verify generated workbook contents using ExcelJS
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(result.buffer);

    const expectedSheets = [
      'GSTR1 Report',
      'b2b,sez,de',
      'b2cl',
      'b2cs',
      'cdnr',
      'cdnur',
      'exp',
      'at',
      'atadj',
      'exemp',
      'hsn(b2b)',
      'hsn(b2c)',
      'docs',
      'itemWiseSale',
      'itemWiseSaleReturn',
      'itemSummary'
    ];

    expect(wb.worksheets.length).toBe(16);

    for (const sheetName of expectedSheets) {
      const sheet = wb.getWorksheet(sheetName);
      expect(sheet).toBeDefined();
      expect(sheet.rowCount).toBeGreaterThan(0);
    }

    // Verify GSTR1 Report headers and merges
    const wsMaster = wb.getWorksheet('GSTR1 Report');
    const r1 = wsMaster.getRow(1);
    expect(r1.getCell(1).value).toBe('From Year');
    expect(r1.getCell(3).value).toBe('To Year');

    // Verify Row 10 clean single-row headers (no duplicate stacked names)
    expect(wsMaster.getCell('A10').value).toBe('GSTIN/UIN No.');
    expect(wsMaster.getCell('B10').value).toBe('Party Name');
    expect(wsMaster.getCell('C10').value).toBe('Transaction Type');
    expect(wsMaster.getCell('D10').value).toBe('Invoice No.');
    expect(wsMaster.getCell('E10').value).toBe('Invoice Date');
    expect(wsMaster.getCell('F10').value).toBe('Invoice Value');
    expect(wsMaster.getCell('K10').value).toBe('Integrated Tax');
    expect(wsMaster.getCell('L10').value).toBe('Central Tax');
    expect(wsMaster.getCell('M10').value).toBe('State/UT Tax');

    // Verify docs sheet
    const wsDocs = wb.getWorksheet('docs');
    expect(wsDocs.getRow(1).getCell(1).value).toContain('Summary of documents');
  });
});

