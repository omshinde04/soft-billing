import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { initDatabase, closeDatabase } from '../src/database/db.js';
import {
  createProduct,
  createRetailer,
  getRetailerById,
  updateRetailer,
  createInvoice,
  createSalesReturn,
  getSalesReturnById,
  getDashboardMetrics,
  createOrder,
  getOrders,
  getOrderById,
  convertOrderToInvoice
} from '../src/database/queries.js';
import {
  generateInvoiceWhatsAppText,
  generateReturnWhatsAppText
} from '../src/shared/whatsapp.js';

const TEST_DB_PATH = path.resolve(process.cwd(), '.data/test_workflow.db');

describe('Core Workflow, Returns Dashboard & WhatsApp Integration', () => {
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

  it('stores and manages retailer whatsapp_number', () => {
    // 1. Created with explicit whatsapp_number
    const ret1 = createRetailer({
      shop_name: 'Avinash General Store',
      contact_person: 'Avinash',
      phone: '9822110011',
      whatsapp_number: '9822110022'
    });
    expect(ret1.phone).toBe('9822110011');
    expect(ret1.whatsapp_number).toBe('9822110022');

    // 2. Created without explicit whatsapp_number (defaults to phone)
    const ret2 = createRetailer({
      shop_name: 'Ganesh Kirana',
      phone: '9822334455'
    });
    expect(ret2.whatsapp_number).toBe('9822334455');

    // 3. Update whatsapp_number
    updateRetailer(ret2.id, {
      ...ret2,
      whatsapp_number: '9988776655'
    });
    const updated = getRetailerById(ret2.id);
    expect(updated.whatsapp_number).toBe('9988776655');
  });

  it('generates structured WhatsApp text for invoices', () => {
    const fakeInvoice = {
      invoice_number: 'INV-1001',
      invoice_date: '2026-10-15',
      place_of_supply: '27-Maharashtra',
      subtotal_taxable: 1000,
      total_cgst: 25,
      total_sgst: 25,
      total_igst: 0,
      round_off: 0,
      grand_total: 1050,
      retailer: { shop_name: 'Sai Krupa Stores' },
      items: [
        { item_name: 'Parle-G 10 MRP', quantity: 100, unit: 'PCS', rate: 8.57, total_amount: 857 },
        { item_name: 'Good Day 10 MRP', quantity: 20, unit: 'PCS', rate: 8.65, total_amount: 193 }
      ]
    };

    const businessSettings = {
      trade_name: 'Om Distributors',
      bank_name: 'HDFC Bank',
      bank_account_no: '50200012345678',
      bank_ifsc: 'HDFC0001234'
    };

    const text = generateInvoiceWhatsAppText(fakeInvoice, businessSettings);
    expect(text).toContain('TAX INVOICE — OM DISTRIBUTORS');
    expect(text).toContain('INV-1001');
    expect(text).toContain('Sai Krupa Stores');
    expect(text).toContain('Parle-G 10 MRP');
    expect(text).toContain('TOTAL PAYABLE: ₹1,050.00');
    expect(text).toContain('HDFC Bank');
    expect(text).toContain('50200012345678');
  });

  it('generates structured WhatsApp text for credit notes', () => {
    const fakeReturn = {
      return_number: 'RET-1001',
      return_date: '2026-10-18',
      invoice_number: 'INV-1001',
      retailer_name: 'Sai Krupa Stores',
      reason: 'Damaged cartons during transit',
      total_refund_amount: 171.40,
      items: [
        { item_name: 'Parle-G 10 MRP', return_qty: 20, refund_total: 171.40 }
      ]
    };

    const businessSettings = {
      trade_name: 'Om Distributors'
    };

    const text = generateReturnWhatsAppText(fakeReturn, businessSettings);
    expect(text).toContain('CREDIT NOTE / SALES RETURN — OM DISTRIBUTORS');
    expect(text).toContain('RET-1001');
    expect(text).toContain('Against Invoice:* INV-1001');
    expect(text).toContain('Damaged cartons during transit');
    expect(text).toContain('TOTAL REFUND CREDIT: ₹171.40');
  });

  it('calculates dashboard metrics with independent date filters and sales return adjustments', () => {
    // 1. Setup Master records
    const prod = createProduct({
      name: 'Sample Biscuit 10 MRP',
      brand: 'BrandX',
      sku: 'BX-10',
      unit: 'PCS',
      selling_rate: 10,
      tax_rate: 5
    });

    const ret = createRetailer({
      shop_name: 'Test Kirana',
      phone: '9822112233'
    });

    // 2. Create Invoices on different dates
    const inv1 = createInvoice({
      retailer_id: ret.id,
      invoice_date: '2026-10-05',
      items: [{ product_id: prod.id, name: prod.name, quantity: 10, rate: 10, taxable_amount: 100, tax_rate: 5, cgst_amount: 2.5, sgst_amount: 2.5, igst_amount: 0, total_amount: 105 }],
      subtotal_taxable: 100,
      total_cgst: 2.5,
      total_sgst: 2.5,
      total_igst: 0,
      round_off: 0,
      grand_total: 105,
      status: 'finalized'
    });

    const inv2 = createInvoice({
      retailer_id: ret.id,
      invoice_date: '2026-10-15',
      items: [{ product_id: prod.id, name: prod.name, quantity: 20, rate: 10, taxable_amount: 200, tax_rate: 5, cgst_amount: 5, sgst_amount: 5, igst_amount: 0, total_amount: 210 }],
      subtotal_taxable: 200,
      total_cgst: 5,
      total_sgst: 5,
      total_igst: 0,
      round_off: 0,
      grand_total: 210,
      status: 'finalized'
    });

    // 3. Create a Sales Return against inv2 on 2026-10-18
    const returnDoc = createSalesReturn({
      invoice_id: inv2.id,
      return_date: '2026-10-18',
      reason: 'Quality issue',
      items: [{
        invoice_item_id: inv2.items[0].id,
        return_qty: 5 // 5 out of 20 = 25% refund -> 210 * 0.25 = 52.50
      }]
    });
    expect(returnDoc.return_number).toBe('RET-1001');
    expect(returnDoc.total_refund_amount).toBe(52.5);

    // 4. Test All-Time Dashboard Metrics
    const allMetrics = getDashboardMetrics();
    expect(allMetrics.totalInvoices).toBe(2);
    expect(allMetrics.grossSales).toBe(315); // 105 + 210
    expect(allMetrics.totalReturns).toBe(1);
    expect(allMetrics.returnsAmount).toBe(52.5);
    expect(allMetrics.netSales).toBe(262.5); // 315 - 52.5 = 262.5

    // 5. Test Filter with fromDate only (>= 2026-10-10) -> Should include inv2 and returnDoc, exclude inv1
    const fromOnlyMetrics = getDashboardMetrics({ fromDate: '2026-10-10' });
    expect(fromOnlyMetrics.totalInvoices).toBe(1);
    expect(fromOnlyMetrics.grossSales).toBe(210);
    expect(fromOnlyMetrics.totalReturns).toBe(1);
    expect(fromOnlyMetrics.returnsAmount).toBe(52.5);
    expect(fromOnlyMetrics.netSales).toBe(157.5);

    // 6. Test Filter with toDate only (<= 2026-10-10) -> Should include inv1, exclude inv2 and returnDoc
    const toOnlyMetrics = getDashboardMetrics({ toDate: '2026-10-10' });
    expect(toOnlyMetrics.totalInvoices).toBe(1);
    expect(toOnlyMetrics.grossSales).toBe(105);
    expect(toOnlyMetrics.totalReturns).toBe(0);
    expect(toOnlyMetrics.returnsAmount).toBe(0);
    expect(toOnlyMetrics.netSales).toBe(105);

    // 7. Verify getSalesReturnById returns populated original invoice info & retailer phone
    const fullReturn = getSalesReturnById(returnDoc.id);
    expect(fullReturn.return_number).toBe('RET-1001');
    expect(fullReturn.invoice_number).toBe(inv2.invoice_number);
    expect(fullReturn.retailer_name).toBe('Test Kirana');
    expect(fullReturn.phone).toBe('9822112233');
    expect(fullReturn.items).toHaveLength(1);
    expect(fullReturn.items[0].return_qty).toBe(5);
  });

  it('handles mobile field sales orders lifecycle and conversion to tax invoice', () => {
    // 1. Setup product and retailer
    const prod = createProduct({
      name: 'Parle-G Glucose 10 MRP',
      selling_rate: 8.59,
      tax_rate: 5,
      pack_size: 72,
      unit: 'PCS'
    });

    const ret = createRetailer({
      shop_name: 'Avinash Kirana Stores',
      phone: '9822114400',
      address: 'Nandgaon Market',
      city: 'Nandgaon'
    });

    // 2. Mobile app submits an order
    const order = createOrder({
      order_number: 'ORD-TEST-001',
      order_date: '2026-10-19',
      salesman_name: 'Rahul Shinde (Field Salesman)',
      salesman_phone: '9822998811',
      beat_name: 'Nandgaon Market Beat',
      retailer_id: ret.id,
      retailer_name: ret.shop_name,
      retailer_phone: ret.phone,
      retailer_address: ret.address,
      notes: 'Urgent delivery requested by kirana owner',
      items: [
        {
          product_id: prod.id,
          item_name: prod.name,
          quantity: 144,
          rate: prod.selling_rate,
          tax_rate: prod.tax_rate,
          mrp: 10
        }
      ]
    });

    expect(order).toBeDefined();
    expect(order.order_number).toBe('ORD-TEST-001');
    expect(order.status).toBe('pending');
    expect(order.salesman_name).toContain('Rahul Shinde');
    expect(order.grand_total).toBeGreaterThan(0);
    expect(order.items).toHaveLength(1);

    // 3. Desktop listing retrieves the pending mobile order
    const pendingOrders = getOrders({ status: 'pending' });
    expect(pendingOrders.some(o => o.order_number === 'ORD-TEST-001')).toBe(true);

    // 4. Distributor converts mobile order to formal tax invoice
    const conversionResult = convertOrderToInvoice(order.id);
    expect(conversionResult.success).toBe(true);
    expect(conversionResult.invoice).toBeDefined();
    expect(conversionResult.invoice.invoice_number).toMatch(/^INV-/);
    expect(conversionResult.invoice.grand_total).toBe(Math.round(order.grand_total));

    // 5. Verify order is now marked converted
    const updatedOrder = getOrderById(order.id);
    expect(updatedOrder.status).toBe('converted');
    expect(updatedOrder.converted_invoice_number).toBe(conversionResult.invoice.invoice_number);
  });
});

