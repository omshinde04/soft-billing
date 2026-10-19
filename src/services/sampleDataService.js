import { getDb } from '../database/db.js';
import {
  createProduct,
  createRetailer,
  createInvoice,
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

    return {
      productsCount: getProducts().length,
      retailersCount: getRetailers().length,
      invoicesCount: db.prepare('SELECT COUNT(*) as count FROM invoices').get().count
    };
  });

  return seedTx();
}
