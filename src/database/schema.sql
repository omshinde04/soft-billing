-- Billing-Soft SQLite Schema Migration V1
PRAGMA foreign_keys = ON;

-- 1. Schema Migrations Table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Business Settings Table
CREATE TABLE IF NOT EXISTS business_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  legal_name TEXT NOT NULL DEFAULT 'My Distribution Company',
  trade_name TEXT DEFAULT '',
  gstin TEXT DEFAULT '',
  address TEXT NOT NULL DEFAULT 'Main Market Road',
  city TEXT NOT NULL DEFAULT 'Nashik',
  state TEXT NOT NULL DEFAULT 'Maharashtra',
  state_code TEXT NOT NULL DEFAULT '27',
  pincode TEXT NOT NULL DEFAULT '422001',
  phone TEXT NOT NULL DEFAULT '9876543210',
  email TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  bank_account_no TEXT DEFAULT '',
  bank_ifsc TEXT DEFAULT '',
  bank_branch TEXT DEFAULT '',
  invoice_prefix TEXT NOT NULL DEFAULT 'INV-',
  next_invoice_number INTEGER NOT NULL DEFAULT 1001,
  invoice_footer_notes TEXT DEFAULT 'Goods once sold will not be taken back without prior authorization.',
  default_pricing_mode TEXT NOT NULL DEFAULT 'exclusive',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand TEXT DEFAULT '',
  sku TEXT UNIQUE,
  barcode TEXT,
  hsn_code TEXT DEFAULT '',
  unit TEXT NOT NULL DEFAULT 'PCS',
  pack_size INTEGER DEFAULT 1,
  mrp REAL NOT NULL DEFAULT 0.0,
  purchase_price REAL DEFAULT 0.0,
  selling_rate REAL NOT NULL DEFAULT 0.0,
  tax_rate REAL NOT NULL DEFAULT 5.0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- 4. Retailers Table
CREATE TABLE IF NOT EXISTS retailers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_name TEXT NOT NULL,
  contact_person TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  whatsapp_number TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT NOT NULL DEFAULT 'Maharashtra',
  state_code TEXT NOT NULL DEFAULT '27',
  pincode TEXT DEFAULT '',
  gstin TEXT DEFAULT '',
  beat_name TEXT DEFAULT 'Market Beat',
  outstanding_balance REAL DEFAULT 0.0,
  notes TEXT DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_retailers_shop_name ON retailers(shop_name);
CREATE INDEX IF NOT EXISTS idx_retailers_phone ON retailers(phone);
CREATE INDEX IF NOT EXISTS idx_retailers_active ON retailers(is_active);

-- 5. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date TEXT NOT NULL,
  due_date TEXT,
  retailer_id INTEGER REFERENCES retailers(id),
  pricing_mode TEXT NOT NULL DEFAULT 'exclusive',
  seller_snapshot TEXT NOT NULL,
  retailer_snapshot TEXT NOT NULL,
  place_of_supply TEXT NOT NULL DEFAULT '27-Maharashtra',
  is_inter_state INTEGER NOT NULL DEFAULT 0,
  subtotal_taxable REAL NOT NULL DEFAULT 0.0,
  total_cgst REAL NOT NULL DEFAULT 0.0,
  total_sgst REAL NOT NULL DEFAULT 0.0,
  total_igst REAL NOT NULL DEFAULT 0.0,
  round_off REAL NOT NULL DEFAULT 0.0,
  grand_total REAL NOT NULL DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'finalized',
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_retailer ON invoices(retailer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- 6. Invoice Line Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  item_name TEXT NOT NULL,
  hsn_code TEXT DEFAULT '',
  unit TEXT NOT NULL DEFAULT 'PCS',
  quantity REAL NOT NULL DEFAULT 1,
  mrp REAL NOT NULL DEFAULT 0.0,
  rate REAL NOT NULL DEFAULT 0.0,
  gross_rate REAL NOT NULL DEFAULT 0.0,
  discount_amount REAL NOT NULL DEFAULT 0.0,
  taxable_amount REAL NOT NULL DEFAULT 0.0,
  tax_rate REAL NOT NULL DEFAULT 5.0,
  cgst_amount REAL NOT NULL DEFAULT 0.0,
  sgst_amount REAL NOT NULL DEFAULT 0.0,
  igst_amount REAL NOT NULL DEFAULT 0.0,
  total_amount REAL NOT NULL DEFAULT 0.0
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON invoice_items(product_id);

-- 7. Sales Returns Table
CREATE TABLE IF NOT EXISTS sales_returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_number TEXT NOT NULL UNIQUE,
  return_date TEXT NOT NULL,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id),
  retailer_id INTEGER NOT NULL REFERENCES retailers(id),
  reason TEXT DEFAULT '',
  total_refund_taxable REAL NOT NULL DEFAULT 0.0,
  total_refund_tax REAL NOT NULL DEFAULT 0.0,
  total_refund_amount REAL NOT NULL DEFAULT 0.0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_returns_invoice ON sales_returns(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_date ON sales_returns(return_date);

-- 8. Sales Return Items Table
CREATE TABLE IF NOT EXISTS sales_return_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sales_return_id INTEGER NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
  invoice_item_id INTEGER NOT NULL REFERENCES invoice_items(id),
  product_id INTEGER REFERENCES products(id),
  item_name TEXT NOT NULL,
  return_qty REAL NOT NULL,
  refund_taxable REAL NOT NULL DEFAULT 0.0,
  refund_cgst REAL NOT NULL DEFAULT 0.0,
  refund_sgst REAL NOT NULL DEFAULT 0.0,
  refund_igst REAL NOT NULL DEFAULT 0.0,
  refund_total REAL NOT NULL DEFAULT 0.0
);

CREATE INDEX IF NOT EXISTS idx_sales_return_items_return ON sales_return_items(sales_return_id);
CREATE INDEX IF NOT EXISTS idx_sales_return_items_inv_item ON sales_return_items(invoice_item_id);

-- 9. Mobile Field Orders Table (Incoming Orders from Salesman Android App)
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL UNIQUE,
  order_date TEXT NOT NULL,
  salesman_name TEXT NOT NULL,
  salesman_phone TEXT DEFAULT '',
  beat_name TEXT DEFAULT '',
  retailer_id INTEGER REFERENCES retailers(id),
  retailer_name TEXT NOT NULL,
  retailer_phone TEXT DEFAULT '',
  retailer_address TEXT DEFAULT '',
  retailer_gstin TEXT DEFAULT '',
  subtotal_taxable REAL NOT NULL DEFAULT 0.0,
  total_tax REAL NOT NULL DEFAULT 0.0,
  grand_total REAL NOT NULL DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'converted', 'cancelled'
  converted_invoice_id INTEGER REFERENCES invoices(id),
  converted_invoice_number TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_salesman ON orders(salesman_name);

-- 10. Mobile Order Line Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  item_name TEXT NOT NULL,
  hsn_code TEXT DEFAULT '',
  unit TEXT NOT NULL DEFAULT 'PCS',
  quantity REAL NOT NULL DEFAULT 1,
  mrp REAL NOT NULL DEFAULT 0.0,
  rate REAL NOT NULL DEFAULT 0.0,
  tax_rate REAL NOT NULL DEFAULT 5.0,
  taxable_amount REAL NOT NULL DEFAULT 0.0,
  tax_amount REAL NOT NULL DEFAULT 0.0,
  total_amount REAL NOT NULL DEFAULT 0.0
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- 11. Salesmen Master Table (RBAC for Mobile Field Sales)
CREATE TABLE IF NOT EXISTS salesmen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  login_id TEXT UNIQUE,
  password TEXT NOT NULL DEFAULT '1234',
  assigned_beat TEXT DEFAULT 'Nandgaon Main Market',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_salesmen_phone ON salesmen(phone);
CREATE INDEX IF NOT EXISTS idx_salesmen_login ON salesmen(login_id);
CREATE INDEX IF NOT EXISTS idx_salesmen_active ON salesmen(is_active);


