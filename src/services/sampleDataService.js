import { getDb } from '../database/db.js';
import {
  createProduct,
  createRetailer,
  createInvoice,
  createOrder,
  getProducts,
  getRetailers
} from '../database/queries.js';
import { calculateInvoiceTotals } from '../shared/calculations.js';

/**
 * Isolated FMCG Demo Data Generator.
 * Used for evaluation, demos, and testing.
 * Contains generic fictional business names, products, and prices.
 * Strictly separates sample data from production defaults.
 */

export const SAMPLE_PRODUCTS = [
  { name: 'Parle-G Glucose 10 MRP', brand: 'Parle', sku: 'PG-10', hsn_code: '19053100', unit: 'PCS', pack_size: 72, mrp: 10, selling_rate: 8.59, tax_rate: 5 },
  { name: 'Parle-G Glucose 5 MRP', brand: 'Parle', sku: 'PG-5', hsn_code: '19053100', unit: 'PCS', pack_size: 144, mrp: 5, selling_rate: 4.30, tax_rate: 5 },
  { name: '20-20 Cashew Cookies 10 MRP', brand: 'Parle', sku: 'PAR-2020-10', hsn_code: '19053100', unit: 'PCS', pack_size: 96, mrp: 10, selling_rate: 8.48, tax_rate: 5 },
  { name: 'Monaco Salted Crackers 10 MRP', brand: 'Parle', sku: 'MON-10', hsn_code: '19053100', unit: 'PCS', pack_size: 72, mrp: 10, selling_rate: 8.57, tax_rate: 5 },
  { name: 'Krackjack Sweet & Salty 10 MRP', brand: 'Parle', sku: 'KJ-10', hsn_code: '19053100', unit: 'PCS', pack_size: 72, mrp: 10, selling_rate: 8.57, tax_rate: 5 },
  { name: 'Good Day Butter Cookies 10 MRP', brand: 'Britannia', sku: 'GD-10', hsn_code: '19053100', unit: 'PCS', pack_size: 72, mrp: 10, selling_rate: 8.65, tax_rate: 5 },
  { name: 'Marie Gold Tea Biscuits 10 MRP', brand: 'Britannia', sku: 'MG-10', hsn_code: '19053100', unit: 'PCS', pack_size: 72, mrp: 10, selling_rate: 8.55, tax_rate: 5 },
  { name: 'Milano Chocolate Chip 40 MRP', brand: 'Parle', sku: 'MIL-40', hsn_code: '19053100', unit: 'PCS', pack_size: 12, mrp: 40, selling_rate: 34.01, tax_rate: 5 },
  { name: 'Kurkure Masala Munch 20 MRP', brand: 'PepsiCo', sku: 'KUR-20', hsn_code: '21069099', unit: 'PCS', pack_size: 24, mrp: 20, selling_rate: 17.20, tax_rate: 12 },
  { name: 'Cadbury Dairy Milk 10 MRP', brand: 'Cadbury', sku: 'CDM-10', hsn_code: '18063200', unit: 'PCS', pack_size: 48, mrp: 10, selling_rate: 8.80, tax_rate: 18 }
];

export const SAMPLE_RETAILERS = [
  { shop_name: 'Shree Ganesh Kirana Stores', contact_person: 'Ganesh Shinde', phone: '9822114400', address: 'Main Bazar, Market Yard', city: 'Sinnar', state: 'Maharashtra', state_code: '27', pincode: '422103', gstin: '' },
  { shop_name: 'Jai Bhavani Provision Stores', contact_person: 'Bhavani Prasad', phone: '9822335511', address: 'Station Road', city: 'Niphad', state: 'Maharashtra', state_code: '27', pincode: '422303', gstin: '' },
  { shop_name: 'Kisan Super Market', contact_person: 'Sachin Patil', phone: '9822446622', address: 'Old Agra Road', city: 'Nashik', state: 'Maharashtra', state_code: '27', pincode: '422002', gstin: '27AABCU9603R1ZM' },
  { shop_name: 'Maruti Daily Needs', contact_person: 'Maruti Jadhav', phone: '9822557733', address: 'Bus Stand Chowk', city: 'Igatpuri', state: 'Maharashtra', state_code: '27', pincode: '422403', gstin: '' },
  { shop_name: 'Vikas Traders & General Store', contact_person: 'Vikas Kadam', phone: '9822668844', address: 'Opposite Police Station', city: 'Dindori', state: 'Maharashtra', state_code: '27', pincode: '422202', gstin: '' }
];

export function seedDemoData() {
  const db = getDb();

  const seedTx = db.transaction(() => {
    // 1. Seed Products if empty
    const existingProducts = getProducts();
    const productMap = new Map();

    if (existingProducts.length === 0) {
      for (const prod of SAMPLE_PRODUCTS) {
        const created = createProduct(prod);
        productMap.set(created.sku, created);
      }
    } else {
      existingProducts.forEach(p => productMap.set(p.sku, p));
    }

    // 2. Seed Retailers if empty
    const existingRetailers = getRetailers();
    const retailerList = [];

    if (existingRetailers.length === 0) {
      for (const ret of SAMPLE_RETAILERS) {
        const created = createRetailer(ret);
        retailerList.push(created);
      }
    } else {
      existingRetailers.forEach(r => retailerList.push(r));
    }

    // 3. Create a set of sample invoices for evaluation
    const existingInvoicesCount = db.prepare('SELECT COUNT(*) as count FROM invoices').get().count;
    if (existingInvoicesCount === 0 && retailerList.length > 0 && productMap.size > 0) {
      const allProds = Array.from(productMap.values());

      // Create 5 sample invoices across recent dates
      const sampleOrders = [
        {
          retailer: retailerList[0],
          date: '2026-10-10',
          items: [
            { product: allProds[0], qty: 72 },
            { product: allProds[1], qty: 144 },
            { product: allProds[2], qty: 96 }
          ]
        },
        {
          retailer: retailerList[1],
          date: '2026-10-12',
          items: [
            { product: allProds[3], qty: 72 },
            { product: allProds[4], qty: 72 },
            { product: allProds[5], qty: 72 }
          ]
        },
        {
          retailer: retailerList[2], // B2B with GSTIN
          date: '2026-10-14',
          items: [
            { product: allProds[0], qty: 144 },
            { product: allProds[6], qty: 144 },
            { product: allProds[8], qty: 48 }, // 12% GST item
            { product: allProds[9], qty: 48 }  // 18% GST item
          ]
        },
        {
          retailer: retailerList[3],
          date: '2026-10-15',
          items: [
            { product: allProds[2], qty: 48 },
            { product: allProds[7], qty: 24 }
          ]
        },
        {
          retailer: retailerList[4],
          date: '2026-10-17',
          items: [
            { product: allProds[0], qty: 72 },
            { product: allProds[1], qty: 144 },
            { product: allProds[3], qty: 72 },
            { product: allProds[5], qty: 72 }
          ]
        }
      ];

      for (const order of sampleOrders) {
        const lineItems = order.items.map(entry => ({
          product_id: entry.product.id,
          name: entry.product.name,
          quantity: entry.qty,
          rate: entry.product.selling_rate,
          taxRate: entry.product.tax_rate,
          unit: entry.product.unit,
          mrp: entry.product.mrp,
          hsn_code: entry.product.hsn_code
        }));

        const calculated = calculateInvoiceTotals(lineItems, 'exclusive', false);

        createInvoice({
          retailer_id: order.retailer.id,
          invoice_date: order.date,
          due_date: order.date,
          subtotal_taxable: calculated.subtotalTaxable,
          total_cgst: calculated.totalCgst,
          total_sgst: calculated.totalSgst,
          total_igst: calculated.totalIgst,
          round_off: calculated.roundOff,
          grand_total: calculated.grandTotal,
          place_of_supply: '27-Maharashtra',
          status: 'finalized',
          notes: 'Standard trade credit: 7 days.',
          items: calculated.items.map(it => ({
            product_id: it.product_id,
            item_name: it.name,
            hsn_code: it.hsn_code,
            unit: it.unit,
            quantity: it.quantity,
            mrp: it.mrp,
            rate: it.rate,
            gross_rate: it.grossRate,
            discount_amount: it.discountAmount,
            taxable_amount: it.taxableAmount,
            tax_rate: it.taxRate,
            cgst_amount: it.cgstAmount,
            sgst_amount: it.sgstAmount,
            igst_amount: it.igstAmount,
            total_amount: it.totalAmount
          }))
        });
      }
    }

    // 4. Seed Mobile Orders if empty
    let existingOrdersCount = 0;
    try {
      existingOrdersCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    } catch (e) {
      existingOrdersCount = 0;
    }

    if (existingOrdersCount === 0 && retailerList.length >= 3 && productMap.size >= 4) {
      const allProds = Array.from(productMap.values());

      // Order 1: From Rahul Shinde on Nandgaon Beat
      createOrder({
        order_number: 'ORD-2026-001',
        order_date: new Date().toISOString().split('T')[0],
        salesman_name: 'Rahul Shinde (Field Salesman)',
        salesman_phone: '9822998811',
        beat_name: 'Nandgaon Market Beat',
        retailer_id: retailerList[0].id,
        retailer_name: retailerList[0].shop_name,
        retailer_phone: retailerList[0].phone,
        retailer_address: retailerList[0].address,
        retailer_gstin: retailerList[0].gstin || '',
        status: 'pending',
        notes: 'Urgent morning delivery requested. Cash on delivery.',
        items: [
          { product_id: allProds[0].id, item_name: allProds[0].name, hsn_code: allProds[0].hsn_code, unit: allProds[0].unit, quantity: 144, mrp: allProds[0].mrp, rate: allProds[0].selling_rate, tax_rate: allProds[0].tax_rate },
          { product_id: allProds[2].id, item_name: allProds[2].name, hsn_code: allProds[2].hsn_code, unit: allProds[2].unit, quantity: 96, mrp: allProds[2].mrp, rate: allProds[2].selling_rate, tax_rate: allProds[2].tax_rate },
          { product_id: allProds[3].id, item_name: allProds[3].name, hsn_code: allProds[3].hsn_code, unit: allProds[3].unit, quantity: 72, mrp: allProds[3].mrp, rate: allProds[3].selling_rate, tax_rate: allProds[3].tax_rate },
          { product_id: allProds[8].id, item_name: allProds[8].name, hsn_code: allProds[8].hsn_code, unit: allProds[8].unit, quantity: 24, mrp: allProds[8].mrp, rate: allProds[8].selling_rate, tax_rate: allProds[8].tax_rate }
        ]
      });

      // Order 2: From Sanjay Patil on Station Road Beat
      createOrder({
        order_number: 'ORD-2026-002',
        order_date: new Date().toISOString().split('T')[0],
        salesman_name: 'Sanjay Patil (Order Booker)',
        salesman_phone: '9822776655',
        beat_name: 'Station Road & College Corner',
        retailer_id: retailerList[1].id,
        retailer_name: retailerList[1].shop_name,
        retailer_phone: retailerList[1].phone,
        retailer_address: retailerList[1].address,
        retailer_gstin: retailerList[1].gstin || '',
        status: 'pending',
        notes: 'Stock running low. Send tempo before 2 PM.',
        items: [
          { product_id: allProds[1].id, item_name: allProds[1].name, hsn_code: allProds[1].hsn_code, unit: allProds[1].unit, quantity: 144, mrp: allProds[1].mrp, rate: allProds[1].selling_rate, tax_rate: allProds[1].tax_rate },
          { product_id: allProds[4].id, item_name: allProds[4].name, hsn_code: allProds[4].hsn_code, unit: allProds[4].unit, quantity: 72, mrp: allProds[4].mrp, rate: allProds[4].selling_rate, tax_rate: allProds[4].tax_rate },
          { product_id: allProds[5].id, item_name: allProds[5].name, hsn_code: allProds[5].hsn_code, unit: allProds[5].unit, quantity: 72, mrp: allProds[5].mrp, rate: allProds[5].selling_rate, tax_rate: allProds[5].tax_rate }
        ]
      });

      // Order 3: B2B Order from Kisan Super Market
      createOrder({
        order_number: 'ORD-2026-003',
        order_date: new Date().toISOString().split('T')[0],
        salesman_name: 'Rahul Shinde (Field Salesman)',
        salesman_phone: '9822998811',
        beat_name: 'Old Agra Road B2B',
        retailer_id: retailerList[2].id,
        retailer_name: retailerList[2].shop_name,
        retailer_phone: retailerList[2].phone,
        retailer_address: retailerList[2].address,
        retailer_gstin: retailerList[2].gstin || '',
        status: 'pending',
        notes: 'B2B GST bill needed for input credit. Store manager approved payment on delivery.',
        items: [
          { product_id: allProds[0].id, item_name: allProds[0].name, hsn_code: allProds[0].hsn_code, unit: allProds[0].unit, quantity: 288, mrp: allProds[0].mrp, rate: allProds[0].selling_rate, tax_rate: allProds[0].tax_rate },
          { product_id: allProds[6].id, item_name: allProds[6].name, hsn_code: allProds[6].hsn_code, unit: allProds[6].unit, quantity: 144, mrp: allProds[6].mrp, rate: allProds[6].selling_rate, tax_rate: allProds[6].tax_rate },
          { product_id: allProds[7].id, item_name: allProds[7].name, hsn_code: allProds[7].hsn_code, unit: allProds[7].unit, quantity: 24, mrp: allProds[7].mrp, rate: allProds[7].selling_rate, tax_rate: allProds[7].tax_rate },
          { product_id: allProds[9].id, item_name: allProds[9].name, hsn_code: allProds[9].hsn_code, unit: allProds[9].unit, quantity: 96, mrp: allProds[9].mrp, rate: allProds[9].selling_rate, tax_rate: allProds[9].tax_rate }
        ]
      });

      // Order 4: Already converted sample order
      createOrder({
        order_number: 'ORD-2026-000',
        order_date: '2026-10-15',
        salesman_name: 'Amit Deshmukh (Beat Salesman)',
        salesman_phone: '9822668844',
        beat_name: 'Bus Stand Chowk',
        retailer_id: retailerList[3].id,
        retailer_name: retailerList[3].shop_name,
        retailer_phone: retailerList[3].phone,
        retailer_address: retailerList[3].address,
        retailer_gstin: retailerList[3].gstin || '',
        status: 'converted',
        notes: 'Converted to official tax invoice INV-1004.',
        items: [
          { product_id: allProds[0].id, item_name: allProds[0].name, hsn_code: allProds[0].hsn_code, unit: allProds[0].unit, quantity: 72, mrp: allProds[0].mrp, rate: allProds[0].selling_rate, tax_rate: allProds[0].tax_rate }
        ]
      });
    }

    return {
      productsCount: getProducts().length,
      retailersCount: getRetailers().length,
      invoicesCount: db.prepare('SELECT COUNT(*) as count FROM invoices').get().count,
      ordersCount: db.prepare('SELECT COUNT(*) as count FROM orders').get().count
    };
  });

  return seedTx();
}
