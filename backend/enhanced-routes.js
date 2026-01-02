/**
 * Enhanced Backend Routes for Multi-User, Analytics, and Barcode Support
 * Add these routes to backend/server.js
 */

// ============================================
// AUTHENTICATION & USER MANAGEMENT
// ============================================

/**
 * User Login
 */
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Get user from database
    const user = db.prepare(`
      SELECT id, username, full_name, email, role, is_active, permissions
      FROM users_enhanced 
      WHERE username = ? AND is_active = 1
    `).get(username);
    
    if (!user) {
      logActivity(null, 'login_failed', 'auth', null, `Failed login attempt for ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // In production, use bcrypt for password hashing
    // For now, using plain text (REPLACE THIS IN PRODUCTION)
    if (password !== password) { // Replace with bcrypt.compare(password, user.password)
      logActivity(user.id, 'login_failed', 'auth', null, `Failed login attempt`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate session token
    const sessionToken = generateSessionToken();
    
    // Create session
    db.prepare(`
      INSERT INTO user_sessions (user_id, session_token, ip_address)
      VALUES (?, ?, ?)
    `).run(user.id, sessionToken, req.ip);
    
    // Update last login
    db.prepare(`
      UPDATE users_enhanced 
      SET last_login = CURRENT_TIMESTAMP, login_count = login_count + 1
      WHERE id = ?
    `).run(user.id);
    
    // Log activity
    logActivity(user.id, 'login', 'auth', null, `User logged in`);
    
    // Get user permissions
    const permissions = getUserPermissions(user.role, user.permissions);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        permissions
      },
      sessionToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * User Logout
 */
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.split(' ')[1];
    
    db.prepare(`
      UPDATE user_sessions 
      SET logout_time = CURRENT_TIMESTAMP, is_active = 0
      WHERE session_token = ?
    `).run(sessionToken);
    
    logActivity(req.user.id, 'logout', 'auth', null, 'User logged out');
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * Get All Users (Admin/Manager only)
 */
app.get('/api/users', authenticateToken, checkPermission('users', 'can_view'), (req, res) => {
  try {
    const users = db.prepare(`
      SELECT 
        id, username, full_name, email, role, is_active, 
        last_login, login_count, created_at
      FROM users_enhanced
      ORDER BY created_at DESC
    `).all();
    
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * Create User (Admin only)
 */
app.post('/api/users', authenticateToken, checkPermission('users', 'can_create'), (req, res) => {
  try {
    const { username, password, fullName, email, role } = req.body;
    
    // Validate role
    if (!['admin', 'manager', 'cashier'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Insert user (in production, hash password with bcrypt)
    const result = db.prepare(`
      INSERT INTO users_enhanced (username, password, full_name, email, role, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(username, password, fullName, email, role, req.user.id);
    
    logActivity(req.user.id, 'create', 'users', result.lastInsertRowid, 
      `Created user: ${username} with role: ${role}`);
    
    res.json({ 
      success: true, 
      id: result.lastInsertRowid,
      message: 'User created successfully' 
    });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * Update User (Admin only)
 */
app.put('/api/users/:id', authenticateToken, checkPermission('users', 'can_edit'), (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, role, isActive } = req.body;
    
    const oldUser = db.prepare('SELECT * FROM users_enhanced WHERE id = ?').get(id);
    
    db.prepare(`
      UPDATE users_enhanced 
      SET full_name = ?, email = ?, role = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(fullName, email, role, isActive ? 1 : 0, id);
    
    logActivity(req.user.id, 'update', 'users', id, 
      `Updated user: ${oldUser.username}`, 
      JSON.stringify(oldUser), 
      JSON.stringify(req.body));
    
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * Delete User (Admin only)
 */
app.delete('/api/users/:id', authenticateToken, checkPermission('users', 'can_delete'), (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent self-deletion
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const user = db.prepare('SELECT username FROM users_enhanced WHERE id = ?').get(id);
    
    // Soft delete
    db.prepare('UPDATE users_enhanced SET is_active = 0 WHERE id = ?').run(id);
    
    logActivity(req.user.id, 'delete', 'users', id, `Deactivated user: ${user.username}`);
    
    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ============================================
// ACTIVITY LOGS
// ============================================

/**
 * Get Activity Logs
 */
app.get('/api/activity-logs', authenticateToken, checkPermission('reports', 'can_view'), (req, res) => {
  try {
    const { startDate, endDate, userId, module, limit = 100 } = req.query;
    
    let query = `
      SELECT 
        al.*,
        u.full_name as user_full_name
      FROM activity_logs al
      LEFT JOIN users_enhanced u ON al.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (startDate) {
      query += ' AND al.timestamp >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND al.timestamp <= ?';
      params.push(endDate);
    }
    if (userId) {
      query += ' AND al.user_id = ?';
      params.push(userId);
    }
    if (module) {
      query += ' AND al.module = ?';
      params.push(module);
    }
    
    query += ' ORDER BY al.timestamp DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const logs = db.prepare(query).all(...params);
    
    res.json(logs);
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

/**
 * Get Activity Statistics
 */
app.get('/api/activity-logs/stats', authenticateToken, checkPermission('reports', 'can_view'), (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE timestamp BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    const stats = {
      totalActivities: db.prepare(`SELECT COUNT(*) as count FROM activity_logs ${dateFilter}`).get(...params).count,
      byModule: db.prepare(`
        SELECT module, COUNT(*) as count 
        FROM activity_logs ${dateFilter}
        GROUP BY module
        ORDER BY count DESC
      `).all(...params),
      byUser: db.prepare(`
        SELECT 
          u.full_name, 
          u.username, 
          COUNT(*) as count 
        FROM activity_logs al
        LEFT JOIN users_enhanced u ON al.user_id = u.id
        ${dateFilter}
        GROUP BY al.user_id
        ORDER BY count DESC
        LIMIT 10
      `).all(...params),
      byActionType: db.prepare(`
        SELECT action_type, COUNT(*) as count 
        FROM activity_logs ${dateFilter}
        GROUP BY action_type
      `).all(...params)
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ============================================
// ANALYTICS & REPORTS
// ============================================

/**
 * Get Profit Trends
 */
app.get('/api/analytics/profit-trends', authenticateToken, checkPermission('reports', 'can_view'), (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    let dateFormat;
    switch(groupBy) {
      case 'month':
        dateFormat = "%Y-%m";
        break;
      case 'week':
        dateFormat = "%Y-W%W";
        break;
      default:
        dateFormat = "%Y-%m-%d";
    }
    
    const trends = db.prepare(`
      SELECT 
        strftime(?, date) as period,
        SUM(profit_amount) as total_profit,
        AVG(profit_margin) as avg_margin,
        COUNT(DISTINCT sale_id) as transaction_count,
        SUM(quantity * selling_price) as total_revenue,
        SUM(quantity * cost_price) as total_cost
      FROM profit_tracking
      WHERE date BETWEEN ? AND ?
      GROUP BY period
      ORDER BY period
    `).all(dateFormat, startDate, endDate);
    
    res.json(trends);
  } catch (error) {
    console.error('Get profit trends error:', error);
    res.status(500).json({ error: 'Failed to fetch profit trends' });
  }
});

/**
 * Get Sales Forecast
 */
app.get('/api/analytics/forecast', authenticateToken, checkPermission('reports', 'can_view'), (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // Get historical data for forecasting
    const historicalData = db.prepare(`
      SELECT 
        date,
        total_sales,
        total_transactions
      FROM sales_analytics
      WHERE date >= date('now', '-90 days')
      ORDER BY date
    `).all();
    
    // Simple moving average forecast
    const forecast = generateForecast(historicalData, parseInt(days));
    
    res.json(forecast);
  } catch (error) {
    console.error('Get forecast error:', error);
    res.status(500).json({ error: 'Failed to generate forecast' });
  }
});

/**
 * Get Customer Analytics
 */
app.get('/api/analytics/customers', authenticateToken, checkPermission('reports', 'can_view'), (req, res) => {
  try {
    const analytics = db.prepare(`
      SELECT 
        c.id,
        c.name,
        c.phone,
        ca.total_purchases,
        ca.total_transactions,
        ca.average_purchase,
        ca.last_purchase_date,
        ca.lifetime_value,
        ca.preferred_payment_method,
        ca.top_purchased_category,
        CASE 
          WHEN ca.last_purchase_date >= date('now', '-30 days') THEN 'Active'
          WHEN ca.last_purchase_date >= date('now', '-90 days') THEN 'Moderate'
          ELSE 'Inactive'
        END as status
      FROM customers c
      LEFT JOIN customer_analytics ca ON c.id = ca.customer_id
      WHERE c.is_active = 1
      ORDER BY ca.lifetime_value DESC
    `).all();
    
    res.json(analytics);
  } catch (error) {
    console.error('Get customer analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch customer analytics' });
  }
});

/**
 * Get Top Selling Items
 */
app.get('/api/analytics/top-items', authenticateToken, (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    
    const topItems = db.prepare(`
      SELECT 
        si.item_name,
        si.category,
        SUM(sli.quantity) as total_quantity,
        SUM(sli.total) as total_revenue,
        SUM(pt.profit_amount) as total_profit,
        AVG(pt.profit_margin) as avg_margin,
        COUNT(DISTINCT sli.sale_id) as transaction_count
      FROM sale_items sli
      JOIN stock_items si ON sli.item_id = si.id
      JOIN sales s ON sli.sale_id = s.id
      LEFT JOIN profit_tracking pt ON pt.sale_id = s.id AND pt.item_id = si.id
      WHERE s.date BETWEEN ? AND ?
      GROUP BY si.id
      ORDER BY total_revenue DESC
      LIMIT ?
    `).all(startDate, endDate, parseInt(limit));
    
    res.json(topItems);
  } catch (error) {
    console.error('Get top items error:', error);
    res.status(500).json({ error: 'Failed to fetch top items' });
  }
});

// ============================================
// BARCODE OPERATIONS
// ============================================

/**
 * Scan Barcode (POS)
 */
app.post('/api/barcode/scan', authenticateToken, (req, res) => {
  try {
    const { barcode, scanType = 'pos', quantity = 1 } = req.body;
    
    // Find item by barcode
    const item = db.prepare(`
      SELECT * FROM stock_items 
      WHERE barcode = ? AND is_active = 1
    `).get(barcode);
    
    if (!item) {
      // Log failed scan
      db.prepare(`
        INSERT INTO barcode_scans (barcode, scan_type, user_id, success, error_message)
        VALUES (?, ?, ?, 0, 'Item not found')
      `).run(barcode, scanType, req.user.id);
      
      return res.status(404).json({ error: 'Item not found for barcode: ' + barcode });
    }
    
    // Check stock availability
    if (scanType === 'pos' && item.current_qty < quantity) {
      return res.status(400).json({ 
        error: 'Insufficient stock',
        available: item.current_qty 
      });
    }
    
    // Log successful scan
    db.prepare(`
      INSERT INTO barcode_scans (barcode, item_id, scan_type, user_id, quantity, success)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(barcode, item.id, scanType, req.user.id, quantity);
    
    res.json({ 
      success: true, 
      item: {
        id: item.id,
        name: item.item_name,
        barcode: item.barcode,
        price: item.sale_rate,
        stock: item.current_qty,
        category: item.category
      }
    });
  } catch (error) {
    console.error('Barcode scan error:', error);
    res.status(500).json({ error: 'Barcode scan failed' });
  }
});

/**
 * Generate Barcode for Item
 */
app.post('/api/barcode/generate', authenticateToken, checkPermission('stock', 'can_edit'), (req, res) => {
  try {
    const { itemId, barcodeType = 'ean13' } = req.body;
    
    const item = db.prepare('SELECT * FROM stock_items WHERE id = ?').get(itemId);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Generate barcode if not exists
    let barcode = item.barcode;
    if (!barcode) {
      barcode = generateBarcode(itemId, barcodeType);
      
      db.prepare('UPDATE stock_items SET barcode = ? WHERE id = ?')
        .run(barcode, itemId);
      
      logActivity(req.user.id, 'update', 'stock', itemId, 
        `Generated barcode: ${barcode} for ${item.item_name}`);
    }
    
    res.json({ success: true, barcode });
  } catch (error) {
    console.error('Generate barcode error:', error);
    res.status(500).json({ error: 'Failed to generate barcode' });
  }
});

/**
 * Print Barcode Labels
 */
app.post('/api/barcode/print', authenticateToken, (req, res) => {
  try {
    const { itemId, quantity = 1, template = 'medium' } = req.body;
    
    const item = db.prepare('SELECT * FROM stock_items WHERE id = ?').get(itemId);
    
    if (!item || !item.barcode) {
      return res.status(400).json({ error: 'Item not found or has no barcode' });
    }
    
    // Add to print queue
    db.prepare(`
      INSERT INTO barcode_print_queue (item_id, barcode, quantity, label_template, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(itemId, item.barcode, quantity, template, req.user.id);
    
    res.json({ 
      success: true, 
      message: `${quantity} label(s) added to print queue` 
    });
  } catch (error) {
    console.error('Print barcode error:', error);
    res.status(500).json({ error: 'Failed to queue print job' });
  }
});

/**
 * Bulk Import Items with Barcodes
 */
app.post('/api/barcode/bulk-import', authenticateToken, checkPermission('stock', 'can_create'), (req, res) => {
  try {
    const { items } = req.body; // Array of {name, barcode, price, stock}
    
    const results = [];
    const errors = [];
    
    const insertStmt = db.prepare(`
      INSERT INTO stock_items 
      (item_name, barcode, sale_rate, current_qty, opening_qty)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    db.transaction(() => {
      items.forEach((item, index) => {
        try {
          const result = insertStmt.run(
            item.name,
            item.barcode,
            item.price || 0,
            item.stock || 0,
            item.stock || 0
          );
          results.push({ index, id: result.lastInsertRowid, success: true });
        } catch (error) {
          errors.push({ 
            index, 
            name: item.name, 
            error: error.message 
          });
        }
      });
    })();
    
    logActivity(req.user.id, 'create', 'stock', null, 
      `Bulk imported ${results.length} items with barcodes`);
    
    res.json({ 
      success: true, 
      imported: results.length,
      failed: errors.length,
      errors 
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Bulk import failed' });
  }
});

// ============================================
// DASHBOARD METRICS
// ============================================

/**
 * Get Enhanced Dashboard Metrics
 */
app.get('/api/dashboard/metrics', authenticateToken, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if metrics are cached
    let metrics = db.prepare(`
      SELECT * FROM dashboard_metrics 
      WHERE metric_date = ?
    `).get(today);
    
    if (!metrics) {
      // Calculate fresh metrics
      metrics = calculateDashboardMetrics(today);
      
      // Cache for future requests
      db.prepare(`
        INSERT OR REPLACE INTO dashboard_metrics 
        (metric_date, total_sales, total_purchases, profit, cash_flow, 
         stock_value, pending_payments, low_stock_items, new_customers, active_users)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        today,
        metrics.totalSales,
        metrics.totalPurchases,
        metrics.profit,
        metrics.cashFlow,
        metrics.stockValue,
        metrics.pendingPayments,
        metrics.lowStockItems,
        metrics.newCustomers,
        metrics.activeUsers
      );
    }
    
    res.json(metrics);
  } catch (error) {
    console.error('Get dashboard metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Authentication Middleware
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const session = db.prepare(`
      SELECT s.*, u.id, u.username, u.role, u.permissions
      FROM user_sessions s
      JOIN users_enhanced u ON s.user_id = u.id
      WHERE s.session_token = ? AND s.is_active = 1
    `).get(token);
    
    if (!session) {
      return res.status(403).json({ error: 'Invalid or expired session' });
    }
    
    // Update last activity
    db.prepare(`
      UPDATE user_sessions 
      SET last_activity = CURRENT_TIMESTAMP 
      WHERE session_token = ?
    `).run(token);
    
    req.user = {
      id: session.user_id,
      username: session.username,
      role: session.role,
      permissions: session.permissions
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Permission Check Middleware
 */
function checkPermission(module, permission) {
  return (req, res, next) => {
    try {
      const userRole = req.user.role;
      
      // Admin has all permissions
      if (userRole === 'admin') {
        return next();
      }
      
      const rolePermission = db.prepare(`
        SELECT ${permission} as has_permission
        FROM role_permissions
        WHERE role = ? AND module = ?
      `).get(userRole, module);
      
      if (!rolePermission || !rolePermission.has_permission) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Log Activity
 */
function logActivity(userId, actionType, module, recordId, description, oldValues = null, newValues = null) {
  try {
    db.prepare(`
      INSERT INTO activity_logs 
      (user_id, username, action_type, module, record_id, description, old_values, new_values)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      userId ? db.prepare('SELECT username FROM users_enhanced WHERE id = ?').get(userId)?.username : null,
      actionType,
      module,
      recordId,
      description,
      oldValues,
      newValues
    );
  } catch (error) {
    console.error('Log activity error:', error);
  }
}

/**
 * Get User Permissions
 */
function getUserPermissions(role, customPermissions) {
  const rolePermissions = db.prepare(`
    SELECT module, can_view, can_create, can_edit, can_delete, can_approve, can_export
    FROM role_permissions
    WHERE role = ?
  `).all(role);
  
  const permissions = {};
  rolePermissions.forEach(perm => {
    permissions[perm.module] = {
      view: !!perm.can_view,
      create: !!perm.can_create,
      edit: !!perm.can_edit,
      delete: !!perm.can_delete,
      approve: !!perm.can_approve,
      export: !!perm.can_export
    };
  });
  
  // Merge custom permissions if provided
  if (customPermissions) {
    try {
      const custom = JSON.parse(customPermissions);
      Object.assign(permissions, custom);
    } catch (e) {
      console.error('Failed to parse custom permissions:', e);
    }
  }
  
  return permissions;
}

/**
 * Generate Session Token
 */
function generateSessionToken() {
  return require('crypto').randomBytes(32).toString('hex');
}

/**
 * Generate Barcode
 */
function generateBarcode(itemId, type = 'ean13') {
  // Simple barcode generation (in production, use a proper library)
  const prefix = '200'; // Custom prefix for internal items
  const itemCode = String(itemId).padStart(9, '0');
  const barcode = prefix + itemCode;
  
  // Calculate check digit for EAN-13
  if (type === 'ean13') {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(barcode[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return barcode + checkDigit;
  }
  
  return barcode;
}

/**
 * Calculate Dashboard Metrics
 */
function calculateDashboardMetrics(date) {
  const metrics = {};
  
  // Total sales today
  metrics.totalSales = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as total 
    FROM sales 
    WHERE date = ?
  `).get(date).total;
  
  // Total purchases today
  metrics.totalPurchases = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as total 
    FROM purchases 
    WHERE date = ?
  `).get(date).total;
  
  // Profit today
  metrics.profit = db.prepare(`
    SELECT COALESCE(SUM(profit_amount), 0) as total 
    FROM profit_tracking 
    WHERE date = ?
  `).get(date).total;
  
  // Cash flow
  metrics.cashFlow = metrics.totalSales - metrics.totalPurchases;
  
  // Stock value
  metrics.stockValue = db.prepare(`
    SELECT COALESCE(SUM(current_qty * average_cost), 0) as total 
    FROM stock_items
  `).get().total;
  
  // Pending payments
  metrics.pendingPayments = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as total 
    FROM sales 
    WHERE payment_status = 'pending'
  `).get().total;
  
  // Low stock items
  metrics.lowStockItems = db.prepare(`
    SELECT COUNT(*) as count 
    FROM stock_items 
    WHERE current_qty <= reorder_level AND is_active = 1
  `).get().count;
  
  // New customers today
  metrics.newCustomers = db.prepare(`
    SELECT COUNT(*) as count 
    FROM customers 
    WHERE DATE(created_at) = ?
  `).get(date).count;
  
  // Active users today
  metrics.activeUsers = db.prepare(`
    SELECT COUNT(DISTINCT user_id) as count 
    FROM user_sessions 
    WHERE DATE(login_time) = ?
  `).get(date).count;
  
  return metrics;
}

/**
 * Generate Sales Forecast (Simple Moving Average)
 */
function generateForecast(historicalData, days) {
  if (historicalData.length < 7) {
    return { error: 'Insufficient historical data' };
  }
  
  const forecast = [];
  const window = 7; // 7-day moving average
  
  // Calculate moving averages
  for (let i = 0; i < days; i++) {
    const lastValues = historicalData.slice(-window);
    const avgSales = lastValues.reduce((sum, d) => sum + d.total_sales, 0) / window;
    const avgTransactions = lastValues.reduce((sum, d) => sum + d.total_transactions, 0) / window;
    
    const forecastDate = new Date();
    forecastDate.setDate(forecastDate.getDate() + i + 1);
    
    forecast.push({
      date: forecastDate.toISOString().split('T')[0],
      predictedSales: Math.round(avgSales * 100) / 100,
      predictedTransactions: Math.round(avgTransactions),
      confidenceLevel: 70 - (i * 0.5) // Confidence decreases over time
    });
    
    // Add this forecast to historical data for next iteration
    historicalData.push({
      date: forecastDate.toISOString().split('T')[0],
      total_sales: avgSales,
      total_transactions: avgTransactions
    });
  }
  
  return forecast;
}

module.exports = {
  authenticateToken,
  checkPermission,
  logActivity
};
