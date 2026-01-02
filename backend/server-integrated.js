// backend/server.js - COMPLETE VERSION WITH car_makes/car_models
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');
const os = require('os');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Determine database path based on environment
let dbPath;
if (process.env.PORTABLE_EXECUTABLE_DIR) {
  dbPath = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'tally.db');
} else if (__dirname.includes('app.asar')) {
  const appName = 'AutoCityAccountingPro';
  let appDataDir;
  
  if (process.platform === 'darwin') {
    appDataDir = path.join(os.homedir(), 'Library', 'Application Support', appName);
  } else if (process.platform === 'win32') {
    appDataDir = path.join(process.env.APPDATA || os.homedir(), appName);
  } else {
    appDataDir = path.join(os.homedir(), '.config', appName);
  }
  
  if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir, { recursive: true });
    console.log('📁 Created app data directory:', appDataDir);
  }
  
  dbPath = path.join(appDataDir, 'tally.db');
} else {
  dbPath = path.join(__dirname, 'tally.db');
}

console.log('📂 Database directory:', path.dirname(dbPath));
console.log('📁 Database path:', dbPath);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

console.log('✅ Database connected:', dbPath);

// Initialize enhanced database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS ledgers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    balance REAL DEFAULT 0,
    opening_balance REAL DEFAULT 0,
    parent_group TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voucher_no TEXT UNIQUE,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    debit_ledger TEXT NOT NULL,
    credit_ledger TEXT NOT NULL,
    amount REAL NOT NULL,
    narration TEXT,
    reference_no TEXT,
    status TEXT DEFAULT 'posted',
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stock_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL,
    sku TEXT UNIQUE,
    barcode TEXT,
    oem_part_no TEXT,
    category TEXT,
    unit TEXT DEFAULT 'PCS',
    opening_qty REAL DEFAULT 0,
    current_qty REAL DEFAULT 0,
    min_qty REAL DEFAULT 5,
    max_qty REAL DEFAULT 1000,
    reorder_level REAL DEFAULT 10,
    purchase_rate REAL DEFAULT 0,
    sale_rate REAL DEFAULT 0,
    mrp REAL DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    location TEXT,
    supplier TEXT,
    average_cost REAL DEFAULT 0,
    last_purchase_date TEXT,
    last_purchase_price REAL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stock_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    quantity REAL NOT NULL,
    rate REAL DEFAULT 0,
    date TEXT NOT NULL,
    reference_no TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_no TEXT UNIQUE,
    customer TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    date TEXT NOT NULL,
    subtotal REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    total REAL NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    payment_status TEXT DEFAULT 'paid',
    notes TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    rate REAL NOT NULL,
    tax_rate REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    total REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_no TEXT UNIQUE,
    supplier TEXT NOT NULL,
    date TEXT NOT NULL,
    subtotal REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    shipping_cost REAL DEFAULT 0,
    total REAL NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    purchase_rate REAL NOT NULL,
    tax_rate REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    total REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    gstin TEXT,
    opening_balance REAL DEFAULT 0,
    current_balance REAL DEFAULT 0,
    credit_limit REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    gstin TEXT,
    opening_balance REAL DEFAULT 0,
    current_balance REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    parent_id INTEGER,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    is_active INTEGER DEFAULT 1,
    last_login TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT,
    action TEXT,
    table_name TEXT,
    record_id INTEGER,
    old_value TEXT,
    new_value TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS car_makes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    country TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS car_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    make_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (make_id) REFERENCES car_makes(id),
    UNIQUE(make_id, name)
  );

  CREATE TABLE IF NOT EXISTS item_vehicle_compatibility (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    make_id INTEGER NOT NULL,
    model_id INTEGER,
    year_from INTEGER,
    year_to INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES stock_items(id),
    FOREIGN KEY (make_id) REFERENCES car_makes(id),
    FOREIGN KEY (model_id) REFERENCES car_models(id)
  );

  CREATE TABLE IF NOT EXISTS virtual_items (
    id INTEGER PRIMARY KEY,
    item_name TEXT NOT NULL,
    item_type TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('✅ Database tables initialized');
// Add this code to your backend/server.js
// Place it RIGHT AFTER the db.exec() that creates tables

// ============================================
