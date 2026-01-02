// backend/db.js - Using better-sqlite3 (synchronous, faster)
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Determine database location
// In production: Use userData directory passed from main process
// In development: Use backend directory
let dbFile;

if (process.env.USER_DATA_PATH && process.env.IS_PACKAGED === 'true') {
  // Production: Store in user's data directory
  const dbDir = path.join(process.env.USER_DATA_PATH, 'database');
  
  // Create database directory if it doesn't exist
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('📁 Created database directory:', dbDir);
  }
  
  dbFile = path.join(dbDir, 'tally.db');
  console.log('📦 Production mode - Database location:', dbFile);
} else {
  // Development: Use backend directory
  dbFile = path.join(__dirname, 'tally.db');
  console.log('🔧 Development mode - Database location:', dbFile);
}

// Create database connection
const db = new Database(dbFile, { verbose: console.log });

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

console.log('✅ SQLite connected (better-sqlite3):', dbFile);

// Initialize basic schema (will be extended by server.js)
// NOTE: Keep this minimal - full schema is in server.js
db.exec(`
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
`);

console.log('✅ Basic schema initialized');

// Graceful shutdown
process.on('exit', () => {
  db.close();
  console.log('📁 Database connection closed');
});

process.on('SIGINT', () => {
  db.close();
  console.log('\n📁 Database connection closed');
  process.exit(0);
});

module.exports = db;