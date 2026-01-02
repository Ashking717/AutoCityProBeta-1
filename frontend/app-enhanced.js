// frontend/app-enhanced.js - Enhanced Features Module
// This module extends the existing app.js with new functionality

(function() {
  'use strict';

// ============================================
// AUTHENTICATION & SESSION MANAGEMENT
// ============================================

let currentUser = null;
let sessionToken = null;

// Initialize authentication
function initializeAuth() {
  console.log('🔐 Initializing authentication...');
  
  // Check for existing session
  const savedToken = localStorage.getItem('sessionToken');
  const savedUser = localStorage.getItem('currentUser');
  
  if (savedToken && savedUser) {
    console.log('✅ Found saved session');
    sessionToken = savedToken;
    currentUser = JSON.parse(savedUser);
    
    // Update UI immediately with saved user
    updateUserInfo();
    updateNavigation();
    
    // Then verify session in background
    verifySession();
  } else {
    console.log('❌ No saved session, showing login');
    showLoginScreen();
  }
}

// Login function
async function login(username, password) {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    
    sessionToken = data.sessionToken;
    currentUser = data.user;
    
    localStorage.setItem('sessionToken', sessionToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    hideLoginScreen();
    updateUserInfo();
    updateNavigation();
    showNotification('Login successful', 'success');
    
    return true;
  } catch (err) {
    console.error('Login error:', err);
    showNotification(err.message, 'error');
    return false;
  }
}

// Logout function
async function logout() {
  try {
    if (sessionToken) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken
        }
      });
    }
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    sessionToken = null;
    currentUser = null;
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('currentUser');
    showLoginScreen();
  }
}

// Verify session
async function verifySession() {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { 'x-session-token': sessionToken }
    });
    
    if (!response.ok) {
      throw new Error('Session expired');
    }
    
    const user = await response.json();
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Update UI with user info
    updateUserInfo();
    updateNavigation();
    
    console.log('✅ Session verified for user:', currentUser.username);
  } catch (err) {
    console.error('Session verification failed:', err);
    logout();
  }
}

// Check permission
function hasPermission(permission) {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  return currentUser.permissions.includes(permission);
}

// Add session token to all API requests
function fetchWithAuth(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'x-session-token': sessionToken
    }
  });
}

// ============================================
// LOGIN SCREEN UI
// ============================================

function showLoginScreen() {
  const loginHTML = `
    <div id="loginScreen" class="login-screen">
      <div class="login-container">
        <div class="login-header">
          <i class="fas fa-car"></i>
          <h1>Auto City Accounting Pro</h1>
          <p>Multi-user Edition</p>
        </div>
        <form id="loginForm" class="login-form">
          <div class="form-group">
            <label><i class="fas fa-user"></i> Username</label>
            <input type="text" id="loginUsername" required autocomplete="username" />
          </div>
          <div class="form-group">
            <label><i class="fas fa-lock"></i> Password</label>
            <input type="password" id="loginPassword" required autocomplete="current-password" />
          </div>
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-sign-in-alt"></i> Login
          </button>
          <div class="login-footer">
            <small>Default: admin / admin123</small>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('afterbegin', loginHTML);
  
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    await login(username, password);
  });
  
  // Hide main content
  const mainContent = document.querySelector('.main-content');
  const sidebar = document.querySelector('.sidebar');
  if (mainContent) mainContent.style.display = 'none';
  if (sidebar) sidebar.style.display = 'none';
}

function hideLoginScreen() {
  document.getElementById('loginScreen')?.remove();
  
  // Show main content
  const mainContent = document.querySelector('.main-content');
  const sidebar = document.querySelector('.sidebar');
  if (mainContent) mainContent.style.display = 'block';
  if (sidebar) sidebar.style.display = 'block';
}

function updateUserInfo() {
  if (currentUser) {
    console.log('👤 Updating user info for:', currentUser.username);
    
    // Update the existing user menu in topbar
    const userMenuDisplay = document.getElementById('userMenuDisplay');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userAvatarDisplay = document.getElementById('userAvatarDisplay');
    const logoutButton = document.getElementById('logoutButton');
    
    if (userMenuDisplay) {
      userMenuDisplay.style.display = 'flex';
    }
    
    if (logoutButton) {
      logoutButton.style.display = 'flex';
    }
    
    if (userNameDisplay) {
      userNameDisplay.textContent = currentUser.fullName || currentUser.username;
    }
    
    if (userAvatarDisplay) {
      // Get initials from full name or username
      const name = currentUser.fullName || currentUser.username;
      const initials = name.split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
      userAvatarDisplay.textContent = initials;
    }
  } else {
    console.log('👤 No user logged in, hiding user menu');
    
    // Hide user menu if not logged in
    const userMenuDisplay = document.getElementById('userMenuDisplay');
    const logoutButton = document.getElementById('logoutButton');
    
    if (userMenuDisplay) {
      userMenuDisplay.style.display = 'none';
    }
    
    if (logoutButton) {
      logoutButton.style.display = 'none';
    }
  }
}

// Show user menu
function showUserMenu(event) {
  console.log('🔽 User menu clicked', event);
  event.stopPropagation();
  event.preventDefault();
  
  if (!currentUser) {
    console.error('❌ No current user');
    return;
  }
  
  // Remove existing menu
  const existingMenu = document.getElementById('userMenuDropdown');
  if (existingMenu) {
    console.log('🗑️ Removing existing menu');
    existingMenu.remove();
    return; // Toggle behavior - if menu exists, just close it
  }
  
  console.log('✨ Creating new dropdown menu');
  
  const menuHTML = `
    <div id="userMenuDropdown" class="user-menu-dropdown">
      <div class="dropdown-header">
        <div class="dropdown-user-info">
          <strong>${currentUser.fullName || currentUser.username}</strong>
          <small>${currentUser.role.toUpperCase()}</small>
        </div>
      </div>
      <div class="dropdown-divider"></div>
      <div class="menu-item" onclick="event.stopPropagation(); changePassword();">
        <i class="fas fa-key"></i> Change Password
      </div>
      <div class="dropdown-divider"></div>
      <div class="menu-item" onclick="event.stopPropagation(); logout();">
        <i class="fas fa-sign-out-alt"></i> Logout
      </div>
    </div>
  `;
  
  const userMenu = event.currentTarget || event.target.closest('.user-menu');
  if (!userMenu) {
    console.error('❌ Could not find user menu element');
    return;
  }
  
  userMenu.insertAdjacentHTML('beforeend', menuHTML);
  console.log('✅ Dropdown menu added to DOM');
  
  // Close menu when clicking outside
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!e.target.closest('#userMenuDropdown') && !e.target.closest('.user-menu')) {
        console.log('🗑️ Closing menu (clicked outside)');
        document.getElementById('userMenuDropdown')?.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 100);
}

function updateNavigation() {
  // Show/hide menu items based on permissions
  const adminSection = document.getElementById('adminSection');
  if (adminSection) {
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager')) {
      adminSection.style.display = 'block';
    } else {
      adminSection.style.display = 'none';
    }
  }
  
  // Hide/show individual buttons
  const btnUsers = document.getElementById('btnUsers');
  const btnActivityLogs = document.getElementById('btnActivityLogs');
  const btnAnalytics = document.getElementById('btnAnalytics');
  
  if (btnUsers) {
    btnUsers.style.display = hasPermission('manage_users') ? 'flex' : 'none';
  }
  
  if (btnActivityLogs) {
    btnActivityLogs.style.display = hasPermission('view_activity_logs') ? 'flex' : 'none';
  }
  
  if (btnAnalytics) {
    btnAnalytics.style.display = hasPermission('view_analytics') ? 'flex' : 'none';
  }
}

// ============================================
// USER MANAGEMENT UI
// ============================================

async function loadUsersSection() {
  if (!hasPermission('manage_users')) {
    showNotification('Access denied: Admin permission required', 'error');
    return;
  }
  
  try {
    const response = await fetchWithAuth(`${API_URL}/users`);
    const users = await response.json();
    
    const usersHTML = `
      <div class="section-header">
        <h2>User Management</h2>
        <button class="btn btn-primary" onclick="showCreateUserModal()">
          <i class="fas fa-user-plus"></i> Add User
        </button>
      </div>
      
      <div class="users-grid">
        ${users.map(user => `
          <div class="user-card ${!user.is_active ? 'inactive' : ''}">
            <div class="user-card-header">
              <div class="user-avatar-large">
                <i class="fas fa-user-circle"></i>
              </div>
              <div class="user-card-info">
                <h3>${user.full_name || user.username}</h3>
                <p class="user-username">@${user.username}</p>
                <span class="badge badge-${user.role}">${user.role}</span>
              </div>
            </div>
            <div class="user-card-details">
              <div class="detail-row">
                <span class="label">Email:</span>
                <span>${user.email || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="label">Last Login:</span>
                <span>${user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</span>
              </div>
              <div class="detail-row">
                <span class="label">Status:</span>
                <span class="${user.is_active ? 'text-success' : 'text-danger'}">
                  ${user.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div class="user-card-actions">
              <button class="btn btn-sm" onclick="editUser(${user.id})">
                <i class="fas fa-edit"></i> Edit
              </button>
              <button class="btn btn-sm" onclick="resetUserPassword(${user.id})">
                <i class="fas fa-key"></i> Reset Password
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    document.getElementById('users').innerHTML = usersHTML;
  } catch (err) {
    console.error('Load users error:', err);
    showNotification('Failed to load users', 'error');
  }
}

function showCreateUserModal() {
  console.log('🎯 Opening Create User Modal');
  
  const modalHTML = `
    <div class="modal" id="createUserModal" style="display: flex !important;">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Create New User</h2>
          <button class="btn-close" onclick="closeModal('createUserModal')">×</button>
        </div>
        <form id="createUserForm" class="modal-body">
          <div class="form-group">
            <label>Username *</label>
            <input type="text" name="username" required />
          </div>
          <div class="form-group">
            <label>Password *</label>
            <input type="password" name="password" required minlength="6" />
          </div>
          <div class="form-group">
            <label>Full Name</label>
            <input type="text" name="fullName" />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" />
          </div>
          <div class="form-group">
            <label>Role *</label>
            <select name="role" required onchange="updatePermissions(this.value)">
              <option value="">Select Role</option>
              <option value="cashier">Cashier</option>
              <option value="manager">Manager</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div class="form-group">
            <label>Permissions</label>
            <div id="permissionsContainer" class="permissions-grid">
              <!-- Populated dynamically -->
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn" onclick="closeModal('createUserModal')">Cancel</button>
            <button type="submit" class="btn btn-primary">Create User</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  // Remove any existing modal first
  const existingModal = document.getElementById('createUserModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  console.log('✅ Modal inserted into DOM');
  
  // Verify modal exists
  const modal = document.getElementById('createUserModal');
  console.log('📦 Modal element:', modal);
  
  if (!modal) {
    console.error('❌ Modal not found after insertion!');
    return;
  }
  
  document.getElementById('createUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const permissions = Array.from(document.querySelectorAll('.permission-checkbox:checked'))
      .map(cb => cb.value);
    
    const userData = {
      username: formData.get('username'),
      password: formData.get('password'),
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      role: formData.get('role'),
      permissions
    };
    
    try {
      const response = await fetchWithAuth(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
      
      showNotification('User created successfully', 'success');
      closeModal('createUserModal');
      loadUsersSection();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  });
}

// Update permissions based on role selection
function updatePermissions(role) {
  const container = document.getElementById('permissionsContainer');
  if (!container) return;
  
  const rolePermissions = {
    admin: ['all'],
    manager: [
      'view_dashboard', 'create_sales', 'edit_sales', 'view_inventory',
      'manage_inventory', 'adjust_stock', 'view_reports', 'export_reports',
      'view_analytics', 'view_activity_logs'
    ],
    cashier: ['view_dashboard', 'create_sales', 'view_inventory']
  };
  
  const allPermissions = [
    { id: 'view_dashboard', name: 'View Dashboard', category: 'Basic' },
    { id: 'create_sales', name: 'Create Sales', category: 'Sales' },
    { id: 'edit_sales', name: 'Edit Sales', category: 'Sales' },
    { id: 'delete_sales', name: 'Delete Sales', category: 'Sales' },
    { id: 'view_inventory', name: 'View Inventory', category: 'Inventory' },
    { id: 'manage_inventory', name: 'Manage Inventory', category: 'Inventory' },
    { id: 'adjust_stock', name: 'Adjust Stock', category: 'Inventory' },
    { id: 'view_reports', name: 'View Reports', category: 'Reports' },
    { id: 'export_reports', name: 'Export Reports', category: 'Reports' },
    { id: 'view_analytics', name: 'View Analytics', category: 'Analytics' },
    { id: 'manage_users', name: 'Manage Users', category: 'Admin' },
    { id: 'view_activity_logs', name: 'View Activity Logs', category: 'Admin' },
    { id: 'manage_settings', name: 'Manage Settings', category: 'Settings' }
  ];
  
  const defaultPerms = rolePermissions[role] || [];
  const isAdmin = role === 'admin';
  
  container.innerHTML = allPermissions.map(perm => `
    <label class="permission-item">
      <input 
        type="checkbox" 
        class="permission-checkbox" 
        value="${perm.id}"
        ${defaultPerms.includes(perm.id) || defaultPerms.includes('all') ? 'checked' : ''}
        ${isAdmin ? 'disabled' : ''}
      />
      <span class="permission-label">${perm.name}</span>
    </label>
  `).join('');
}

// Edit user
async function editUser(userId) {
  showNotification('Edit user feature - coming soon!', 'info');
  // TODO: Implement edit user modal
}

// Reset user password (Admin only)
async function resetUserPassword(userId) {
  const newPassword = prompt('Enter new password for this user (minimum 6 characters):');
  
  if (!newPassword) return;
  
  if (newPassword.length < 6) {
    showNotification('Password must be at least 6 characters', 'error');
    return;
  }
  
  try {
    const response = await fetchWithAuth(`${API_URL}/users/${userId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    showNotification('Password reset successfully', 'success');
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

// Change own password
async function changePassword() {
  const oldPassword = prompt('Enter your current password:');
  if (!oldPassword) return;
  
  const newPassword = prompt('Enter new password (minimum 6 characters):');
  if (!newPassword) return;
  
  if (newPassword.length < 6) {
    showNotification('Password must be at least 6 characters', 'error');
    return;
  }
  
  const confirmPassword = prompt('Confirm new password:');
  if (newPassword !== confirmPassword) {
    showNotification('Passwords do not match', 'error');
    return;
  }
  
  try {
    const response = await fetchWithAuth(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword, newPassword })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    showNotification('Password changed successfully! Please login again.', 'success');
    setTimeout(() => logout(), 2000);
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

// ============================================
// ACTIVITY LOGS UI
// ============================================

async function loadActivityLogsSection() {
  if (!hasPermission('view_activity_logs')) {
    showNotification('Access denied: Manager/Admin permission required', 'error');
    return;
  }
  
  try {
    // Load activity logs
    const logsResponse = await fetchWithAuth(`${API_URL}/activity-logs?limit=100`);
    const logs = await logsResponse.json();
    
    // Load summary
    const summaryResponse = await fetchWithAuth(`${API_URL}/activity-logs/summary`);
    const summary = await summaryResponse.json();
    
    const logsHTML = `
      <div class="section-header">
        <h2>Activity Logs</h2>
        <div class="filters">
          <input type="date" id="logStartDate" placeholder="Start Date" />
          <input type="date" id="logEndDate" placeholder="End Date" />
          <button class="btn" onclick="filterActivityLogs()">
            <i class="fas fa-filter"></i> Filter
          </button>
          <button class="btn" onclick="exportActivityLogs()">
            <i class="fas fa-download"></i> Export
          </button>
        </div>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <i class="fas fa-chart-line"></i>
          <div>
            <div class="stat-value">${summary.todayActions}</div>
            <div class="stat-label">Actions Today</div>
          </div>
        </div>
        <div class="stat-card">
          <i class="fas fa-calendar-week"></i>
          <div>
            <div class="stat-value">${summary.weekActions}</div>
            <div class="stat-label">This Week</div>
          </div>
        </div>
        <div class="stat-card">
          <i class="fas fa-users"></i>
          <div>
            <div class="stat-value">${summary.activeUsers}</div>
            <div class="stat-label">Active Users</div>
          </div>
        </div>
      </div>
      
      <div class="activity-log-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map(log => `
              <tr>
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td>
                  <div class="user-badge">
                    <i class="fas fa-user"></i>
                    ${log.username}
                  </div>
                </td>
                <td><span class="badge badge-action">${log.action}</span></td>
                <td>${log.entity_type || '-'}</td>
                <td class="text-truncate">${log.details || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    document.getElementById('activityLogs').innerHTML = logsHTML;
  } catch (err) {
    console.error('Load activity logs error:', err);
    showNotification('Failed to load activity logs', 'error');
  }
}

// ============================================
// ANALYTICS & CHARTS
// ============================================

async function loadAnalyticsSection() {
  if (!hasPermission('view_analytics')) {
    showNotification('Access denied', 'error');
    return;
  }
  
  try {
    // Load profit trends
    const profitResponse = await fetchWithAuth(`${API_URL}/analytics/profit-trends?period=month`);
    const profitData = await profitResponse.json();
    
    // Load sales forecast
    const forecastResponse = await fetchWithAuth(`${API_URL}/analytics/sales-forecast`);
    const forecastData = await forecastResponse.json();
    
    // Load customer analytics
    const customerResponse = await fetchWithAuth(`${API_URL}/analytics/customers`);
    const customerData = await customerResponse.json();
    
    const analyticsHTML = `
      <div class="section-header">
        <h2>Advanced Analytics</h2>
        <div class="filters">
          <select id="analyticsPeriod" onchange="updateAnalytics()">
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month" selected>Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </div>
      </div>
      
      <div class="analytics-grid">
        <div class="chart-container">
          <h3>Profit Trends</h3>
          <canvas id="profitTrendsChart"></canvas>
        </div>
        
        <div class="chart-container">
          <h3>Sales Forecast</h3>
          <canvas id="salesForecastChart"></canvas>
        </div>
        
        <div class="chart-container">
          <h3>Top Customers</h3>
          <div class="top-customers-list">
            ${customerData.topCustomers.slice(0, 5).map((customer, index) => `
              <div class="customer-row">
                <span class="rank">#${index + 1}</span>
                <div class="customer-info">
                  <strong>${customer.name}</strong>
                  <small>${customer.phone || 'No phone'}</small>
                </div>
                <div class="customer-stats">
                  <div>₹${customer.total_spent.toFixed(2)}</div>
                  <small>${customer.purchase_count} purchases</small>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="chart-container">
          <h3>Customer Growth</h3>
          <canvas id="customerGrowthChart"></canvas>
        </div>
      </div>
    `;
    
    document.getElementById('analytics').innerHTML = analyticsHTML;
    
    // Render charts
    renderProfitTrendsChart(profitData);
    renderSalesForecastChart(forecastData);
    renderCustomerGrowthChart(customerData.customersByMonth);
    
  } catch (err) {
    console.error('Load analytics error:', err);
    showNotification('Failed to load analytics', 'error');
  }
}

// ============================================
// BARCODE SCANNER FUNCTIONALITY
// ============================================

let barcodeBuffer = '';
let barcodeTimeout = null;

function initializeBarcodeScanner() {
  document.addEventListener('keypress', (e) => {
    // Ignore if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    
    clearTimeout(barcodeTimeout);
    
    if (e.key === 'Enter') {
      if (barcodeBuffer.length > 0) {
        handleBarcodeScanned(barcodeBuffer);
        barcodeBuffer = '';
      }
    } else {
      barcodeBuffer += e.key;
      barcodeTimeout = setTimeout(() => {
        barcodeBuffer = '';
      }, 100);
    }
  });
}

async function handleBarcodeScanned(barcode) {
  try {
    showNotification(`Scanning barcode: ${barcode}`, 'info');
    
    const response = await fetchWithAuth(`${API_URL}/stock/barcode/${barcode}`);
    
    if (!response.ok) {
      throw new Error('Item not found');
    }
    
    const item = await response.json();
    
    // If in sales section, add to cart
    if (currentSection === 'sales') {
      addToCart(item);
      showNotification(`Added ${item.item_name} to cart`, 'success');
    } else {
      // Show item details modal
      showItemDetailsModal(item);
    }
    
  } catch (err) {
    console.error('Barcode scan error:', err);
    showNotification(err.message, 'error');
  }
}

function showBarcodeGeneratorModal(itemId) {
  const modalHTML = `
    <div class="modal" id="barcodeGeneratorModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Generate Barcode</h2>
          <button class="btn-close" onclick="closeModal('barcodeGeneratorModal')">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Barcode Type</label>
            <select id="barcodeType">
              <option value="EAN13">EAN-13</option>
              <option value="CODE128">Code 128</option>
              <option value="UPC">UPC</option>
            </select>
          </div>
          <div id="barcodePreview" class="barcode-preview">
            <!-- Barcode will be displayed here -->
          </div>
          <div class="modal-footer">
            <button class="btn" onclick="closeModal('barcodeGeneratorModal')">Cancel</button>
            <button class="btn btn-primary" onclick="generateBarcode(${itemId})">Generate</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function generateBarcode(itemId) {
  try {
    const barcodeType = document.getElementById('barcodeType').value;
    
    const response = await fetchWithAuth(`${API_URL}/stock/${itemId}/generate-barcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcodeType })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error);
    }
    
    showNotification(`Barcode generated: ${data.barcode}`, 'success');
    closeModal('barcodeGeneratorModal');
    loadStockSection(); // Refresh the stock list
    
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

// ============================================
// ENHANCED SALES WITH BARCODE
// ============================================

function enhanceSalesSection() {
  const salesSection = document.getElementById('sales');
  
  // Add barcode scan indicator
  const scanIndicator = document.createElement('div');
  scanIndicator.className = 'barcode-scan-indicator';
  scanIndicator.innerHTML = `
    <i class="fas fa-barcode"></i>
    <span>Ready to scan barcodes</span>
  `;
  
  salesSection.querySelector('.section-header')?.appendChild(scanIndicator);
  
  // Enhance add item button with barcode option
  const addItemBtn = salesSection.querySelector('.add-item-btn');
  if (addItemBtn) {
    addItemBtn.insertAdjacentHTML('afterend', `
      <button class="btn" onclick="toggleBarcodeScanner()">
        <i class="fas fa-barcode"></i>
        Scan Barcode
      </button>
    `);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function closeModal(modalId) {
  document.getElementById(modalId)?.remove();
}

// ============================================
// CHART RENDERING (using Chart.js)
// ============================================

function renderProfitTrendsChart(data) {
  const ctx = document.getElementById('profitTrendsChart')?.getContext('2d');
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.period),
      datasets: [
        {
          label: 'Sales',
          data: data.map(d => d.totalSales),
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          fill: true
        },
        {
          label: 'Purchases',
          data: data.map(d => d.totalPurchases),
          borderColor: '#f44336',
          backgroundColor: 'rgba(244, 67, 54, 0.1)',
          fill: true
        },
        {
          label: 'Profit',
          data: data.map(d => d.profit),
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' }
      }
    }
  });
}

function renderSalesForecastChart(data) {
  const ctx = document.getElementById('salesForecastChart')?.getContext('2d');
  if (!ctx) return;
  
  const historicalData = data.historical.map(d => ({ x: d.month, y: d.totalSales }));
  const forecastData = data.forecast.map(d => ({ x: d.month, y: d.predictedSales }));
  
  new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Historical Sales',
          data: historicalData,
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)'
        },
        {
          label: 'Forecast',
          data: forecastData,
          borderColor: '#FF9800',
          borderDash: [5, 5],
          backgroundColor: 'rgba(255, 152, 0, 0.1)'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { x: { type: 'category' } }
    }
  });
}

function renderCustomerGrowthChart(data) {
  const ctx = document.getElementById('customerGrowthChart')?.getContext('2d');
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.month),
      datasets: [{
        label: 'New Customers',
        data: data.map(d => d.newCustomers),
        backgroundColor: '#9C27B0'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

// ============================================
// INITIALIZATION
// ============================================

// Wait for DOM to be ready before initializing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  initializeAuth();
  initializeBarcodeScanner();
}

// Export functions for global access
window.login = login;
window.logout = logout;
window.hasPermission = hasPermission;
window.loadUsersSection = loadUsersSection;
window.loadActivityLogsSection = loadActivityLogsSection;
window.loadAnalyticsSection = loadAnalyticsSection;
window.showBarcodeGeneratorModal = showBarcodeGeneratorModal;
window.generateBarcode = generateBarcode;
window.closeModal = closeModal;
window.showCreateUserModal = showCreateUserModal;
window.updatePermissions = updatePermissions;
window.editUser = editUser;
window.resetUserPassword = resetUserPassword;
window.changePassword = changePassword;
window.showUserMenu = showUserMenu;

})(); // End of IIFE