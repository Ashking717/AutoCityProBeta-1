// backend/server-enhanced.js - Enhanced with Multi-user, Analytics, and Barcode Support
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

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

// ============================================
// ENHANCED DATABASE SCHEMA WITH NEW FEATURES
// ============================================

db.exec(`
  -- Existing tables
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

  -- ENHANCED: Users table with role-based access
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT,
    email TEXT,
    role TEXT DEFAULT 'cashier' CHECK(role IN ('admin', 'manager', 'cashier')),
    permissions TEXT, -- JSON string of permissions
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

  -- ENHANCED: User sessions for tracking
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
    data_json TEXT, -- Additional metrics in JSON format
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Create indexes for better performance
  CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
  CREATE INDEX IF NOT EXISTS idx_stock_items_barcode ON stock_items(barcode);
  CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
  CREATE INDEX IF NOT EXISTS idx_sales_created_by ON sales(created_by);
`);

console.log('✅ Enhanced database tables initialized');

// ============================================
// UTILITY FUNCTIONS
// ============================================

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
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin');
    
    if (adminCount.count === 0) {
      const defaultPassword = hashPassword('admin123');
      db.prepare(`
        INSERT INTO users (username, password, full_name, role, permissions)
        VALUES (?, ?, ?, ?, ?)
      `).run('admin', defaultPassword, 'System Administrator', 'admin', JSON.stringify(['all']));
      
      console.log('✅ Default admin user created (username: admin, password: admin123)');
      console.log('⚠️  Please change the password after first login!');
    }
  } catch (err) {
    console.error('❌ Error initializing admin:', err);
  }
}

initializeDefaultAdmin();

// ============================================
// AUTO-IMPORT CAR DATA
// ============================================

function importCarDataIfNeeded() {
  try {
    const makeCount = db.prepare('SELECT COUNT(*) as count FROM car_makes').get();
    
    if (makeCount.count > 0) {
      console.log(`✅ Car database already populated (${makeCount.count} makes)`);
      return;
    }
    
    console.log('📥 First run detected - importing car makes and models...');
    
    let carDataPath = path.join(__dirname, 'car-makes-models.json');
    
    if (!fs.existsSync(carDataPath)) {
      const unpackedPath = __dirname.replace('app.asar', 'app.asar.unpacked');
      carDataPath = path.join(unpackedPath, 'car-makes-models.json');
    }
    
    if (!fs.existsSync(carDataPath)) {
      console.error('❌ car-makes-models.json not found!');
      return;
    }
    
    console.log('📂 Loading car data from:', carDataPath);
    const carData = JSON.parse(fs.readFileSync(carDataPath, 'utf8'));
    
    const importTransaction = db.transaction(() => {
      const insertMake = db.prepare('INSERT INTO car_makes (name, country) VALUES (?, ?)');
      const getMakeId = db.prepare('SELECT id FROM car_makes WHERE name = ?');
      const insertModel = db.prepare('INSERT INTO car_models (make_id, name) VALUES (?, ?)');
      
      let makesInserted = 0;
      let modelsInserted = 0;
      
      carData.makes.forEach((make) => {
        insertMake.run(make.name, make.country);
        makesInserted++;
        
        const makeId = getMakeId.get(make.name).id;
        
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

importCarDataIfNeeded();

// Helper function for generating unique numbers
function generateUniqueNo(prefix) {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const hashedPassword = hashPassword(password);
    const user = db.prepare(`
      SELECT * FROM users WHERE username = ? AND password = ? AND is_active = 1
    `).get(username, hashedPassword);
    
    if (!user) {
      logActivity(null, username, 'LOGIN_FAILED', 'user', null, 'Invalid credentials');
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
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
// USER MANAGEMENT ENDPOINTS (Admin Only)
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

// Reset user password (Admin only)
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
// ACTIVITY LOGS ENDPOINTS
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
// ENHANCED ANALYTICS ENDPOINTS
// ============================================

// Get profit trends
app.get('/api/analytics/profit-trends', verifySession, (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    
    let dateFormat, dateGroup;
    switch (period) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        dateGroup = "strftime('%Y-%m-%d', date)";
        break;
      case 'week':
        dateFormat = '%Y-W%W';
        dateGroup = "strftime('%Y-W%W', date)";
        break;
      case 'month':
        dateFormat = '%Y-%m';
        dateGroup = "strftime('%Y-%m', date)";
        break;
      case 'year':
        dateFormat = '%Y';
        dateGroup = "strftime('%Y', date)";
        break;
      default:
        dateFormat = '%Y-%m';
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
      WITH sales_data AS (
        SELECT 
          ${dateGroup} as period,
          SUM(total) as total_sales,
          SUM(subtotal) as subtotal,
          COUNT(*) as transaction_count
        FROM sales
        WHERE ${whereClause}
        GROUP BY ${dateGroup}
      ),
      purchase_data AS (
        SELECT 
          ${dateGroup} as period,
          SUM(total) as total_purchases
        FROM purchases
        WHERE ${whereClause}
        GROUP BY ${dateGroup}
      )
      SELECT 
        COALESCE(s.period, p.period) as period,
        COALESCE(s.total_sales, 0) as total_sales,
        COALESCE(p.total_purchases, 0) as total_purchases,
        (COALESCE(s.total_sales, 0) - COALESCE(p.total_purchases, 0)) as profit,
        COALESCE(s.transaction_count, 0) as transaction_count
      FROM sales_data s
      FULL OUTER JOIN purchase_data p ON s.period = p.period
      ORDER BY period ASC
    `).all(...params);
    
    res.json(profitTrends);
  } catch (err) {
    console.error('❌ Get profit trends error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get sales forecasting data
app.get('/api/analytics/sales-forecast', verifySession, (req, res) => {
  try {
    // Get last 12 months of sales data
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
    
    // Simple moving average for forecast (can be enhanced with more sophisticated methods)
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

// Create daily analytics snapshot
function createAnalyticsSnapshot() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if snapshot already exists for today
    const existing = db.prepare('SELECT id FROM analytics_snapshots WHERE snapshot_date = ?').get(today);
    if (existing) {
      console.log('📊 Analytics snapshot already exists for today');
      return;
    }
    
    const totalSales = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE date = ?
    `).get(today).total;
    
    const totalPurchases = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total FROM purchases WHERE date = ?
    `).get(today).total;
    
    const transactionsCount = db.prepare('SELECT COUNT(*) as count FROM sales WHERE date = ?').get(today).count;
    
    const newCustomers = db.prepare(`
      SELECT COUNT(*) as count FROM customers WHERE date(created_at) = ?
    `).get(today).count;
    
    const stockValue = db.prepare(`
      SELECT COALESCE(SUM(current_qty * sale_rate), 0) as value FROM stock_items WHERE is_active = 1
    `).get().value;
    
    const profit = totalSales - totalPurchases;
    
    db.prepare(`
      INSERT INTO analytics_snapshots 
      (snapshot_date, total_sales, total_purchases, profit, transactions_count, new_customers, stock_value)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(today, totalSales, totalPurchases, profit, transactionsCount, newCustomers, stockValue);
    
    console.log('📊 Analytics snapshot created for', today);
  } catch (err) {
    console.error('❌ Error creating analytics snapshot:', err);
  }
}

// Create snapshot on server start and schedule daily
createAnalyticsSnapshot();
setInterval(createAnalyticsSnapshot, 24 * 60 * 60 * 1000); // Daily

// ============================================
// BARCODE SCANNER ENDPOINTS
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
    const { barcodeType = 'EAN13' } = req.body;
    
    // Generate a simple barcode (in production, use proper barcode generation library)
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

// ============================================
// ENHANCED DASHBOARD STATS
// ============================================
app.get('/api/dashboard/stats', verifySession, (req, res) => {
  try {
    const allItems = db.prepare('SELECT * FROM stock_items').all();
    console.log('📊 Total stock items in DB:', allItems.length);
    
    const ledgerCount = db.prepare('SELECT COUNT(*) as count FROM ledgers WHERE is_active = 1').get();
    const stockCount = db.prepare('SELECT COUNT(*) as count FROM stock_items WHERE is_active = 1').get();
    const lowStockCount = db.prepare('SELECT COUNT(*) as count FROM stock_items WHERE current_qty <= min_qty AND is_active = 1').get();
    const salesTotal = db.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE date >= date('now', '-30 days')`).get();
    const stockValue = db.prepare('SELECT COALESCE(SUM(current_qty * sale_rate), 0) as value FROM stock_items WHERE is_active = 1').get();
    
    // Enhanced stats
    const todaySales = db.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE date = date('now')`).get();
    const activeUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get();
    const todayTransactions = db.prepare(`SELECT COUNT(*) as count FROM sales WHERE date = date('now')`).get();
    
    const stats = {
      total_ledgers: ledgerCount.count || 0,
      total_stock_items: stockCount.count || 0,
      low_stock_count: lowStockCount.count || 0,
      sales_last_30_days: salesTotal.total || 0,
      total_stock_value: stockValue.value || 0,
      today_sales: todaySales.total || 0,
      active_users: activeUsers.count || 0,
      today_transactions: todayTransactions.count || 0
    };
    
    console.log('✅ Sending enhanced stats:', stats);
    res.json(stats);
  } catch (err) {
    console.error('❌ Dashboard stats error:', err);
    res.status(500).json({ error: err.message, details: 'Check server logs' });
  }
});

// Import all existing endpoints from original server.js
// [The rest of the original API endpoints would go here - ledgers, vouchers, stock, sales, etc.]
// For brevity, I'm showing the structure. The original endpoints should be copied over.

// ============================================
// SERVER STARTUP
// ============================================

const PORT = process.env.PORT || 5001;

app.listen(PORT, '127.0.0.1', () => {
  console.log(`✅ Enhanced server running on http://127.0.0.1:${PORT}`);
  console.log(`📊 Features enabled: Multi-user, Activity Logs, Analytics, Barcode Support`);
});

module.exports = { db, app };
