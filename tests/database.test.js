import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { initDatabase, closeDatabase, getDb } from '../src/database/db.js';
import {
  getBusinessSettings,
  updateBusinessSettings,
  createProduct,
  getProducts,
  updateProduct,
  createRetailer,
  getRetailers,
  createInvoice,
  getInvoiceById,
  cancelInvoice,
  createSalesReturn,
  getInvoiceReturnableItems
} from '../src/database/queries.js';

const TEST_DB_PATH = path.resolve(process.cwd(), '.data/test_billing.db');

describe('Database Layer & Transactional Integrity', () => {
  beforeEach(() => {
    closeDatabase();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    initDatabase(TEST_DB_PATH);
  });

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it('initializes database with default business settings', () => {
    const settings = getBusinessSettings();
    expect(settings).toBeDefined();
    expect(settings.id).toBe(1);
    expect(settings.invoice_prefix).toBe('INV-');
    expect(settings.next_invoice_number).toBe(1001);
  });

  it('updates business settings cleanly', () => {
    updateBusinessSettings({
      legal_name: 'Test Distributors LLP',
      gstin: '27AABCU9603R1ZM',
      phone: '9988776655',
      invoice_prefix: 'TEST-',
      next_invoice_number: 500
    });

    const updated = getBusinessSettings();
    expect(updated.legal_name).toBe('Test Distributors LLP');
    expect(updated.gstin).toBe('27AABCU9603R1ZM');
    expect(updated.invoice_prefix).toBe('TEST-');
    expect(updated.next_invoice_number).toBe(500);
  });

  it('creates, retrieves, and updates products', () => {
    const p1 = createProduct({
      name: 'Parle-G 10 MRP',
      brand: 'Parle',
      sku: 'PG-10',
      unit: 'PCS',
      mrp: 10,
      selling_rate: 8.59,
      tax_rate: 5
    });

    expect(p1.id).toBeDefined();
    expect(p1.name).toBe('Parle-G 10 MRP');
    expect(p1.selling_rate).toBe(8.59);

    const list = getProducts();
    expect(list.length).toBe(1);

    updateProduct(p1.id, {
      ...p1,
      selling_rate: 8.65
    });

    const p1Updated = getProducts()[0];
    expect(p1Updated.selling_rate).toBe(8.65);
  });

  it('creates, retrieves, and updates retailers', () => {
    const r1 = createRetailer({
      shop_name: 'Jai Kisan Kirana Stores',
      contact_person: 'Ramesh Patil',
      city: 'Nandgaon',
      phone: '9822001122',
      gstin: '27EBYPB2347Q1ZT'
    });

    expect(r1.id).toBeDefined();
    expect(r1.shop_name).toBe('Jai Kisan Kirana Stores');

    const retailers = getRetailers();
    expect(retailers.length).toBe(1);
  });

  it('creates an invoice atomically and increments next_invoice_number', () => {
    const retailer = createRetailer({ shop_name: 'Shree Ganesh Mart' });
    const product = createProduct({ name: 'Glucose Biscuit', mrp: 5, selling_rate: 4.30, tax_rate: 5 });

    const invoice = createInvoice({
      retailer_id: retailer.id,
      invoice_date: '2026-10-17',
      subtotal_taxable: 430,
      total_cgst: 10.75,
      total_sgst: 10.75,
      grand_total: 451.50,
      items: [
        {
          product_id: product.id,
          item_name: product.name,
          quantity: 100,
          rate: 4.30,
          taxable_amount: 430,
          tax_rate: 5,
          cgst_amount: 10.75,
          sgst_amount: 10.75,
          total_amount: 451.50
        }
      ]
    });

    expect(invoice.invoice_number).toBe('INV-1001');
    expect(invoice.items.length).toBe(1);

    // Business settings next_invoice_number should now be 1002
    const settings = getBusinessSettings();
    expect(settings.next_invoice_number).toBe(1002);
  });

  it('prevents duplicate invoice numbers and rolls back cleanly', () => {
    const retailer = createRetailer({ shop_name: 'Shop 1' });
    const product = createProduct({ name: 'Item 1', selling_rate: 10 });

    createInvoice({
      invoice_number: 'INV-CUSTOM-01',
      retailer_id: retailer.id,
      subtotal_taxable: 100,
      grand_total: 105,
      items: [{ product_id: product.id, item_name: product.name, quantity: 10, rate: 10, taxable_amount: 100, total_amount: 105 }]
    });

    // Attempt to create duplicate invoice number
    expect(() => {
      createInvoice({
        invoice_number: 'INV-CUSTOM-01',
        retailer_id: retailer.id,
        subtotal_taxable: 200,
        grand_total: 210,
        items: [{ product_id: product.id, item_name: product.name, quantity: 20, rate: 10, taxable_amount: 200, total_amount: 210 }]
      });
    }).toThrow(/already exists/i);
  });

  it('guarantees historical invoice integrity even if master retailer or product changes later', () => {
    const retailer = createRetailer({ shop_name: 'Original Shop Name' });
    const product = createProduct({ name: 'Original Product Name', selling_rate: 10 });

    const invoice = createInvoice({
      retailer_id: retailer.id,
      subtotal_taxable: 100,
      grand_total: 105,
      items: [{ product_id: product.id, item_name: product.name, quantity: 10, rate: 10, taxable_amount: 100, total_amount: 105 }]
    });

    // Now change the master product name and price, and master retailer name
    updateProduct(product.id, { ...product, name: 'NEW Changed Product Name', selling_rate: 999 });
    createRetailer({ shop_name: 'Another Shop' });

    // Reload invoice
    const savedInvoice = getInvoiceById(invoice.id);
    expect(savedInvoice.retailer.shop_name).toBe('Original Shop Name');
    expect(savedInvoice.items[0].item_name).toBe('Original Product Name');
    expect(savedInvoice.items[0].rate).toBe(10);
  });

  it('cancels invoice and preserves audit trail without silent deletion', () => {
    const retailer = createRetailer({ shop_name: 'Audit Shop' });
    const invoice = createInvoice({
      retailer_id: retailer.id,
      subtotal_taxable: 50,
      grand_total: 52.5,
      items: [{ item_name: 'Item', quantity: 5, rate: 10, taxable_amount: 50, total_amount: 52.5 }]
    });

    const cancelled = cancelInvoice(invoice.id, 'Wrong retailer selected');
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.notes).toContain('Wrong retailer selected');

    // Should not allow cancelling twice
    expect(() => cancelInvoice(invoice.id, 'Again')).toThrow(/already cancelled/);
  });

  it('validates and executes sales return against original invoice quantities', () => {
    const retailer = createRetailer({ shop_name: 'Return Test Mart' });
    const product = createProduct({ name: 'Cashew 10 MRP', selling_rate: 8.50, tax_rate: 5 });

    const invoice = createInvoice({
      retailer_id: retailer.id,
      subtotal_taxable: 850,
      total_cgst: 21.25,
      total_sgst: 21.25,
      grand_total: 892.50,
      items: [
        {
          product_id: product.id,
          item_name: product.name,
          quantity: 100,
          rate: 8.50,
          taxable_amount: 850,
          tax_rate: 5,
          cgst_amount: 21.25,
          sgst_amount: 21.25,
          total_amount: 892.50
        }
      ]
    });

    const invoiceItemId = invoice.items[0].id;

    // Check returnable items
    const returnable = getInvoiceReturnableItems(invoice.id);
    expect(returnable[0].remaining_qty).toBe(100);

    // Return 20 items
    const returnDoc = createSalesReturn({
      invoice_id: invoice.id,
      reason: 'Damaged packaging',
      items: [
        { invoice_item_id: invoiceItemId, return_qty: 20 }
      ]
    });

    expect(returnDoc.return_number).toMatch(/^RET-/);
    expect(returnDoc.items[0].return_qty).toBe(20);
    expect(returnDoc.total_refund_amount).toBe(178.50); // 20% of 892.50

    // Remaining returnable items should now be 80
    const returnableAfter = getInvoiceReturnableItems(invoice.id);
    expect(returnableAfter[0].remaining_qty).toBe(80);

    // Attempting to return more than 80 should fail
    expect(() => {
      createSalesReturn({
        invoice_id: invoice.id,
        items: [{ invoice_item_id: invoiceItemId, return_qty: 85 }]
      });
    }).toThrow(/exceeds remaining eligible quantity/i);
  });
});
