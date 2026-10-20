import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;

/**
 * Resolves the path to the SQLite database file.
 * In Electron main process, callers can pass the userData path.
 */
export function getDatabasePath(customPath = null) {
  if (customPath) return customPath;
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;

  // Fallback for standalone/development/test
  const defaultDir = path.resolve(process.cwd(), '.data');
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }
  return path.join(defaultDir, 'billing_soft.db');
}

/**
 * Initializes and returns the SQLite database instance.
 */
export function initDatabase(dbPath = null) {
  if (dbInstance) return dbInstance;

  const targetPath = getDatabasePath(dbPath);
  const isMemory = targetPath === ':memory:';

  if (!isMemory) {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  dbInstance = new Database(targetPath);

  // Performance and integrity pragma settings
  dbInstance.pragma('foreign_keys = ON');
  if (!isMemory) {
    dbInstance.pragma('journal_mode = WAL');
  }

  // Run schema migration
  runMigrations(dbInstance);

  return dbInstance;
}

/**
 * Runs the initial schema migration and seeds default settings if empty.
 */
function runMigrations(db) {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Execute schema within transaction
  db.exec(schemaSql);

  // Ensure default initial settings exist
  const existingSettings = db.prepare('SELECT id FROM business_settings WHERE id = 1').get();
  if (!existingSettings) {
    db.prepare(`
      INSERT INTO business_settings (
        id, legal_name, trade_name, gstin, address, city, state, state_code,
        pincode, phone, email, bank_name, bank_account_no, bank_ifsc, bank_branch,
        invoice_prefix, next_invoice_number, default_pricing_mode
      ) VALUES (
        1, 'Om Distributor Services', 'Om Distributors', '',
        'Shop No. 12, Market Yard', 'Nashik', 'Maharashtra', '27',
        '422001', '9876543210', 'billing@omdistributors.local',
        '', '', '', '',
        'INV-', 1001, 'exclusive'
      )
    `).run();
  }

  // Ensure whatsapp_number, beat_name, and outstanding_balance exist on retailers table
  try {
    const retailerCols = db.pragma('table_info(retailers)');
    if (!retailerCols.some(col => col.name === 'whatsapp_number')) {
      db.exec("ALTER TABLE retailers ADD COLUMN whatsapp_number TEXT DEFAULT ''");
    }
    if (!retailerCols.some(col => col.name === 'beat_name')) {
      db.exec("ALTER TABLE retailers ADD COLUMN beat_name TEXT DEFAULT 'Market Beat'");
    }
    if (!retailerCols.some(col => col.name === 'outstanding_balance')) {
      db.exec("ALTER TABLE retailers ADD COLUMN outstanding_balance REAL DEFAULT 0.0");
    }
  } catch (e) {
    // Column might already exist or table not yet created
  }

  // Ensure orders table exists and has replaces_order_number column
  try {
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'").get();
    if (!tableExists) {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      db.exec(schemaSql);
    } else {
      const orderCols = db.pragma('table_info(orders)');
      if (orderCols && !orderCols.some(col => col.name === 'replaces_order_number')) {
        db.exec("ALTER TABLE orders ADD COLUMN replaces_order_number TEXT DEFAULT ''");
      }
    }
  } catch (e) {
    // Orders table might already exist
  }

  // Ensure salesmen table exists and seed defaults if empty
  try {
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='salesmen'").get();
    if (!tableExists) {
      db.exec(`
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
      `);
    }

    const count = db.prepare('SELECT COUNT(*) as count FROM salesmen').get().count;
    if (count === 0) {
      const insert = db.prepare(`
        INSERT INTO salesmen (name, phone, login_id, password, assigned_beat, is_active)
        VALUES (@name, @phone, @login_id, @password, @assigned_beat, 1)
      `);
      insert.run({ name: 'Rahul Shinde', phone: '9822012345', login_id: 'rahul', password: '123', assigned_beat: 'Nandgaon Main Market' });
      insert.run({ name: 'Sanjay Patil', phone: '9822054321', login_id: 'sanjay', password: '123', assigned_beat: 'Station Road Beat' });
      insert.run({ name: 'Amit Deshmukh', phone: '9822098765', login_id: 'amit', password: '123', assigned_beat: 'Old Agra Road Beat' });
    }
  } catch (e) {
    console.error('Salesmen migration error:', e);
  }

  // Record migration version 1
  const existingVersion = db.prepare('SELECT version FROM schema_migrations WHERE version = 1').get();
  if (!existingVersion) {
    db.prepare('INSERT INTO schema_migrations (version) VALUES (1)').run();
  }
}

/**
 * Returns the active database instance, initializing if necessary.
 */
export function getDb() {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

/**
 * Closes the active database connection. Useful for cleanup and tests.
 */
export function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Creates a safe, non-blocking backup of the SQLite database.
 * Uses SQLite's native backup API.
 */
export async function backupDatabase(destPath) {
  const db = getDb();
  if (!destPath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    destPath = path.resolve(process.cwd(), `.data/billing_soft_backup_${timestamp}.db`);
  }
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  await db.backup(destPath);
  return { success: true, backupPath: destPath };
}
