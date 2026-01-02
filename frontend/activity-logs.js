/**
 * Activity Logs & Audit Trail
 * Comprehensive activity tracking and reporting
 */

// ============================================
// ACTIVITY LOGS UI
// ============================================

/**
 * Load Activity Logs Section
 */
async function loadActivityLogsSection() {
  if (!hasPermission('reports', 'view')) {
    showError('You do not have permission to view activity logs');
    return;
  }
  
  const container = document.getElementById('activityLogsSection');
  
  container.innerHTML = `
    <div class="activity-logs-page">
      <div class="section-header">
        <h2>Activity Logs & Audit Trail</h2>
        <button onclick="exportActivityLogs()" class="btn-secondary">
          <i class="icon-download"></i> Export Logs
        </button>
      </div>
      
      <!-- Filters -->
      <div class="activity-filters">
        <div class="filter-group">
          <label>Date Range</label>
          <input type="date" id="activityStartDate" />
          <span>to</span>
          <input type="date" id="activityEndDate" />
        </div>
        
        <div class="filter-group">
          <label>User</label>
          <select id="activityUserFilter">
            <option value="">All Users</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Module</label>
          <select id="activityModuleFilter">
            <option value="">All Modules</option>
            <option value="sales">Sales</option>
            <option value="stock">Stock</option>
            <option value="voucher">Voucher</option>
            <option value="ledger">Ledger</option>
            <option value="users">Users</option>
            <option value="auth">Authentication</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Action Type</label>
          <select id="activityActionFilter">
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="view">View</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
          </select>
        </div>
        
        <button onclick="filterActivityLogs()" class="btn-primary">
          Apply Filters
        </button>
        <button onclick="resetActivityFilters()" class="btn-secondary">
          Reset
        </button>
      </div>
      
      <!-- Statistics -->
      <div id="activityStats" class="activity-stats"></div>
      
      <!-- Logs Table -->
      <div id="activityLogsTable" class="activity-logs-table">
        <div class="loading">Loading activity logs...</div>
      </div>
      
      <!-- Pagination -->
      <div id="activityPagination" class="pagination"></div>
    </div>
  `;
  
  // Set default dates (last 7 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  document.getElementById('activityStartDate').value = startDate.toISOString().split('T')[0];
  document.getElementById('activityEndDate').value = endDate.toISOString().split('T')[0];
  
  // Load users for filter
  await loadActivityUsersFilter();
  
  // Load initial logs
  await loadActivityLogs();
  
  // Load statistics
  await loadActivityStats();
}

/**
 * Load Users for Filter
 */
async function loadActivityUsersFilter() {
  try {
    const response = await authenticatedFetch(`${API_URL}/users`);
    const users = await response.json();
    
    const select = document.getElementById('activityUserFilter');
    users.forEach(user => {
      const option = document.createElement('option');
      option.value = user.id;
      option.textContent = `${user.full_name || user.username} (${user.role})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load users:', error);
  }
}

/**
 * Load Activity Logs
 */
async function loadActivityLogs(page = 1, limit = 50) {
  const container = document.getElementById('activityLogsTable');
  container.innerHTML = '<div class="loading">Loading activity logs...</div>';
  
  try {
    const startDate = document.getElementById('activityStartDate').value;
    const endDate = document.getElementById('activityEndDate').value;
    const userId = document.getElementById('activityUserFilter').value;
    const module = document.getElementById('activityModuleFilter').value;
    const actionType = document.getElementById('activityActionFilter').value;
    
    let url = `${API_URL}/activity-logs?limit=${limit}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    if (userId) url += `&userId=${userId}`;
    if (module) url += `&module=${module}`;
    if (actionType) url += `&actionType=${actionType}`;
    
    const response = await authenticatedFetch(url);
    const logs = await response.json();
    
    displayActivityLogs(logs);
  } catch (error) {
    container.innerHTML = `<div class="error">Failed to load activity logs: ${error.message}</div>`;
  }
}

/**
 * Display Activity Logs
 */
function displayActivityLogs(logs) {
  const container = document.getElementById('activityLogsTable');
  
  if (logs.length === 0) {
    container.innerHTML = '<div class="empty-state">No activity logs found for the selected filters</div>';
    return;
  }
  
  const html = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>User</th>
          <th>Action</th>
          <th>Module</th>
          <th>Description</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        ${logs.map(log => `
          <tr class="activity-row ${getSeverityClass(log.severity)}">
            <td class="timestamp">${formatDateTime(log.timestamp)}</td>
            <td>
              <div class="user-info">
                <strong>${log.user_full_name || log.username || 'System'}</strong>
                ${log.username ? `<small>${log.username}</small>` : ''}
              </div>
            </td>
            <td>
              <span class="badge badge-${getActionBadgeClass(log.action_type)}">
                ${log.action_type.toUpperCase()}
              </span>
            </td>
            <td>
              <span class="module-badge">${log.module}</span>
            </td>
            <td class="description">${escapeHtml(log.description)}</td>
            <td>
              ${log.old_values || log.new_values ? `
                <button onclick="showActivityDetails(${log.id})" class="btn-sm btn-secondary">
                  View Changes
                </button>
              ` : '-'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  container.innerHTML = html;
}

/**
 * Load Activity Statistics
 */
async function loadActivityStats() {
  try {
    const startDate = document.getElementById('activityStartDate').value;
    const endDate = document.getElementById('activityEndDate').value;
    
    const response = await authenticatedFetch(
      `${API_URL}/activity-logs/stats?startDate=${startDate}&endDate=${endDate}`
    );
    
    const stats = await response.json();
    
    displayActivityStats(stats);
  } catch (error) {
    console.error('Failed to load activity stats:', error);
  }
}

/**
 * Display Activity Statistics
 */
function displayActivityStats(stats) {
  const container = document.getElementById('activityStats');
  
  const html = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Activities</div>
        <div class="stat-value">${stats.totalActivities}</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-label">Most Active Module</div>
        <div class="stat-value">${stats.byModule[0]?.module || 'N/A'}</div>
        <div class="stat-subtitle">${stats.byModule[0]?.count || 0} actions</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-label">Most Active User</div>
        <div class="stat-value">${stats.byUser[0]?.full_name || 'N/A'}</div>
        <div class="stat-subtitle">${stats.byUser[0]?.count || 0} actions</div>
      </div>
    </div>
    
    <div class="stats-charts">
      <div class="chart-half">
        <h4>Activities by Module</h4>
        <canvas id="moduleActivityChart"></canvas>
      </div>
      
      <div class="chart-half">
        <h4>Activities by Action Type</h4>
        <canvas id="actionTypeChart"></canvas>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
  
  // Draw charts
  drawModuleActivityChart(stats.byModule);
  drawActionTypeChart(stats.byActionType);
}

/**
 * Draw Module Activity Chart
 */
function drawModuleActivityChart(data) {
  const ctx = document.getElementById('moduleActivityChart');
  if (!ctx) return;
  
  if (window.moduleActivityChart) {
    window.moduleActivityChart.destroy();
  }
  
  window.moduleActivityChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.module),
      datasets: [{
        data: data.map(d => d.count),
        backgroundColor: [
          '#3498db',
          '#2ecc71',
          '#f39c12',
          '#e74c3c',
          '#9b59b6',
          '#1abc9c',
          '#34495e'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right'
        }
      }
    }
  });
}

/**
 * Draw Action Type Chart
 */
function drawActionTypeChart(data) {
  const ctx = document.getElementById('actionTypeChart');
  if (!ctx) return;
  
  if (window.actionTypeChart) {
    window.actionTypeChart.destroy();
  }
  
  window.actionTypeChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.action_type.toUpperCase()),
      datasets: [{
        label: 'Count',
        data: data.map(d => d.count),
        backgroundColor: '#3498db'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

/**
 * Show Activity Details Modal
 */
async function showActivityDetails(logId) {
  try {
    const response = await authenticatedFetch(`${API_URL}/activity-logs/${logId}`);
    const log = await response.json();
    
    let changesHTML = '';
    
    if (log.old_values && log.new_values) {
      const oldValues = JSON.parse(log.old_values);
      const newValues = JSON.parse(log.new_values);
      
      changesHTML = '<div class="changes-comparison">';
      changesHTML += '<table class="data-table">';
      changesHTML += '<thead><tr><th>Field</th><th>Old Value</th><th>New Value</th></tr></thead>';
      changesHTML += '<tbody>';
      
      const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
      allKeys.forEach(key => {
        const oldVal = oldValues[key];
        const newVal = newValues[key];
        
        if (oldVal !== newVal) {
          changesHTML += `
            <tr>
              <td><strong>${key}</strong></td>
              <td class="old-value">${oldVal || '-'}</td>
              <td class="new-value">${newVal || '-'}</td>
            </tr>
          `;
        }
      });
      
      changesHTML += '</tbody></table></div>';
    }
    
    const modal = createModal('Activity Details', `
      <div class="activity-details">
        <div class="detail-row">
          <strong>Timestamp:</strong>
          <span>${formatDateTime(log.timestamp)}</span>
        </div>
        <div class="detail-row">
          <strong>User:</strong>
          <span>${log.user_full_name || log.username}</span>
        </div>
        <div class="detail-row">
          <strong>Action:</strong>
          <span class="badge badge-${getActionBadgeClass(log.action_type)}">
            ${log.action_type.toUpperCase()}
          </span>
        </div>
        <div class="detail-row">
          <strong>Module:</strong>
          <span>${log.module}</span>
        </div>
        <div class="detail-row">
          <strong>Description:</strong>
          <span>${escapeHtml(log.description)}</span>
        </div>
        
        ${changesHTML ? `
          <hr>
          <h4>Changes Made:</h4>
          ${changesHTML}
        ` : ''}
        
        <div class="modal-actions">
          <button onclick="closeModal()" class="btn-secondary">Close</button>
        </div>
      </div>
    `);
    
  } catch (error) {
    showError('Failed to load activity details: ' + error.message);
  }
}

/**
 * Filter Activity Logs
 */
function filterActivityLogs() {
  loadActivityLogs();
  loadActivityStats();
}

/**
 * Reset Activity Filters
 */
function resetActivityFilters() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  document.getElementById('activityStartDate').value = startDate.toISOString().split('T')[0];
  document.getElementById('activityEndDate').value = endDate.toISOString().split('T')[0];
  document.getElementById('activityUserFilter').value = '';
  document.getElementById('activityModuleFilter').value = '';
  document.getElementById('activityActionFilter').value = '';
  
  loadActivityLogs();
  loadActivityStats();
}

/**
 * Export Activity Logs
 */
async function exportActivityLogs() {
  try {
    const startDate = document.getElementById('activityStartDate').value;
    const endDate = document.getElementById('activityEndDate').value;
    const userId = document.getElementById('activityUserFilter').value;
    const module = document.getElementById('activityModuleFilter').value;
    
    let url = `${API_URL}/activity-logs/export?format=csv`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    if (userId) url += `&userId=${userId}`;
    if (module) url += `&module=${module}`;
    
    const response = await authenticatedFetch(url);
    const blob = await response.blob();
    
    // Download file
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    showSuccess('Activity logs exported successfully');
  } catch (error) {
    showError('Failed to export activity logs: ' + error.message);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get Severity Class
 */
function getSeverityClass(severity) {
  switch(severity) {
    case 'critical': return 'severity-critical';
    case 'error': return 'severity-error';
    case 'warning': return 'severity-warning';
    default: return 'severity-info';
  }
}

/**
 * Get Action Badge Class
 */
function getActionBadgeClass(action) {
  switch(action) {
    case 'create': return 'success';
    case 'update': return 'info';
    case 'delete': return 'danger';
    case 'login': return 'primary';
    case 'logout': return 'secondary';
    default: return 'secondary';
  }
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Format DateTime
 */
function formatDateTime(dateString) {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}
