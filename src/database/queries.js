import { getDb } from './db.js';
import { roundTo } from '../shared/calculations.js';

// ==========================================
// 1. BUSINESS SETTINGS
// ==========================================

export function getBusinessSettings() {
  const db = getDb();
  return db.prepare('SELECT * FROM business_settings WHERE id = 1').get();
}

export function updateBusinessSettings(settings) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE business_settings SET
      legal_name = @legal_name,
      trade_name = @trade_name,
      gstin = @gstin,
      address = @address,
      city = @city,
      state = @state,
      state_code = @state_code,
      pincode = @pincode,
      phone = @phone,
      email = @email,
      bank_name = @bank_name,
      bank_account_no = @bank_account_no,
      bank_ifsc = @bank_ifsc,
      bank_branch = @bank_branch,
      invoice_prefix = @invoice_prefix,
      next_invoice_number = @next_invoice_number,
      invoice_footer_notes = @invoice_footer_notes,
      default_pricing_mode = @default_pricing_mode,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `);

  stmt.run({
    legal_name: settings.legal_name || 'My Distribution Company',
    trade_name: settings.trade_name || '',
    gstin: (settings.gstin || '').trim().toUpperCase(),
    address: settings.address || '',
    city: settings.city || '',
    state: settings.state || 'Maharashtra',
    state_code: settings.state_code || '27',
    pincode: settings.pincode || '',
    phone: settings.phone || '',
    email: settings.email || '',
    bank_name: settings.bank_name || '',
    bank_account_no: settings.bank_account_no || '',
    bank_ifsc: (settings.bank_ifsc || '').trim().toUpperCase(),
    bank_branch: settings.bank_branch || '',
    invoice_prefix: settings.invoice_prefix || 'INV-',
    next_invoice_number: Number(settings.next_invoice_number) || 1001,
    invoice_footer_notes: settings.invoice_footer_notes || '',
    default_pricing_mode: settings.default_pricing_mode || 'exclusive'
  });

  return getBusinessSettings();
}

// ==========================================
// 2. PRODUCTS MASTER
// ==========================================

export function getProducts({ search = '', activeOnly = false } = {}) {
  const db = getDb();
  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (activeOnly) {
    query += ' AND is_active = 1';
  }

  if (search && search.trim()) {
    query += ' AND (name LIKE ? OR brand LIKE ? OR sku LIKE ? OR barcode LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  query += ' ORDER BY name ASC';
  return db.prepare(query).all(...params);
}

export function getProductById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
}

export function createProduct(product) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO products (
      name, brand, sku, barcode, hsn_code, unit, pack_size,
      mrp, purchase_price, selling_rate, tax_rate, is_active
    ) VALUES (
      @name, @brand, @sku, @barcode, @hsn_code, @unit, @pack_size,
      @mrp, @purchase_price, @selling_rate, @tax_rate, @is_active
    )
  `);

  const info = stmt.run({
    name: product.name.trim(),
    brand: product.brand ? product.brand.trim() : '',
    sku: product.sku ? product.sku.trim() : null,
    barcode: product.barcode ? product.barcode.trim() : null,
    hsn_code: product.hsn_code ? product.hsn_code.trim() : '',
    unit: product.unit || 'PCS',
    pack_size: Number(product.pack_size) || 1,
    mrp: Number(product.mrp) || 0,
    purchase_price: Number(product.purchase_price) || 0,
    selling_rate: Number(product.selling_rate) || 0,
    tax_rate: (product.tax_rate !== undefined && product.tax_rate !== null) ? Number(product.tax_rate) : 5.0,
    is_active: product.is_active !== undefined ? (product.is_active ? 1 : 0) : 1
  });

  return getProductById(info.lastInsertRowid);
}

export function updateProduct(id, product) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE products SET
      name = @name,
      brand = @brand,
      sku = @sku,
      barcode = @barcode,
      hsn_code = @hsn_code,
      unit = @unit,
      pack_size = @pack_size,
      mrp = @mrp,
      purchase_price = @purchase_price,
      selling_rate = @selling_rate,
      tax_rate = @tax_rate,
      is_active = @is_active,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `);

  stmt.run({
    id: id,
    name: product.name.trim(),
    brand: product.brand ? product.brand.trim() : '',
    sku: product.sku ? product.sku.trim() : null,
    barcode: product.barcode ? product.barcode.trim() : null,
    hsn_code: product.hsn_code ? product.hsn_code.trim() : '',
    unit: product.unit || 'PCS',
    pack_size: Number(product.pack_size) || 1,
    mrp: Number(product.mrp) || 0,
    purchase_price: Number(product.purchase_price) || 0,
    selling_rate: Number(product.selling_rate) || 0,
    tax_rate: (product.tax_rate !== undefined && product.tax_rate !== null) ? Number(product.tax_rate) : 5.0,
    is_active: product.is_active ? 1 : 0
  });

  return getProductById(id);
}

export function toggleProductStatus(id) {
  const db = getDb();
  const product = getProductById(id);
  if (!product) throw new Error('Product not found');
  const newStatus = product.is_active ? 0 : 1;
  db.prepare('UPDATE products SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, id);
  return getProductById(id);
}

// ==========================================
// 3. RETAILERS MASTER
// ==========================================

export function getRetailers({ search = '', activeOnly = false } = {}) {
  const db = getDb();
  let query = 'SELECT * FROM retailers WHERE 1=1';
  const params = [];

  if (activeOnly) {
    query += ' AND is_active = 1';
  }

  if (search && search.trim()) {
    query += ' AND (shop_name LIKE ? OR contact_person LIKE ? OR phone LIKE ? OR city LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  query += ' ORDER BY shop_name ASC';
  return db.prepare(query).all(...params);
}

export function getRetailerById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM retailers WHERE id = ?').get(id);
}

export function createRetailer(retailer) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO retailers (
      shop_name, contact_person, phone, whatsapp_number, address, city, state, state_code,
      pincode, gstin, notes, is_active
    ) VALUES (
      @shop_name, @contact_person, @phone, @whatsapp_number, @address, @city, @state, @state_code,
      @pincode, @gstin, @notes, @is_active
    )
  `);

  const info = stmt.run({
    shop_name: retailer.shop_name.trim(),
    contact_person: retailer.contact_person ? retailer.contact_person.trim() : '',
    phone: retailer.phone ? retailer.phone.trim() : '',
    whatsapp_number: retailer.whatsapp_number ? retailer.whatsapp_number.trim() : (retailer.phone ? retailer.phone.trim() : ''),
    address: retailer.address ? retailer.address.trim() : '',
    city: retailer.city ? retailer.city.trim() : '',
    state: retailer.state || 'Maharashtra',
    state_code: retailer.state_code || '27',
    pincode: retailer.pincode ? retailer.pincode.trim() : '',
    gstin: retailer.gstin ? retailer.gstin.trim().toUpperCase() : '',
    notes: retailer.notes || '',
    is_active: retailer.is_active !== undefined ? (retailer.is_active ? 1 : 0) : 1
  });

  return getRetailerById(info.lastInsertRowid);
}

export function updateRetailer(id, retailer) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE retailers SET
      shop_name = @shop_name,
      contact_person = @contact_person,
      phone = @phone,
      whatsapp_number = @whatsapp_number,
      address = @address,
      city = @city,
      state = @state,
      state_code = @state_code,
      pincode = @pincode,
      gstin = @gstin,
      notes = @notes,
      is_active = @is_active,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `);

  stmt.run({
    id: id,
    shop_name: retailer.shop_name.trim(),
    contact_person: retailer.contact_person ? retailer.contact_person.trim() : '',
    phone: retailer.phone ? retailer.phone.trim() : '',
    whatsapp_number: retailer.whatsapp_number ? retailer.whatsapp_number.trim() : (retailer.phone ? retailer.phone.trim() : ''),
    address: retailer.address ? retailer.address.trim() : '',
    city: retailer.city ? retailer.city.trim() : '',
    state: retailer.state || 'Maharashtra',
    state_code: retailer.state_code || '27',
    pincode: retailer.pincode ? retailer.pincode.trim() : '',
    gstin: retailer.gstin ? retailer.gstin.trim().toUpperCase() : '',
    notes: retailer.notes || '',
    is_active: retailer.is_active ? 1 : 0
  });

  return getRetailerById(id);
}

export function toggleRetailerStatus(id) {
  const db = getDb();
  const retailer = getRetailerById(id);
  if (!retailer) throw new Error('Retailer not found');
  const newStatus = retailer.is_active ? 0 : 1;
  db.prepare('UPDATE retailers SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, id);
  return getRetailerById(id);
}

// ==========================================
// 4. INVOICES & BILLING
// ==========================================

/**
 * Creates an invoice with full transactional atomicity and historical integrity snapshots.
 */
export function createInvoice(invoiceData) {
  const db = getDb();

  const insertTx = db.transaction(() => {
    // 1. Get current business settings for invoice number & snapshot
    const settings = db.prepare('SELECT * FROM business_settings WHERE id = 1').get();
    if (!settings) throw new Error('Business settings not found');

    let invoiceNumber = invoiceData.invoice_number;
    if (!invoiceNumber) {
      invoiceNumber = `${settings.invoice_prefix}${settings.next_invoice_number}`;
      // Increment next_invoice_number atomically
      db.prepare('UPDATE business_settings SET next_invoice_number = next_invoice_number + 1 WHERE id = 1').run();
    }

    // Check uniqueness
    const exists = db.prepare('SELECT id FROM invoices WHERE invoice_number = ?').get(invoiceNumber);
    if (exists) {
      throw new Error(`Invoice number "${invoiceNumber}" already exists.`);
    }

    // 2. Fetch retailer for snapshot if retailer_id is provided
    let retailerSnapshot = invoiceData.retailer_snapshot;
    if (!retailerSnapshot && invoiceData.retailer_id) {
      const retailer = db.prepare('SELECT * FROM retailers WHERE id = ?').get(invoiceData.retailer_id);
      if (retailer) {
        retailerSnapshot = JSON.stringify(retailer);
      }
    }
    if (!retailerSnapshot) {
      retailerSnapshot = JSON.stringify({ shop_name: 'Cash Customer' });
    } else if (typeof retailerSnapshot === 'object') {
      retailerSnapshot = JSON.stringify(retailerSnapshot);
    }

    const sellerSnapshot = JSON.stringify(settings);

    // 3. Insert invoice master record
    const insertInvoiceStmt = db.prepare(`
      INSERT INTO invoices (
        invoice_number, invoice_date, due_date, retailer_id,
        pricing_mode, seller_snapshot, retailer_snapshot, place_of_supply,
        is_inter_state, subtotal_taxable, total_cgst, total_sgst, total_igst,
        round_off, grand_total, status, notes
      ) VALUES (
        @invoice_number, @invoice_date, @due_date, @retailer_id,
        @pricing_mode, @seller_snapshot, @retailer_snapshot, @place_of_supply,
        @is_inter_state, @subtotal_taxable, @total_cgst, @total_sgst, @total_igst,
        @round_off, @grand_total, @status, @notes
      )
    `);

    const invoiceInfo = insertInvoiceStmt.run({
      invoice_number: invoiceNumber,
      invoice_date: invoiceData.invoice_date || new Date().toISOString().split('T')[0],
      due_date: invoiceData.due_date || invoiceData.invoice_date || new Date().toISOString().split('T')[0],
      retailer_id: invoiceData.retailer_id || null,
      pricing_mode: invoiceData.pricing_mode || 'exclusive',
      seller_snapshot: sellerSnapshot,
      retailer_snapshot: retailerSnapshot,
      place_of_supply: invoiceData.place_of_supply || '27-Maharashtra',
      is_inter_state: invoiceData.is_inter_state ? 1 : 0,
      subtotal_taxable: Number(invoiceData.subtotal_taxable) || 0,
      total_cgst: Number(invoiceData.total_cgst) || 0,
      total_sgst: Number(invoiceData.total_sgst) || 0,
      total_igst: Number(invoiceData.total_igst) || 0,
      round_off: Number(invoiceData.round_off) || 0,
      grand_total: Number(invoiceData.grand_total) || 0,
      status: invoiceData.status || 'finalized',
      notes: invoiceData.notes || ''
    });

    const invoiceId = invoiceInfo.lastInsertRowid;

    // 4. Insert line items
    const insertItemStmt = db.prepare(`
      INSERT INTO invoice_items (
        invoice_id, product_id, item_name, hsn_code, unit,
        quantity, mrp, rate, gross_rate, discount_amount,
        taxable_amount, tax_rate, cgst_amount, sgst_amount,
        igst_amount, total_amount
      ) VALUES (
        @invoice_id, @product_id, @item_name, @hsn_code, @unit,
        @quantity, @mrp, @rate, @gross_rate, @discount_amount,
        @taxable_amount, @tax_rate, @cgst_amount, @sgst_amount,
        @igst_amount, @total_amount
      )
    `);

    for (const item of invoiceData.items || []) {
      insertItemStmt.run({
        invoice_id: invoiceId,
        product_id: item.product_id || null,
        item_name: item.item_name || item.name,
        hsn_code: item.hsn_code || '',
        unit: item.unit || 'PCS',
        quantity: Number(item.quantity) || 1,
        mrp: Number(item.mrp) || 0,
        rate: Number(item.rate) || 0,
        gross_rate: Number(item.gross_rate) || Number(item.rate) || 0,
        discount_amount: Number(item.discount_amount) || 0,
        taxable_amount: Number(item.taxable_amount) || 0,
        tax_rate: (item.tax_rate !== undefined && item.tax_rate !== null) ? Number(item.tax_rate) : 5.0,
        cgst_amount: Number(item.cgst_amount) || 0,
        sgst_amount: Number(item.sgst_amount) || 0,
        igst_amount: Number(item.igst_amount) || 0,
        total_amount: Number(item.total_amount) || 0
      });
    }

    return invoiceId;
  });

  const invoiceId = insertTx();
  return getInvoiceById(invoiceId);
}

export function getInvoices({ search = '', status = '', fromDate = '', toDate = '', retailerId = null } = {}) {
  const db = getDb();
  let query = `
    SELECT i.*, r.shop_name as retailer_name, r.city as retailer_city
    FROM invoices i
    LEFT JOIN retailers r ON i.retailer_id = r.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND i.status = ?';
    params.push(status);
  }

  if (retailerId) {
    query += ' AND i.retailer_id = ?';
    params.push(retailerId);
  }

  if (fromDate) {
    query += ' AND i.invoice_date >= ?';
    params.push(fromDate);
  }

  if (toDate) {
    query += ' AND i.invoice_date <= ?';
    params.push(toDate);
  }

  if (search && search.trim()) {
    query += ' AND (i.invoice_number LIKE ? OR r.shop_name LIKE ? OR r.city LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY i.id DESC';
  return db.prepare(query).all(...params);
}

export function getInvoiceById(id) {
  const db = getDb();
  const invoice = db.prepare(`
    SELECT i.*, r.shop_name as retailer_name, r.phone as retailer_phone, r.gstin as retailer_gstin
    FROM invoices i
    LEFT JOIN retailers r ON i.retailer_id = r.id
    WHERE i.id = ?
  `).get(id);

  if (!invoice) return null;

  const items = db.prepare(`
    SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC
  `).all(id);

  let seller = {};
  let retailer = {};
  try {
    seller = JSON.parse(invoice.seller_snapshot);
  } catch (e) {
    seller = {};
  }
  try {
    retailer = JSON.parse(invoice.retailer_snapshot);
  } catch (e) {
    retailer = {};
  }

  return {
    ...invoice,
    seller,
    retailer,
    items
  };
}

export function cancelInvoice(id, reason = '') {
  const db = getDb();
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  if (!invoice) throw new Error('Invoice not found');
  if (invoice.status === 'cancelled') throw new Error('Invoice is already cancelled');

  // Cancel invoice - preserve audit trail
  db.prepare(`
    UPDATE invoices
    SET status = 'cancelled', notes = CASE WHEN notes = '' THEN ? ELSE notes || ' | ' || ? END
    WHERE id = ?
  `).run(`Cancelled: ${reason}`, `Cancelled: ${reason}`, id);

  return getInvoiceById(id);
}

// ==========================================
// 5. SALES RETURNS
// ==========================================

export function getInvoiceReturnableItems(invoiceId) {
  const db = getDb();
  const invoice = getInvoiceById(invoiceId);
  if (!invoice) throw new Error('Invoice not found');

  // Fetch all prior returns for this invoice
  const returnedItems = db.prepare(`
    SELECT sri.invoice_item_id, SUM(sri.return_qty) as total_returned
    FROM sales_return_items sri
    JOIN sales_returns sr ON sri.sales_return_id = sr.id
    WHERE sr.invoice_id = ?
    GROUP BY sri.invoice_item_id
  `).all(invoiceId);

  const returnedMap = new Map();
  for (const row of returnedItems) {
    returnedMap.set(row.invoice_item_id, row.total_returned);
  }

  return invoice.items.map(item => {
    const alreadyReturned = returnedMap.get(item.id) || 0;
    const remainingQty = Math.max(0, item.quantity - alreadyReturned);
    return {
      ...item,
      already_returned_qty: alreadyReturned,
      remaining_qty: remainingQty
    };
  });
}

export function createSalesReturn(returnData) {
  const db = getDb();

  const returnTx = db.transaction(() => {
    const invoice = getInvoiceById(returnData.invoice_id);
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'cancelled') throw new Error('Cannot return items from a cancelled invoice');

    // Generate return document number: RET-YYYYMM-XXXX
    const countRow = db.prepare('SELECT COUNT(*) as count FROM sales_returns').get();
    const returnNumber = `RET-${String(countRow.count + 1001).padStart(4, '0')}`;

    // Validate quantities against remaining returnable amounts
    const returnableItems = getInvoiceReturnableItems(returnData.invoice_id);
    const returnableMap = new Map(returnableItems.map(item => [item.id, item]));

    let totalRefundTaxable = 0;
    let totalRefundTax = 0;
    let totalRefundAmount = 0;

    const validatedItems = [];

    for (const retItem of returnData.items) {
      const originalItem = returnableMap.get(retItem.invoice_item_id);
      if (!originalItem) {
        throw new Error(`Item ${retItem.invoice_item_id} not found on invoice.`);
      }

      const returnQty = Number(retItem.return_qty) || 0;
      if (returnQty <= 0) continue;

      if (returnQty > originalItem.remaining_qty) {
        throw new Error(
          `Return quantity (${returnQty}) exceeds remaining eligible quantity (${originalItem.remaining_qty}) for "${originalItem.item_name}".`
        );
      }

      // Calculate proportional refund based on original rate and taxes
      const ratio = returnQty / originalItem.quantity;
      const refTaxable = roundTo(originalItem.taxable_amount * ratio, 2);
      const refCgst = roundTo(originalItem.cgst_amount * ratio, 2);
      const refSgst = roundTo(originalItem.sgst_amount * ratio, 2);
      const refIgst = roundTo(originalItem.igst_amount * ratio, 2);
      const refTotal = roundTo(refTaxable + refCgst + refSgst + refIgst, 2);

      totalRefundTaxable = roundTo(totalRefundTaxable + refTaxable, 2);
      totalRefundTax = roundTo(totalRefundTax + refCgst + refSgst + refIgst, 2);
      totalRefundAmount = roundTo(totalRefundAmount + refTotal, 2);

      validatedItems.push({
        invoice_item_id: originalItem.id,
        product_id: originalItem.product_id,
        item_name: originalItem.item_name,
        return_qty: returnQty,
        refund_taxable: refTaxable,
        refund_cgst: refCgst,
        refund_sgst: refSgst,
        refund_igst: refIgst,
        refund_total: refTotal
      });
    }

    if (validatedItems.length === 0) {
      throw new Error('No items selected for return.');
    }

    // Insert sales return master
    const insertReturnStmt = db.prepare(`
      INSERT INTO sales_returns (
        return_number, return_date, invoice_id, retailer_id,
        reason, total_refund_taxable, total_refund_tax, total_refund_amount
      ) VALUES (
        @return_number, @return_date, @invoice_id, @retailer_id,
        @reason, @total_refund_taxable, @total_refund_tax, @total_refund_amount
      )
    `);

    const returnInfo = insertReturnStmt.run({
      return_number: returnNumber,
      return_date: returnData.return_date || new Date().toISOString().split('T')[0],
      invoice_id: invoice.id,
      retailer_id: invoice.retailer_id || 0,
      reason: returnData.reason || '',
      total_refund_taxable: totalRefundTaxable,
      total_refund_tax: totalRefundTax,
      total_refund_amount: totalRefundAmount
    });

    const returnId = returnInfo.lastInsertRowid;

    // Insert sales return items
    const insertRetItemStmt = db.prepare(`
      INSERT INTO sales_return_items (
        sales_return_id, invoice_item_id, product_id, item_name,
        return_qty, refund_taxable, refund_cgst, refund_sgst,
        refund_igst, refund_total
      ) VALUES (
        @sales_return_id, @invoice_item_id, @product_id, @item_name,
        @return_qty, @refund_taxable, @refund_cgst, @refund_sgst,
        @refund_igst, @refund_total
      )
    `);

    for (const vItem of validatedItems) {
      insertRetItemStmt.run({
        sales_return_id: returnId,
        ...vItem
      });
    }

    return returnId;
  });

  const returnId = returnTx();
  return getSalesReturnById(returnId);
}

export function getSalesReturns({ fromDate = '', toDate = '', invoiceId = null } = {}) {
  const db = getDb();
  let query = `
    SELECT sr.*, i.invoice_number, r.shop_name as retailer_name, r.phone, r.whatsapp_number, r.city as retailer_city
    FROM sales_returns sr
    JOIN invoices i ON sr.invoice_id = i.id
    LEFT JOIN retailers r ON sr.retailer_id = r.id
    WHERE 1=1
  `;
  const params = [];

  if (invoiceId) {
    query += ' AND sr.invoice_id = ?';
    params.push(invoiceId);
  }
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

export function getSalesReturnById(id) {
  const db = getDb();
  const ret = db.prepare(`
    SELECT sr.*, i.invoice_number, i.invoice_date,
           r.shop_name as retailer_name, r.phone, r.whatsapp_number,
           r.address as retailer_address, r.city as retailer_city, r.gstin as retailer_gstin
    FROM sales_returns sr
    JOIN invoices i ON sr.invoice_id = i.id
    LEFT JOIN retailers r ON sr.retailer_id = r.id
    WHERE sr.id = ?
  `).get(id);

  if (!ret) return null;

  const items = db.prepare(`
    SELECT * FROM sales_return_items WHERE sales_return_id = ? ORDER BY id ASC
  `).all(id);

  return { ...ret, items };
}

// ==========================================
// 6. DASHBOARD & REPORTING AGGREGATES
// ==========================================

export function getDashboardMetrics({ fromDate = '', toDate = '' } = {}) {
  const db = getDb();
  
  let invWhere = "status = 'finalized'";
  const invParams = [];
  if (fromDate) {
    invWhere += ' AND invoice_date >= ?';
    invParams.push(fromDate);
  }
  if (toDate) {
    invWhere += ' AND invoice_date <= ?';
    invParams.push(toDate);
  }

  let retWhere = '1=1';
  const retParams = [];
  if (fromDate) {
    retWhere += ' AND return_date >= ?';
    retParams.push(fromDate);
  }
  if (toDate) {
    retWhere += ' AND return_date <= ?';
    retParams.push(toDate);
  }

  // Active Finalized Invoices Summary
  const invoiceStats = db.prepare(`
    SELECT
      COUNT(*) as total_invoices,
      COALESCE(SUM(subtotal_taxable), 0) as total_taxable,
      COALESCE(SUM(total_cgst), 0) as total_cgst,
      COALESCE(SUM(total_sgst), 0) as total_sgst,
      COALESCE(SUM(total_igst), 0) as total_igst,
      COALESCE(SUM(grand_total), 0) as total_sales
    FROM invoices
    WHERE ${invWhere}
  `).get(...invParams);

  // Sales Returns in the period
  const returnStats = db.prepare(`
    SELECT
      COUNT(*) as total_returns,
      COALESCE(SUM(total_refund_taxable), 0) as return_taxable,
      COALESCE(SUM(total_refund_amount), 0) as return_amount
    FROM sales_returns
    WHERE ${retWhere}
  `).get(...retParams);

  const productCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get().count;
  const retailerCount = db.prepare('SELECT COUNT(*) as count FROM retailers WHERE is_active = 1').get().count;

  // Recent invoices
  const recentInvoices = db.prepare(`
    SELECT i.id, i.invoice_number, i.invoice_date, i.grand_total, i.status, r.shop_name as retailer_name
    FROM invoices i
    LEFT JOIN retailers r ON i.retailer_id = r.id
    WHERE ${invWhere}
    ORDER BY i.id DESC
    LIMIT 6
  `).all(...invParams);

  // Recent sales returns
  const recentReturns = db.prepare(`
    SELECT sr.id, sr.return_number, sr.return_date, sr.total_refund_amount, sr.reason, i.invoice_number, r.shop_name as retailer_name
    FROM sales_returns sr
    JOIN invoices i ON sr.invoice_id = i.id
    LEFT JOIN retailers r ON sr.retailer_id = r.id
    WHERE ${retWhere.replace(/return_date/g, 'sr.return_date')}
    ORDER BY sr.id DESC
    LIMIT 6
  `).all(...retParams);

  const netSales = roundTo(invoiceStats.total_sales - returnStats.return_amount, 2);
  const netTaxable = roundTo(invoiceStats.total_taxable - returnStats.return_taxable, 2);
  const totalTax = roundTo(invoiceStats.total_cgst + invoiceStats.total_sgst + invoiceStats.total_igst, 2);

  return {
    totalInvoices: invoiceStats.total_invoices,
    grossSales: roundTo(invoiceStats.total_sales, 2),
    totalReturns: returnStats.total_returns,
    returnsAmount: roundTo(returnStats.return_amount, 2),
    netSales: netSales,
    taxableSales: netTaxable,
    totalCgst: roundTo(invoiceStats.total_cgst, 2),
    totalSgst: roundTo(invoiceStats.total_sgst, 2),
    totalIgst: roundTo(invoiceStats.total_igst, 2),
    totalTax: totalTax,
    activeProducts: productCount,
    activeRetailers: retailerCount,
    recentInvoices: recentInvoices,
    recentReturns: recentReturns
  };
}
