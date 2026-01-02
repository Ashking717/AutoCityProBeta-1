-- Enhanced Database Schema for Multi-User, Analytics, and Barcode Features
-- Add to existing schema (append to db.exec in server.js)

-- ============================================
-- MULTI-USER SUPPORT TABLES
-- ============================================

-- Enhanced users table with roles and permissions
CREATE TABLE IF NOT EXISTS users_enhanced (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'cashier' CHECK(role IN ('admin', 'manager', 'cashier')),
  permissions TEXT, -- JSON string of specific permissions
  is_active INTEGER DEFAULT 1,
  last_login TEXT,
  login_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users_enhanced(id)
);

-- User sessions for tracking active logins
CREATE TABLE IF NOT EXISTS user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users_enhanced(id),
  session_token TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  login_time TEXT DEFAULT CURRENT_TIMESTAMP,
  logout_time TEXT,
  is_active INTEGER DEFAULT 1,
  last_activity TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ACTIVITY LOGS (Enhanced)
-- ============================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users_enhanced(id),
  username TEXT,
  action_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'view', 'login', 'logout'
  module TEXT NOT NULL, -- 'sales', 'stock', 'voucher', 'ledger', etc.
  table_name TEXT,
  record_id INTEGER,
  description TEXT,
  old_values TEXT, -- JSON string
  new_values TEXT, -- JSON string
  ip_address TEXT,
  session_id INTEGER REFERENCES user_sessions(id),
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  severity TEXT DEFAULT 'info' CHECK(severity IN ('info', 'warning', 'error', 'critical'))
);

-- Index for faster activity log queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_logs_module ON activity_logs(module);

-- ============================================
-- PERMISSIONS SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'cashier')),
  module TEXT NOT NULL,
  can_view INTEGER DEFAULT 0,
  can_create INTEGER DEFAULT 0,
  can_edit INTEGER DEFAULT 0,
  can_delete INTEGER DEFAULT 0,
  can_approve INTEGER DEFAULT 0,
  can_export INTEGER DEFAULT 0,
  UNIQUE(role, module)
);

-- Default permissions for roles
INSERT OR IGNORE INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete, can_approve, can_export) VALUES
-- Admin: Full access to everything
('admin', 'dashboard', 1, 1, 1, 1, 1, 1),
('admin', 'sales', 1, 1, 1, 1, 1, 1),
('admin', 'stock', 1, 1, 1, 1, 1, 1),
('admin', 'voucher', 1, 1, 1, 1, 1, 1),
('admin', 'ledger', 1, 1, 1, 1, 1, 1),
('admin', 'reports', 1, 1, 1, 1, 1, 1),
('admin', 'users', 1, 1, 1, 1, 1, 1),
('admin', 'settings', 1, 1, 1, 1, 1, 1),

-- Manager: Can view, create, edit; limited delete
('manager', 'dashboard', 1, 0, 0, 0, 0, 1),
('manager', 'sales', 1, 1, 1, 1, 1, 1),
('manager', 'stock', 1, 1, 1, 1, 1, 1),
('manager', 'voucher', 1, 1, 1, 0, 1, 1),
('manager', 'ledger', 1, 1, 1, 0, 0, 1),
('manager', 'reports', 1, 0, 0, 0, 0, 1),
('manager', 'users', 1, 0, 0, 0, 0, 0),
('manager', 'settings', 1, 0, 1, 0, 0, 0),

-- Cashier: Limited to POS and basic operations
('cashier', 'dashboard', 1, 0, 0, 0, 0, 0),
('cashier', 'sales', 1, 1, 0, 0, 0, 0),
('cashier', 'stock', 1, 0, 0, 0, 0, 0),
('cashier', 'voucher', 0, 0, 0, 0, 0, 0),
('cashier', 'ledger', 0, 0, 0, 0, 0, 0),
('cashier', 'reports', 1, 0, 0, 0, 0, 0),
('cashier', 'users', 0, 0, 0, 0, 0, 0),
('cashier', 'settings', 0, 0, 0, 0, 0, 0);

-- ============================================
-- ANALYTICS TABLES
-- ============================================

-- Sales analytics cache (for faster reporting)
CREATE TABLE IF NOT EXISTS sales_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  total_sales REAL DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  total_profit REAL DEFAULT 0,
  average_transaction REAL DEFAULT 0,
  top_selling_item TEXT,
  top_customer TEXT,
  payment_method_breakdown TEXT, -- JSON: {cash: x, card: y, upi: z}
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date)
);

-- Profit tracking per sale
CREATE TABLE IF NOT EXISTS profit_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER REFERENCES sales(id),
  item_id INTEGER REFERENCES stock_items(id),
  quantity REAL NOT NULL,
  cost_price REAL NOT NULL,
  selling_price REAL NOT NULL,
  profit_amount REAL NOT NULL,
  profit_margin REAL NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Customer analytics
CREATE TABLE IF NOT EXISTS customer_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER REFERENCES customers(id),
  total_purchases REAL DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  average_purchase REAL DEFAULT 0,
  last_purchase_date TEXT,
  purchase_frequency REAL DEFAULT 0, -- purchases per month
  lifetime_value REAL DEFAULT 0,
  preferred_payment_method TEXT,
  top_purchased_category TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id)
);

-- Forecasting data
CREATE TABLE IF NOT EXISTS sales_forecast (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  forecast_date TEXT NOT NULL,
  predicted_sales REAL,
  predicted_transactions INTEGER,
  confidence_level REAL, -- 0-100
  actual_sales REAL,
  actual_transactions INTEGER,
  variance REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(forecast_date)
);

-- ============================================
-- BARCODE SYSTEM ENHANCEMENTS
-- ============================================

-- Barcode scanning history
CREATE TABLE IF NOT EXISTS barcode_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  barcode TEXT NOT NULL,
  item_id INTEGER REFERENCES stock_items(id),
  scan_type TEXT NOT NULL, -- 'pos', 'stock_in', 'stock_check'
  user_id INTEGER REFERENCES users_enhanced(id),
  quantity REAL DEFAULT 1,
  success INTEGER DEFAULT 1,
  error_message TEXT,
  scanned_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Barcode print queue
CREATE TABLE IF NOT EXISTS barcode_print_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER REFERENCES stock_items(id),
  barcode TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  label_template TEXT, -- 'small', 'medium', 'large'
  status TEXT DEFAULT 'pending', -- 'pending', 'printed', 'failed'
  created_by INTEGER REFERENCES users_enhanced(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  printed_at TEXT
);

-- ============================================
-- DASHBOARD METRICS CACHE
-- ============================================

CREATE TABLE IF NOT EXISTS dashboard_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_date TEXT NOT NULL,
  total_sales REAL DEFAULT 0,
  total_purchases REAL DEFAULT 0,
  profit REAL DEFAULT 0,
  cash_flow REAL DEFAULT 0,
  stock_value REAL DEFAULT 0,
  pending_payments REAL DEFAULT 0,
  low_stock_items INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(metric_date)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_role ON users_enhanced(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users_enhanced(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sales_analytics_date ON sales_analytics(date);
CREATE INDEX IF NOT EXISTS idx_profit_tracking_date ON profit_tracking(date);
CREATE INDEX IF NOT EXISTS idx_barcode_scans_timestamp ON barcode_scans(scanned_at);
CREATE INDEX IF NOT EXISTS idx_stock_items_barcode ON stock_items(barcode);

-- ============================================
-- TRIGGERS FOR AUTOMATED TRACKING
-- ============================================

-- Trigger to update customer analytics on new sale
CREATE TRIGGER IF NOT EXISTS update_customer_analytics_on_sale
AFTER INSERT ON sales
BEGIN
  INSERT OR REPLACE INTO customer_analytics (
    customer_id, 
    total_purchases, 
    total_transactions,
    average_purchase,
    last_purchase_date,
    lifetime_value,
    updated_at
  )
  SELECT 
    c.id,
    COALESCE(SUM(s.total), 0),
    COUNT(s.id),
    COALESCE(AVG(s.total), 0),
    MAX(s.date),
    COALESCE(SUM(s.total), 0),
    CURRENT_TIMESTAMP
  FROM customers c
  LEFT JOIN sales s ON c.name = s.customer
  WHERE c.id = (SELECT id FROM customers WHERE name = NEW.customer LIMIT 1)
  GROUP BY c.id;
END;

-- Trigger to track profit on sale
CREATE TRIGGER IF NOT EXISTS track_profit_on_sale_item
AFTER INSERT ON sale_items
BEGIN
  INSERT INTO profit_tracking (
    sale_id,
    item_id,
    quantity,
    cost_price,
    selling_price,
    profit_amount,
    profit_margin,
    date
  )
  SELECT 
    NEW.sale_id,
    NEW.item_id,
    NEW.quantity,
    COALESCE(si.average_cost, 0),
    NEW.rate,
    (NEW.rate - COALESCE(si.average_cost, 0)) * NEW.quantity,
    CASE 
      WHEN NEW.rate > 0 THEN ((NEW.rate - COALESCE(si.average_cost, 0)) / NEW.rate) * 100
      ELSE 0
    END,
    (SELECT date FROM sales WHERE id = NEW.sale_id)
  FROM stock_items si
  WHERE si.id = NEW.item_id;
END;
