import { getDb } from '../database/db.js';
import { roundTo } from '../shared/calculations.js';
import { UQC_MAPPING } from '../shared/constants.js';

/**
 * Service to aggregate sales, products, retailers, and GST data for reports and Excel export.
 */

export function getInvoiceWiseReport({ fromDate = '', toDate = '' } = {}) {
  const db = getDb();
  let query = `
    SELECT
      i.id, i.invoice_number, i.invoice_date, i.subtotal_taxable,
      i.total_cgst, i.total_sgst, i.total_igst, i.round_off, i.grand_total,
      i.status, i.place_of_supply, i.is_inter_state,
      r.shop_name as retailer_name, r.gstin as retailer_gstin, r.city as retailer_city
    FROM invoices i
    LEFT JOIN retailers r ON i.retailer_id = r.id
    WHERE 1=1
  `;
  const params = [];
  if (fromDate) {
    query += ' AND i.invoice_date >= ?';
    params.push(fromDate);
  }
  if (toDate) {
    query += ' AND i.invoice_date <= ?';
    params.push(toDate);
  }
  query += ' ORDER BY i.id ASC';

  const rows = db.prepare(query).all(...params);

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalAmount = 0;

  for (const row of rows) {
    if (row.status !== 'cancelled') {
      totalTaxable = roundTo(totalTaxable + row.subtotal_taxable, 2);
      totalCgst = roundTo(totalCgst + row.total_cgst, 2);
      totalSgst = roundTo(totalSgst + row.total_sgst, 2);
      totalIgst = roundTo(totalIgst + row.total_igst, 2);
      totalAmount = roundTo(totalAmount + row.grand_total, 2);
    }
  }

  return {
    rows,
    summary: {
      count: rows.length,
      activeCount: rows.filter(r => r.status !== 'cancelled').length,
      cancelledCount: rows.filter(r => r.status === 'cancelled').length,
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTax: roundTo(totalCgst + totalSgst + totalIgst, 2),
      totalAmount
    }
  };
}

export function getProductWiseReport({ fromDate = '', toDate = '' } = {}) {
  const db = getDb();
  let query = `
    SELECT
      ii.item_name,
      ii.hsn_code,
      ii.unit,
      ii.tax_rate,
      SUM(ii.quantity) as total_quantity,
      SUM(ii.taxable_amount) as total_taxable,
      SUM(ii.cgst_amount) as total_cgst,
      SUM(ii.sgst_amount) as total_sgst,
      SUM(ii.igst_amount) as total_igst,
      SUM(ii.total_amount) as total_amount
    FROM invoice_items ii
    JOIN invoices i ON ii.invoice_id = i.id
    WHERE i.status = 'finalized'
  `;
  const params = [];
  if (fromDate) {
    query += ' AND i.invoice_date >= ?';
    params.push(fromDate);
  }
  if (toDate) {
    query += ' AND i.invoice_date <= ?';
    params.push(toDate);
  }
  query += `
    GROUP BY ii.item_name, ii.hsn_code, ii.unit, ii.tax_rate
    ORDER BY total_amount DESC
  `;

  const rows = db.prepare(query).all(...params).map(row => ({
    ...row,
    uqc: UQC_MAPPING[row.unit] || 'OTH-OTHERS',
    total_quantity: Number(row.total_quantity) || 0,
    total_taxable: roundTo(row.total_taxable, 2),
    total_cgst: roundTo(row.total_cgst, 2),
    total_sgst: roundTo(row.total_sgst, 2),
    total_igst: roundTo(row.total_igst, 2),
    total_tax: roundTo(row.total_cgst + row.total_sgst + row.total_igst, 2),
    total_amount: roundTo(row.total_amount, 2)
  }));

  return rows;
}

export function getRetailerWiseReport({ fromDate = '', toDate = '' } = {}) {
  const db = getDb();
  let query = `
    SELECT
      COALESCE(r.shop_name, 'Cash Sales') as retailer_name,
      r.gstin as retailer_gstin,
      r.city as city,
      COUNT(i.id) as invoice_count,
      SUM(i.subtotal_taxable) as total_taxable,
      SUM(i.total_cgst + i.total_sgst + i.total_igst) as total_tax,
      SUM(i.grand_total) as total_sales
    FROM invoices i
    LEFT JOIN retailers r ON i.retailer_id = r.id
    WHERE i.status = 'finalized'
  `;
  const params = [];
  if (fromDate) {
    query += ' AND i.invoice_date >= ?';
    params.push(fromDate);
  }
  if (toDate) {
    query += ' AND i.invoice_date <= ?';
    params.push(toDate);
  }
  query += `
    GROUP BY r.id, r.shop_name
    ORDER BY total_sales DESC
  `;

  return db.prepare(query).all(...params).map(row => ({
    ...row,
    total_taxable: roundTo(row.total_taxable, 2),
    total_tax: roundTo(row.total_tax, 2),
    total_sales: roundTo(row.total_sales, 2)
  }));
}

export function getGSTSummaryReport({ fromDate = '', toDate = '' } = {}) {
  const db = getDb();
  let query = `
    SELECT
      ii.tax_rate,
      SUM(ii.taxable_amount) as taxable_value,
      SUM(ii.cgst_amount) as central_tax,
      SUM(ii.sgst_amount) as state_tax,
      SUM(ii.igst_amount) as integrated_tax,
      SUM(ii.total_amount) as total_value
    FROM invoice_items ii
    JOIN invoices i ON ii.invoice_id = i.id
    WHERE i.status = 'finalized'
  `;
  const params = [];
  if (fromDate) {
    query += ' AND i.invoice_date >= ?';
    params.push(fromDate);
  }
  if (toDate) {
    query += ' AND i.invoice_date <= ?';
    params.push(toDate);
  }
  query += `
    GROUP BY ii.tax_rate
    ORDER BY ii.tax_rate ASC
  `;

  const rows = db.prepare(query).all(...params).map(row => ({
    tax_rate: row.tax_rate,
    taxable_value: roundTo(row.taxable_value, 2),
    central_tax: roundTo(row.central_tax, 2),
    state_tax: roundTo(row.state_tax, 2),
    integrated_tax: roundTo(row.integrated_tax, 2),
    total_tax: roundTo(row.central_tax + row.state_tax + row.integrated_tax, 2),
    total_value: roundTo(row.total_value, 2)
  }));

  return rows;
}

export function getDocumentsSummaryReport({ fromDate = '', toDate = '' } = {}) {
  const db = getDb();
  let query = 'SELECT invoice_number, status FROM invoices WHERE 1=1';
  const params = [];
  if (fromDate) {
    query += ' AND invoice_date >= ?';
    params.push(fromDate);
  }
  if (toDate) {
    query += ' AND invoice_date <= ?';
    params.push(toDate);
  }
  query += ' ORDER BY id ASC';

  const invoices = db.prepare(query).all(...params);
  if (invoices.length === 0) {
    return {
      docType: 'Invoices for outward supply',
      srFrom: '-',
      srTo: '-',
      totalCount: 0,
      cancelledCount: 0
    };
  }

  const srFrom = invoices[0].invoice_number;
  const srTo = invoices[invoices.length - 1].invoice_number;
  const totalCount = invoices.length;
  const cancelledCount = invoices.filter(inv => inv.status === 'cancelled').length;

  return {
    docType: 'Invoices for outward supply',
    srFrom,
    srTo,
    totalCount,
    cancelledCount
  };
}

export function getSalesReturnReport({ fromDate = '', toDate = '' } = {}) {
  const db = getDb();
  let query = `
    SELECT
      sr.id, sr.return_number, sr.return_date, sr.reason,
      sr.total_refund_taxable, sr.total_refund_tax, sr.total_refund_amount,
      i.invoice_number, r.shop_name as retailer_name, r.gstin as retailer_gstin,
      i.place_of_supply
    FROM sales_returns sr
    JOIN invoices i ON sr.invoice_id = i.id
    LEFT JOIN retailers r ON sr.retailer_id = r.id
    WHERE 1=1
  `;
  const params = [];
  if (fromDate) {
    query += ' AND sr.return_date >= ?';
    params.push(fromDate);
  }
  if (toDate) {
    query += ' AND sr.return_date <= ?';
    params.push(toDate);
  }
  query += ' ORDER BY sr.id DESC';

  return db.prepare(query).all(...params);
}

export function getProductReturnsReport({ fromDate = '', toDate = '' } = {}) {
  const db = getDb();
  let query = `
    SELECT
      sri.item_name,
      sri.product_id,
      p.hsn_code,
      p.unit,
      p.tax_rate,
      SUM(sri.return_qty) as total_quantity,
      SUM(sri.refund_taxable) as total_taxable,
      SUM(sri.refund_cgst) as total_cgst,
      SUM(sri.refund_sgst) as total_sgst,
      SUM(sri.refund_igst) as total_igst,
      SUM(sri.refund_total) as total_amount
    FROM sales_return_items sri
    JOIN sales_returns sr ON sri.sales_return_id = sr.id
    LEFT JOIN products p ON sri.product_id = p.id
    WHERE 1=1
  `;
  const params = [];
  if (fromDate) {
    query += ' AND sr.return_date >= ?';
    params.push(fromDate);
  }
  if (toDate) {
    query += ' AND sr.return_date <= ?';
    params.push(toDate);
  }
  query += `
    GROUP BY sri.item_name, sri.product_id, p.hsn_code, p.unit, p.tax_rate
    ORDER BY total_amount DESC
  `;

  return db.prepare(query).all(...params).map(row => ({
    ...row,
    uqc: UQC_MAPPING[row.unit] || 'OTH-OTHERS',
    total_tax: roundTo((row.total_cgst || 0) + (row.total_sgst || 0) + (row.total_igst || 0), 2)
  }));
}

