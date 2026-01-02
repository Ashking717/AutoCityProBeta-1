const db = require('../db');

db.serialize(() => {
  // Ledger Table
  db.run(`CREATE TABLE IF NOT EXISTS ledgers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    balance REAL DEFAULT 0
  )`);

  // Voucher Table
  db.run(`CREATE TABLE IF NOT EXISTS vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    debit_ledger INTEGER,
    credit_ledger INTEGER,
    amount REAL,
    narration TEXT,
    FOREIGN KEY(debit_ledger) REFERENCES ledgers(id),
    FOREIGN KEY(credit_ledger) REFERENCES ledgers(id)
  )`);

  // Stock Table
  db.run(`CREATE TABLE IF NOT EXISTS stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL,
    sku TEXT UNIQUE,
    unit TEXT,
    opening_qty REAL DEFAULT 0,
    current_qty REAL DEFAULT 0,
    rate REAL DEFAULT 0
  )`);

  // Stock Transactions Table
  db.run(`CREATE TABLE IF NOT EXISTS stock_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER,
    date TEXT,
    type TEXT,
    quantity REAL,
    rate REAL,
    FOREIGN KEY(item_id) REFERENCES stock(id)
  )`);
});

console.log('Tables initialized.');
