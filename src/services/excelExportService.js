import ExcelJS from 'exceljs';
import { getBusinessSettings } from '../database/queries.js';
import {
  getInvoiceWiseReport,
  getProductWiseReport,
  getGSTSummaryReport,
  getDocumentsSummaryReport,
  getSalesReturnReport
} from './reportsService.js';
import { formatIndianDate, roundTo } from '../shared/calculations.js';
import { UQC_MAPPING } from '../shared/constants.js';

/**
 * ExcelJS Export Engine for Billing-Soft
 * Generates Swipe-compatible multi-worksheet GSTR-1 Excel workbooks.
 */

export async function generateGSTR1Workbook({ fromDate = '', toDate = '', filePath = null } = {}) {
  const settings = getBusinessSettings();
  const invoiceData = getInvoiceWiseReport({ fromDate, toDate });
  const productData = getProductWiseReport({ fromDate, toDate });
  const docsData = getDocumentsSummaryReport({ fromDate, toDate });
  const returnData = getSalesReturnReport({ fromDate, toDate });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Billing-Soft Desktop';
  workbook.lastModifiedBy = 'Billing-Soft';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Helper for styling headers
  const headerFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8EFF7' }
  };
  const boldFont = { bold: true, name: 'Calibri', size: 11 };

  // Parse Year and Month for GSTR-1 Header
  let fromYear = 2026;
  let fromMonth = 'September';
  if (fromDate) {
    const d = new Date(fromDate);
    if (!isNaN(d.getTime())) {
      fromYear = d.getFullYear();
      fromMonth = d.toLocaleString('en-US', { month: 'long' });
    }
  }

  // ==========================================
  // SHEET 1: GSTR1 Report (Master Sales Ledger)
  // ==========================================
  const wsMaster = workbook.addWorksheet('GSTR1 Report');
  wsMaster.views = [{ state: 'frozen', ySplit: 11 }];

  wsMaster.addRow(['From Year', fromYear, 'To Year', fromYear]);
  wsMaster.addRow(['From Month', fromMonth, 'To Month', fromMonth]);
  wsMaster.addRow([]);
  wsMaster.addRow(['1.GSTIN:', settings.gstin || '']);
  wsMaster.addRow(['2.(a)Legal name of the registered person:', settings.legal_name || '']);
  wsMaster.addRow(['   (b)Trade name, if any', settings.trade_name || '']);
  wsMaster.addRow(['3.(a)Aggregate Turnover in the preceeding Financial Year:', '']);
  wsMaster.addRow(['   (b)Aggregate Turnover - April to June, 2017:', '']);
  wsMaster.addRow([]);

  // Table headers (Rows 10 & 11)
  const r10 = wsMaster.addRow(['GSTIN/UIN No.', 'Party Name', 'Transaction Type', 'Invoice', '', '', 'Rate', 'CESS Rate', 'Taxable Value', 'Reverse Charge', 'Amount', '', '', '', 'Place Of Supply']);
  const r11 = wsMaster.addRow(['GSTIN/UIN No.', 'Party Name', 'Transaction Type', 'No.', 'Date', 'Value', 'Rate', 'CESS Rate', 'Taxable Value', 'Reverse Charge', 'Integrated Tax', 'Central Tax', 'State/UT Tax', 'CESS', 'Place Of Supply']);

  r10.font = boldFont;
  r11.font = boldFont;
  r10.fill = headerFill;
  r11.fill = headerFill;

  let totalVal = 0;
  let totalTaxable = 0;
  let totalIgst = 0;
  let totalCgst = 0;
  let totalSgst = 0;

  for (const inv of invoiceData.rows) {
    if (inv.status === 'cancelled') continue;

    // Approximate average tax rate for invoice display or 5% default
    const estTaxRate = inv.subtotal_taxable > 0
      ? roundTo(((inv.total_cgst + inv.total_sgst + inv.total_igst) / inv.subtotal_taxable) * 100, 1)
      : 5.0;

    const row = wsMaster.addRow([
      inv.retailer_gstin || '',
      inv.retailer_name || 'Cash Customer',
      'Sale',
      inv.invoice_number,
      formatIndianDate(inv.invoice_date),
      roundTo(inv.grand_total, 2),
      estTaxRate,
      0.0,
      roundTo(inv.subtotal_taxable, 2),
      'N',
      roundTo(inv.total_igst, 2),
      roundTo(inv.total_cgst, 2),
      roundTo(inv.total_sgst, 2),
      0.0,
      inv.place_of_supply || '27-Maharashtra'
    ]);

    totalVal = roundTo(totalVal + inv.grand_total, 2);
    totalTaxable = roundTo(totalTaxable + inv.subtotal_taxable, 2);
    totalIgst = roundTo(totalIgst + inv.total_igst, 2);
    totalCgst = roundTo(totalCgst + inv.total_cgst, 2);
    totalSgst = roundTo(totalSgst + inv.total_sgst, 2);
  }

  // Totals Row
  wsMaster.addRow([]);
  const totRow = wsMaster.addRow([
    'Totals', '', '', '', '',
    totalVal, '', '', totalTaxable, '',
    totalIgst, totalCgst, totalSgst, 0.0, ''
  ]);
  totRow.font = { bold: true };

  // ==========================================
  // SHEET 2: b2b,sez,de (Registered B2B supplies)
  // ==========================================
  const wsB2B = workbook.addWorksheet('b2b,sez,de');
  wsB2B.addRow(['Summary For B2B, SEZ, DE (4A, 4B, 6B, 6C)']);
  wsB2B.addRow(['No. of Recipients', '', 'No. of Invoices', '', 'Total Invoice Value', '', '', '', '', '', '', 'Total Taxable Value', 'Total Cess']);

  const b2bInvoices = invoiceData.rows.filter(inv => inv.status !== 'cancelled' && inv.retailer_gstin && inv.retailer_gstin.trim().length === 15);
  const b2bRecipients = new Set(b2bInvoices.map(i => i.retailer_gstin)).size;
  const b2bTotalVal = roundTo(b2bInvoices.reduce((acc, i) => acc + i.grand_total, 0), 2);
  const b2bTotalTaxable = roundTo(b2bInvoices.reduce((acc, i) => acc + i.subtotal_taxable, 0), 2);

  wsB2B.addRow([b2bRecipients, '', b2bInvoices.length, '', b2bTotalVal, '', '', '', '', '', '', b2bTotalTaxable, 0.0]);
  const b2bHeader = wsB2B.addRow(['GSTIN/UIN of Recipient', 'Receiver Name', 'Invoice Number', 'Invoice date', 'Invoice Value', 'Place Of Supply', 'Reverse Charge', 'Applicable % of Tax Rate', 'Invoice Type', 'E-Commerce GSTIN', 'Rate', 'Taxable Value', 'Cess Amount']);
  b2bHeader.font = boldFont;

  for (const inv of b2bInvoices) {
    wsB2B.addRow([
      inv.retailer_gstin,
      inv.retailer_name,
      inv.invoice_number,
      formatIndianDate(inv.invoice_date),
      roundTo(inv.grand_total, 2),
      inv.place_of_supply || '27-Maharashtra',
      'N',
      '',
      'Regular',
      '',
      5.0,
      roundTo(inv.subtotal_taxable, 2),
      0.0
    ]);
  }

  // ==========================================
  // SHEET 3: b2cs (B2C Small Supplies)
  // ==========================================
  const wsB2CS = workbook.addWorksheet('b2cs');
  wsB2CS.addRow(['Summary For B2CS(7)']);
  wsB2CS.addRow(['', '', '', '', 'Total Taxable Value', 'Total Cess', '']);

  const b2cInvoices = invoiceData.rows.filter(inv => inv.status !== 'cancelled' && (!inv.retailer_gstin || inv.retailer_gstin.trim().length !== 15));
  const b2cTotalTaxable = roundTo(b2cInvoices.reduce((acc, i) => acc + i.subtotal_taxable, 0), 2);

  wsB2CS.addRow(['', '', '', '', b2cTotalTaxable, 0.0, '']);
  const b2csHeader = wsB2CS.addRow(['Type', 'Place Of Supply', 'Applicable % of Tax Rate', 'Rate', 'Taxable Value', 'Cess Amount', 'E-Commerce GSTIN']);
  b2csHeader.font = boldFont;

  // Group B2CS by place of supply & rate
  const b2csGroups = new Map();
  for (const inv of b2cInvoices) {
    const pos = inv.place_of_supply || '27-Maharashtra';
    const rate = 5.0; // Default FMCG rate
    const key = `${pos}_${rate}`;
    const current = b2csGroups.get(key) || { pos, rate, taxable: 0 };
    current.taxable = roundTo(current.taxable + inv.subtotal_taxable, 2);
    b2csGroups.set(key, current);
  }

  for (const item of b2csGroups.values()) {
    wsB2CS.addRow(['OE', item.pos, '', item.rate, item.taxable, 0.0, '']);
  }

  // ==========================================
  // SHEET 4: hsn(b2c)
  // ==========================================
  const wsHSN = workbook.addWorksheet('hsn(b2c)');
  wsHSN.addRow(['Summary For HSN(12)']);
  wsHSN.addRow(['No. of HSN', '', '', '', 'Total Value', '', 'Total Taxable Value', 'Total Integrated Tax', 'Total Central Tax', 'Total State/UT Tax', 'Total Cess']);

  const hsnTotalVal = roundTo(productData.reduce((acc, p) => acc + p.total_amount, 0), 2);
  const hsnTotalTaxable = roundTo(productData.reduce((acc, p) => acc + p.total_taxable, 0), 2);
  const hsnTotalCgst = roundTo(productData.reduce((acc, p) => acc + p.total_cgst, 0), 2);
  const hsnTotalSgst = roundTo(productData.reduce((acc, p) => acc + p.total_sgst, 0), 2);
  const hsnTotalIgst = roundTo(productData.reduce((acc, p) => acc + p.total_igst, 0), 2);

  wsHSN.addRow([0.0, '', '', '', hsnTotalVal, '', hsnTotalTaxable, hsnTotalIgst, hsnTotalCgst, hsnTotalSgst, 0.0]);
  const hsnHeader = wsHSN.addRow(['HSN', 'Description', 'UQC', 'Total Quantity', 'Total Value', 'Rate', 'Taxable Value', 'Integrated Tax Amount', 'Central Tax Amount', 'State/UT Tax Amount', 'Cess Amount']);
  hsnHeader.font = boldFont;
  wsHSN.addRow([]);

  // Aggregate by UQC & Tax Rate (like Swipe's reference export)
  const uqcGroups = new Map();
  for (const p of productData) {
    const key = `${p.uqc}_${p.tax_rate}`;
    const cur = uqcGroups.get(key) || {
      uqc: p.uqc,
      tax_rate: p.tax_rate,
      quantity: 0,
      total_value: 0,
      taxable_value: 0,
      cgst: 0,
      sgst: 0,
      igst: 0
    };
    cur.quantity += p.total_quantity;
    cur.total_value = roundTo(cur.total_value + p.total_amount, 2);
    cur.taxable_value = roundTo(cur.taxable_value + p.total_taxable, 2);
    cur.cgst = roundTo(cur.cgst + p.total_cgst, 2);
    cur.sgst = roundTo(cur.sgst + p.total_sgst, 2);
    cur.igst = roundTo(cur.igst + p.total_igst, 2);
    uqcGroups.set(key, cur);
  }

  for (const grp of uqcGroups.values()) {
    wsHSN.addRow([
      '',
      '',
      grp.uqc,
      grp.quantity,
      grp.total_value,
      grp.tax_rate,
      grp.taxable_value,
      grp.igst,
      grp.cgst,
      grp.sgst,
      0.0
    ]);
  }

  // ==========================================
  // SHEET 5: docs (Document Audit Summary)
  // ==========================================
  const wsDocs = workbook.addWorksheet('docs');
  wsDocs.addRow(['Summary of documents issued during the tax period (13)']);
  wsDocs.addRow(['', '', '', 'Total Number', 'Total Cancelled']);
  wsDocs.addRow(['', '', '', docsData.totalCount, docsData.cancelledCount]);
  const docsHeader = wsDocs.addRow(['Nature of Document', 'Sr. No. From', 'Sr. No. To', 'Total Number', 'Cancelled']);
  docsHeader.font = boldFont;
  wsDocs.addRow([
    docsData.docType,
    docsData.srFrom,
    docsData.srTo,
    docsData.totalCount,
    docsData.cancelledCount
  ]);

  // ==========================================
  // SHEET 6: itemWiseSale (Product-wise Breakdown)
  // ==========================================
  const wsItems = workbook.addWorksheet('itemWiseSale');
  wsItems.addRow(['Summary For HSN(12)']);
  wsItems.addRow(['No. of HSN', '', '', '', 'Total Value', '', 'Total Taxable Value', 'Total Integrated Tax', 'Total Central Tax', 'Total State/UT Tax', 'Total Cess']);
  wsItems.addRow([0.0, '', '', '', hsnTotalVal, '', hsnTotalTaxable, hsnTotalIgst, hsnTotalCgst, hsnTotalSgst, 0.0]);
  const itemsHeader = wsItems.addRow(['HSN', 'Description', 'UQC', 'Total Quantity', 'Total Value', 'Rate', 'Taxable Value', 'Integrated Tax Amount', 'Central Tax Amount', 'State/UT Tax Amount', 'Cess Amount']);
  itemsHeader.font = boldFont;
  wsItems.addRow([]);

  for (const item of productData) {
    wsItems.addRow([
      item.hsn_code || '',
      item.item_name,
      item.uqc,
      item.total_quantity,
      item.total_amount,
      item.tax_rate,
      item.total_taxable,
      item.total_igst,
      item.total_cgst,
      item.total_sgst,
      0.0
    ]);
  }

  // ==========================================
  // SHEET 7: itemWiseSaleReturn
  // ==========================================
  const wsItemReturns = workbook.addWorksheet('itemWiseSaleReturn');
  wsItemReturns.addRow(['Summary For HSN(12)']);
  wsItemReturns.addRow(['No. of HSN', '', '', '', 'Total Value', '', 'Total Taxable Value', 'Total Integrated Tax', 'Total Central Tax', 'Total State/UT Tax', 'Total Cess']);
  wsItemReturns.addRow([0.0, '', '', '', 0.0, '', 0.0, 0.0, 0.0, 0.0, 0.0]);
  const retHeader = wsItemReturns.addRow(['HSN', 'Description', 'UQC', 'Total Quantity', 'Total Value', 'Rate', 'Taxable Value', 'Integrated Tax Amount', 'Central Tax Amount', 'State/UT Tax Amount', 'Cess Amount']);
  retHeader.font = boldFont;

  // ==========================================
  // SHEET 8: itemSummary
  // ==========================================
  const wsSummary = workbook.addWorksheet('itemSummary');
  wsSummary.addRow(['Summary For HSN(12)']);
  wsSummary.addRow(['No. of HSN', '', '', '', 'Total Value', '', 'Total Taxable Value', 'Total Integrated Tax', 'Total Central Tax', 'Total State/UT Tax', 'Total Cess']);
  wsSummary.addRow([0.0, '', '', '', hsnTotalVal, '', hsnTotalTaxable, hsnTotalIgst, hsnTotalCgst, hsnTotalSgst, 0.0]);
  const sumHeader = wsSummary.addRow(['HSN', 'Description', 'UQC', 'Total Quantity', 'Total Value', 'Rate', 'Taxable Value', 'Integrated Tax Amount', 'Central Tax Amount', 'State/UT Tax Amount', 'Cess Amount']);
  sumHeader.font = boldFont;
  wsSummary.addRow([]);

  for (const item of productData) {
    wsSummary.addRow([
      item.hsn_code || '',
      item.item_name,
      item.uqc,
      item.total_quantity,
      item.total_amount,
      item.tax_rate,
      item.total_taxable,
      item.total_igst,
      item.total_cgst,
      item.total_sgst,
      0.0
    ]);
  }

  // Auto-fit column widths across all worksheets
  for (const sheet of workbook.worksheets) {
    sheet.columns.forEach(col => {
      let maxLen = 12;
      col.eachCell({ includeEmpty: false }, cell => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len > maxLen) maxLen = Math.min(len + 3, 35);
      });
      col.width = maxLen;
    });
  }

  if (filePath) {
    await workbook.xlsx.writeFile(filePath);
    return { success: true, filePath };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return { success: true, buffer };
}
