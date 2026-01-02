/**
 * Authentication and Session Management
 * Add this to frontend/app.js or create a new auth.js file
 */

// ============================================
// AUTHENTICATION STATE
// ============================================

let currentUser = null;
let sessionToken = null;

/**
 * Initialize Authentication
 */
function initAuth() {
  // Check for saved session
  const savedSession = localStorage.getItem('sessionToken');
  const savedUser = localStorage.getItem('currentUser');
  
  if (savedSession && savedUser) {
    sessionToken = savedSession;
    currentUser = JSON.parse(savedUser);
    validateSession();
  } else {
    showLoginScreen();
  }
}

/**
 * Show Login Screen
 */
function showLoginScreen() {
  const loginHTML = `
    <div class="login-container" style="
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    ">
      <div class="login-card" style="
        background: white;
        padding: 40px;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        width: 400px;
      ">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin: 0 0 10px 0;">AutoCity Pro</h1>
          <p style="color: #666; margin: 0;">Accounting & Inventory System</p>
        </div>
        
        <form id="loginForm" style="display: flex; flex-direction: column; gap: 20px;">
          <div>
            <label style="display: block; margin-bottom: 5px; color: #555; font-weight: 500;">
              Username
            </label>
            <input 
              type="text" 
              id="loginUsername" 
              required
              style="
                width: 100%;
                padding: 12px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                font-size: 14px;
              "
              placeholder="Enter your username"
            />
          </div>
          
          <div>
            <label style="display: block; margin-bottom: 5px; color: #555; font-weight: 500;">
              Password
            </label>
            <input 
              type="password" 
              id="loginPassword" 
              required
              style="
                width: 100%;
                padding: 12px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                font-size: 14px;
              "
              placeholder="Enter your password"
            />
          </div>
          
          <div id="loginError" style="
            color: #e74c3c;
            font-size: 14px;
            display: none;
            padding: 10px;
            background: #fee;
            border-radius: 6px;
          "></div>
          
          <button 
            type="submit" 
            style="
              padding: 14px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: transform 0.2s;
            "
            onmouseover="this.style.transform='translateY(-2px)'"
            onmouseout="this.style.transform='translateY(0)'"
          >
            Sign In
          </button>
        </form>
        
        <div style="margin-top: 20px; text-align: center; color: #999; font-size: 12px;">
          v1.0.0 | © 2024 AutoCity
        </div>
      </div>
    </div>
  `;
  
  document.body.innerHTML = loginHTML;
  
  // Add login form handler
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

/**
 * Handle Login
 */
async function handleLogin(e) {
  e.preventDefault();
  
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  
  errorDiv.style.display = 'none';
  
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
    
    // Save session
    currentUser = data.user;
    sessionToken = data.sessionToken;
    localStorage.setItem('sessionToken', sessionToken);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Reload app with authentication
    window.location.reload();
    
  } catch (error) {
    errorDiv.textContent = error.message;
    errorDiv.style.display = 'block';
  }
}

/**
 * Validate Session
 */
async function validateSession() {
  try {
    const response = await fetch(`${API_URL}/auth/validate`, {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    });
    
    if (!response.ok) {
      throw new Error('Session expired');
    }
    
    updateUIForUser();
  } catch (error) {
    logout();
  }
}

/**
 * Logout
 */
async function logout() {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
  
  // Clear session
  currentUser = null;
  sessionToken = null;
  localStorage.removeItem('sessionToken');
  localStorage.removeItem('currentUser');
  
  showLoginScreen();
}

/**
 * Update UI based on user permissions
 */
function updateUIForUser() {
  if (!currentUser) return;
  
  // Update user info in topbar
  document.getElementById('currentUserName').textContent = currentUser.fullName || currentUser.username;
  document.getElementById('currentUserRole').textContent = currentUser.role.toUpperCase();
  
  // Hide/show menu items based on permissions
  const menuItems = document.querySelectorAll('[data-module]');
  menuItems.forEach(item => {
    const module = item.dataset.module;
    const permission = currentUser.permissions[module];
    
    if (!permission || !permission.view) {
      item.style.display = 'none';
    }
  });
  
  // Update action buttons based on permissions
  updateActionButtonsPermissions();
}

/**
 * Update Action Buttons based on permissions
 */
function updateActionButtonsPermissions() {
  const currentModule = getCurrentModule();
  const permissions = currentUser?.permissions[currentModule];
  
  if (!permissions) return;
  
  // Hide/disable buttons based on permissions
  document.querySelectorAll('[data-action="create"]').forEach(btn => {
    btn.style.display = permissions.create ? 'inline-block' : 'none';
  });
  
  document.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.style.display = permissions.edit ? 'inline-block' : 'none';
  });
  
  document.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.style.display = permissions.delete ? 'inline-block' : 'none';
  });
  
  document.querySelectorAll('[data-action="export"]').forEach(btn => {
    btn.style.display = permissions.export ? 'inline-block' : 'none';
  });
}

/**
 * Get current module
 */
function getCurrentModule() {
  return currentSection; // Assumes currentSection variable exists
}

/**
 * Check Permission
 */
function hasPermission(module, action) {
  if (!currentUser || !currentUser.permissions) return false;
  
  const permissions = currentUser.permissions[module];
  if (!permissions) return false;
  
  return permissions[action] === true;
}

/**
 * API Request with Authentication
 */
async function authenticatedFetch(url, options = {}) {
  if (!sessionToken) {
    throw new Error('Not authenticated');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionToken}`,
    ...options.headers
  };
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  // Handle session expiration
  if (response.status === 401 || response.status === 403) {
    logout();
    throw new Error('Session expired');
  }
  
  return response;
}

// ============================================
// USER MANAGEMENT UI
// ============================================

/**
 * Load Users Section (Admin only)
 */
async function loadUsersSection() {
  if (!hasPermission('users', 'view')) {
    showError('You do not have permission to view users');
    return;
  }
  
  const container = document.getElementById('usersSection');
  
  container.innerHTML = `
    <div class="section-header">
      <h2>User Management</h2>
      ${hasPermission('users', 'create') ? `
        <button onclick="showAddUserModal()" class="btn-primary">
          <i class="icon-plus"></i> Add User
        </button>
      ` : ''}
    </div>
    
    <div class="users-grid" id="usersGrid">
      <div class="loading">Loading users...</div>
    </div>
  `;
  
  try {
    const response = await authenticatedFetch(`${API_URL}/users`);
    const users = await response.json();
    
    displayUsers(users);
  } catch (error) {
    showError('Failed to load users: ' + error.message);
  }
}

/**
 * Display Users
 */
function displayUsers(users) {
  const grid = document.getElementById('usersGrid');
  
  if (users.length === 0) {
    grid.innerHTML = '<div class="empty-state">No users found</div>';
    return;
  }
  
  const usersHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Username</th>
          <th>Full Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Status</th>
          <th>Last Login</th>
          <th>Login Count</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${users.map(user => `
          <tr>
            <td>${user.username}</td>
            <td>${user.full_name || '-'}</td>
            <td>${user.email || '-'}</td>
            <td>
              <span class="badge badge-${getRoleBadgeClass(user.role)}">
                ${user.role.toUpperCase()}
              </span>
            </td>
            <td>
              <span class="badge ${user.is_active ? 'badge-success' : 'badge-danger'}">
                ${user.is_active ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td>${formatDateTime(user.last_login) || 'Never'}</td>
            <td>${user.login_count || 0}</td>
            <td>
              ${hasPermission('users', 'edit') ? `
                <button onclick="editUser(${user.id})" class="btn-sm btn-secondary">
                  Edit
                </button>
              ` : ''}
              ${hasPermission('users', 'delete') && user.id !== currentUser.id ? `
                <button onclick="deleteUser(${user.id}, '${user.username}')" class="btn-sm btn-danger">
                  Delete
                </button>
              ` : ''}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  grid.innerHTML = usersHTML;
}

/**
 * Show Add User Modal
 */
function showAddUserModal() {
  const modal = createModal('Add New User', `
    <form id="addUserForm">
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
        <select name="role" required>
          <option value="cashier">Cashier</option>
          <option value="manager">Manager</option>
          <option value="admin">Administrator</option>
        </select>
      </div>
      
      <div class="form-actions">
        <button type="button" onclick="closeModal()" class="btn-secondary">Cancel</button>
        <button type="submit" class="btn-primary">Create User</button>
      </div>
    </form>
  `);
  
  document.getElementById('addUserForm').addEventListener('submit', handleAddUser);
}

/**
 * Handle Add User
 */
async function handleAddUser(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const userData = Object.fromEntries(formData);
  
  try {
    const response = await authenticatedFetch(`${API_URL}/users`, {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to create user');
    }
    
    showSuccess('User created successfully');
    closeModal();
    loadUsersSection();
  } catch (error) {
    showError(error.message);
  }
}

/**
 * Get role badge class
 */
function getRoleBadgeClass(role) {
  switch(role) {
    case 'admin': return 'danger';
    case 'manager': return 'warning';
    case 'cashier': return 'info';
    default: return 'secondary';
  }
}

/**
 * Format DateTime
 */
function formatDateTime(dateString) {
  if (!dateString) return null;
  
  const date = new Date(dateString);
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ============================================
// Initialize on load
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
});
