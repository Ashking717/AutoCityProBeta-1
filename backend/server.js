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

// ============================================
// FILE LOGGING FOR WINDOWS EXE DEBUGGING
// ============================================
let logFilePath;
try {
  // Determine log file location
  if (process.env.APPDATA) {
    // Windows
    logFilePath = path.join(process.env.APPDATA, 'AutoCityAccountingPro', 'server.log');
  } else if (process.platform === 'darwin') {
    // macOS
    logFilePath = path.join(os.homedir(), 'Library', 'Application Support', 'AutoCityAccountingPro', 'server.log');
  } else {
    // Linux
    logFilePath = path.join(os.homedir(), '.config', 'AutoCityAccountingPro', 'server.log');
  }
  
  // Ensure directory exists
  const logDir = path.dirname(logFilePath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  // Clear old log on startup
  if (fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, ''); // Clear previous log
  }
  
  // Override console.log and console.error
  const originalLog = console.log;
  const originalError = console.error;
  
  console.log = function(...args) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    
    try {
      fs.appendFileSync(logFilePath, `[LOG ${timestamp}] ${message}\n`);
    } catch (err) {
      // Silently fail if logging fails
    }
    originalLog.apply(console, args);
  };
  
  console.error = function(...args) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    
    try {
      fs.appendFileSync(logFilePath, `[ERROR ${timestamp}] ${message}\n`);
    } catch (err) {
      // Silently fail if logging fails
    }
    originalError.apply(console, args);
  };
  
  console.log('========================================');
  console.log('AUTO CITY ACCOUNTING PRO - SERVER START');
  console.log('========================================');
  console.log('📝 Log file:', logFilePath);
  console.log('🖥️  Platform:', process.platform);
  console.log('📁 Working directory:', __dirname);
} catch (err) {
  console.error('Failed to setup logging:', err);
}

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

  -- ENHANCED: Enhanced users table with role-based access
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT,
    email TEXT,
    role TEXT DEFAULT 'cashier' CHECK(role IN ('admin', 'manager', 'cashier')),
    permissions TEXT,
    is_active INTEGER DEFAULT 1,
    last_login TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
  );

  -- ENHANCED: Activity logs for audit trail
  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id INTEGER,
    details TEXT,
    ip_address TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- ENHANCED: User sessions
  CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    login_time TEXT DEFAULT CURRENT_TIMESTAMP,
    logout_time TEXT,
    last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- ENHANCED: Analytics snapshots for trend analysis
  CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_date TEXT NOT NULL,
    total_sales REAL DEFAULT 0,
    total_purchases REAL DEFAULT 0,
    profit REAL DEFAULT 0,
    transactions_count INTEGER DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    stock_value REAL DEFAULT 0,
    data_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Create indexes for better performance
  CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
  CREATE INDEX IF NOT EXISTS idx_stock_items_barcode ON stock_items(barcode);
  CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
  CREATE INDEX IF NOT EXISTS idx_sales_created_by ON sales(created_by);
`);

console.log('✅ Database tables initialized (with enhanced features)');
// Add this code to your backend/server.js
// Place it RIGHT AFTER the db.exec() that creates tables

// ============================================
// AUTO-IMPORT CAR DATA ON FIRST RUN
// ============================================

function importCarDataIfNeeded() {
  try {
    // Check if car_makes table has data
    const makeCount = db.prepare('SELECT COUNT(*) as count FROM car_makes').get();
    
    if (makeCount.count > 0) {
      console.log(`✅ Car database already populated (${makeCount.count} makes)`);
      return;
    }
    
    console.log('📥 First run detected - importing car makes and models...');
    
    // Load the JSON file - handle both dev and production paths
    let carDataPath = path.join(__dirname, 'car-makes-models.json');
    
    // In production (ASAR packaged), use app.asar.unpacked path
    if (!fs.existsSync(carDataPath)) {
      // Try the unpacked path
      const unpackedPath = __dirname.replace('app.asar', 'app.asar.unpacked');
      carDataPath = path.join(unpackedPath, 'car-makes-models.json');
    }
    
    if (!fs.existsSync(carDataPath)) {
      console.error('❌ car-makes-models.json not found!');
      console.error('   Tried paths:');
      console.error('   1.', path.join(__dirname, 'car-makes-models.json'));
      console.error('   2.', carDataPath);
      return;
    }
    
    console.log('📂 Loading car data from:', carDataPath);
    const carData = JSON.parse(fs.readFileSync(carDataPath, 'utf8'));
    
    // Import in a transaction
    const importTransaction = db.transaction(() => {
      const insertMake = db.prepare('INSERT INTO car_makes (name, country) VALUES (?, ?)');
      const getMakeId = db.prepare('SELECT id FROM car_makes WHERE name = ?');
      const insertModel = db.prepare('INSERT INTO car_models (make_id, name) VALUES (?, ?)');
      
      let makesInserted = 0;
      let modelsInserted = 0;
      
      carData.makes.forEach((make) => {
        // Insert make
        insertMake.run(make.name, make.country);
        makesInserted++;
        
        // Get make ID
        const makeId = getMakeId.get(make.name).id;
        
        // Insert models
        make.models.forEach((modelName) => {
          insertModel.run(makeId, modelName);
          modelsInserted++;
        });
      });
      
      console.log(`✅ Imported ${makesInserted} makes and ${modelsInserted} models`);
    });
    
    importTransaction();
    
  } catch (error) {
    console.error('❌ Error importing car data:', error);
  }
}

// Call this function after tables are created
importCarDataIfNeeded();

// ============================================
// ENHANCED: Utility Functions
// ============================================
const crypto = require('crypto');

// Hash password using SHA256
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate session token
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Log activity
function logActivity(userId, username, action, entityType, entityId, details) {
  try {
    const stmt = db.prepare(`
      INSERT INTO activity_logs (user_id, username, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(userId || null, username, action, entityType || null, entityId || null, details || null);
  } catch (err) {
    console.error('❌ Error logging activity:', err);
  }
}

// Check permission
function hasPermission(user, permission) {
  if (user.role === 'admin') return true;
  if (!user.permissions) return false;
  
  try {
    const permissions = JSON.parse(user.permissions);
    return permissions.includes(permission);
  } catch {
    return false;
  }
}

// Middleware to verify user session
function verifySession(req, res, next) {
  const sessionToken = req.headers['x-session-token'];
  
  if (!sessionToken) {
    return res.status(401).json({ error: 'No session token provided' });
  }
  
  try {
    const session = db.prepare(`
      SELECT us.*, u.username, u.full_name, u.role, u.permissions
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.session_token = ? AND us.logout_time IS NULL AND u.is_active = 1
    `).get(sessionToken);
    
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    // Update last activity
    db.prepare('UPDATE user_sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = ?')
      .run(session.id);
    
    req.user = session;
    next();
  } catch (err) {
    console.error('❌ Session verification error:', err);
    res.status(500).json({ error: 'Session verification failed' });
  }
}

// Initialize default admin user if none exists
function initializeDefaultAdmin() {
  try {
    console.log('🔍 Checking for admin user...');
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin');
    console.log(`📊 Found ${adminCount.count} admin users`);
    
    if (adminCount.count === 0) {
      console.log('👤 Creating default admin user...');
      const defaultPassword = hashPassword('admin123');
      console.log('🔑 Password hash:', defaultPassword);
      
      const result = db.prepare(`
        INSERT INTO users (username, password, full_name, role, permissions)
        VALUES (?, ?, ?, ?, ?)
      `).run('admin', defaultPassword, 'System Administrator', 'admin', JSON.stringify(['all']));
      
      console.log('✅ Default admin user created successfully!');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   User ID:', result.lastInsertRowid);
      console.log('⚠️  Please change the password after first login!');
      
      // Verify it was created
      const verify = db.prepare('SELECT username, role FROM users WHERE id = ?').get(result.lastInsertRowid);
      console.log('✓ Verification:', verify);
    } else {
      console.log('✅ Admin user already exists');
      // Show existing admin details
      const admin = db.prepare('SELECT id, username, role, created_at FROM users WHERE role = ?').get('admin');
      console.log('   Admin user:', admin);
    }
  } catch (err) {
    console.error('❌ Error initializing admin:', err);
    console.error('Stack:', err.stack);
  }
}

// Check for first run and ensure admin exists
function checkFirstRun() {
  try {
    const firstRunMarker = path.join(path.dirname(dbPath), '.initialized');
    console.log('🔍 Checking first run marker:', firstRunMarker);
    
    if (!fs.existsSync(firstRunMarker)) {
      console.log('🆕 FIRST RUN DETECTED - Ensuring clean admin setup...');
      
      // Delete any existing admin (in case of corrupted data)
      try {
        const deleted = db.prepare('DELETE FROM users WHERE username = ?').run('admin');
        console.log('🗑️  Deleted existing admin entries:', deleted.changes);
      } catch (err) {
        console.log('ℹ️  No existing admin to delete:', err.message);
      }
      
      // Create fresh admin
      const defaultPassword = hashPassword('admin123');
      const result = db.prepare(`
        INSERT INTO users (username, password, full_name, role, permissions, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('admin', defaultPassword, 'System Administrator', 'admin', JSON.stringify(['all']), 1);
      
      console.log('✅ Fresh admin created on first run!');
      console.log('   ID:', result.lastInsertRowid);
      console.log('   Username: admin');
      console.log('   Password: admin123');
      
      // Mark as initialized
      fs.writeFileSync(firstRunMarker, JSON.stringify({
        initialized: new Date().toISOString(),
        version: '1.0.0'
      }));
      console.log('✓ First run marker created');
    } else {
      console.log('✓ App previously initialized');
      const markerData = fs.readFileSync(firstRunMarker, 'utf8');
      console.log('   Marker data:', markerData);
    }
  } catch (err) {
    console.error('❌ Error in checkFirstRun:', err);
  }
}

// Initialize with delay to ensure tables are ready
setTimeout(() => {
  console.log('⏰ Running delayed initialization (1000ms)...');
  initializeDefaultAdmin();
  checkFirstRun();
  console.log('✅ Initialization complete');
}, 1000);

// ============================================
// ENHANCED: Authentication Endpoints
// ============================================

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`🔐 Login attempt for username: ${username}`);
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const hashedPassword = hashPassword(password);
    console.log(`🔑 Hashed password: ${hashedPassword.substring(0, 16)}...`);
    
    // First, check if user exists
    const userCheck = db.prepare('SELECT username, role FROM users WHERE username = ?').get(username);
    console.log('👤 User lookup result:', userCheck);
    
    const user = db.prepare(`
      SELECT * FROM users WHERE username = ? AND password = ? AND is_active = 1
    `).get(username, hashedPassword);
    
    if (!user) {
      console.log('❌ Login failed - invalid credentials');
      logActivity(null, username, 'LOGIN_FAILED', 'user', null, 'Invalid credentials');
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    console.log(`✅ Login successful for: ${user.username} (${user.role})`);
    
    // Create session
    const sessionToken = generateSessionToken();
    db.prepare(`
      INSERT INTO user_sessions (user_id, session_token, ip_address)
      VALUES (?, ?, ?)
    `).run(user.id, sessionToken, req.ip);
    
    // Update last login
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
    
    logActivity(user.id, user.username, 'LOGIN_SUCCESS', 'user', user.id, 'User logged in');
    
    res.json({
      success: true,
      sessionToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        permissions: user.permissions ? JSON.parse(user.permissions) : []
      }
    });
    
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Logout
app.post('/api/auth/logout', verifySession, (req, res) => {
  try {
    const sessionToken = req.headers['x-session-token'];
    
    db.prepare('UPDATE user_sessions SET logout_time = CURRENT_TIMESTAMP WHERE session_token = ?')
      .run(sessionToken);
    
    logActivity(req.user.user_id, req.user.username, 'LOGOUT', 'user', req.user.user_id, 'User logged out');
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('❌ Logout error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get current user
app.get('/api/auth/me', verifySession, (req, res) => {
  res.json({
    id: req.user.user_id,
    username: req.user.username,
    fullName: req.user.full_name,
    role: req.user.role,
    permissions: req.user.permissions ? JSON.parse(req.user.permissions) : []
  });
});

// Change password
app.post('/api/auth/change-password', verifySession, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old and new passwords required' });
    }
    
    const hashedOldPassword = hashPassword(oldPassword);
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND password = ?')
      .get(req.user.user_id, hashedOldPassword);
    
    if (!user) {
      return res.status(401).json({ error: 'Old password is incorrect' });
    }
    
    const hashedNewPassword = hashPassword(newPassword);
    db.prepare('UPDATE users SET password = ? WHERE id = ?')
      .run(hashedNewPassword, req.user.user_id);
    
    logActivity(req.user.user_id, req.user.username, 'PASSWORD_CHANGED', 'user', req.user.user_id, 'Password changed');
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('❌ Change password error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ENHANCED: User Management Endpoints
// ============================================

// Get all users
app.get('/api/users', verifySession, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const users = db.prepare(`
      SELECT id, username, full_name, email, role, is_active, last_login, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();
    
    res.json(users);
  } catch (err) {
    console.error('❌ Get users error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create user
app.post('/api/users', verifySession, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const { username, password, fullName, email, role, permissions } = req.body;
    
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role are required' });
    }
    
    const hashedPassword = hashPassword(password);
    const permissionsJson = JSON.stringify(permissions || []);
    
    const result = db.prepare(`
      INSERT INTO users (username, password, full_name, email, role, permissions, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(username, hashedPassword, fullName, email, role, permissionsJson, req.user.username);
    
    logActivity(req.user.user_id, req.user.username, 'USER_CREATED', 'user', result.lastInsertRowid, 
      `Created user: ${username} with role: ${role}`);
    
    res.json({ success: true, userId: result.lastInsertRowid });
  } catch (err) {
    console.error('❌ Create user error:', err);
    if (err.message.includes('UNIQUE')) {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Update user
app.put('/api/users/:id', verifySession, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const { id } = req.params;
    const { fullName, email, role, permissions, isActive } = req.body;
    
    const permissionsJson = JSON.stringify(permissions || []);
    
    db.prepare(`
      UPDATE users
      SET full_name = ?, email = ?, role = ?, permissions = ?, is_active = ?
      WHERE id = ?
    `).run(fullName, email, role, permissionsJson, isActive ? 1 : 0, id);
    
    logActivity(req.user.user_id, req.user.username, 'USER_UPDATED', 'user', id, 
      `Updated user ID: ${id}`);
    
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Update user error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reset user password
app.post('/api/users/:id/reset-password', verifySession, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ error: 'New password required' });
    }
    
    const hashedPassword = hashPassword(newPassword);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, id);
    
    logActivity(req.user.user_id, req.user.username, 'PASSWORD_RESET', 'user', id, 
      `Reset password for user ID: ${id}`);
    
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('❌ Reset password error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ENHANCED: Activity Logs Endpoints
// ============================================

// Get activity logs
app.get('/api/activity-logs', verifySession, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Manager or Admin access required' });
  }
  
  try {
    const { userId, action, startDate, endDate, limit = 100 } = req.query;
    
    let query = 'SELECT * FROM activity_logs WHERE 1=1';
    const params = [];
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    
    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }
    
    if (startDate) {
      query += ' AND timestamp >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND timestamp <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const logs = db.prepare(query).all(...params);
    
    res.json(logs);
  } catch (err) {
    console.error('❌ Get activity logs error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get activity summary
app.get('/api/activity-logs/summary', verifySession, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Manager or Admin access required' });
  }
  
  try {
    const summary = {
      todayActions: db.prepare(`
        SELECT COUNT(*) as count FROM activity_logs 
        WHERE date(timestamp) = date('now')
      `).get().count,
      
      weekActions: db.prepare(`
        SELECT COUNT(*) as count FROM activity_logs 
        WHERE timestamp >= datetime('now', '-7 days')
      `).get().count,
      
      activeUsers: db.prepare(`
        SELECT COUNT(DISTINCT user_id) as count FROM activity_logs 
        WHERE timestamp >= datetime('now', '-7 days') AND user_id IS NOT NULL
      `).get().count,
      
      topActions: db.prepare(`
        SELECT action, COUNT(*) as count FROM activity_logs 
        WHERE timestamp >= datetime('now', '-7 days')
        GROUP BY action
        ORDER BY count DESC
        LIMIT 5
      `).all()
    };
    
    res.json(summary);
  } catch (err) {
    console.error('❌ Get activity summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ENHANCED: Analytics Endpoints
// ============================================

// Get profit trends
app.get('/api/analytics/profit-trends', verifySession, (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    
    let dateGroup;
    switch (period) {
      case 'day':
        dateGroup = "strftime('%Y-%m-%d', date)";
        break;
      case 'week':
        dateGroup = "strftime('%Y-W%W', date)";
        break;
      case 'month':
        dateGroup = "strftime('%Y-%m', date)";
        break;
      case 'year':
        dateGroup = "strftime('%Y', date)";
        break;
      default:
        dateGroup = "strftime('%Y-%m', date)";
    }
    
    let whereClause = '1=1';
    const params = [];
    
    if (startDate) {
      whereClause += ' AND date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      whereClause += ' AND date <= ?';
      params.push(endDate);
    }
    
    const profitTrends = db.prepare(`
      SELECT 
        ${dateGroup} as period,
        COALESCE(SUM(CASE WHEN total > 0 THEN total ELSE 0 END), 0) as total_sales,
        COALESCE(SUM(CASE WHEN total < 0 THEN ABS(total) ELSE 0 END), 0) as total_purchases,
        COUNT(*) as transaction_count
      FROM sales
      WHERE ${whereClause}
      GROUP BY ${dateGroup}
      ORDER BY period ASC
    `).all(...params);
    
    // Calculate profit
    const result = profitTrends.map(row => ({
      ...row,
      profit: row.total_sales - row.total_purchases
    }));
    
    res.json(result);
  } catch (err) {
    console.error('❌ Get profit trends error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get sales forecasting data
app.get('/api/analytics/sales-forecast', verifySession, (req, res) => {
  try {
    const historicalData = db.prepare(`
      SELECT 
        strftime('%Y-%m', date) as month,
        SUM(total) as total_sales,
        COUNT(*) as transaction_count,
        AVG(total) as avg_transaction
      FROM sales
      WHERE date >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month ASC
    `).all();
    
    // Simple moving average for forecast
    const forecastMonths = 3;
    const lastMonthsSales = historicalData.slice(-3).map(d => d.total_sales);
    const avgSales = lastMonthsSales.reduce((a, b) => a + b, 0) / lastMonthsSales.length;
    
    const forecast = [];
    for (let i = 1; i <= forecastMonths; i++) {
      const forecastDate = new Date();
      forecastDate.setMonth(forecastDate.getMonth() + i);
      forecast.push({
        month: forecastDate.toISOString().slice(0, 7),
        predicted_sales: Math.round(avgSales * 100) / 100,
        confidence: 'medium'
      });
    }
    
    res.json({
      historical: historicalData,
      forecast: forecast
    });
  } catch (err) {
    console.error('❌ Get sales forecast error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get customer analytics
app.get('/api/analytics/customers', verifySession, (req, res) => {
  try {
    const analytics = {
      totalCustomers: db.prepare('SELECT COUNT(*) as count FROM customers WHERE is_active = 1').get().count,
      
      newCustomersThisMonth: db.prepare(`
        SELECT COUNT(*) as count FROM customers 
        WHERE created_at >= date('now', 'start of month') AND is_active = 1
      `).get().count,
      
      topCustomers: db.prepare(`
        SELECT 
          c.name,
          c.phone,
          COUNT(s.id) as purchase_count,
          SUM(s.total) as total_spent,
          MAX(s.date) as last_purchase
        FROM customers c
        LEFT JOIN sales s ON c.name = s.customer
        WHERE c.is_active = 1
        GROUP BY c.id
        ORDER BY total_spent DESC
        LIMIT 10
      `).all(),
      
      customersByMonth: db.prepare(`
        SELECT 
          strftime('%Y-%m', created_at) as month,
          COUNT(*) as new_customers
        FROM customers
        WHERE created_at >= date('now', '-12 months')
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month ASC
      `).all()
    };
    
    res.json(analytics);
  } catch (err) {
    console.error('❌ Get customer analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ENHANCED: Barcode Scanner Endpoints
// ============================================

// Search item by barcode
app.get('/api/stock/barcode/:barcode', verifySession, (req, res) => {
  try {
    const { barcode } = req.params;
    
    const item = db.prepare(`
      SELECT * FROM stock_items 
      WHERE barcode = ? AND is_active = 1
    `).get(barcode);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    logActivity(req.user.user_id, req.user.username, 'BARCODE_SCAN', 'stock_item', item.id, 
      `Scanned barcode: ${barcode}`);
    
    res.json(item);
  } catch (err) {
    console.error('❌ Barcode lookup error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Generate barcode for item
app.post('/api/stock/:id/generate-barcode', verifySession, (req, res) => {
  try {
    const { id } = req.params;
    
    // Generate a simple barcode
    const barcode = '200' + String(id).padStart(9, '0') + Math.floor(Math.random() * 10);
    
    db.prepare('UPDATE stock_items SET barcode = ? WHERE id = ?').run(barcode, id);
    
    logActivity(req.user.user_id, req.user.username, 'BARCODE_GENERATED', 'stock_item', id, 
      `Generated barcode: ${barcode}`);
    
    res.json({ success: true, barcode });
  } catch (err) {
    console.error('❌ Generate barcode error:', err);
    res.status(500).json({ error: err.message });
  }
});

console.log('✅ Enhanced features endpoints registered');

// Helper function for generating unique numbers
function generateUniqueNo(prefix) {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

// =============== DASHBOARD STATS ===============
app.get('/api/dashboard/stats', (req, res) => {
  try {
    const allItems = db.prepare('SELECT * FROM stock_items').all();
    console.log('📊 Total stock items in DB:', allItems.length);
    console.log('📊 Active stock items:', allItems.filter(item => item.is_active === 1).length);
    
    const ledgerCount = db.prepare('SELECT COUNT(*) as count FROM ledgers WHERE is_active = 1').get();
    const stockCount = db.prepare('SELECT COUNT(*) as count FROM stock_items WHERE is_active = 1').get();
    const lowStockCount = db.prepare('SELECT COUNT(*) as count FROM stock_items WHERE current_qty <= min_qty AND is_active = 1').get();
    const salesTotal = db.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE date >= date('now', '-30 days')`).get();
    const stockValue = db.prepare('SELECT COALESCE(SUM(current_qty * sale_rate), 0) as value FROM stock_items WHERE is_active = 1').get();
    
    const stats = {
      total_ledgers: ledgerCount.count || 0,
      total_stock_items: stockCount.count || 0,
      low_stock_count: lowStockCount.count || 0,
      sales_last_30_days: salesTotal.total || 0,
      total_stock_value: stockValue.value || 0
    };
    
    console.log('✅ Sending stats:', stats);
    res.json(stats);
  } catch (err) {
    console.error('❌ Dashboard stats error:', err);
    res.status(500).json({ error: err.message, details: 'Check server logs' });
  }
});

// =============== LEDGERS ===============
app.get('/api/ledgers', (req, res) => {
  const { type, search, active } = req.query;
  let query = 'SELECT * FROM ledgers WHERE 1=1';
  const params = [];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }
  if (search) {
    query += ' AND name LIKE ?';
    params.push(`%${search}%`);
  }
  if (active !== undefined) {
    query += ' AND is_active = ?';
    params.push(active === 'true' ? 1 : 0);
  }

  query += ' ORDER BY name ASC';

  try {
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ledgers', (req, res) => {
  const { name, type, opening_balance, parent_group } = req.body;
  
  try {
    const stmt = db.prepare(
      `INSERT INTO ledgers (name, type, balance, opening_balance, parent_group) 
       VALUES (?, ?, ?, ?, ?)`
    );
    const info = stmt.run(name, type, opening_balance || 0, opening_balance || 0, parent_group || null);
    res.json({ id: info.lastInsertRowid, message: 'Ledger created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/ledgers/:id', (req, res) => {
  const { name, type, parent_group, is_active } = req.body;
  
  try {
    const stmt = db.prepare(
      `UPDATE ledgers SET name = ?, type = ?, parent_group = ?, is_active = ?, 
       updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    );
    stmt.run(name, type, parent_group, is_active, req.params.id);
    res.json({ message: 'Ledger updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ledgers/:id', (req, res) => {
  try {
    db.prepare('UPDATE ledgers SET is_active = 0 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Ledger deactivated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============== VOUCHERS ===============
app.get('/api/vouchers', (req, res) => {
  const { start_date, end_date, type, ledger } = req.query;
  let query = 'SELECT * FROM vouchers WHERE 1=1';
  const params = [];

  if (start_date && end_date) {
    query += ' AND date BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }
  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }
  if (ledger) {
    query += ' AND (debit_ledger = ? OR credit_ledger = ?)';
    params.push(ledger, ledger);
  }

  query += ' ORDER BY date DESC, id DESC';

  try {
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vouchers', (req, res) => {
  const { date, type, debit_ledger, credit_ledger, amount, narration, reference_no } = req.body;
  const voucher_no = generateUniqueNo('VCH');

  try {
    const insertVoucher = db.transaction(() => {
      const voucherStmt = db.prepare(
        `INSERT INTO vouchers (voucher_no, date, type, debit_ledger, credit_ledger, amount, narration, reference_no) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const info = voucherStmt.run(voucher_no, date, type, debit_ledger, credit_ledger, amount, narration, reference_no);

      db.prepare('UPDATE ledgers SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?')
        .run(amount, debit_ledger);
      db.prepare('UPDATE ledgers SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?')
        .run(amount, credit_ledger);

      return { id: info.lastInsertRowid, voucher_no };
    });

    const result = insertVoucher();
    res.json({ ...result, message: 'Voucher posted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============== STOCK ===============
app.get('/api/stock', (req, res) => {
  const { category, search, low_stock } = req.query;
  let query = 'SELECT * FROM stock_items WHERE is_active = 1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    query += ' AND (item_name LIKE ? OR sku LIKE ? OR barcode LIKE ? OR oem_part_no LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }
  if (low_stock === 'true') {
    query += ' AND current_qty <= min_qty';
  }

  query += ' ORDER BY item_name ASC';

  try {
    const rows = db.prepare(query).all(...params);
    console.log(`📦 Stock query returned ${rows.length} items`);
    res.json(rows);
  } catch (err) {
    console.error('❌ Stock query error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stock/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM stock_items WHERE id = ? AND is_active = 1').get(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Stock item not found' });
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stock/:id/full', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM stock_items WHERE id = ? AND is_active = 1').get(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Stock item not found' });
    }
    
    // Get compatibility info using car_makes and car_models
    const compatibility = db.prepare(`
      SELECT ivc.*, cm.name as make_name, cmo.name as model_name
      FROM item_vehicle_compatibility ivc
      JOIN car_makes cm ON ivc.make_id = cm.id
      LEFT JOIN car_models cmo ON ivc.model_id = cmo.id
      WHERE ivc.item_id = ?
    `).all(req.params.id);
    
    item.compatibility = compatibility;
    res.json(item);
  } catch (err) {
    console.error('Stock fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stock', (req, res) => {
  const {
    item_name, sku, barcode, oem_part_no, category, unit,
    opening_qty, min_qty, max_qty, reorder_level,
    purchase_rate, sale_rate, mrp, tax_rate,
    location, supplier
  } = req.body;

  try {
    const stmt = db.prepare(
      `INSERT INTO stock_items 
       (item_name, sku, barcode, oem_part_no, category, unit, opening_qty, current_qty, min_qty, max_qty, reorder_level,
        purchase_rate, sale_rate, mrp, tax_rate, location, supplier, average_cost)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const info = stmt.run(
      item_name, sku, barcode, oem_part_no, category, unit || 'PCS',
      opening_qty || 0, opening_qty || 0, min_qty || 5, max_qty || 1000, reorder_level || 10,
      purchase_rate || 0, sale_rate || 0, mrp || 0, tax_rate || 0,
      location, supplier, purchase_rate || 0
    );
    console.log(`✅ Stock item created with ID: ${info.lastInsertRowid}`);
    res.json({ id: info.lastInsertRowid, message: 'Stock item added successfully' });
  } catch (err) {
    console.error('❌ Stock creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/stock/:id', (req, res) => {
  const {
    item_name, sku, barcode, oem_part_no, category, unit, min_qty, max_qty, reorder_level,
    purchase_rate, sale_rate, mrp, tax_rate, location, supplier
  } = req.body;

  try {
    const stmt = db.prepare(
      `UPDATE stock_items SET 
       item_name = ?, sku = ?, barcode = ?, oem_part_no = ?, category = ?, unit = ?, 
       min_qty = ?, max_qty = ?, reorder_level = ?,
       purchase_rate = ?, sale_rate = ?, mrp = ?, tax_rate = ?, location = ?, supplier = ?,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    );
    stmt.run(
      item_name, sku, barcode, oem_part_no, category, unit, min_qty, max_qty, reorder_level,
      purchase_rate, sale_rate, mrp, tax_rate, location, supplier, req.params.id
    );
    res.json({ message: 'Stock item updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/stock/:id/full', (req, res) => {
  const {
    item_name, sku, barcode, oem_part_no, category, unit,
    min_qty, max_qty, reorder_level,
    purchase_rate, sale_rate, mrp, tax_rate,
    location, supplier
  } = req.body;
  
  try {
    const stmt = db.prepare(`
      UPDATE stock_items SET 
        item_name = ?, sku = ?, barcode = ?, oem_part_no = ?, 
        category = ?, unit = ?, min_qty = ?, max_qty = ?, reorder_level = ?,
        purchase_rate = ?, sale_rate = ?, mrp = ?, tax_rate = ?,
        location = ?, supplier = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run(
      item_name, sku, barcode, oem_part_no,
      category, unit, min_qty, max_qty, reorder_level,
      purchase_rate, sale_rate, mrp, tax_rate,
      location, supplier, req.params.id
    );
    
    res.json({ message: 'Stock item updated successfully' });
  } catch (err) {
    console.error('Stock update error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/stock/:id', (req, res) => {
  try {
    console.log('🗑️  Deleting stock item:', req.params.id);
    
    const deleteStock = db.transaction(() => {
      db.prepare('DELETE FROM item_vehicle_compatibility WHERE item_id = ?').run(req.params.id);
      db.prepare('UPDATE stock_items SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
    });
    
    deleteStock();
    res.json({ message: 'Stock item deleted successfully' });
  } catch (err) {
    console.error('❌ Delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============== PURCHASES ===============
app.get('/api/purchases', (req, res) => {
  const { start_date, end_date, supplier } = req.query;
  let query = 'SELECT * FROM purchases WHERE 1=1';
  const params = [];

  if (start_date && end_date) {
    query += ' AND date BETWEEN ? AND ?';
    params.push(start_date, end_date);
  }
  if (supplier) {
    query += ' AND supplier LIKE ?';
    params.push(`%${supplier}%`);
  }

  query += ' ORDER BY date DESC, id DESC';

  try {
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/purchases', (req, res) => {
  const { supplier, date, items, discount_amount, shipping_cost, notes } = req.body;
  const purchase_no = generateUniqueNo('PUR');

  let subtotal = 0;
  let tax_amount = 0;

  items.forEach((item) => {
    const itemTotal = item.purchase_rate * item.quantity;
    const itemTax = (itemTotal * (item.tax_rate || 0)) / 100;
    subtotal += itemTotal;
    tax_amount += itemTax;
  });

  const total = subtotal + tax_amount - (discount_amount || 0) + (shipping_cost || 0);

  try {
    const insertPurchase = db.transaction(() => {
      const purchaseStmt = db.prepare(
        `INSERT INTO purchases (purchase_no, supplier, date, subtotal, tax_amount, 
         discount_amount, shipping_cost, total, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      
      const purchaseInfo = purchaseStmt.run(
        purchase_no, supplier, date, subtotal, tax_amount,
        discount_amount || 0, shipping_cost || 0, total, notes || null
      );
      
      const purchase_id = purchaseInfo.lastInsertRowid;

      const purchaseItemStmt = db.prepare(
        `INSERT INTO purchase_items (purchase_id, item_id, quantity, purchase_rate, tax_rate, total) 
         VALUES (?, ?, ?, ?, ?, ?)`
      );

      items.forEach((item) => {
        const itemTotal = item.purchase_rate * item.quantity * (1 + (item.tax_rate || 0) / 100);
        purchaseItemStmt.run(purchase_id, item.id, item.quantity, item.purchase_rate, item.tax_rate || 0, itemTotal);
        
        db.prepare('UPDATE stock_items SET current_qty = current_qty + ?, last_purchase_date = ?, last_purchase_price = ? WHERE id = ?')
          .run(item.quantity, date, item.purchase_rate, item.id);
      });

      return { purchase_id, purchase_no, subtotal, tax_amount, discount_amount, shipping_cost, total };
    });

    const result = insertPurchase();
    res.json({ ...result, message: 'Purchase completed successfully' });
  } catch (err) {
    console.error('❌ Purchase error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/purchase-history/:item_id', (req, res) => {
  try {
    const query = `
      SELECT 
        p.purchase_no, p.date, p.supplier,
        pi.quantity, pi.purchase_rate, pi.tax_rate, pi.discount, pi.total
      FROM purchase_items pi
      JOIN purchases p ON pi.purchase_id = p.id
      WHERE pi.item_id = ?
      ORDER BY p.date DESC, p.id DESC
    `;
    
    const rows = db.prepare(query).all(req.params.item_id);
    res.json(rows);
  } catch (err) {
    console.error('Purchase history error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============== SALES ===============
app.post('/api/sales', (req, res) => {
  const { customer, customer_phone, date, items, payment_method, discount_amount, notes } = req.body;
  const invoice_no = generateUniqueNo('INV');

  let subtotal = 0;
  let tax_amount = 0;

  items.forEach((item) => {
    const itemTotal = item.rate * item.quantity;
    const itemTax = (itemTotal * (item.tax_rate || 0)) / 100;
    subtotal += itemTotal;
    tax_amount += itemTax;
  });

  const total = subtotal + tax_amount - (discount_amount || 0);

  try {
    const insertSale = db.transaction(() => {
      const saleStmt = db.prepare(
        `INSERT INTO sales (invoice_no, customer, customer_phone, date, subtotal, tax_amount, 
         discount_amount, total, payment_method, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const saleInfo = saleStmt.run(
        invoice_no, customer, customer_phone, date, subtotal, tax_amount, 
        discount_amount, total, payment_method, notes
      );
      const sale_id = saleInfo.lastInsertRowid;

      const saleItemStmt = db.prepare(
        `INSERT INTO sale_items (sale_id, item_id, quantity, rate, tax_rate, total) 
         VALUES (?, ?, ?, ?, ?, ?)`
      );

      items.forEach((item) => {
        const itemTotal = item.rate * item.quantity * (1 + (item.tax_rate || 0) / 100);
        
        // For services and labour (negative IDs), save to virtual_items for tracking
        if (item.id && item.id < 0) {
          const existingVirtual = db.prepare('SELECT id FROM virtual_items WHERE id = ?').get(item.id);
          if (!existingVirtual) {
            db.prepare('INSERT OR IGNORE INTO virtual_items (id, item_name, item_type) VALUES (?, ?, ?)')
              .run(item.id, item.name, item.type || 'service');
          }
        }
        
        saleItemStmt.run(
          sale_id, 
          item.id,  // Uses positive ID for stock, negative ID for services/labour
          item.quantity, 
          item.rate, 
          item.tax_rate || 0, 
          itemTotal
        );
        
        // Only update stock for positive IDs (actual stock items)
        // Negative IDs are services/labour and don't affect inventory
        if (item.id && item.id > 0) {
          db.prepare('UPDATE stock_items SET current_qty = current_qty - ? WHERE id = ?').run(item.quantity, item.id);
        }
      });

      return { sale_id, invoice_no, subtotal, tax_amount, discount_amount, total };
    });

    const result = insertSale();
    res.json({ ...result, message: 'Sale completed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============== CAR MAKES & MODELS ===============
app.get('/api/car-makes', (req, res) => {
  try {
    const makes = db.prepare(`
      SELECT id, name, country 
      FROM car_makes 
      ORDER BY name ASC
    `).all();
    
    res.json(makes);
  } catch (error) {
    console.error('Error fetching car makes:', error);
    res.status(500).json({ error: 'Failed to fetch car makes' });
  }
});

app.get('/api/car-makes/:makeId/models', (req, res) => {
  try {
    const { makeId } = req.params;
    
    const models = db.prepare(`
      SELECT id, name 
      FROM car_models 
      WHERE make_id = ? 
      ORDER BY name ASC
    `).all(makeId);
    
    res.json(models);
  } catch (error) {
    console.error('Error fetching car models:', error);
    res.status(500).json({ error: 'Failed to fetch car models' });
  }
});

app.get('/api/car-makes-with-models', (req, res) => {
  try {
    const makes = db.prepare(`
      SELECT id, name, country 
      FROM car_makes 
      ORDER BY name ASC
    `).all();
    
    const makesWithModels = makes.map(make => {
      const models = db.prepare(`
        SELECT id, name 
        FROM car_models 
        WHERE make_id = ? 
        ORDER BY name ASC
      `).all(make.id);
      
      return { ...make, models };
    });
    
    res.json(makesWithModels);
  } catch (error) {
    console.error('Error fetching car data:', error);
    res.status(500).json({ error: 'Failed to fetch car data' });
  }
});

app.get('/api/car-search', (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.json([]);
    }
    
    const searchTerm = `%${query}%`;
    
    const results = db.prepare(`
      SELECT 
        cm.id as make_id,
        cm.name as make_name,
        cmo.id as model_id,
        cmo.name as model_name,
        cm.country
      FROM car_makes cm
      LEFT JOIN car_models cmo ON cm.id = cmo.make_id
      WHERE cm.name LIKE ? OR cmo.name LIKE ?
      ORDER BY cm.name, cmo.name
      LIMIT 50
    `).all(searchTerm, searchTerm);
    
    res.json(results);
  } catch (error) {
    console.error('Error searching cars:', error);
    res.status(500).json({ error: 'Failed to search cars' });
  }
});

// =============== VEHICLE MAKES (uses car_makes) ===============
app.get('/api/vehicle-makes', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM car_makes ORDER BY name').all();
    res.json(rows);
  } catch (err) {
    console.error('Error fetching car makes:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vehicle-makes', (req, res) => {
  const { name, country } = req.body;
  
  try {
    const stmt = db.prepare('INSERT INTO car_makes (name, country) VALUES (?, ?)');
    const info = stmt.run(name, country || 'Middle East');
    res.json({ id: info.lastInsertRowid, message: 'Car make added successfully' });
  } catch (err) {
    console.error('Error adding car make:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============== VEHICLE MODELS (uses car_models) ===============
app.get('/api/vehicle-models', (req, res) => {
  const { make_id } = req.query;
  
  try {
    let query = `
      SELECT cm.*, mk.name as make_name 
      FROM car_models cm
      JOIN car_makes mk ON cm.make_id = mk.id
    `;
    
    if (make_id) {
      query += ' WHERE cm.make_id = ?';
      const rows = db.prepare(query + ' ORDER BY cm.name').all(make_id);
      res.json(rows);
    } else {
      const rows = db.prepare(query + ' ORDER BY mk.name, cm.name').all();
      res.json(rows);
    }
  } catch (err) {
    console.error('Error fetching car models:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vehicle-models', (req, res) => {
  const { make_id, name, year_start, year_end } = req.body;
  
  try {
    const stmt = db.prepare('INSERT INTO car_models (make_id, name) VALUES (?, ?)');
    const info = stmt.run(make_id, name);
    res.json({ id: info.lastInsertRowid, message: 'Car model added successfully' });
  } catch (err) {
    console.error('Error adding car model:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============== ITEM VEHICLE COMPATIBILITY ===============
app.get('/api/item-compatibility/:item_id', (req, res) => {
  try {
    const query = `
      SELECT ivc.*, 
             cm.name as make_name,
             cmo.name as model_name
      FROM item_vehicle_compatibility ivc
      JOIN car_makes cm ON ivc.make_id = cm.id
      LEFT JOIN car_models cmo ON ivc.model_id = cmo.id
      WHERE ivc.item_id = ?
      ORDER BY cm.name, cmo.name
    `;
    const rows = db.prepare(query).all(req.params.item_id);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching compatibility:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/item-compatibility', (req, res) => {
  const { item_id, make_id, model_id, year_from, year_to, notes } = req.body;
  
  try {
    const stmt = db.prepare(
      `INSERT INTO item_vehicle_compatibility 
       (item_id, make_id, model_id, year_from, year_to, notes) 
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const info = stmt.run(item_id, make_id, model_id || null, year_from || null, year_to || null, notes || null);
    res.json({ id: info.lastInsertRowid, message: 'Compatibility added successfully' });
  } catch (err) {
    console.error('Error adding compatibility:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/item-compatibility/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM item_vehicle_compatibility WHERE id = ?').run(req.params.id);
    res.json({ message: 'Compatibility removed successfully' });
  } catch (err) {
    console.error('Error deleting compatibility:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============== COMPREHENSIVE REPORTS ===============

// 1. PROFIT & LOSS REPORT
app.get('/api/reports/profit-loss', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get all income ledgers
    const income = db.prepare(`
      SELECT 
        l.name,
        l.type,
        COALESCE(SUM(CASE WHEN v.credit_ledger = l.name THEN v.amount ELSE 0 END), 0) as total
      FROM ledgers l
      LEFT JOIN vouchers v ON (v.credit_ledger = l.name OR v.debit_ledger = l.name)
        AND v.date BETWEEN ? AND ?
      WHERE l.type = 'Income' AND l.is_active = 1
      GROUP BY l.id, l.name, l.type
    `).all(startDate || '1900-01-01', endDate || '2999-12-31');
    
    // Get all expense ledgers
    const expenses = db.prepare(`
      SELECT 
        l.name,
        l.type,
        COALESCE(SUM(CASE WHEN v.debit_ledger = l.name THEN v.amount ELSE 0 END), 0) as total
      FROM ledgers l
      LEFT JOIN vouchers v ON (v.credit_ledger = l.name OR v.debit_ledger = l.name)
        AND v.date BETWEEN ? AND ?
      WHERE l.type = 'Expense' AND l.is_active = 1
      GROUP BY l.id, l.name, l.type
    `).all(startDate || '1900-01-01', endDate || '2999-12-31');
    
    const totalIncome = income.reduce((sum, item) => sum + item.total, 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + item.total, 0);
    const netProfit = totalIncome - totalExpenses;
    
    res.json({
      income,
      expenses,
      totalIncome,
      totalExpenses,
      netProfit,
      profitPercentage: totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(2) : 0
    });
  } catch (err) {
    console.error('Error generating P&L:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. BALANCE SHEET REPORT
app.get('/api/reports/balance-sheet', (req, res) => {
  try {
    // Assets
    const assets = db.prepare(`
      SELECT name, balance as total
      FROM ledgers 
      WHERE type = 'Asset' AND is_active = 1
      ORDER BY name
    `).all();
    
    // Liabilities
    const liabilities = db.prepare(`
      SELECT name, balance as total
      FROM ledgers 
      WHERE type = 'Liability' AND is_active = 1
      ORDER BY name
    `).all();
    
    const totalAssets = assets.reduce((sum, item) => sum + item.total, 0);
    const totalLiabilities = liabilities.reduce((sum, item) => sum + item.total, 0);
    
    res.json({
      assets,
      liabilities,
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities
    });
  } catch (err) {
    console.error('Error generating Balance Sheet:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. SALES REPORT
app.get('/api/reports/sales', (req, res) => {
  try {
    const { startDate, endDate, groupBy } = req.query;
    
    let dateFormat;
    switch(groupBy) {
      case 'day':
        dateFormat = 'date';
        break;
      case 'month':
        dateFormat = "strftime('%Y-%m', date)";
        break;
      case 'year':
        dateFormat = "strftime('%Y', date)";
        break;
      default:
        dateFormat = 'date';
    }
    
    const salesData = db.prepare(`
      SELECT 
        ${dateFormat} as period,
        COUNT(*) as transaction_count,
        SUM(total) as total_sales,
        SUM(subtotal) as subtotal,
        SUM(tax_amount) as total_tax,
        SUM(discount_amount) as total_discount,
        AVG(total) as average_sale
      FROM sales
      WHERE date BETWEEN ? AND ?
      GROUP BY period
      ORDER BY period DESC
    `).all(startDate || '1900-01-01', endDate || '2999-12-31');
    
    // Top selling items (including services/labour with negative IDs)
    const topItems = db.prepare(`
      SELECT 
        COALESCE(s.item_name, v.item_name, 'Unknown Item') as item_name,
        CASE
          WHEN si.item_id > 0 THEN 'Stock Item'
          WHEN v.item_type = 'labour' THEN 'Labour'
          WHEN v.item_type = 'service' THEN 'Service'
          ELSE 'Other'
        END as item_type,
        SUM(si.quantity) as total_quantity,
        SUM(si.total) as total_revenue,
        COUNT(DISTINCT si.sale_id) as times_sold
      FROM sale_items si
      LEFT JOIN stock_items s ON s.id = si.item_id AND si.item_id > 0
      LEFT JOIN virtual_items v ON v.id = si.item_id AND si.item_id < 0
      JOIN sales sal ON sal.id = si.sale_id
      WHERE sal.date BETWEEN ? AND ?
      GROUP BY si.item_id
      ORDER BY total_revenue DESC
      LIMIT 10
    `).all(startDate || '1900-01-01', endDate || '2999-12-31');
    
    // Top customers
    const topCustomers = db.prepare(`
      SELECT 
        customer,
        COUNT(*) as purchase_count,
        SUM(total) as total_spent,
        AVG(total) as average_purchase
      FROM sales
      WHERE date BETWEEN ? AND ?
      GROUP BY customer
      ORDER BY total_spent DESC
      LIMIT 10
    `).all(startDate || '1900-01-01', endDate || '2999-12-31');
    
    const totals = salesData.reduce((acc, row) => ({
      totalSales: acc.totalSales + row.total_sales,
      totalTransactions: acc.totalTransactions + row.transaction_count,
      totalTax: acc.totalTax + row.total_tax,
      totalDiscount: acc.totalDiscount + row.total_discount
    }), { totalSales: 0, totalTransactions: 0, totalTax: 0, totalDiscount: 0 });
    
    res.json({
      salesData,
      topItems,
      topCustomers,
      totals
    });
  } catch (err) {
    console.error('Error generating sales report:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. PURCHASE REPORT
app.get('/api/reports/purchases', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const purchaseData = db.prepare(`
      SELECT 
        date(date) as purchase_date,
        COUNT(*) as transaction_count,
        SUM(total) as total_purchases,
        SUM(subtotal) as subtotal,
        SUM(tax_amount) as total_tax,
        AVG(total) as average_purchase
      FROM purchases
      WHERE date BETWEEN ? AND ?
      GROUP BY purchase_date
      ORDER BY purchase_date DESC
    `).all(startDate || '1900-01-01', endDate || '2999-12-31');
    
    // Top purchased items
    const topItems = db.prepare(`
      SELECT 
        s.item_name,
        SUM(pi.quantity) as total_quantity,
        SUM(pi.total) as total_cost,
        COUNT(DISTINCT pi.purchase_id) as times_purchased
      FROM purchase_items pi
      JOIN stock_items s ON s.id = pi.item_id
      JOIN purchases p ON p.id = pi.purchase_id
      WHERE p.date BETWEEN ? AND ?
      GROUP BY pi.item_id
      ORDER BY total_cost DESC
      LIMIT 10
    `).all(startDate || '1900-01-01', endDate || '2999-12-31');
    
    // Top suppliers
    const topSuppliers = db.prepare(`
      SELECT 
        supplier,
        COUNT(*) as purchase_count,
        SUM(total) as total_purchased,
        AVG(total) as average_purchase
      FROM purchases
      WHERE date BETWEEN ? AND ?
      GROUP BY supplier
      ORDER BY total_purchased DESC
      LIMIT 10
    `).all(startDate || '1900-01-01', endDate || '2999-12-31');
    
    res.json({
      purchaseData,
      topItems,
      topSuppliers
    });
  } catch (err) {
    console.error('Error generating purchase report:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. STOCK REPORT
app.get('/api/reports/stock', (req, res) => {
  try {
    const { lowStock } = req.query;
    
    let query = `
      SELECT 
        id,
        item_name,
        sku,
        category,
        current_qty,
        min_qty,
        reorder_level,
        purchase_rate,
        sale_rate,
        (current_qty * purchase_rate) as stock_value,
        CASE 
          WHEN current_qty <= min_qty THEN 'Critical'
          WHEN current_qty <= reorder_level THEN 'Low'
          ELSE 'Adequate'
        END as stock_status
      FROM stock_items
      WHERE is_active = 1
    `;
    
    if (lowStock === 'true') {
      query += ' AND current_qty <= reorder_level';
    }
    
    query += ' ORDER BY stock_status DESC, current_qty ASC';
    
    const stockItems = db.prepare(query).all();
    
    const summary = {
      totalItems: stockItems.length,
      totalStockValue: stockItems.reduce((sum, item) => sum + item.stock_value, 0),
      criticalItems: stockItems.filter(item => item.stock_status === 'Critical').length,
      lowStockItems: stockItems.filter(item => item.stock_status === 'Low').length,
      adequateItems: stockItems.filter(item => item.stock_status === 'Adequate').length
    };
    
    res.json({
      stockItems,
      summary
    });
  } catch (err) {
    console.error('Error generating stock report:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. CUSTOMER LEDGER REPORT
app.get('/api/reports/customer-ledger', (req, res) => {
  try {
    const { customerId } = req.query;
    
    const customers = db.prepare(`
      SELECT 
        c.id,
        c.name,
        c.phone,
        c.email,
        c.current_balance,
        COUNT(s.id) as total_purchases,
        COALESCE(SUM(s.total), 0) as total_amount,
        MAX(s.date) as last_purchase_date
      FROM customers c
      LEFT JOIN sales s ON s.customer = c.name
      WHERE c.is_active = 1
      ${customerId ? 'AND c.id = ?' : ''}
      GROUP BY c.id
      ORDER BY c.current_balance DESC
    `).all(customerId ? [customerId] : []);
    
    res.json(customers);
  } catch (err) {
    console.error('Error generating customer ledger:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. SUPPLIER LEDGER REPORT
app.get('/api/reports/supplier-ledger', (req, res) => {
  try {
    const suppliers = db.prepare(`
      SELECT 
        s.id,
        s.name,
        s.phone,
        s.email,
        s.current_balance,
        COUNT(p.id) as total_purchases,
        COALESCE(SUM(p.total), 0) as total_amount,
        MAX(p.date) as last_purchase_date
      FROM suppliers s
      LEFT JOIN purchases p ON p.supplier = s.name
      WHERE s.is_active = 1
      GROUP BY s.id
      ORDER BY s.current_balance DESC
    `).all();
    
    res.json(suppliers);
  } catch (err) {
    console.error('Error generating supplier ledger:', err);
    res.status(500).json({ error: err.message });
  }
});

// 8. DAYBOOK REPORT
app.get('/api/reports/daybook', (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const vouchers = db.prepare(`
      SELECT 
        id,
        voucher_no,
        date,
        type,
        debit_ledger,
        credit_ledger,
        amount,
        narration,
        reference_no
      FROM vouchers
      WHERE date(date) = date(?)
      ORDER BY created_at
    `).all(targetDate);
    
    const summary = {
      totalVouchers: vouchers.length,
      totalAmount: vouchers.reduce((sum, v) => sum + v.amount, 0),
      byType: {}
    };
    
    vouchers.forEach(v => {
      if (!summary.byType[v.type]) {
        summary.byType[v.type] = { count: 0, amount: 0 };
      }
      summary.byType[v.type].count++;
      summary.byType[v.type].amount += v.amount;
    });
    
    res.json({
      date: targetDate,
      vouchers,
      summary
    });
  } catch (err) {
    console.error('Error generating daybook:', err);
    res.status(500).json({ error: err.message });
  }
});

// 9. CASH FLOW REPORT
app.get('/api/reports/cashflow', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Cash inflows
    const inflows = db.prepare(`
      SELECT 
        type,
        SUM(amount) as total
      FROM vouchers
      WHERE credit_ledger IN (SELECT name FROM ledgers WHERE type = 'Asset' AND (name LIKE '%Cash%' OR name LIKE '%Bank%'))
      AND date BETWEEN ? AND ?
      GROUP BY type
    `).all(startDate || '1900-01-01', endDate || '2999-12-31');
    
    // Cash outflows
    const outflows = db.prepare(`
      SELECT 
        type,
        SUM(amount) as total
      FROM vouchers
      WHERE debit_ledger IN (SELECT name FROM ledgers WHERE type = 'Asset' AND (name LIKE '%Cash%' OR name LIKE '%Bank%'))
      AND date BETWEEN ? AND ?
      GROUP BY type
    `).all(startDate || '1900-01-01', endDate || '2999-12-31');
    
    const totalInflow = inflows.reduce((sum, item) => sum + item.total, 0);
    const totalOutflow = outflows.reduce((sum, item) => sum + item.total, 0);
    
    res.json({
      inflows,
      outflows,
      totalInflow,
      totalOutflow,
      netCashFlow: totalInflow - totalOutflow
    });
  } catch (err) {
    console.error('Error generating cash flow:', err);
    res.status(500).json({ error: err.message });
  }
});

// 10. TAX REPORT
app.get('/api/reports/tax', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const taxCollected = db.prepare(`
      SELECT 
        SUM(tax_amount) as total_tax,
        COUNT(*) as transaction_count
      FROM sales
      WHERE date BETWEEN ? AND ?
    `).get(startDate || '1900-01-01', endDate || '2999-12-31');
    
    const taxPaid = db.prepare(`
      SELECT 
        SUM(tax_amount) as total_tax,
        COUNT(*) as transaction_count
      FROM purchases
      WHERE date BETWEEN ? AND ?
    `).get(startDate || '1900-01-01', endDate || '2999-12-31');
    
    res.json({
      taxCollected: taxCollected.total_tax || 0,
      taxPaid: taxPaid.total_tax || 0,
      netTaxLiability: (taxCollected.total_tax || 0) - (taxPaid.total_tax || 0),
      salesTransactions: taxCollected.transaction_count || 0,
      purchaseTransactions: taxPaid.transaction_count || 0
    });
  } catch (err) {
    console.error('Error generating tax report:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============== CUSTOMERS (ENHANCED WITH TRANSACTION HISTORY) ===============
app.get('/api/customers', (req, res) => {
  try {
    const customers = db.prepare(`
      SELECT 
        c.*,
        COUNT(DISTINCT s.id) as total_purchases,
        COALESCE(SUM(s.total), 0) as total_spent,
        MAX(s.date) as last_purchase_date
      FROM customers c
      LEFT JOIN sales s ON s.customer = c.name
      WHERE c.is_active = 1
      GROUP BY c.id
      ORDER BY c.name
    `).all();
    
    res.json(customers);
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customers/:id', (req, res) => {
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Get customer's purchase history
    const purchases = db.prepare(`
      SELECT 
        s.id,
        s.invoice_no,
        s.date,
        s.total,
        s.payment_method,
        s.payment_status,
        COUNT(si.id) as item_count
      FROM sales s
      LEFT JOIN sale_items si ON si.sale_id = s.id
      WHERE s.customer = ?
      GROUP BY s.id
      ORDER BY s.date DESC
      LIMIT 50
    `).all(customer.name);
    
    // Get summary statistics
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total) as total_spent,
        AVG(total) as average_order_value,
        MIN(date) as first_purchase,
        MAX(date) as last_purchase
      FROM sales
      WHERE customer = ?
    `).get(customer.name);
    
    res.json({
      ...customer,
      purchases,
      stats
    });
  } catch (err) {
    console.error('Error fetching customer details:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', (req, res) => {
  const { name, phone, email, address, gstin, opening_balance, credit_limit } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Customer name is required' });
  }
  
  try {
    const stmt = db.prepare(`
      INSERT INTO customers (name, phone, email, address, gstin, opening_balance, current_balance, credit_limit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      name, 
      phone || null, 
      email || null, 
      address || null, 
      gstin || null, 
      opening_balance || 0,
      opening_balance || 0,
      credit_limit || 0
    );
    
    res.json({ 
      id: info.lastInsertRowid, 
      message: 'Customer created successfully' 
    });
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', (req, res) => {
  const { name, phone, email, address, gstin, credit_limit, is_active } = req.body;
  
  try {
    const stmt = db.prepare(`
      UPDATE customers 
      SET name = ?, phone = ?, email = ?, address = ?, gstin = ?, credit_limit = ?, is_active = ?
      WHERE id = ?
    `);
    stmt.run(
      name, 
      phone || null, 
      email || null, 
      address || null, 
      gstin || null, 
      credit_limit || 0,
      is_active !== undefined ? is_active : 1,
      req.params.id
    );
    
    res.json({ message: 'Customer updated successfully' });
  } catch (err) {
    console.error('Error updating customer:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', (req, res) => {
  try {
    // Check if customer has transactions
    const customer = db.prepare('SELECT name FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const salesCount = db.prepare('SELECT COUNT(*) as count FROM sales WHERE customer = ?').get(customer.name);
    
    if (salesCount.count > 0) {
      // Soft delete
      db.prepare('UPDATE customers SET is_active = 0 WHERE id = ?').run(req.params.id);
      res.json({ 
        message: 'Customer deactivated successfully',
        info: `Customer has ${salesCount.count} transaction(s) and was deactivated instead of deleted.`
      });
    } else {
      // Hard delete if no transactions
      db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
      res.json({ message: 'Customer deleted successfully' });
    }
  } catch (err) {
    console.error('Error deleting customer:', err);
    res.status(500).json({ error: err.message });
  }
});

// Customer statement/ledger
app.get('/api/customers/:id/statement', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const transactions = db.prepare(`
      SELECT 
        date,
        invoice_no as reference,
        'Sale' as type,
        total as amount,
        payment_status,
        notes
      FROM sales
      WHERE customer = ?
      AND date BETWEEN ? AND ?
      ORDER BY date, invoice_no
    `).all(
      customer.name,
      startDate || '1900-01-01',
      endDate || '2999-12-31'
    );
    
    res.json({
      customer,
      transactions,
      openingBalance: customer.opening_balance,
      closingBalance: customer.current_balance
    });
  } catch (err) {
    console.error('Error generating customer statement:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============== CATEGORIES (ENHANCED) ===============
app.get('/api/categories', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        c.*,
        p.name as parent_name,
        (SELECT COUNT(*) FROM stock_items WHERE category = c.name AND is_active = 1) as item_count
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.is_active = 1 
      ORDER BY c.name
    `).all();
    res.json(rows);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/categories/:id', (req, res) => {
  try {
    const category = db.prepare(`
      SELECT 
        c.*,
        p.name as parent_name
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.id = ?
    `).get(req.params.id);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Get items in this category
    const items = db.prepare(`
      SELECT id, item_name, sku, current_qty, sale_rate
      FROM stock_items
      WHERE category = ? AND is_active = 1
    `).all(category.name);
    
    res.json({ ...category, items });
  } catch (err) {
    console.error('Error fetching category:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', (req, res) => {
  const { name, description, parent_id } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }
  
  try {
    const stmt = db.prepare('INSERT INTO categories (name, description, parent_id) VALUES (?, ?, ?)');
    const info = stmt.run(name, description, parent_id || null);
    res.json({ id: info.lastInsertRowid, message: 'Category created successfully' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      res.status(400).json({ error: 'Category name already exists' });
    } else {
      console.error('Error creating category:', err);
      res.status(500).json({ error: err.message });
    }
  }
});

app.put('/api/categories/:id', (req, res) => {
  const { name, description, parent_id, is_active } = req.body;
  
  try {
    const stmt = db.prepare(`
      UPDATE categories 
      SET name = ?, description = ?, parent_id = ?, is_active = ?
      WHERE id = ?
    `);
    stmt.run(name, description, parent_id || null, is_active !== undefined ? is_active : 1, req.params.id);
    res.json({ message: 'Category updated successfully' });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      res.status(400).json({ error: 'Category name already exists' });
    } else {
      console.error('Error updating category:', err);
      res.status(500).json({ error: err.message });
    }
  }
});

app.delete('/api/categories/:id', (req, res) => {
  try {
    // Check if category has items
    const category = db.prepare('SELECT name FROM categories WHERE id = ?').get(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    const itemCount = db.prepare('SELECT COUNT(*) as count FROM stock_items WHERE category = ? AND is_active = 1').get(category.name);
    
    if (itemCount.count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category. It contains ${itemCount.count} active item(s). Please reassign or delete the items first.` 
      });
    }
    
    // Soft delete
    db.prepare('UPDATE categories SET is_active = 0 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: err.message });
  }
});

console.log('✅ Car makes/models API endpoints registered');

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = process.env.PORT || 5001;

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`✅ Auto City Accounting Server running on http://localhost:${PORT}`);
    console.log(`🔍 Dashboard stats endpoint: http://localhost:${PORT}/api/dashboard/stats`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
      console.log('Server closed');
    });
  });
} else {
  module.exports = app;
}