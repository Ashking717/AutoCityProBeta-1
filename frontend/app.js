// Enhanced Frontend Application for Electron (with embedded Express server)
//frontend/app.js
const API_URL = 'http://localhost:5001/api';
let currentSection = 'dashboard';
let salesCart = [];
let editingId = null;

// Check if running in Electron
const isElectron = window.electronAPI?.isElectron || false;

// ============== INITIALIZATION ==============
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  setupKeyboardShortcuts();
  updateDashboard();
});

function initializeApp() {
  // Wait for DOM to be fully ready
  setTimeout(() => {
    showSection('dashboard');
  }, 100);
  setInterval(autoSave, 60000); // Auto-save every minute
}

// ============== NAVIGATION ==============
function showSection(sectionId) {
  // Update active states
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar nav button').forEach(b => b.classList.remove('active'));
  
  const section = document.getElementById(sectionId);
  if (!section) {
    console.error('❌ Section not found:', sectionId);
    return;
  }
  
  section.classList.add('active');
  currentSection = sectionId;
  
  // Update topbar
  const titles = {
    dashboard: 'Dashboard',
    ledger: 'Ledger Management',
    voucher: 'Voucher Entry',
    stock: 'Stock Management',
    categories: 'Categories',
    sales: 'Sales / POS',
    customers: 'Customers',
    reports: 'Reports',
    settings: 'Settings',
    // ENHANCED: New sections
    users: 'User Management',
    activityLogs: 'Activity Logs',
    analytics: 'Advanced Analytics'
  };
  
  document.getElementById('pageTitle').textContent = titles[sectionId] || 'Dashboard';
  document.getElementById('breadcrumb').textContent = titles[sectionId] || 'Dashboard';
  
  // Load section content
  loadSectionContent(sectionId);
  
  // Update active nav button
  event?.target?.classList.add('active');
}
function loadSectionContent(section) {
  switch(section) {
    case 'dashboard':
      updateDashboard();
      break;
    case 'ledger':
      loadLedgerSection();
      break;
    case 'voucher':
      loadVoucherSection();
      break;
    case 'stock':
      loadStockSection();
      break;
    case 'categories':
      loadCategoriesSection();
      break;
    case 'sales':
      loadSalesSection();
      break;
    case 'customers':
      loadCustomersSection();
      break;
    case 'reports':
      loadReportsSection();
      break;
    case 'settings':
      loadSettingsSection();
      break;
  }
}

// ============== KEYBOARD SHORTCUTS ==============
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Function keys
    if (e.key === 'F1') { e.preventDefault(); showSection('dashboard'); }
    if (e.key === 'F2') { e.preventDefault(); showSection('ledger'); }
    if (e.key === 'F3') { e.preventDefault(); showSection('voucher'); }
    if (e.key === 'F4') { e.preventDefault(); showSection('stock'); }
    if (e.key === 'F5') { e.preventDefault(); showSection('sales'); }
    
    // Ctrl shortcuts
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      if (currentSection === 'sales') completeSale();
    }
    
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      openNewItemModal();
    }
    
    // ESC to close modals
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
}

// ============== DASHBOARD ==============
async function updateDashboard() {
  try {
    const response = await fetch(`${API_URL}/dashboard/stats`);
    const stats = await response.json();
    
    document.getElementById('totalLedgers').textContent = stats.total_ledgers || 0;
    document.getElementById('totalStock').textContent = stats.total_stock_items || 0;
    document.getElementById('lowStockCount').textContent = stats.low_stock_count || 0;
    document.getElementById('salesLast30').textContent = 
      `QAR.${(stats.sales_last_30_days || 0).toLocaleString('en-IN', {maximumFractionDigits: 2})}`;
  } catch (error) {
    console.error('Dashboard update error:', error);
  }
}

// ============== LEDGER MANAGEMENT ==============
async function loadLedgerSection() {
  const section = document.getElementById('ledger');
  section.innerHTML = `
    <div class="form-card">
      <h3><i class="fas fa-plus-circle"></i> Add New Ledger</h3>
      <div class="form-grid">
        <div class="form-group">
          <label>Ledger Name <span class="required">*</span></label>
          <input type="text" id="ledgerName" placeholder="Enter ledger name" required>
        </div>
        <div class="form-group">
          <label>Ledger Type <span class="required">*</span></label>
          <select id="ledgerType">
            <option value="Asset">Asset</option>
            <option value="Liability">Liability</option>
            <option value="Income">Income</option>
            <option value="Expense">Expense</option>
          </select>
        </div>
        <div class="form-group">
          <label>Opening Balance</label>
          <input type="number" id="ledgerOpeningBalance" placeholder="0.00" step="0.01">
        </div>
        <div class="form-group">
          <label>Parent Group</label>
          <select id="ledgerParentGroup">
            <option value="">None</option>
            <option value="Cash">Cash</option>
            <option value="Bank">Bank</option>
            <option value="Sales">Sales</option>
            <option value="Purchase">Purchase</option>
          </select>
        </div>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="saveLedger()">
          <i class="fas fa-save"></i> Save Ledger
        </button>
        <button class="btn btn-secondary" onclick="clearLedgerForm()">
          <i class="fas fa-times"></i> Clear
        </button>
      </div>
    </div>

    <div class="table-card">
      <div class="table-header">
        <h3><i class="fas fa-list"></i> All Ledgers</h3>
        <div class="table-controls">
          <div class="table-search">
            <i class="fas fa-search"></i>
            <input type="text" placeholder="Search ledgers..." onkeyup="searchLedgers(this.value)">
          </div>
          <select onchange="filterLedgersByType(this.value)" class="form-control">
            <option value="">All Types</option>
            <option value="Asset">Asset</option>
            <option value="Liability">Liability</option>
            <option value="Income">Income</option>
            <option value="Expense">Expense</option>
          </select>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Parent Group</th>
            <th>Opening Balance</th>
            <th>Current Balance</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="ledgerTableBody">
          <tr><td colspan="6" class="empty-state">
            <i class="fas fa-spinner fa-spin"></i> Loading...
          </td></tr>
        </tbody>
      </table>
    </div>
  `;
  
  fetchLedgers();
}

async function fetchLedgers(params = {}) {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/ledgers?${queryString}`);
    const ledgers = await response.json();
    
    const tbody = document.getElementById('ledgerTableBody');
    
    if (ledgers.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="6">
          <div class="empty-state">
            <i class="fas fa-book"></i>
            <h3>No Ledgers Found</h3>
            <p>Start by adding your first ledger account</p>
          </div>
        </td></tr>
      `;
      return;
    }
    
    tbody.innerHTML = ledgers.map(ledger => `
      <tr>
        <td><strong>${ledger.name}</strong></td>
        <td><span class="badge badge-${getTypeColor(ledger.type)}">${ledger.type}</span></td>
        <td>${ledger.parent_group || '-'}</td>
        <td>QAR.${(ledger.opening_balance || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
        <td>QAR.${(ledger.balance || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
        <td class="table-actions">
          <button class="action-btn edit" onclick="editLedger(${ledger.id})">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="action-btn delete" onclick="deleteLedger(${ledger.id})">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    showToast('Error loading ledgers', 'error');
    console.error(error);
  }
}

async function saveLedger() {
  const name = document.getElementById('ledgerName').value.trim();
  const type = document.getElementById('ledgerType').value;
  const opening_balance = parseFloat(document.getElementById('ledgerOpeningBalance').value) || 0;
  const parent_group = document.getElementById('ledgerParentGroup').value;
  
  if (!name) {
    showToast('Please enter ledger name', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/ledgers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, opening_balance, parent_group })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast('Ledger saved successfully', 'success');
      clearLedgerForm();
      fetchLedgers();
      updateDashboard();
    } else {
      showToast(data.error || 'Failed to save ledger', 'error');
    }
  } catch (error) {
    showToast('Error saving ledger', 'error');
    console.error(error);
  }
}

function clearLedgerForm() {
  document.getElementById('ledgerName').value = '';
  document.getElementById('ledgerOpeningBalance').value = '';
  document.getElementById('ledgerParentGroup').value = '';
}

function searchLedgers(query) {
  fetchLedgers({ search: query });
}

function filterLedgersByType(type) {
  fetchLedgers({ type });
}

// ============== VOUCHER ENTRY ==============
async function loadVoucherSection() {
  const section = document.getElementById('voucher');
  section.innerHTML = `
    <div class="form-card">
      <h3><i class="fas fa-file-invoice"></i> New Voucher Entry</h3>
      <div class="form-grid">
        <div class="form-group">
          <label>Date <span class="required">*</span></label>
          <input type="date" id="voucherDate" value="${new Date().toISOString().split('T')[0]}" required>
        </div>
        <div class="form-group">
          <label>Voucher Type</label>
          <select id="voucherType">
            <option value="Payment">Payment</option>
            <option value="Receipt">Receipt</option>
            <option value="Journal">Journal</option>
            <option value="Contra">Contra</option>
          </select>
        </div>
        <div class="form-group">
          <label>Debit Ledger <span class="required">*</span></label>
          <select id="debitLedger"></select>
        </div>
        <div class="form-group">
          <label>Credit Ledger <span class="required">*</span></label>
          <select id="creditLedger"></select>
        </div>
        <div class="form-group">
          <label>Amount <span class="required">*</span></label>
          <input type="number" id="voucherAmount" placeholder="0.00" step="0.01" required>
        </div>
        <div class="form-group">
          <label>Reference No.</label>
          <input type="text" id="voucherReference" placeholder="Optional">
        </div>
      </div>
      <div class="form-group">
        <label>Narration</label>
        <textarea id="voucherNarration" placeholder="Enter voucher details..."></textarea>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="saveVoucher()">
          <i class="fas fa-check"></i> Post Voucher
        </button>
        <button class="btn btn-secondary" onclick="clearVoucherForm()">
          <i class="fas fa-times"></i> Clear
        </button>
      </div>
    </div>

    <div class="table-card">
      <div class="table-header">
        <h3><i class="fas fa-list"></i> Recent Vouchers</h3>
        <div class="table-controls">
          <input type="date" id="voucherFilterDate" onchange="filterVouchersByDate(this.value)">
          <button class="btn btn-sm btn-secondary" onclick="clearVoucherFilter()" style="margin-left: 10px;">
            <i class="fas fa-times"></i> Clear Filter
          </button>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Voucher No</th>
            <th>Date</th>
            <th>Type</th>
            <th>Debit</th>
            <th>Credit</th>
            <th>Amount</th>
            <th>Reference</th>
          </tr>
        </thead>
        <tbody id="voucherTableBody">
          <tr><td colspan="7" class="empty-state">
            <i class="fas fa-spinner fa-spin"></i> Loading...
          </td></tr>
        </tbody>
      </table>
    </div>
  `;
  
  await populateVoucherLedgers();
  fetchVouchers();
}

async function populateVoucherLedgers() {
  try {
    const response = await fetch(`${API_URL}/ledgers?active=true`);
    const ledgers = await response.json();
    
    const debitSelect = document.getElementById('debitLedger');
    const creditSelect = document.getElementById('creditLedger');
    
    const options = ledgers.map(l => 
      `<option value="${l.name}">${l.name} (${l.type})</option>`
    ).join('');
    
    debitSelect.innerHTML = '<option value="">Select Ledger</option>' + options;
    creditSelect.innerHTML = '<option value="">Select Ledger</option>' + options;
  } catch (error) {
    console.error('Error loading ledgers:', error);
  }
}

async function fetchVouchers(params = {}) {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/vouchers?${queryString}`);
    const vouchers = await response.json();
    
    const tbody = document.getElementById('voucherTableBody');
    
    if (vouchers.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="7">
          <div class="empty-state">
            <i class="fas fa-receipt"></i>
            <h3>No Vouchers Found</h3>
            <p>Start by posting your first voucher</p>
          </div>
        </td></tr>
      `;
      return;
    }
    
    tbody.innerHTML = vouchers.map(v => `
      <tr>
        <td><strong>${v.voucher_no}</strong></td>
        <td>${formatDate(v.date)}</td>
        <td><span class="badge badge-success">${v.type}</span></td>
        <td>${v.debit_ledger}</td>
        <td>${v.credit_ledger}</td>
        <td>QAR.${v.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
        <td>${v.reference_no || '-'}</td>
      </tr>
    `).join('');
  } catch (error) {
    showToast('Error loading vouchers', 'error');
    console.error(error);
  }
}

function filterVouchersByDate(date) {
  if (date) {
    // Send both start_date and end_date as the same date to filter for that specific day
    fetchVouchers({ start_date: date, end_date: date });
  } else {
    fetchVouchers();
  }
}

function clearVoucherFilter() {
  const dateInput = document.getElementById('voucherFilterDate');
  if (dateInput) {
    dateInput.value = '';
  }
  fetchVouchers();
}

async function saveVoucher() {
  const date = document.getElementById('voucherDate').value;
  const type = document.getElementById('voucherType').value;
  const debit_ledger = document.getElementById('debitLedger').value;
  const credit_ledger = document.getElementById('creditLedger').value;
  const amount = parseFloat(document.getElementById('voucherAmount').value);
  const reference_no = document.getElementById('voucherReference').value;
  const narration = document.getElementById('voucherNarration').value;
  
  if (!date || !debit_ledger || !credit_ledger || !amount || amount <= 0) {
    showToast('Please fill all required fields', 'error');
    return;
  }
  
  if (debit_ledger === credit_ledger) {
    showToast('Debit and Credit ledgers cannot be same', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/vouchers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, type, debit_ledger, credit_ledger, amount, reference_no, narration })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast('Voucher posted successfully', 'success');
      clearVoucherForm();
      fetchVouchers();
      updateDashboard();
    } else {
      showToast(data.error || 'Failed to post voucher', 'error');
    }
  } catch (error) {
    showToast('Error posting voucher', 'error');
    console.error(error);
  }
}

function clearVoucherForm() {
  document.getElementById('voucherDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('debitLedger').value = '';
  document.getElementById('creditLedger').value = '';
  document.getElementById('voucherAmount').value = '';
  document.getElementById('voucherReference').value = '';
  document.getElementById('voucherNarration').value = '';
}

// ============== STOCK MANAGEMENT ==============
// UPDATED Stock Management Section with Vehicle Compatibility in Form
// Replace the loadStockSection() function with this version

async function loadStockSection() {
  const section = document.getElementById('stock');
  section.innerHTML = `
    <div style="display: grid; gap: 20px;">
      <!-- Tab Navigation -->
      <div class="form-card">
        <div class="btn-group">
          <button class="btn btn-primary" onclick="showStockTab('items')" id="tabItems">
            <i class="fas fa-boxes"></i> Stock Items
          </button>
          <button class="btn btn-secondary" onclick="showStockTab('purchase')" id="tabPurchase">
            <i class="fas fa-truck-loading"></i> Receive Purchase
          </button>
        </div>
      </div>

      <!-- Stock Items Tab -->
      <div id="stockItemsTab" class="stock-tab">
        <div class="form-card">
          <h3><i class="fas fa-box-open"></i> Add/Edit Stock Item</h3>
          <input type="hidden" id="editingStockId">
          
          <!-- Basic Info -->
          <h4 style="color: #475569; margin: 15px 0 10px 0; font-size: 16px;">
            <i class="fas fa-info-circle"></i> Basic Information
          </h4>
          <div class="form-grid">
            <div class="form-group">
              <label>Item Name <span class="required">*</span></label>
              <input type="text" id="itemName" placeholder="Enter item name" required>
            </div>
            <div class="form-group">
              <label>SKU</label>
              <input type="text" id="itemSKU" placeholder="Stock keeping unit">
            </div>
            <div class="form-group">
              <label>Barcode</label>
              <input type="text" id="itemBarcode" placeholder="Barcode number">
            </div>
            <div class="form-group">
              <label>OEM Part No</label>
              <input type="text" id="itemOEM" placeholder="Original Equipment Manufacturer part number">
            </div>
            <div class="form-group">
              <label>Category</label>
              <select id="itemCategory">
                <option value="">Select Category</option>
                <option value="Engine Parts">Engine Parts</option>
                <option value="Brake System">Brake System</option>
                <option value="Suspension">Suspension</option>
                <option value="Electrical">Electrical</option>
                <option value="Body Parts">Body Parts</option>
                <option value="Filters">Filters</option>
                <option value="Oils & Fluids">Oils & Fluids</option>
                <option value="Lighting">Lighting</option>
                <option value="Cooling System">Cooling System</option>
                <option value="Exhaust System">Exhaust System</option>
                <option value="Interior">Interior</option>
                <option value="Accessories">Accessories</option>
                <option value="Tools">Tools</option>
              </select>
            </div>
            <div class="form-group">
              <label>Unit</label>
              <input type="text" id="itemUnit" placeholder="PCS, KG, LTR" value="PCS">
            </div>
          </div>

          <!-- Vehicle Compatibility -->
          <h4 style="color: #475569; margin: 20px 0 10px 0; font-size: 16px;">
            <i class="fas fa-car"></i> Vehicle Compatibility
          </h4>
          <div class="form-grid">
            <div class="form-group">
              <label>Compatible Make(s)</label>
              <select id="itemMake" multiple size="5" style="height: 120px;">
                <option value="">Loading...</option>
              </select>
              <small style="color: #64748b;">Hold Ctrl/Cmd to select multiple</small>
            </div>
            <div class="form-group">
              <label>Compatible Model(s)</label>
              <select id="itemModel" multiple size="5" style="height: 120px;">
                <option value="">Select make first</option>
              </select>
              <small style="color: #64748b;">Hold Ctrl/Cmd to select multiple</small>
            </div>
            <div class="form-group">
              <label>Year From</label>
              <input type="number" id="itemYearFrom" placeholder="e.g., 2010" min="1950" max="2030">
            </div>
            <div class="form-group">
              <label>Year To</label>
              <input type="number" id="itemYearTo" placeholder="e.g., 2025" min="1950" max="2030">
            </div>
          </div>

          <!-- Quantity & Pricing -->
          <h4 style="color: #475569; margin: 20px 0 10px 0; font-size: 16px;">
            <i class="fas fa-chart-line"></i> Quantity & Pricing
          </h4>
          <div class="form-grid">
            <div class="form-group">
              <label>Opening Qty</label>
              <input type="number" id="itemOpeningQty" placeholder="0" step="0.01">
            </div>
            <div class="form-group">
              <label>Min Qty (Alert)</label>
              <input type="number" id="itemMinQty" placeholder="5" value="5">
            </div>
            <div class="form-group">
              <label>Reorder Level</label>
              <input type="number" id="itemReorderLevel" placeholder="10" value="10">
            </div>
            <div class="form-group">
              <label>Max Qty</label>
              <input type="number" id="itemMaxQty" placeholder="1000" value="1000">
            </div>
            <div class="form-group">
              <label>Purchase Rate (QAR)</label>
              <input type="number" id="itemPurchaseRate" placeholder="0.00" step="0.01">
            </div>
            <div class="form-group">
              <label>Sale Rate (QAR)</label>
              <input type="number" id="itemSaleRate" placeholder="0.00" step="0.01">
            </div>
            <div class="form-group">
              <label>MRP (QAR)</label>
              <input type="number" id="itemMRP" placeholder="0.00" step="0.01">
            </div>
            <div class="form-group">
              <label>Tax Rate (%)</label>
              <input type="number" id="itemTaxRate" placeholder="0" value="0">
            </div>
          </div>

          <!-- Location & Supplier -->
          <h4 style="color: #475569; margin: 20px 0 10px 0; font-size: 16px;">
            <i class="fas fa-warehouse"></i> Location & Supplier
          </h4>
          <div class="form-grid">
            <div class="form-group">
              <label>Location</label>
              <input type="text" id="itemLocation" placeholder="Warehouse location">
            </div>
            <div class="form-group">
              <label>Supplier</label>
              <input type="text" id="itemSupplier" placeholder="Supplier name">
            </div>
          </div>

          <div class="btn-group">
            <button class="btn btn-primary" onclick="saveStockItemWithVehicles()">
              <i class="fas fa-save"></i> Save Item
            </button>
            <button class="btn btn-secondary" onclick="clearStockForm()">
              <i class="fas fa-times"></i> Clear
            </button>
          </div>
        </div>

        <div class="table-card">
          <div class="table-header">
            <h3><i class="fas fa-list"></i> Stock Items</h3>
            <div class="table-controls">
              <div class="table-search">
                <i class="fas fa-search"></i>
                <input type="text" placeholder="Search items..." onkeyup="searchStock(this.value)">
              </div>
              <button class="btn btn-secondary" onclick="filterLowStock()">
                <i class="fas fa-exclamation-triangle"></i> Low Stock
              </button>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>OEM Part No</th>
                <th>Compatible Vehicles</th>
                <th>Category</th>
                <th>Qty</th>
                <th>Sale Rate</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="stockTableBody">
              <tr><td colspan="8" class="empty-state">
                <i class="fas fa-spinner fa-spin"></i> Loading...
              </td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Purchase Tab -->
      <div id="stockPurchaseTab" class="stock-tab" style="display: none;">
        <div style="display: grid; grid-template-columns: 1fr 400px; gap: 20px;">
          <div>
            <div class="form-card">
              <h3><i class="fas fa-truck-loading"></i> Receive Purchase</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label>Supplier Name <span class="required">*</span></label>
                  <input type="text" id="purchaseSupplier" placeholder="Supplier name" required>
                </div>
                <div class="form-group">
                  <label>Purchase Date <span class="required">*</span></label>
                  <input type="date" id="purchaseDate" value="${new Date().toISOString().split('T')[0]}" required>
                </div>
              </div>

              <h4 style="margin: 20px 0 10px 0; color: #475569; font-size: 16px;">
                <i class="fas fa-plus-circle"></i> Add Item to Purchase
              </h4>
              <div class="form-grid">
                <div class="form-group">
                  <label>Select Stock Item <span class="required">*</span></label>
                  <select id="purchaseItemSelect" onchange="selectItemForPurchase()">
                    <option value="">Select Item</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Quantity <span class="required">*</span></label>
                  <input type="number" id="purchaseQty" placeholder="1" value="1" min="0.01" step="0.01">
                </div>
                <div class="form-group">
                  <label>Purchase Rate (QAR) <span class="required">*</span></label>
                  <input type="number" id="purchaseRate" placeholder="0.00" step="0.01" min="0">
                </div>
                <div class="form-group">
                  <label>Tax %</label>
                  <input type="number" id="purchaseTax" placeholder="0" value="0" min="0">
                </div>
              </div>
              <button class="btn btn-primary" onclick="addToPurchaseCart()">
                <i class="fas fa-plus"></i> Add to Purchase
              </button>
            </div>
          </div>

          <div>
            <div class="form-card" style="position: sticky; top: 20px;">
              <h3><i class="fas fa-shopping-cart"></i> Purchase Items</h3>
              <div id="purchaseCartItems" style="max-height: 300px; overflow-y: auto; margin-bottom: 15px;">
                <div class="empty-state" style="padding: 30px;">
                  <i class="fas fa-shopping-basket"></i>
                  <p>No items added</p>
                </div>
              </div>
              <div style="border-top: 2px solid #e2e8f0; padding-top: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span>Subtotal:</span>
                  <strong id="purchaseSubtotal">QAR 0.00</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span>Tax:</span>
                  <strong id="purchaseTaxAmount">QAR 0.00</strong>
                </div>
                <div class="form-group">
                  <label>Discount (QAR)</label>
                  <input type="number" id="purchaseDiscount" placeholder="0.00" step="0.01" min="0" oninput="updatePurchaseTotals()">
                </div>
                <div class="form-group">
                  <label>Shipping Cost (QAR)</label>
                  <input type="number" id="purchaseShipping" placeholder="0.00" step="0.01" min="0" oninput="updatePurchaseTotals()">
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; margin-top: 15px; padding-top: 15px; border-top: 2px solid #e2e8f0;">
                  <span>Total:</span>
                  <span id="purchaseTotal">QAR 0.00</span>
                </div>
              </div>
              <div class="btn-group" style="margin-top: 20px;">
                <button class="btn btn-success" onclick="completePurchase()" style="flex: 1;">
                  <i class="fas fa-check"></i> Complete Purchase
                </button>
                <button class="btn btn-danger" onclick="clearPurchaseCart()">
                  <i class="fas fa-trash"></i> Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  await loadVehicleMakesForForm();
  await fetchStockItemsWithVehicles();
}
// ============================================================
// ADD THESE FUNCTIONS TO YOUR app.js FILE
// Place them after the existing stock functions
// ============================================================

// ========== GLOBAL VARIABLE FOR PURCHASE CART ==========
// Add this at the top of your file with other global variables (near salesCart)
let purchaseCart = [];

// ========== TAB SWITCHING FOR STOCK SECTION ==========
function showStockTab(tab) {
  console.log('Switching to tab:', tab);
  
  // Hide all tabs
  const itemsTab = document.getElementById('stockItemsTab');
  const purchaseTab = document.getElementById('stockPurchaseTab');
  
  if (itemsTab) itemsTab.style.display = 'none';
  if (purchaseTab) purchaseTab.style.display = 'none';
  
  // Reset button styles
  const tabItems = document.getElementById('tabItems');
  const tabPurchase = document.getElementById('tabPurchase');
  
  if (tabItems) {
    tabItems.classList.remove('btn-primary');
    tabItems.classList.add('btn-secondary');
  }
  if (tabPurchase) {
    tabPurchase.classList.remove('btn-primary');
    tabPurchase.classList.add('btn-secondary');
  }
  
  // Show selected tab
  if (tab === 'items') {
    if (itemsTab) itemsTab.style.display = 'block';
    if (tabItems) {
      tabItems.classList.add('btn-primary');
      tabItems.classList.remove('btn-secondary');
    }
  } else if (tab === 'purchase') {
    if (purchaseTab) purchaseTab.style.display = 'block';
    if (tabPurchase) {
      tabPurchase.classList.add('btn-primary');
      tabPurchase.classList.remove('btn-secondary');
    }
    loadPurchaseItems();
  }
}

// ========== PURCHASE FUNCTIONS ==========
async function loadPurchaseItems() {
  try {
    const response = await fetch(`${API_URL}/stock`);
    const items = await response.json();
    
    const select = document.getElementById('purchaseItemSelect');
    if (select) {
      select.innerHTML = '<option value="">Select Item</option>' + 
        items.map(item => 
          `<option value="${item.id}" data-rate="${item.purchase_rate}" data-name="${item.item_name}">
            ${item.item_name} (Current: ${item.current_qty})
          </option>`
        ).join('');
    }
  } catch (error) {
    console.error('Error loading items:', error);
  }
}

function selectItemForPurchase() {
  const select = document.getElementById('purchaseItemSelect');
  const option = select.options[select.selectedIndex];
  if (option && option.value) {
    document.getElementById('purchaseRate').value = option.dataset.rate || 0;
  }
}

function addToPurchaseCart() {
  const select = document.getElementById('purchaseItemSelect');
  const itemId = select.value;
  const itemName = select.options[select.selectedIndex]?.dataset?.name;
  const quantity = parseFloat(document.getElementById('purchaseQty').value);
  const rate = parseFloat(document.getElementById('purchaseRate').value);
  const tax_rate = parseFloat(document.getElementById('purchaseTax').value) || 0;
  
  if (!itemId || !quantity || quantity <= 0 || !rate || rate < 0) {
    showToast('Please fill all required fields', 'error');
    return;
  }
  
  purchaseCart.push({
    id: itemId,
    name: itemName,
    quantity: quantity,
    purchase_rate: rate,
    tax_rate: tax_rate
  });
  
  renderPurchaseCart();
  
  // Reset
  document.getElementById('purchaseQty').value = '1';
  document.getElementById('purchaseItemSelect').value = '';
  document.getElementById('purchaseRate').value = '';
  
  showToast(`${itemName} added`, 'success');
}

function renderPurchaseCart() {
  const cartDiv = document.getElementById('purchaseCartItems');
  
  if (!cartDiv) return;
  
  if (!purchaseCart || purchaseCart.length === 0) {
    cartDiv.innerHTML = `
      <div class="empty-state" style="padding: 30px;">
        <i class="fas fa-shopping-basket"></i>
        <p>No items added</p>
      </div>
    `;
  } else {
    cartDiv.innerHTML = purchaseCart.map((item, index) => {
      const subtotal = item.quantity * item.purchase_rate;
      const tax = (subtotal * item.tax_rate) / 100;
      const total = subtotal + tax;
      
      return `
        <div style="padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between;">
            <div>
              <strong>${item.name}</strong><br>
              <small>${item.quantity} × QAR ${item.purchase_rate.toFixed(2)}</small>
            </div>
            <div style="text-align: right;">
              <strong>QAR ${total.toFixed(2)}</strong><br>
              <button class="action-btn delete" onclick="removeFromPurchaseCart(${index})">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  updatePurchaseTotals();
}

function updatePurchaseTotals() {
  let subtotal = 0;
  let tax = 0;
  
  if (purchaseCart && purchaseCart.length > 0) {
    purchaseCart.forEach(item => {
      const itemSubtotal = item.quantity * item.purchase_rate;
      const itemTax = (itemSubtotal * (item.tax_rate || 0)) / 100;
      subtotal += itemSubtotal;
      tax += itemTax;
    });
  }
  
  const discount = parseFloat(document.getElementById('purchaseDiscount')?.value) || 0;
  const shipping = parseFloat(document.getElementById('purchaseShipping')?.value) || 0;
  const total = subtotal + tax - discount + shipping;
  
  const subtotalEl = document.getElementById('purchaseSubtotal');
  const taxEl = document.getElementById('purchaseTaxAmount');
  const totalEl = document.getElementById('purchaseTotal');
  
  if (subtotalEl) subtotalEl.textContent = `QAR ${subtotal.toFixed(2)}`;
  if (taxEl) taxEl.textContent = `QAR ${tax.toFixed(2)}`;
  if (totalEl) totalEl.textContent = `QAR ${total.toFixed(2)}`;
}

function removeFromPurchaseCart(index) {
  purchaseCart.splice(index, 1);
  renderPurchaseCart();
}

function clearPurchaseCart() {
  if (purchaseCart.length > 0 && !confirm('Clear all items?')) return;
  purchaseCart = [];
  renderPurchaseCart();
  const supplier = document.getElementById('purchaseSupplier');
  const discount = document.getElementById('purchaseDiscount');
  const shipping = document.getElementById('purchaseShipping');
  if (supplier) supplier.value = '';
  if (discount) discount.value = '';
  if (shipping) shipping.value = '';
}

async function completePurchase() {
  console.log('Complete purchase clicked');
  
  if (!purchaseCart || purchaseCart.length === 0) {
    showToast('No items in purchase', 'error');
    return;
  }
  
  const supplier = document.getElementById('purchaseSupplier')?.value;
  const date = document.getElementById('purchaseDate')?.value;
  
  if (!supplier) {
    showToast('Please enter supplier name', 'error');
    return;
  }
  
  const discount_amount = parseFloat(document.getElementById('purchaseDiscount')?.value) || 0;
  const shipping_cost = parseFloat(document.getElementById('purchaseShipping')?.value) || 0;
  
  try {
    const response = await fetch(`${API_URL}/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier: supplier,
        date: date,
        items: purchaseCart,
        discount_amount: discount_amount,
        shipping_cost: shipping_cost
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast(`Purchase completed! No: ${data.purchase_no}`, 'success');
      clearPurchaseCart();
      updateDashboard();
      fetchStockItemsWithVehicles();
    } else {
      showToast(data.error || 'Failed to complete purchase', 'error');
    }
  } catch (error) {
    showToast('Error completing purchase', 'error');
    console.error(error);
  }
}
// Load vehicle makes into the form dropdown
async function loadVehicleMakesForForm() {
  try {
    console.log('🚗 Loading vehicle makes...');
    const response = await fetch(`${API_URL}/car-makes`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const makes = await response.json();
    console.log('✅ Loaded makes:', makes.length);
    
    const select = document.getElementById('itemMake');
    if (!select) {
      console.error('❌ itemMake select not found!');
      return;
    }
    
    if (makes.length === 0) {
      select.innerHTML = '<option value="">No makes found</option>';
      return;
    }
    
    select.innerHTML = makes.map(make => 
      `<option value="${make.id}">${make.name} </option>`
    ).join('');
    
    console.log('✅ Populated dropdown with', makes.length, 'makes');
    
    // Add event listener to load models when make is selected
    select.removeEventListener('change', loadModelsForSelectedMakes); // Remove old listener
    select.addEventListener('change', loadModelsForSelectedMakes);
    
  } catch (error) {
    console.error('❌ Error loading makes:', error);
    const select = document.getElementById('itemMake');
    if (select) {
      select.innerHTML = '<option value="">Error loading makes</option>';
    }
  }
}
// Load models based on selected makes
async function loadModelsForSelectedMakes() {
  const makeSelect = document.getElementById('itemMake');
  const modelSelect = document.getElementById('itemModel');
  
  if (!makeSelect || !modelSelect) {
    console.error('❌ Make or Model select not found');
    return;
  }
  
  const selectedMakes = Array.from(makeSelect.selectedOptions).map(opt => opt.value);
  
  console.log('🚗 Selected makes:', selectedMakes);
  
  if (selectedMakes.length === 0) {
    modelSelect.innerHTML = '<option value="">Select make first</option>';
    return;
  }
  
  try {
    modelSelect.innerHTML = '<option value="">Loading models...</option>';
    
    // Load models for all selected makes
    const allModels = [];
    for (const makeId of selectedMakes) {
      console.log(`📡 Fetching models for make ID: ${makeId}`);
      const response = await fetch(`${API_URL}/car-makes/${makeId}/models`);
      
      if (!response.ok) {
        console.error(`❌ HTTP ${response.status} for make ${makeId}`);
        continue;
      }
      
      const models = await response.json();
      console.log(`✅ Got ${models.length} models for make ${makeId}`);
      allModels.push(...models);
    }
    
    if (allModels.length === 0) {
      modelSelect.innerHTML = '<option value="">No models found</option>';
      return;
    }
    
    modelSelect.innerHTML = allModels.map(model => 
      `<option value="${model.id}">${model.make_name || ''} ${model.name}</option>`
    ).join('');
    
    console.log(`✅ Loaded ${allModels.length} total models`);
    
  } catch (error) {
    console.error('❌ Error loading models:', error);
    modelSelect.innerHTML = '<option value="">Error loading models</option>';
  }
}
// ============================================================
// FIXED saveStockItemWithVehicles Function
// Replace in your frontend/app.js
// ============================================================

async function saveStockItemWithVehicles() {
  const item_name = document.getElementById('itemName').value.trim();
  const sku = document.getElementById('itemSKU').value.trim();
  const barcode = document.getElementById('itemBarcode').value.trim();
  const oem_part_no = document.getElementById('itemOEM').value.trim();
  const category = document.getElementById('itemCategory').value;
  const unit = document.getElementById('itemUnit').value.trim() || 'PCS';
  const opening_qty = parseFloat(document.getElementById('itemOpeningQty').value) || 0;
  const min_qty = parseFloat(document.getElementById('itemMinQty').value) || 5;
  const reorder_level = parseFloat(document.getElementById('itemReorderLevel').value) || 10;
  const max_qty = parseFloat(document.getElementById('itemMaxQty').value) || 1000;
  const purchase_rate = parseFloat(document.getElementById('itemPurchaseRate').value) || 0;
  const sale_rate = parseFloat(document.getElementById('itemSaleRate').value) || 0;
  const mrp = parseFloat(document.getElementById('itemMRP').value) || 0;
  const tax_rate = parseFloat(document.getElementById('itemTaxRate').value) || 0;
  const location = document.getElementById('itemLocation').value.trim();
  const supplier = document.getElementById('itemSupplier').value.trim();
  
  // Vehicle compatibility
  const makeSelect = document.getElementById('itemMake');
  const modelSelect = document.getElementById('itemModel');
  const selectedMakes = Array.from(makeSelect.selectedOptions).map(opt => parseInt(opt.value));
  const selectedModels = Array.from(modelSelect.selectedOptions).map(opt => parseInt(opt.value));
  const yearFrom = document.getElementById('itemYearFrom').value || null;
  const yearTo = document.getElementById('itemYearTo').value || null;
  
  console.log('🚗 Selected makes:', selectedMakes);
  console.log('🚗 Selected models:', selectedModels);
  
  if (!item_name) {
    showToast('Please enter item name', 'error');
    return;
  }
  
  try {
    // First save the stock item
    const editingId = document.getElementById('editingStockId').value;
    const url = editingId ? `${API_URL}/stock/${editingId}/full` : `${API_URL}/stock`;
    const method = editingId ? 'PUT' : 'POST';
    
    console.log(`📝 Saving stock item (${method}):`, { item_name, sku, oem_part_no });
    
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_name, sku, barcode, oem_part_no, category, unit, 
        opening_qty, min_qty, reorder_level, max_qty,
        purchase_rate, sale_rate, mrp, tax_rate, location, supplier
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      showToast(data.error || 'Failed to save item', 'error');
      return;
    }
    
    const itemId = editingId || data.id;
    console.log(`✅ Stock item saved with ID: ${itemId}`);
    
    // If editing, first delete existing compatibility
    if (editingId) {
      console.log('🗑️ Deleting old compatibility records...');
      const oldCompatResponse = await fetch(`${API_URL}/item-compatibility/${editingId}`);
      const oldCompat = await oldCompatResponse.json();
      
      for (const compat of oldCompat) {
        await fetch(`${API_URL}/item-compatibility/${compat.id}`, {
          method: 'DELETE'
        });
      }
      console.log('✅ Old compatibility deleted');
    }
    
    // Add vehicle compatibility
    if (selectedMakes.length > 0) {
      console.log(`🚗 Adding compatibility for ${selectedMakes.length} makes...`);
      
      for (const makeId of selectedMakes) {
        // If specific models are selected, add them
        if (selectedModels.length > 0) {
          for (const modelId of selectedModels) {
            console.log(`📝 Adding compatibility: Make ${makeId}, Model ${modelId}`);
            
            const compatResponse = await fetch(`${API_URL}/item-compatibility`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                item_id: itemId,
                make_id: makeId,
                model_id: modelId,
                year_from: yearFrom,
                year_to: yearTo
              })
            });
            
            if (compatResponse.ok) {
              console.log(`✅ Compatibility added: Make ${makeId}, Model ${modelId}`);
            } else {
              const errorData = await compatResponse.json();
              console.error(`❌ Failed to add compatibility:`, errorData);
            }
          }
        } else {
          // No specific models, add make only (all models compatible)
          console.log(`📝 Adding compatibility: Make ${makeId} (all models)`);
          
          const compatResponse = await fetch(`${API_URL}/item-compatibility`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              item_id: itemId,
              make_id: makeId,
              model_id: null,
              year_from: yearFrom,
              year_to: yearTo
            })
          });
          
          if (compatResponse.ok) {
            console.log(`✅ Compatibility added: Make ${makeId} (all models)`);
          } else {
            const errorData = await compatResponse.json();
            console.error(`❌ Failed to add compatibility:`, errorData);
          }
        }
      }
      
      console.log('✅ All compatibility records added');
    } else {
      console.log('ℹ️ No makes selected, skipping compatibility');
    }
    
    showToast(editingId ? 'Item updated successfully' : 'Item saved successfully', 'success');
    clearStockForm();
    fetchStockItemsWithVehicles();
    updateDashboard();
    
  } catch (error) {
    showToast('Error saving stock item', 'error');
    console.error('❌ Save error:', error);
  }
}
// Fetch stock items with vehicle info
// ============================================================
// ULTIMATE FIX - Vehicle Compatibility Display
// Replace fetchStockItemsWithVehicles in app.js
// ============================================================

async function fetchStockItemsWithVehicles(params = {}) {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/stock?${queryString}`);
    const items = await response.json();
    
    console.log('📦 Fetched items:', items.length);
    if (items.length > 0) {
      console.log('📦 Sample item structure:', items[0]);
    }
    
    const tbody = document.getElementById('stockTableBody');
    
    if (!tbody) return;
    
    if (items.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="8">
          <div class="empty-state">
            <i class="fas fa-boxes"></i>
            <h3>No Stock Items</h3>
            <p>Add your first inventory item</p>
          </div>
        </td></tr>
      `;
      return;
    }
    
    // For each item, fetch compatibility info
    const itemsWithCompatibility = await Promise.all(
      items.map(async (item) => {
        try {
          const compatResponse = await fetch(`${API_URL}/item-compatibility/${item.id}`);
          const compatibility = await compatResponse.json();
          item.compatibility = compatibility;
          console.log(`🚗 Item ${item.id} compatibility:`, compatibility);
        } catch (err) {
          console.error(`❌ Failed to fetch compatibility for item ${item.id}:`, err);
          item.compatibility = [];
        }
        return item;
      })
    );
    
    tbody.innerHTML = itemsWithCompatibility.map(item => {
      const isLowStock = (item.current_qty || 0) <= (item.min_qty || 0);
      const status = isLowStock ? 'danger' : 'success';
      const statusText = isLowStock ? 'Low Stock' : 'In Stock';
      
      // Format vehicle compatibility - DETAILED VERSION
      let vehicleInfo = '';
      if (item.compatibility && item.compatibility.length > 0) {
        console.log(`📋 Formatting compatibility for ${item.item_name}:`, item.compatibility);
        
        // Build detailed strings for each compatibility entry
        const vehicleStrings = item.compatibility.map(c => {
          let parts = [];
          
          // Always add make
          if (c.make_name) {
            parts.push(c.make_name);
          }
          
          // Add model if present
          if (c.model_name) {
            parts.push(c.model_name);
          }
          
          // Build the main string
          let mainString = parts.join(' ');
          
          // Add year range if present
          if (c.year_from || c.year_to) {
            const yearFrom = c.year_from || '...';
            const yearTo = c.year_to || '...';
            mainString += ` (${yearFrom}−${yearTo})`;
          }
          
          return mainString;
        });
        
        // Show first 2, then "+X more"
        if (vehicleStrings.length <= 2) {
          vehicleInfo = vehicleStrings.join(', ');
        } else {
          vehicleInfo = vehicleStrings.slice(0, 2).join(', ') + ` +${vehicleStrings.length - 2} more`;
        }
        
        console.log(`✅ Final vehicle info for ${item.item_name}: ${vehicleInfo}`);
      } else {
        vehicleInfo = '-';
        console.log(`⚠️  No compatibility for ${item.item_name}`);
      }
      
      // Display OEM - check for actual value
      let oemDisplay = '-';
      if (item.oem_part_no && item.oem_part_no.trim() !== '') {
        oemDisplay = item.oem_part_no.trim();
      }
      
      // Escape item name for onclick
      const safeItemName = (item.item_name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
      
      return `
        <tr ${isLowStock ? 'style="background-color: #fee;"' : ''}>
          <td>
            <strong>${item.item_name}</strong>
            ${item.sku ? `<br><small style="color: #64748b;">SKU: ${item.sku}</small>` : ''}
          </td>
          <td>
            <span style="font-family: 'Courier New', monospace; color: ${oemDisplay === '-' ? '#94a3b8' : '#1e293b'};">
              ${oemDisplay}
            </span>
          </td>
          <td>
            <small style="color: #475569; line-height: 1.5; display: block;">
              ${vehicleInfo}
            </small>
          </td>
          <td>${item.category || '-'}</td>
          <td><strong>${item.current_qty || 0}</strong> ${item.unit || 'PCS'}</td>
          <td>QAR ${(item.sale_rate || 0).toFixed(2)}</td>
          <td><span class="badge badge-${status}">${statusText}</span></td>
          <td class="table-actions">
            <button class="action-btn edit" onclick="editStockItemWithVehicles(${item.id})" title="Edit Item">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn" onclick="viewItemCompatibility(${item.id})" title="Vehicle Compatibility" 
              style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;">
              <i class="fas fa-car"></i>
            </button>
            <button class="action-btn" onclick="viewPurchaseHistory(${item.id})" title="Purchase History" 
              style="background: rgba(16, 185, 129, 0.1); color: #10b981;">
              <i class="fas fa-history"></i>
            </button>
            <button class="action-btn delete" onclick="deleteStockItem(${item.id}, '${safeItemName}')" title="Delete Item">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
    
    updateDashboard();
  } catch (error) {
    showToast('Error loading stock items', 'error');
    console.error('❌ fetchStockItemsWithVehicles error:', error);
  }
}
// Edit stock item with vehicles
async function editStockItemWithVehicles(itemId) {
  try {
    const response = await fetch(`${API_URL}/stock/${itemId}/full`);
    const item = await response.json();
    
    // Fill form with item data
    document.getElementById('editingStockId').value = itemId;
    document.getElementById('itemName').value = item.item_name || '';
    document.getElementById('itemSKU').value = item.sku || '';
    document.getElementById('itemBarcode').value = item.barcode || '';
    document.getElementById('itemOEM').value = item.oem_part_no || '';
    document.getElementById('itemCategory').value = item.category || '';
    document.getElementById('itemUnit').value = item.unit || 'PCS';
    document.getElementById('itemOpeningQty').value = item.opening_qty || 0;
    document.getElementById('itemMinQty').value = item.min_qty || 5;
    document.getElementById('itemReorderLevel').value = item.reorder_level || 10;
    document.getElementById('itemMaxQty').value = item.max_qty || 1000;
    document.getElementById('itemPurchaseRate').value = item.purchase_rate || 0;
    document.getElementById('itemSaleRate').value = item.sale_rate || 0;
    document.getElementById('itemMRP').value = item.mrp || 0;
    document.getElementById('itemTaxRate').value = item.tax_rate || 0;
    document.getElementById('itemLocation').value = item.location || '';
    document.getElementById('itemSupplier').value = item.supplier || '';
    
    // Select compatible vehicles
    if (item.compatibility && item.compatibility.length > 0) {
      const makeIds = [...new Set(item.compatibility.map(c => c.make_id))];
      const modelIds = item.compatibility.map(c => c.model_id).filter(id => id);
      const yearFrom = item.compatibility[0].year_from;
      const yearTo = item.compatibility[0].year_to;
      
      // Select makes
      const makeSelect = document.getElementById('itemMake');
      Array.from(makeSelect.options).forEach(option => {
        if (makeIds.includes(parseInt(option.value))) {
          option.selected = true;
        }
      });
      
      // Load and select models
      await loadModelsForSelectedMakes();
      
      setTimeout(() => {
        const modelSelect = document.getElementById('itemModel');
        Array.from(modelSelect.options).forEach(option => {
          if (modelIds.includes(parseInt(option.value))) {
            option.selected = true;
          }
        });
      }, 500);
      
      if (yearFrom) document.getElementById('itemYearFrom').value = yearFrom;
      if (yearTo) document.getElementById('itemYearTo').value = yearTo;
    }
    
    // Scroll to form
    document.getElementById('stockItemsTab').scrollIntoView({ behavior: 'smooth' });
    showToast('Editing item', 'info');
    
  } catch (error) {
    showToast('Error loading item details', 'error');
    console.error(error);
  }
}

// View item compatibility
async function viewItemCompatibility(itemId) {
  try {
    const response = await fetch(`${API_URL}/item-compatibility/${itemId}`);
    const compatibility = await response.json();
    
    const itemResponse = await fetch(`${API_URL}/stock/${itemId}`);
    const item = await itemResponse.json();
    
    let compatHtml = `
      <div style="padding: 20px; background: white; border-radius: 8px; max-width: 600px; margin: 20px auto;">
        <h3 style="margin-bottom: 15px;">
          <i class="fas fa-car"></i> ${item.item_name} - Vehicle Compatibility
        </h3>
    `;
    
    if (compatibility.length === 0) {
      compatHtml += '<p style="color: #64748b;">No vehicle compatibility added yet.</p>';
    } else {
      compatHtml += '<div style="display: grid; gap: 10px;">';
      compatibility.forEach(c => {
        compatHtml += `
          <div style="padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px;">
            <strong style="color: #1e293b;">${c.make_name}${c.model_name ? ' ' + c.model_name : ' (All Models)'}</strong>
            ${c.year_from || c.year_to ? `<br><small style="color: #64748b;">Years: ${c.year_from || '...'} - ${c.year_to || '...'}</small>` : ''}
            ${c.notes ? `<br><small style="color: #475569;">${c.notes}</small>` : ''}
          </div>
        `;
      });
      compatHtml += '</div>';
    }
    
    compatHtml += `
        <button class="btn btn-secondary" onclick="this.parentElement.remove()" style="margin-top: 15px;">
          Close
        </button>
      </div>
    `;
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;';
    overlay.innerHTML = compatHtml;
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
    document.body.appendChild(overlay);
    
  } catch (error) {
    showToast('Error loading compatibility', 'error');
    console.error(error);
  }
}

function clearStockForm() {
  ['itemName', 'itemSKU', 'itemBarcode', 'itemOEM', 'itemOpeningQty', 
   'itemPurchaseRate', 'itemSaleRate', 'itemMRP', 'itemLocation', 'itemSupplier',
   'itemYearFrom', 'itemYearTo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  
  // Clear selections
  document.getElementById('editingStockId').value = '';
  document.getElementById('itemCategory').value = '';
  document.getElementById('itemMake').selectedIndex = -1;
  document.getElementById('itemModel').innerHTML = '<option value="">Select make first</option>';
  
  // Reset defaults
  document.getElementById('itemUnit').value = 'PCS';
  document.getElementById('itemMinQty').value = '5';
  document.getElementById('itemReorderLevel').value = '10';
  document.getElementById('itemMaxQty').value = '1000';
  document.getElementById('itemTaxRate').value = '18';
}

// Update existing functions
function searchStock(query) {
  fetchStockItemsWithVehicles({ search: query });
}

function filterLowStock() {
  fetchStockItemsWithVehicles({ low_stock: 'true' });
}
async function fetchStockItems(params = {}) {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/stock?${queryString}`);
    const items = await response.json();
    
    const tbody = document.getElementById('stockTableBody');
    
    if (items.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="8">
          <div class="empty-state">
            <i class="fas fa-boxes"></i>
            <h3>No Stock Items</h3>
            <p>Add your first inventory item</p>
          </div>
        </td></tr>
      `;
      return;
    }
    
    tbody.innerHTML = items.map(item => {
      const stockValue = item.current_qty * item.sale_rate;
      const isLowStock = item.current_qty <= item.min_qty;
      const status = isLowStock ? 'danger' : 'success';
      const statusText = isLowStock ? 'Low Stock' : 'In Stock';
      
      return `
        <tr ${isLowStock ? 'style="background-color: #fee;"' : ''}>
          <td><strong>${item.item_name}</strong></td>
          <td>${item.sku || '-'}</td>
          <td>${item.category || '-'}</td>
          <td><strong>${item.current_qty}</strong> ${item.unit}</td>
          <td>QAR.${item.sale_rate.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
          <td>QAR.${stockValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
          <td><span class="badge badge-${status}">${statusText}</span></td>
          <td class="table-actions">
            <button class="action-btn edit" onclick="editStockItem(${item.id})">
              <i class="fas fa-edit"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
    
    updateDashboard();
  } catch (error) {
    showToast('Error loading stock items', 'error');
    console.error(error);
  }
}

async function saveStockItem() {
  const item_name = document.getElementById('itemName').value.trim();
  const sku = document.getElementById('itemSKU').value.trim();
  const barcode = document.getElementById('itemBarcode').value.trim();
  const category = document.getElementById('itemCategory').value;
  const unit = document.getElementById('itemUnit').value.trim() || 'PCS';
  const opening_qty = parseFloat(document.getElementById('itemOpeningQty').value) || 0;
  const min_qty = parseFloat(document.getElementById('itemMinQty').value) || 5;
  const max_qty = parseFloat(document.getElementById('itemMaxQty').value) || 1000;
  const purchase_rate = parseFloat(document.getElementById('itemPurchaseRate').value) || 0;
  const sale_rate = parseFloat(document.getElementById('itemSaleRate').value) || 0;
  const mrp = parseFloat(document.getElementById('itemMRP').value) || 0;
  const tax_rate = parseFloat(document.getElementById('itemTaxRate').value) || 0;
  
  if (!item_name) {
    showToast('Please enter item name', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_name, sku, barcode, category, unit, opening_qty, min_qty, max_qty,
        purchase_rate, sale_rate, mrp, tax_rate
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast('Stock item saved successfully', 'success');
      clearStockForm();
      fetchStockItems();
      updateDashboard();
    } else {
      showToast(data.error || 'Failed to save item', 'error');
    }
  } catch (error) {
    showToast('Error saving stock item', 'error');
    console.error(error);
  }
}

function clearStockForm() {
  ['itemName', 'itemSKU', 'itemBarcode', 'itemOpeningQty', 'itemPurchaseRate', 
   'itemSaleRate', 'itemMRP'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('itemUnit').value = 'PCS';
  document.getElementById('itemMinQty').value = '5';
  document.getElementById('itemMaxQty').value = '1000';
  document.getElementById('itemTaxRate').value = '18';
}

function searchStock(query) {
  fetchStockItems({ search: query });
}

function filterLowStock() {
  fetchStockItems({ low_stock: 'true' });
}

// ============== SALES / POS - UPDATED WITH ITEM TYPES ==============
async function loadSalesSection() {
  const section = document.getElementById('sales');
  section.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 400px; gap: 20px;">
      <div>
        <div class="form-card">
          <h3><i class="fas fa-shopping-cart"></i> New Sale</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>Customer Name</label>
              <input type="text" id="customerName" placeholder="Walk-in Customer">
            </div>
            <div class="form-group">
              <label>Customer Phone</label>
              <input type="text" id="customerPhone" placeholder="Phone number">
            </div>
          </div>
          
          <h4 style="margin: 20px 0 10px 0; color: #475569; font-size: 16px;">
            <i class="fas fa-plus-circle"></i> Add Item
          </h4>
          <div class="form-grid">
            <div class="form-group">
              <label>Item Type <span class="required">*</span></label>
              <select id="saleItemType" onchange="handleItemTypeChange()">
                <option value="goods">Goods (from stock)</option>
                <option value="service">Service</option>
                <option value="labour">Labour Charge</option>
              </select>
            </div>
            
            <div class="form-group" id="stockItemGroup">
              <label>Select Stock Item <span class="required">*</span></label>
              <select id="saleItemSelect" onchange="selectItemForSale()">
                <option value="">Select Item</option>
              </select>
            </div>
            
            <div class="form-group" id="manualItemGroup" style="display: none;">
              <label>Item/Service Name <span class="required">*</span></label>
              <input type="text" id="manualItemName" placeholder="Enter service/labour name">
            </div>
            
            <div class="form-group">
              <label>Quantity</label>
              <input type="number" id="saleQty" placeholder="1" value="1" min="0.01" step="0.01">
            </div>
            <div class="form-group">
              <label>Rate (QAR) <span class="required">*</span></label>
              <input type="number" id="saleRate" placeholder="0.00" step="0.01" min="0">
            </div>
            <div class="form-group">
              <label>Tax %</label>
              <input type="number" id="saleTax" placeholder="0" value="0" min="0" max="100">
            </div>
            <div class="form-group">
              <label>Description (Optional)</label>
              <input type="text" id="saleItemDescription" placeholder="Additional details">
            </div>
          </div>
          <button class="btn btn-primary" onclick="addToCart()">
            <i class="fas fa-plus"></i> Add to Cart
          </button>
        </div>
      </div>

      <div>
        <div class="form-card" style="position: sticky; top: 20px;">
          <h3><i class="fas fa-receipt"></i> Cart</h3>
          <div id="cartItems" style="max-height: 300px; overflow-y: auto; margin-bottom: 15px;">
            <div class="empty-state" style="padding: 30px;">
              <i class="fas fa-shopping-basket"></i>
              <p>Cart is empty</p>
            </div>
          </div>
          <div style="border-top: 2px solid #e2e8f0; padding-top: 15px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>Subtotal:</span>
              <strong id="cartSubtotal">QAR 0.00</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>Tax:</span>
              <strong id="cartTax">QAR 0.00</strong>
            </div>
            <div class="form-group">
              <label>Discount (QAR)</label>
              <input type="number" id="saleDiscount" placeholder="0.00" step="0.01" min="0" onchange="updateCartTotals()" oninput="updateCartTotals()">
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; margin-top: 15px; padding-top: 15px; border-top: 2px solid #e2e8f0;">
              <span>Total:</span>
              <span id="cartTotal">QAR 0.00</span>
            </div>
          </div>
          <div class="btn-group" style="margin-top: 20px;">
            <button class="btn btn-success" onclick="completeSale()" style="flex: 1;">
              <i class="fas fa-check"></i> Complete Sale (Ctrl+S)
            </button>
            <button class="btn btn-danger" onclick="clearCart()">
              <i class="fas fa-trash"></i> Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  await loadSaleItems();
  renderCart();
}

async function loadSaleItems() {
  try {
    const response = await fetch(`${API_URL}/stock`);
    const items = await response.json();
    
    const select = document.getElementById('saleItemSelect');
    if (select) {
      select.innerHTML = '<option value="">Select Item</option>' + 
        items.map(item => 
          `<option value="${item.id}" data-rate="${item.sale_rate}" data-tax="${item.tax_rate || 0}" data-name="${item.item_name}" data-qty="${item.current_qty}">
            ${item.item_name} (QAR ${item.sale_rate}) - Stock: ${item.current_qty}
          </option>`
        ).join('');
    }
  } catch (error) {
    console.error('Error loading items:', error);
  }
}

function handleItemTypeChange() {
  const itemType = document.getElementById('saleItemType').value;
  const stockItemGroup = document.getElementById('stockItemGroup');
  const manualItemGroup = document.getElementById('manualItemGroup');
  
  if (itemType === 'goods') {
    stockItemGroup.style.display = 'block';
    manualItemGroup.style.display = 'none';
    document.getElementById('manualItemName').value = '';
  } else {
    stockItemGroup.style.display = 'none';
    manualItemGroup.style.display = 'block';
    document.getElementById('saleItemSelect').value = '';
    document.getElementById('saleRate').value = '';
    document.getElementById('saleTax').value = '0';
  }
}

function selectItemForSale() {
  const select = document.getElementById('saleItemSelect');
  const option = select.options[select.selectedIndex];
  if (option && option.value) {
    document.getElementById('saleRate').value = option.dataset.rate || 0;
    document.getElementById('saleTax').value = option.dataset.tax || 0;
    document.getElementById('saleQty').focus();
  }
}

function addToCart() {
  const itemType = document.getElementById('saleItemType').value;
  const quantity = parseFloat(document.getElementById('saleQty').value);
  const rate = parseFloat(document.getElementById('saleRate').value);
  const tax_rate = parseFloat(document.getElementById('saleTax').value) || 0;
  const description = document.getElementById('saleItemDescription').value.trim();
  
  let itemId = null;
  let itemName = '';
  
  if (itemType === 'goods') {
    const select = document.getElementById('saleItemSelect');
    itemId = select.value;
    const option = select.options[select.selectedIndex];
    itemName = option ? option.dataset.name : '';
    
    if (!itemId) {
      showToast('Please select a stock item', 'error');
      return;
    }
    
    const availableQty = option ? parseFloat(option.dataset.qty || 0) : 0;
    if (quantity > availableQty) {
      showToast(`Only ${availableQty} units available in stock`, 'error');
      return;
    }
  } else {
    // For services and labour, generate unique negative ID
    // This allows them to work with existing database schema
    itemName = document.getElementById('manualItemName').value.trim();
    if (!itemName) {
      showToast('Please enter service/labour name', 'error');
      return;
    }
    
    // Generate unique negative ID based on timestamp and type
    // Services: -1000000 to -1999999
    // Labour: -2000000 to -2999999
    const baseId = itemType === 'service' ? -1000000 : -2000000;
    itemId = baseId - Date.now() % 1000000;
  }
  
  if (!quantity || quantity <= 0) {
    showToast('Please enter valid quantity', 'error');
    return;
  }
  
  if (!rate || rate < 0) {
    showToast('Please enter valid rate', 'error');
    return;
  }
  
  salesCart.push({
    id: itemId,
    name: itemName,
    type: itemType,
    quantity: quantity,
    rate: rate,
    tax_rate: tax_rate,
    description: description
  });
  
  renderCart();
  
  document.getElementById('saleQty').value = '1';
  document.getElementById('saleRate').value = '';
  document.getElementById('saleTax').value = itemType === 'goods' ? '18' : '0';
  document.getElementById('saleItemDescription').value = '';
  
  if (itemType === 'goods') {
    document.getElementById('saleItemSelect').value = '';
  } else {
    document.getElementById('manualItemName').value = '';
  }
  
  showToast(`${itemName} added to cart`, 'success');
}

function renderCart() {
  const cartDiv = document.getElementById('cartItems');
  
  if (!cartDiv) return;
  
  if (!salesCart || salesCart.length === 0) {
    cartDiv.innerHTML = `
      <div class="empty-state" style="padding: 30px;">
        <i class="fas fa-shopping-basket"></i>
        <p>Cart is empty</p>
      </div>
    `;
  } else {
    cartDiv.innerHTML = salesCart.map((item, index) => {
      const itemSubtotal = (item.quantity || 0) * (item.rate || 0);
      const itemTax = (itemSubtotal * (item.tax_rate || 0)) / 100;
      const itemTotal = itemSubtotal + itemTax;
      
      const typeIcon = item.type === 'goods' ? 'box' : 
                      item.type === 'service' ? 'concierge-bell' : 'wrench';
      const typeLabel = item.type ? (item.type.charAt(0).toUpperCase() + item.type.slice(1)) : 'Item';
      const badgeClass = item.type === 'goods' ? 'success' : 'warning';
      
      return `
        <div style="padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px; background: ${item.type !== 'goods' ? '#f8fafc' : 'white'};">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <i class="fas fa-${typeIcon}" style="color: #64748b; font-size: 12px;"></i>
                <strong>${item.name}</strong>
                <span class="badge badge-${badgeClass}" style="font-size: 9px; padding: 2px 6px;">${typeLabel}</span>
              </div>
              <small style="color: #64748b;">
                ${item.quantity} × QAR ${item.rate.toFixed(2)}
                ${item.tax_rate > 0 ? ` + ${item.tax_rate}% tax` : ''}
              </small>
              ${item.description ? `<br><small style="color: #94a3b8; font-style: italic;">${item.description}</small>` : ''}
            </div>
            <div style="text-align: right; margin-left: 10px;">
              <strong style="color: #1e293b;">QAR ${itemTotal.toFixed(2)}</strong><br>
              <button class="action-btn delete" onclick="removeFromCart(${index})" style="margin-top: 5px;">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  updateCartTotals();
}

function updateCartTotals() {
  let subtotal = 0;
  let tax = 0;
  
  if (salesCart && salesCart.length > 0) {
    salesCart.forEach(item => {
      const itemSubtotal = (item.quantity || 0) * (item.rate || 0);
      const itemTax = (itemSubtotal * (item.tax_rate || 0)) / 100;
      subtotal += itemSubtotal;
      tax += itemTax;
    });
  }
  
  const discountInput = document.getElementById('saleDiscount');
  const discount = discountInput ? (parseFloat(discountInput.value) || 0) : 0;
  const total = subtotal + tax - discount;
  
  const cartSubtotalEl = document.getElementById('cartSubtotal');
  const cartTaxEl = document.getElementById('cartTax');
  const cartTotalEl = document.getElementById('cartTotal');
  
  if (cartSubtotalEl) {
    cartSubtotalEl.textContent = `QAR ${subtotal.toFixed(2)}`;
  }
  if (cartTaxEl) {
    cartTaxEl.textContent = `QAR ${tax.toFixed(2)}`;
  }
  if (cartTotalEl) {
    cartTotalEl.textContent = `QAR ${Math.max(0, total).toFixed(2)}`;
  }
}

function removeFromCart(index) {
  if (!salesCart || index < 0 || index >= salesCart.length) return;
  
  const removedItem = salesCart[index];
  salesCart.splice(index, 1);
  renderCart();
  showToast(`${removedItem.name} removed from cart`, 'info');
}

function clearCart() {
  if (salesCart && salesCart.length > 0 && !confirm('Clear all items from cart?')) return;
  
  salesCart = [];
  renderCart();
  
  const customerName = document.getElementById('customerName');
  const customerPhone = document.getElementById('customerPhone');
  const saleDiscount = document.getElementById('saleDiscount');
  
  if (customerName) customerName.value = '';
  if (customerPhone) customerPhone.value = '';
  if (saleDiscount) saleDiscount.value = '';
  
  showToast('Cart cleared', 'info');
}

async function completeSale() {
  if (!salesCart || salesCart.length === 0) {
    showToast('Cart is empty', 'error');
    return;
  }
  
  const customerNameEl = document.getElementById('customerName');
  const customerPhoneEl = document.getElementById('customerPhone');
  const saleDiscountEl = document.getElementById('saleDiscount');
  
  const customer = customerNameEl ? customerNameEl.value : 'Walk-in Customer';
  const customer_phone = customerPhoneEl ? customerPhoneEl.value : '';
  const discount_amount = saleDiscountEl ? (parseFloat(saleDiscountEl.value) || 0) : 0;
  const date = new Date().toISOString().split('T')[0];
  
  try {
    const response = await fetch(`${API_URL}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: customer,
        customer_phone: customer_phone,
        date: date,
        items: salesCart,
        discount_amount: discount_amount,
        payment_method: 'cash'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast(`Sale completed! Invoice: ${data.invoice_no}`, 'success');
      printInvoice(data, customer, customer_phone);
      clearCart();
      updateDashboard();
    } else {
      showToast(data.error || 'Failed to complete sale', 'error');
    }
  } catch (error) {
    showToast('Error completing sale', 'error');
    console.error(error);
  }
}

function printInvoice(saleData, customer, phone) {
  const win = window.open('', '', 'width=800,height=600');
  
  let subtotal = 0;
  let tax = 0;
  salesCart.forEach(item => {
    const itemSubtotal = (item.quantity || 0) * (item.rate || 0);
    const itemTax = (itemSubtotal * (item.tax_rate || 0)) / 100;
    subtotal += itemSubtotal;
    tax += itemTax;
  });
  const discount = saleData.discount_amount || 0;
  const total = subtotal + tax - discount;
  
  const invoiceHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${saleData.invoice_no}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .header h1 { margin: 0; }
        .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background: #f5f5f5; }
        .totals { margin-left: auto; width: 300px; }
        .totals table { margin-bottom: 5px; }
        .totals td { border: none; padding: 5px; }
        .total-row { font-size: 18px; font-weight: bold; border-top: 2px solid #000; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
        .badge { padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold; }
        .badge-goods { background: #d1fae5; color: #065f46; }
        .badge-service { background: #fef3c7; color: #92400e; }
        .badge-labour { background: #dbeafe; color: #1e40af; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Auto City</h1>
        <p>Accounting & Sales Invoice</p>
      </div>
      <div class="info">
        <div>
          <strong>Customer:</strong> ${customer}<br>
          ${phone ? `<strong>Phone:</strong> ${phone}<br>` : ''}
          <strong>Date:</strong> ${new Date().toLocaleDateString()}
        </div>
        <div>
          <strong>Invoice No:</strong> ${saleData.invoice_no}<br>
          <strong>Payment:</strong> Cash
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Item / Service</th>
            <th>Type</th>
            <th>Qty</th>
            <th>Rate (QAR)</th>
            <th>Tax %</th>
            <th>Amount (QAR)</th>
          </tr>
        </thead>
        <tbody>
          ${salesCart.map(item => {
            const itemSubtotal = (item.quantity || 0) * (item.rate || 0);
            const itemTax = (itemSubtotal * (item.tax_rate || 0)) / 100;
            const itemTotal = itemSubtotal + itemTax;
            const typeClass = `badge-${item.type || 'goods'}`;
            const typeLabel = item.type ? (item.type.charAt(0).toUpperCase() + item.type.slice(1)) : 'Goods';
            
            return `
              <tr>
                <td>
                  ${item.name}
                  ${item.description ? `<br><small style="color: #666;">${item.description}</small>` : ''}
                </td>
                <td><span class="badge ${typeClass}">${typeLabel}</span></td>
                <td>${item.quantity}</td>
                <td>${item.rate.toFixed(2)}</td>
                <td>${item.tax_rate || 0}%</td>
                <td>${itemTotal.toFixed(2)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      <div class="totals">
        <table>
          <tr>
            <td>Subtotal:</td>
            <td style="text-align: right;">QAR ${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Tax:</td>
            <td style="text-align: right;">QAR ${tax.toFixed(2)}</td>
          </tr>
          ${discount > 0 ? `
          <tr>
            <td>Discount:</td>
            <td style="text-align: right;">- QAR ${discount.toFixed(2)}</td>
          </tr>
          ` : ''}
          <tr class="total-row">
            <td>Total:</td>
            <td style="text-align: right;">QAR ${total.toFixed(2)}</td>
          </tr>
        </table>
      </div>
      <div class="footer">
        <p>Thank you for your business!</p>
        <p>Powered by Auto City Accounting Pro</p>
      </div>
      <script>window.print();</script>
    </body>
    </html>
  `;
  
  win.document.write(invoiceHTML);
  win.document.close();
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

function getTypeColor(type) {
  const colors = {
    'Asset': 'success',
    'Liability': 'warning',
    'Income': 'success',
    'Expense': 'danger'
  };
  return colors[type] || 'success';
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

function autoSave() {
  // Auto-save functionality can be implemented here
  console.log('Auto-save triggered');
}

// Stub functions for sections not yet implemented
function loadCategoriesSection() {
  const section = document.getElementById('categories');
  section.innerHTML = `
    <div class="form-card">
      <h3><i class="fas fa-tags"></i> Categories Management</h3>
      <p>Category management feature coming soon...</p>
    </div>
  `;
}

function loadCustomersSection() {
  const section = document.getElementById('customers');
  section.innerHTML = `
    <div class="form-card">
      <h3><i class="fas fa-users"></i> Customer Management</h3>
      <p>Customer management feature coming soon...</p>
    </div>
  `;
}

// COMPREHENSIVE REPORTS SECTION - See reports-section.js for full implementation
// This loads dynamically when the reports section is accessed


function loadSettingsSection() {
  const section = document.getElementById('settings');
  section.innerHTML = `
    <div class="form-card">
      <h3><i class="fas fa-cog"></i> Application Settings</h3>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="backupDatabase()">
          <i class="fas fa-download"></i> Backup Database
        </button>
        <button class="btn btn-secondary" onclick="restoreDatabase()">
          <i class="fas fa-upload"></i> Restore Database
        </button>
        <button class="btn btn-secondary" onclick="showAppInfo()">
          <i class="fas fa-info-circle"></i> App Info
        </button>
      </div>
      <div id="settingsInfo" style="margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px;"></div>
    </div>
  `;
  
  showAppInfo();
}

async function backupDatabase() {
  if (!window.electronAPI) {
    showToast('Backup only available in desktop app', 'error');
    return;
  }
  
  try {
    const result = await window.electronAPI.backupDatabase();
    if (result.success) {
      showToast(result.message, 'success');
    } else if (result.error) {
      showToast(result.error, 'error');
    }
  } catch (error) {
    showToast('Backup failed: ' + error.message, 'error');
  }
}

async function restoreDatabase() {
  if (!window.electronAPI) {
    showToast('Restore only available in desktop app', 'error');
    return;
  }
  
  if (!confirm('Restoring will replace current database. Continue?')) {
    return;
  }
  
  try {
    const result = await window.electronAPI.restoreDatabase();
    if (result.success) {
      showToast(result.message, 'success');
      setTimeout(() => location.reload(), 2000);
    } else if (result.error) {
      showToast(result.error, 'error');
    }
  } catch (error) {
    showToast('Restore failed: ' + error.message, 'error');
  }
}

async function showAppInfo() {
  const infoDiv = document.getElementById('settingsInfo');
  if (!infoDiv) return;
  
  let info = '<h4>Application Information</h4>';
  
  if (window.electronAPI) {
    try {
      const version = await window.electronAPI.getAppVersion();
      const dbPath = await window.electronAPI.getDbPath();
      info += `
        <p><strong>Version:</strong> ${version}</p>
        <p><strong>Database Location:</strong> ${dbPath}</p>
        <p><strong>Mode:</strong> Desktop Application (Offline)</p>
      `;
    } catch (error) {
      info += '<p>Could not load app info</p>';
    }
  } else {
    info += '<p><strong>Mode:</strong> Web Application</p>';
  }
  
  info += `
    <p><strong>Backend:</strong> Express.js + SQLite</p>
    <p><strong>Frontend:</strong> Vanilla JavaScript</p>
    <p style="margin-top: 15px; color: #64748b;">
      <i class="fas fa-shield-alt"></i> All data is stored locally and securely
    </p>
  `;
  
  infoDiv.innerHTML = info;
}

console.log('✅ Auto City Accounting Pro - Frontend Loaded')
// ============================================================
// ADD THESE FUNCTIONS TO YOUR frontend/app.js
// ============================================================

// ========== DELETE STOCK ITEM ==========
async function deleteStockItem(itemId, itemName) {
  // Escape single quotes in item name
  const safeName = itemName.replace(/'/g, "\\'");
  
  if (!confirm(`Delete "${itemName}"?\n\nThis will:\n- Remove the item from stock\n- Remove all compatibility data\n- This action cannot be undone!\n\nAre you sure?`)) {
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/stock/${itemId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      showToast(`${itemName} deleted successfully`, 'success');
      fetchStockItemsWithVehicles();
      updateDashboard();
    } else {
      const data = await response.json();
      showToast(data.error || 'Failed to delete item', 'error');
    }
  } catch (error) {
    showToast('Error deleting item', 'error');
    console.error(error);
  }
}

// ========== VIEW PURCHASE HISTORY ==========
async function viewPurchaseHistory(itemId) {
  try {
    const response = await fetch(`${API_URL}/purchase-history/${itemId}`);
    const history = await response.json();
    
    const itemResponse = await fetch(`${API_URL}/stock/${itemId}`);
    const item = await itemResponse.json();
    
    let html = `
      <div style="padding: 20px; background: white; border-radius: 8px; max-width: 900px; max-height: 80vh; overflow-y: auto;">
        <h3 style="margin-bottom: 20px; color: #1e293b;">
          <i class="fas fa-history"></i> ${item.item_name} - Purchase History
        </h3>
        
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
            <div>
              <small style="color: #64748b;">Current Stock</small>
              <div style="font-size: 20px; font-weight: bold; color: #1e293b;">${item.current_qty || 0} ${item.unit || 'PCS'}</div>
            </div>
            <div>
              <small style="color: #64748b;">Average Cost</small>
              <div style="font-size: 20px; font-weight: bold; color: #1e293b;">QAR ${(item.average_cost || 0).toFixed(2)}</div>
            </div>
            <div>
              <small style="color: #64748b;">Last Purchase</small>
              <div style="font-size: 20px; font-weight: bold; color: #1e293b;">QAR ${(item.last_purchase_price || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>
    `;
    
    if (history.length === 0) {
      html += `
        <div style="text-align: center; padding: 40px; color: #94a3b8;">
          <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 10px;"></i>
          <p>No purchase history yet.</p>
        </div>
      `;
    } else {
      html += `
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f1f5f9; border-bottom: 2px solid #e2e8f0;">
                <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569;">Date</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569;">Purchase No</th>
                <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569;">Supplier</th>
                <th style="padding: 12px; text-align: right; font-weight: 600; color: #475569;">Qty</th>
                <th style="padding: 12px; text-align: right; font-weight: 600; color: #475569;">Rate</th>
                <th style="padding: 12px; text-align: right; font-weight: 600; color: #475569;">Tax</th>
                <th style="padding: 12px; text-align: right; font-weight: 600; color: #475569;">Total</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      history.forEach((h, index) => {
        const bgColor = index % 2 === 0 ? 'white' : '#f9fafb';
        html += `
          <tr style="background: ${bgColor}; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px;">${new Date(h.date).toLocaleDateString()}</td>
            <td style="padding: 12px;"><small style="color: #64748b;">${h.purchase_no || '-'}</small></td>
            <td style="padding: 12px;">${h.supplier}</td>
            <td style="padding: 12px; text-align: right; font-weight: 500;">${h.quantity}</td>
            <td style="padding: 12px; text-align: right;">QAR ${h.purchase_rate.toFixed(2)}</td>
            <td style="padding: 12px; text-align: right;"><small>${h.tax_rate || 0}%</small></td>
            <td style="padding: 12px; text-align: right; font-weight: 600; color: #1e293b;">QAR ${h.total.toFixed(2)}</td>
          </tr>
        `;
      });
      
      // Calculate totals
      const totalQty = history.reduce((sum, h) => sum + h.quantity, 0);
      const totalAmount = history.reduce((sum, h) => sum + h.total, 0);
      
      html += `
              <tr style="background: #f1f5f9; border-top: 2px solid #e2e8f0; font-weight: bold;">
                <td colspan="3" style="padding: 12px; text-align: right;">TOTAL:</td>
                <td style="padding: 12px; text-align: right; color: #1e293b;">${totalQty}</td>
                <td colspan="2"></td>
                <td style="padding: 12px; text-align: right; color: #1e293b;">QAR ${totalAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }
    
    html += `
        <div style="margin-top: 20px; text-align: right;">
          <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">
            <i class="fas fa-times"></i> Close
          </button>
        </div>
      </div>
    `;
    
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;';
    overlay.innerHTML = html;
    overlay.onclick = (e) => { 
      if (e.target === overlay) overlay.remove(); 
    };
    document.body.appendChild(overlay);
    
  } catch (error) {
    showToast('Error loading purchase history', 'error');
    console.error(error);
  }
}

// ============================================================
// EXACT FIX FOR OEM AND DELETE BUTTON
// Replace your fetchStockItemsWithVehicles function with this
// ============================================================

// ============== COMPREHENSIVE REPORTS SECTION ==============

async function loadReportsSection() {
  const section = document.getElementById('reports');
  section.innerHTML = `
    <div class="form-card">
      <h3><i class="fas fa-chart-bar"></i> Business Reports</h3>
      
      <div class="report-selector">
        <div class="btn-group">
          <button class="btn btn-primary" onclick="showProfitLossReport()">
            <i class="fas fa-file-invoice-dollar"></i> Profit & Loss
          </button>
          <button class="btn btn-primary" onclick="showBalanceSheetReport()">
            <i class="fas fa-balance-scale"></i> Balance Sheet
          </button>
          <button class="btn btn-primary" onclick="showSalesReport()">
            <i class="fas fa-chart-line"></i> Sales Report
          </button>
          <button class="btn btn-primary" onclick="showPurchaseReport()">
            <i class="fas fa-shopping-cart"></i> Purchase Report
          </button>
        </div>
        
        <div class="btn-group" style="margin-top: 10px;">
          <button class="btn btn-secondary" onclick="showStockReport()">
            <i class="fas fa-boxes"></i> Stock Report
          </button>
          <button class="btn btn-secondary" onclick="showCustomerLedgerReport()">
            <i class="fas fa-users"></i> Customer Ledger
          </button>
          <button class="btn btn-secondary" onclick="showDaybookReport()">
            <i class="fas fa-book"></i> Daybook
          </button>
          <button class="btn btn-secondary" onclick="showCashFlowReport()">
            <i class="fas fa-money-bill-wave"></i> Cash Flow
          </button>
          <button class="btn btn-secondary" onclick="showTaxReport()">
            <i class="fas fa-file-invoice"></i> Tax Report
          </button>
        </div>
      </div>
      
      <div id="reportContent" class="report-content" style="margin-top: 30px;">
        <div class="empty-state">
          <i class="fas fa-chart-pie fa-3x"></i>
          <p>Select a report from above to view insights</p>
        </div>
      </div>
    </div>
  `;
}

// Profit & Loss Report
async function showProfitLossReport() {
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  
  const contentDiv = document.getElementById('reportContent');
  contentDiv.innerHTML = `
    <div class="report-header">
      <h3><i class="fas fa-file-invoice-dollar"></i> Profit & Loss Statement</h3>
      <div class="date-filter">
        <label>From: <input type="date" id="plStartDate" value="${firstDay}"></label>
        <label>To: <input type="date" id="plEndDate" value="${today}"></label>
        <button class="btn btn-primary btn-sm" onclick="refreshProfitLoss()">
          <i class="fas fa-sync"></i> Refresh
        </button>
      </div>
    </div>
    <div id="plReportData" class="report-data">
      <div class="spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
    </div>
  `;
  
  refreshProfitLoss();
}

async function refreshProfitLoss() {
  const startDate = document.getElementById('plStartDate').value;
  const endDate = document.getElementById('plEndDate').value;
  
  try {
    const response = await fetch(`${API_URL}/reports/profit-loss?startDate=${startDate}&endDate=${endDate}`);
    const data = await response.json();
    
    const reportDiv = document.getElementById('plReportData');
    reportDiv.innerHTML = `
      <div class="report-table">
        <table class="data-table">
          <thead>
            <tr>
              <th colspan="2" class="section-header">INCOME</th>
            </tr>
          </thead>
          <tbody>
            ${data.income.map(item => `
              <tr>
                <td>${item.name}</td>
                <td class="text-right">QAR.${item.total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td><strong>Total Income</strong></td>
              <td class="text-right"><strong>QAR.${data.totalIncome.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></td>
            </tr>
          </tbody>
        </table>
        
        <table class="data-table" style="margin-top: 20px;">
          <thead>
            <tr>
              <th colspan="2" class="section-header">EXPENSES</th>
            </tr>
          </thead>
          <tbody>
            ${data.expenses.map(item => `
              <tr>
                <td>${item.name}</td>
                <td class="text-right">QAR.${item.total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td><strong>Total Expenses</strong></td>
              <td class="text-right"><strong>QAR.${data.totalExpenses.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></td>
            </tr>
          </tbody>
        </table>
        
        <table class="data-table" style="margin-top: 20px;">
          <tbody>
            <tr class="profit-row ${data.netProfit >= 0 ? 'profit' : 'loss'}">
              <td><strong>NET ${data.netProfit >= 0 ? 'PROFIT' : 'LOSS'}</strong></td>
              <td class="text-right"><strong>QAR.${Math.abs(data.netProfit).toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></td>
            </tr>
            <tr>
              <td>Profit Margin</td>
              <td class="text-right">${data.profitPercentage}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    showNotification('Error loading report: ' + error.message, 'error');
  }
}

// Balance Sheet Report
async function showBalanceSheetReport() {
  const contentDiv = document.getElementById('reportContent');
  contentDiv.innerHTML = `
    <div class="report-header">
      <h3><i class="fas fa-balance-scale"></i> Balance Sheet</h3>
    </div>
    <div id="bsReportData" class="report-data">
      <div class="spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
    </div>
  `;
  
  try {
    const response = await fetch(`${API_URL}/reports/balance-sheet`);
    const data = await response.json();
    
    const reportDiv = document.getElementById('bsReportData');
    reportDiv.innerHTML = `
      <div class="report-table">
        <table class="data-table">
          <thead>
            <tr>
              <th colspan="2" class="section-header">ASSETS</th>
            </tr>
          </thead>
          <tbody>
            ${data.assets.map(item => `
              <tr>
                <td>${item.name}</td>
                <td class="text-right">QAR.${item.total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td><strong>Total Assets</strong></td>
              <td class="text-right"><strong>QAR.${data.totalAssets.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></td>
            </tr>
          </tbody>
        </table>
        
        <table class="data-table" style="margin-top: 20px;">
          <thead>
            <tr>
              <th colspan="2" class="section-header">LIABILITIES</th>
            </tr>
          </thead>
          <tbody>
            ${data.liabilities.map(item => `
              <tr>
                <td>${item.name}</td>
                <td class="text-right">QAR.${item.total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td><strong>Total Liabilities</strong></td>
              <td class="text-right"><strong>QAR.${data.totalLiabilities.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></td>
            </tr>
          </tbody>
        </table>
        
        <table class="data-table" style="margin-top: 20px;">
          <tbody>
            <tr class="profit-row">
              <td><strong>NET WORTH (Assets - Liabilities)</strong></td>
              <td class="text-right"><strong>QAR.${data.netWorth.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    showNotification('Error loading report: ' + error.message, 'error');
  }
}

// Sales Report
async function showSalesReport() {
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  
  const contentDiv = document.getElementById('reportContent');
  contentDiv.innerHTML = `
    <div class="report-header">
      <h3><i class="fas fa-chart-line"></i> Sales Report</h3>
      <div class="date-filter">
        <label>From: <input type="date" id="salesStartDate" value="${firstDay}"></label>
        <label>To: <input type="date" id="salesEndDate" value="${today}"></label>
        <label>Group By: 
          <select id="salesGroupBy">
            <option value="day">Daily</option>
            <option value="month" selected>Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </label>
        <button class="btn btn-primary btn-sm" onclick="refreshSalesReport()">
          <i class="fas fa-sync"></i> Refresh
        </button>
      </div>
    </div>
    <div id="salesReportData" class="report-data">
      <div class="spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
    </div>
  `;
  
  refreshSalesReport();
}

async function refreshSalesReport() {
  const startDate = document.getElementById('salesStartDate').value;
  const endDate = document.getElementById('salesEndDate').value;
  const groupBy = document.getElementById('salesGroupBy').value;
  
  try {
    const response = await fetch(`${API_URL}/reports/sales?startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`);
    const data = await response.json();
    
    const reportDiv = document.getElementById('salesReportData');
    reportDiv.innerHTML = `
      <div class="report-summary">
        <div class="summary-card">
          <div class="summary-value">QAR.${data.totals.totalSales.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
          <div class="summary-label">Total Sales</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${data.totals.totalTransactions}</div>
          <div class="summary-label">Transactions</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">QAR.${data.totals.totalTax.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
          <div class="summary-label">Tax Collected</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">QAR.${(data.totals.totalSales / data.totals.totalTransactions || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
          <div class="summary-label">Avg Sale Value</div>
        </div>
      </div>
      
      <div class="report-section">
        <h4>Sales Trend</h4>
        <table class="data-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Transactions</th>
              <th>Subtotal</th>
              <th>Tax</th>
              <th>Discount</th>
              <th>Total Sales</th>
              <th>Avg Sale</th>
            </tr>
          </thead>
          <tbody>
            ${data.salesData.map(row => `
              <tr>
                <td>${row.period}</td>
                <td>${row.transaction_count}</td>
                <td>QAR.${row.subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                <td>QAR.${row.total_tax.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                <td>QAR.${row.total_discount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                <td>QAR.${row.total_sales.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                <td>QAR.${row.average_sale.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="report-section">
        <h4>Top Selling Items</h4>
        <table class="data-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Type</th>
              <th>Qty Sold</th>
              <th>Revenue</th>
              <th>Times Sold</th>
            </tr>
          </thead>
          <tbody>
            ${data.topItems.map(item => `
              <tr>
                <td>${item.item_name || 'N/A'}</td>
                <td>
                  <span class="badge ${
                    item.item_type === 'Stock Item' ? 'badge-success' : 
                    item.item_type === 'Service' ? 'badge-info' : 
                    'badge-warning'
                  }">
                    ${item.item_type}
                  </span>
                </td>
                <td>${item.total_quantity}</td>
                <td>QAR.${item.total_revenue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                <td>${item.times_sold}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="report-section">
        <h4>Top Customers</h4>
        <table class="data-table">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Purchases</th>
              <th>Total Spent</th>
              <th>Avg Purchase</th>
            </tr>
          </thead>
          <tbody>
            ${data.topCustomers.map(customer => `
              <tr>
                <td>${customer.customer}</td>
                <td>${customer.purchase_count}</td>
                <td>QAR.${customer.total_spent.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                <td>QAR.${customer.average_purchase.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    showNotification('Error loading sales report: ' + error.message, 'error');
  }
}

// Stock Report
async function showStockReport() {
  const contentDiv = document.getElementById('reportContent');
  contentDiv.innerHTML = `
    <div class="report-header">
      <h3><i class="fas fa-boxes"></i> Stock Report</h3>
      <div class="btn-group">
        <button class="btn btn-primary btn-sm" onclick="refreshStockReport(false)">
          All Stock
        </button>
        <button class="btn btn-warning btn-sm" onclick="refreshStockReport(true)">
          Low Stock Only
        </button>
      </div>
    </div>
    <div id="stockReportData" class="report-data">
      <div class="spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
    </div>
  `;
  
  refreshStockReport(false);
}

async function refreshStockReport(lowStockOnly) {
  try {
    const response = await fetch(`${API_URL}/reports/stock?lowStock=${lowStockOnly}`);
    const data = await response.json();
    
    const reportDiv = document.getElementById('stockReportData');
    reportDiv.innerHTML = `
      <div class="report-summary">
        <div class="summary-card">
          <div class="summary-value">${data.summary.totalItems}</div>
          <div class="summary-label">Total Items</div>
        </div>
        <div class="summary-card critical">
          <div class="summary-value">${data.summary.criticalItems}</div>
          <div class="summary-label">Critical Stock</div>
        </div>
        <div class="summary-card warning">
          <div class="summary-value">${data.summary.lowStockItems}</div>
          <div class="summary-label">Low Stock</div>
        </div>
        <div class="summary-card success">
          <div class="summary-value">${data.summary.adequateItems}</div>
          <div class="summary-label">Adequate Stock</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">QAR.${data.summary.totalStockValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
          <div class="summary-label">Stock Value</div>
        </div>
      </div>
      
      <table class="data-table">
        <thead>
          <tr>
            <th>Item Name</th>
            <th>SKU</th>
            <th>Category</th>
            <th>Current Qty</th>
            <th>Min Qty</th>
            <th>Reorder Level</th>
            <th>Stock Value</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.stockItems.map(item => `
            <tr class="${item.stock_status === 'Critical' ? 'critical-row' : item.stock_status === 'Low' ? 'warning-row' : ''}">
              <td>${item.item_name}</td>
              <td>${item.sku || 'N/A'}</td>
              <td>${item.category || 'N/A'}</td>
              <td>${item.current_qty}</td>
              <td>${item.min_qty}</td>
              <td>${item.reorder_level}</td>
              <td>QAR.${item.stock_value.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
              <td><span class="badge ${item.stock_status === 'Critical' ? 'badge-danger' : item.stock_status === 'Low' ? 'badge-warning' : 'badge-success'}">${item.stock_status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    showNotification('Error loading stock report: ' + error.message, 'error');
  }
}

// Additional report functions (Daybook, Cash Flow, Tax, etc.) would follow similar patterns
// For brevity, I'm showing the key ones above

// Daybook Report
async function showDaybookReport() {
  const today = new Date().toISOString().split('T')[0];
  
  const contentDiv = document.getElementById('reportContent');
  contentDiv.innerHTML = `
    <div class="report-header">
      <h3><i class="fas fa-book"></i> Daybook</h3>
      <div class="date-filter">
        <label>Date: <input type="date" id="daybookDate" value="${today}"></label>
        <button class="btn btn-primary btn-sm" onclick="refreshDaybook()">
          <i class="fas fa-sync"></i> Refresh
        </button>
      </div>
    </div>
    <div id="daybookData" class="report-data">
      <div class="spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
    </div>
  `;
  
  refreshDaybook();
}

async function refreshDaybook() {
  const date = document.getElementById('daybookDate').value;
  
  try {
    const response = await fetch(`${API_URL}/reports/daybook?date=${date}`);
    const data = await response.json();
    
    const reportDiv = document.getElementById('daybookData');
    reportDiv.innerHTML = `
      <div class="report-summary">
        <div class="summary-card">
          <div class="summary-value">${data.summary.totalVouchers}</div>
          <div class="summary-label">Total Vouchers</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">QAR.${data.summary.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
          <div class="summary-label">Total Amount</div>
        </div>
      </div>
      
      <table class="data-table">
        <thead>
          <tr>
            <th>Voucher No</th>
            <th>Type</th>
            <th>Debit Account</th>
            <th>Credit Account</th>
            <th>Amount</th>
            <th>Narration</th>
          </tr>
        </thead>
        <tbody>
          ${data.vouchers.map(v => `
            <tr>
              <td>${v.voucher_no}</td>
              <td><span class="badge badge-info">${v.type}</span></td>
              <td>${v.debit_ledger}</td>
              <td>${v.credit_ledger}</td>
              <td>QAR.${v.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
              <td>${v.narration || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    showNotification('Error loading daybook: ' + error.message, 'error');
  }
}

// Customer Ledger Report
async function showCustomerLedgerReport() {
  const contentDiv = document.getElementById('reportContent');
  contentDiv.innerHTML = `
    <div class="report-header">
      <h3><i class="fas fa-users"></i> Customer Ledger Report</h3>
    </div>
    <div id="customerLedgerData" class="report-data">
      <div class="spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
    </div>
  `;
  
  try {
    const response = await fetch(`${API_URL}/reports/customer-ledger`);
    const customers = await response.json();
    
    const reportDiv = document.getElementById('customerLedgerData');
    reportDiv.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Customer Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Total Purchases</th>
            <th>Total Amount</th>
            <th>Current Balance</th>
            <th>Last Purchase</th>
          </tr>
        </thead>
        <tbody>
          ${customers.map(c => `
            <tr>
              <td>${c.name}</td>
              <td>${c.phone || 'N/A'}</td>
              <td>${c.email || 'N/A'}</td>
              <td>${c.total_purchases}</td>
              <td>QAR.${c.total_amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
              <td class="${c.current_balance > 0 ? 'text-success' : c.current_balance < 0 ? 'text-danger' : ''}">
                QAR.${c.current_balance.toLocaleString('en-IN', {minimumFractionDigits: 2})}
              </td>
              <td>${c.last_purchase_date || 'Never'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    showNotification('Error loading customer ledger: ' + error.message, 'error');
  }
}

// Cash Flow Report
async function showCashFlowReport() {
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  
  const contentDiv = document.getElementById('reportContent');
  contentDiv.innerHTML = `
    <div class="report-header">
      <h3><i class="fas fa-money-bill-wave"></i> Cash Flow Report</h3>
      <div class="date-filter">
        <label>From: <input type="date" id="cfStartDate" value="${firstDay}"></label>
        <label>To: <input type="date" id="cfEndDate" value="${today}"></label>
        <button class="btn btn-primary btn-sm" onclick="refreshCashFlow()">
          <i class="fas fa-sync"></i> Refresh
        </button>
      </div>
    </div>
    <div id="cashFlowData" class="report-data">
      <div class="spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
    </div>
  `;
  
  refreshCashFlow();
}

async function refreshCashFlow() {
  const startDate = document.getElementById('cfStartDate').value;
  const endDate = document.getElementById('cfEndDate').value;
  
  try {
    const response = await fetch(`${API_URL}/reports/cashflow?startDate=${startDate}&endDate=${endDate}`);
    const data = await response.json();
    
    const reportDiv = document.getElementById('cashFlowData');
    reportDiv.innerHTML = `
      <div class="report-summary">
        <div class="summary-card success">
          <div class="summary-value">QAR.${data.totalInflow.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
          <div class="summary-label">Total Inflow</div>
        </div>
        <div class="summary-card danger">
          <div class="summary-value">QAR.${data.totalOutflow.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
          <div class="summary-label">Total Outflow</div>
        </div>
        <div class="summary-card ${data.netCashFlow >= 0 ? 'success' : 'danger'}">
          <div class="summary-value">QAR.${data.netCashFlow.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
          <div class="summary-label">Net Cash Flow</div>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <h4>Cash Inflows</h4>
          <table class="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${data.inflows.map(item => `
                <tr>
                  <td>${item.type}</td>
                  <td>QAR.${item.total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div>
          <h4>Cash Outflows</h4>
          <table class="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${data.outflows.map(item => `
                <tr>
                  <td>${item.type}</td>
                  <td>QAR.${item.total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (error) {
    showNotification('Error loading cash flow report: ' + error.message, 'error');
  }
}

// Tax Report
async function showTaxReport() {
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  
  const contentDiv = document.getElementById('reportContent');
  contentDiv.innerHTML = `
    <div class="report-header">
      <h3><i class="fas fa-file-invoice"></i> Tax Report</h3>
      <div class="date-filter">
        <label>From: <input type="date" id="taxStartDate" value="${firstDay}"></label>
        <label>To: <input type="date" id="taxEndDate" value="${today}"></label>
        <button class="btn btn-primary btn-sm" onclick="refreshTaxReport()">
          <i class="fas fa-sync"></i> Refresh
        </button>
      </div>
    </div>
    <div id="taxReportData" class="report-data">
      <div class="spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
    </div>
  `;
  
  refreshTaxReport();
}

async function refreshTaxReport() {
  const startDate = document.getElementById('taxStartDate').value;
  const endDate = document.getElementById('taxEndDate').value;
  
  try {
    const response = await fetch(`${API_URL}/reports/tax?startDate=${startDate}&endDate=${endDate}`);
    const data = await response.json();
    
    const reportDiv = document.getElementById('taxReportData');
    reportDiv.innerHTML = `
      <div class="report-summary">
        <div class="summary-card">
          <div class="summary-value">QAR.${data.taxCollected.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
          <div class="summary-label">Tax Collected (Output)</div>
          <div class="summary-sublabel">${data.salesTransactions} sales transactions</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">QAR.${data.taxPaid.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
          <div class="summary-label">Tax Paid (Input)</div>
          <div class="summary-sublabel">${data.purchaseTransactions} purchase transactions</div>
        </div>
        <div class="summary-card ${data.netTaxLiability >= 0 ? 'warning' : 'success'}">
          <div class="summary-value">QAR.${Math.abs(data.netTaxLiability).toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
          <div class="summary-label">${data.netTaxLiability >= 0 ? 'Tax Payable' : 'Tax Refundable'}</div>
        </div>
      </div>
      
      <div class="info-box">
        <i class="fas fa-info-circle"></i>
        <p><strong>Note:</strong> This report shows the difference between tax collected from customers (output tax) and tax paid to suppliers (input tax). 
        ${data.netTaxLiability >= 0 ? 'A positive amount means you need to pay this to the government.' : 'A negative amount means you may be eligible for a refund.'}</p>
      </div>
    `;
  } catch (error) {
    showNotification('Error loading tax report: ' + error.message, 'error');
  }
}

// Purchase Report
async function showPurchaseReport() {
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  
  const contentDiv = document.getElementById('reportContent');
  contentDiv.innerHTML = `
    <div class="report-header">
      <h3><i class="fas fa-shopping-cart"></i> Purchase Report</h3>
      <div class="date-filter">
        <label>From: <input type="date" id="purchaseStartDate" value="${firstDay}"></label>
        <label>To: <input type="date" id="purchaseEndDate" value="${today}"></label>
        <button class="btn btn-primary btn-sm" onclick="refreshPurchaseReport()">
          <i class="fas fa-sync"></i> Refresh
        </button>
      </div>
    </div>
    <div id="purchaseReportData" class="report-data">
      <div class="spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
    </div>
  `;
  
  refreshPurchaseReport();
}

async function refreshPurchaseReport() {
  const startDate = document.getElementById('purchaseStartDate').value;
  const endDate = document.getElementById('purchaseEndDate').value;
  
  try {
    const response = await fetch(`${API_URL}/reports/purchases?startDate=${startDate}&endDate=${endDate}`);
    const data = await response.json();
    
    const reportDiv = document.getElementById('purchaseReportData');
    reportDiv.innerHTML = `
      <div class="report-section">
        <h4>Purchase Trend</h4>
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Transactions</th>
              <th>Subtotal</th>
              <th>Tax</th>
              <th>Total</th>
              <th>Avg Purchase</th>
            </tr>
          </thead>
          <tbody>
            ${data.purchaseData.map(row => `
              <tr>
                <td>${row.purchase_date}</td>
                <td>${row.transaction_count}</td>
                <td>QAR.${row.subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                <td>QAR.${row.total_tax.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                <td>QAR.${row.total_purchases.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                <td>QAR.${row.average_purchase.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="report-section">
        <h4>Top Purchased Items</h4>
        <table class="data-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Qty Purchased</th>
              <th>Total Cost</th>
              <th>Times Purchased</th>
            </tr>
          </thead>
          <tbody>
            ${data.topItems.map(item => `
              <tr>
                <td>${item.item_name}</td>
                <td>${item.total_quantity}</td>
                <td>QAR.${item.total_cost.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                <td>${item.times_purchased}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="report-section">
        <h4>Top Suppliers</h4>
        <table class="data-table">
          <thead>
            <tr>
              <th>Supplier Name</th>
              <th>Purchases</th>
              <th>Total Amount</th>
              <th>Avg Purchase</th>
            </tr>
          </thead>
          <tbody>
            ${data.topSuppliers.map(supplier => `
              <tr>
                <td>${supplier.supplier}</td>
                <td>${supplier.purchase_count}</td>
                <td>QAR.${supplier.total_purchased.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                <td>QAR.${supplier.average_purchase.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    showNotification('Error loading purchase report: ' + error.message, 'error');
  }
}
// ============== COMPREHENSIVE CUSTOMERS SECTION ==============

async function loadCustomersSection() {
  const section = document.getElementById('customers');
  section.innerHTML = `
    <div class="form-card">
      <div class="section-header">
        <h3><i class="fas fa-users"></i> Customer Management</h3>
        <button class="btn btn-primary" onclick="showAddCustomerModal()">
          <i class="fas fa-plus"></i> Add Customer
        </button>
      </div>
      
      <div class="search-filter">
        <input type="text" id="customerSearch" placeholder="Search customers..." 
               onkeyup="filterCustomers()" class="form-input">
      </div>
      
      <div id="customersList" class="data-list">
        <div class="spinner"><i class="fas fa-spinner fa-spin"></i> Loading customers...</div>
      </div>
    </div>
    
    <!-- Add/Edit Customer Modal -->
    <div id="customerModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="customerModalTitle"><i class="fas fa-user-plus"></i> Add Customer</h3>
          <span class="close" onclick="closeCustomerModal()">&times;</span>
        </div>
        <form id="customerForm" onsubmit="saveCustomer(event)">
          <div class="form-grid">
            <div class="form-group">
              <label>Name *</label>
              <input type="text" id="customerName" required class="form-input">
            </div>
            
            <div class="form-group">
              <label>Phone</label>
              <input type="tel" id="customerPhone" class="form-input">
            </div>
            
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="customerEmail" class="form-input">
            </div>
            
            <div class="form-group">
              <label>GSTIN</label>
              <input type="text" id="customerGstin" class="form-input" 
                     pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}">
            </div>
            
            <div class="form-group full-width">
              <label>Address</label>
              <textarea id="customerAddress" class="form-input" rows="2"></textarea>
            </div>
            
            <div class="form-group">
              <label>Opening Balance (QAR.)</label>
              <input type="number" id="customerOpeningBalance" value="0" step="0.01" class="form-input">
            </div>
            
            <div class="form-group">
              <label>Credit Limit (QAR.)</label>
              <input type="number" id="customerCreditLimit" value="0" step="0.01" class="form-input">
            </div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeCustomerModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-save"></i> Save Customer
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Customer Details Modal -->
    <div id="customerDetailsModal" class="modal">
      <div class="modal-content large-modal">
        <div class="modal-header">
          <h3><i class="fas fa-user-circle"></i> Customer Details</h3>
          <span class="close" onclick="closeCustomerDetailsModal()">&times;</span>
        </div>
        <div id="customerDetailsContent">
          <div class="spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
        </div>
      </div>
    </div>
  `;
  
  loadCustomers();
}

let allCustomers = [];
let editingCustomerId = null;

async function loadCustomers() {
  try {
    const response = await fetch(`${API_URL}/customers`);
    allCustomers = await response.json();
    displayCustomers(allCustomers);
  } catch (error) {
    showNotification('Error loading customers: ' + error.message, 'error');
    document.getElementById('customersList').innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Error loading customers. Please try again.</p>
      </div>
    `;
  }
}

function displayCustomers(customers) {
  const listDiv = document.getElementById('customersList');
  
  if (customers.length === 0) {
    listDiv.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-users fa-3x"></i>
        <p>No customers found</p>
        <button class="btn btn-primary" onclick="showAddCustomerModal()">
          <i class="fas fa-plus"></i> Add Your First Customer
        </button>
      </div>
    `;
    return;
  }
  
  listDiv.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Phone</th>
          <th>Email</th>
          <th>Total Purchases</th>
          <th>Total Spent</th>
          <th>Current Balance</th>
          <th>Last Purchase</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${customers.map(customer => `
          <tr>
            <td>
              <strong>${customer.name}</strong>
              ${customer.gstin ? `<br><small class="text-muted">GSTIN: ${customer.gstin}</small>` : ''}
            </td>
            <td>${customer.phone || 'N/A'}</td>
            <td>${customer.email || 'N/A'}</td>
            <td>${customer.total_purchases || 0}</td>
            <td>QAR.${(customer.total_spent || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
            <td class="${customer.current_balance > 0 ? 'text-success' : customer.current_balance < 0 ? 'text-danger' : ''}">
              QAR.${customer.current_balance.toLocaleString('en-IN', {minimumFractionDigits: 2})}
            </td>
            <td>${customer.last_purchase_date || 'Never'}</td>
            <td>
              <div class="action-buttons">
                <button class="btn-icon" onclick="viewCustomerDetails(${customer.id})" title="View Details">
                  <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon" onclick="editCustomer(${customer.id})" title="Edit">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-danger" onclick="deleteCustomer(${customer.id}, '${customer.name}')" title="Delete">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function filterCustomers() {
  const search = document.getElementById('customerSearch').value.toLowerCase();
  const filtered = allCustomers.filter(customer => 
    customer.name.toLowerCase().includes(search) ||
    (customer.phone && customer.phone.includes(search)) ||
    (customer.email && customer.email.toLowerCase().includes(search))
  );
  displayCustomers(filtered);
}

function showAddCustomerModal() {
  editingCustomerId = null;
  document.getElementById('customerModalTitle').innerHTML = '<i class="fas fa-user-plus"></i> Add Customer';
  document.getElementById('customerForm').reset();
  document.getElementById('customerModal').style.display = 'block';
}

function closeCustomerModal() {
  document.getElementById('customerModal').style.display = 'none';
  editingCustomerId = null;
}

async function saveCustomer(event) {
  event.preventDefault();
  
  const customerData = {
    name: document.getElementById('customerName').value,
    phone: document.getElementById('customerPhone').value,
    email: document.getElementById('customerEmail').value,
    address: document.getElementById('customerAddress').value,
    gstin: document.getElementById('customerGstin').value,
    opening_balance: parseFloat(document.getElementById('customerOpeningBalance').value) || 0,
    credit_limit: parseFloat(document.getElementById('customerCreditLimit').value) || 0
  };
  
  try {
    const url = editingCustomerId 
      ? `${API_URL}/customers/${editingCustomerId}`
      : `${API_URL}/customers`;
    
    const method = editingCustomerId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to save customer');
    }
    
    showNotification(result.message || 'Customer saved successfully!', 'success');
    closeCustomerModal();
    loadCustomers();
  } catch (error) {
    showNotification('Error: ' + error.message, 'error');
  }
}

async function editCustomer(id) {
  try {
    const customer = allCustomers.find(c => c.id === id);
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    editingCustomerId = id;
    document.getElementById('customerModalTitle').innerHTML = '<i class="fas fa-user-edit"></i> Edit Customer';
    document.getElementById('customerName').value = customer.name;
    document.getElementById('customerPhone').value = customer.phone || '';
    document.getElementById('customerEmail').value = customer.email || '';
    document.getElementById('customerAddress').value = customer.address || '';
    document.getElementById('customerGstin').value = customer.gstin || '';
    document.getElementById('customerOpeningBalance').value = customer.opening_balance || 0;
    document.getElementById('customerCreditLimit').value = customer.credit_limit || 0;
    
    document.getElementById('customerModal').style.display = 'block';
  } catch (error) {
    showNotification('Error loading customer: ' + error.message, 'error');
  }
}

async function deleteCustomer(id, name) {
  if (!confirm(`Are you sure you want to delete customer "${name}"?`)) {
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/customers/${id}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete customer');
    }
    
    showNotification(result.message || 'Customer deleted successfully!', 'success');
    if (result.info) {
      showNotification(result.info, 'warning');
    }
    loadCustomers();
  } catch (error) {
    showNotification('Error: ' + error.message, 'error');
  }
}

async function viewCustomerDetails(id) {
  const modal = document.getElementById('customerDetailsModal');
  const content = document.getElementById('customerDetailsContent');
  
  modal.style.display = 'block';
  content.innerHTML = '<div class="spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
  
  try {
    const response = await fetch(`${API_URL}/customers/${id}`);
    const customer = await response.json();
    
    if (!response.ok) {
      throw new Error(customer.error || 'Failed to load customer details');
    }
    
    content.innerHTML = `
      <div class="customer-details">
        <div class="customer-info-card">
          <div class="customer-header">
            <div>
              <h2>${customer.name}</h2>
              ${customer.gstin ? `<p class="text-muted">GSTIN: ${customer.gstin}</p>` : ''}
            </div>
            <div class="customer-balance ${customer.current_balance >= 0 ? 'positive' : 'negative'}">
              <div class="balance-label">Current Balance</div>
              <div class="balance-amount">QAR.${customer.current_balance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
            </div>
          </div>
          
          <div class="info-grid">
            <div class="info-item">
              <i class="fas fa-phone"></i>
              <div>
                <div class="info-label">Phone</div>
                <div class="info-value">${customer.phone || 'N/A'}</div>
              </div>
            </div>
            
            <div class="info-item">
              <i class="fas fa-envelope"></i>
              <div>
                <div class="info-label">Email</div>
                <div class="info-value">${customer.email || 'N/A'}</div>
              </div>
            </div>
            
            <div class="info-item">
              <i class="fas fa-map-marker-alt"></i>
              <div>
                <div class="info-label">Address</div>
                <div class="info-value">${customer.address || 'N/A'}</div>
              </div>
            </div>
            
            <div class="info-item">
              <i class="fas fa-credit-card"></i>
              <div>
                <div class="info-label">Credit Limit</div>
                <div class="info-value">QAR.${(customer.credit_limit || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="customer-stats">
          <div class="stat-card">
            <div class="stat-value">${customer.stats?.total_orders || 0}</div>
            <div class="stat-label">Total Orders</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">QAR.${(customer.stats?.total_spent || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
            <div class="stat-label">Total Spent</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">QAR.${(customer.stats?.average_order_value || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
            <div class="stat-label">Avg Order Value</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${customer.stats?.first_purchase || 'N/A'}</div>
            <div class="stat-label">First Purchase</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${customer.stats?.last_purchase || 'N/A'}</div>
            <div class="stat-label">Last Purchase</div>
          </div>
        </div>
        
        <div class="purchase-history">
          <h4><i class="fas fa-history"></i> Purchase History</h4>
          ${customer.purchases && customer.purchases.length > 0 ? `
            <table class="data-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${customer.purchases.map(purchase => `
                  <tr>
                    <td><strong>${purchase.invoice_no}</strong></td>
                    <td>${purchase.date}</td>
                    <td>${purchase.item_count}</td>
                    <td>QAR.${purchase.total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    <td><span class="badge badge-info">${purchase.payment_method}</span></td>
                    <td><span class="badge ${purchase.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}">${purchase.payment_status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `
            <div class="empty-state-small">
              <p>No purchase history found</p>
            </div>
          `}
        </div>
      </div>
    `;
  } catch (error) {
    content.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Error loading customer details: ${error.message}</p>
      </div>
    `;
  }
}

function closeCustomerDetailsModal() {
  document.getElementById('customerDetailsModal').style.display = 'none';
}

// Close modals when clicking outside
window.onclick = function(event) {
  const customerModal = document.getElementById('customerModal');
  const detailsModal = document.getElementById('customerDetailsModal');
  
  if (event.target === customerModal) {
    closeCustomerModal();
  }
  if (event.target === detailsModal) {
    closeCustomerDetailsModal();
  }
};
// ============== COMPREHENSIVE CATEGORIES SECTION ==============

async function loadCategoriesSection() {
  const section = document.getElementById('categories');
  section.innerHTML = `
    <div class="form-card">
      <div class="section-header">
        <h3><i class="fas fa-tags"></i> Category Management</h3>
        <button class="btn btn-primary" onclick="showAddCategoryModal()">
          <i class="fas fa-plus"></i> Add Category
        </button>
      </div>
      
      <div class="search-filter">
        <input type="text" id="categorySearch" placeholder="Search categories..." 
               onkeyup="filterCategories()" class="form-input">
      </div>
      
      <div id="categoriesList" class="data-list">
        <div class="spinner"><i class="fas fa-spinner fa-spin"></i> Loading categories...</div>
      </div>
    </div>
    
    <!-- Add/Edit Category Modal -->
    <div id="categoryModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="categoryModalTitle"><i class="fas fa-tag"></i> Add Category</h3>
          <span class="close" onclick="closeCategoryModal()">&times;</span>
        </div>
        <form id="categoryForm" onsubmit="saveCategory(event)">
          <div class="form-group">
            <label>Category Name *</label>
            <input type="text" id="categoryName" required class="form-input" 
                   placeholder="e.g., Engine Parts, Brake Systems">
          </div>
          
          <div class="form-group">
            <label>Description</label>
            <textarea id="categoryDescription" class="form-input" rows="3" 
                      placeholder="Brief description of this category"></textarea>
          </div>
          
          <div class="form-group">
            <label>Parent Category (Optional)</label>
            <select id="categoryParent" class="form-input">
              <option value="">-- No Parent (Top Level) --</option>
            </select>
            <small class="text-muted">Select a parent category to create a sub-category</small>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeCategoryModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-save"></i> Save Category
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Category Details Modal -->
    <div id="categoryDetailsModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3><i class="fas fa-tag"></i> Category Details</h3>
          <span class="close" onclick="closeCategoryDetailsModal()">&times;</span>
        </div>
        <div id="categoryDetailsContent">
          <div class="spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
        </div>
      </div>
    </div>
  `;
  
  loadCategories();
}

let allCategories = [];
let editingCategoryId = null;

async function loadCategories() {
  try {
    const response = await fetch(`${API_URL}/categories`);
    allCategories = await response.json();
    displayCategories(allCategories);
    populateParentDropdown();
  } catch (error) {
    showNotification('Error loading categories: ' + error.message, 'error');
    document.getElementById('categoriesList').innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Error loading categories. Please try again.</p>
      </div>
    `;
  }
}

function populateParentDropdown() {
  const select = document.getElementById('categoryParent');
  if (!select) return;
  
  const currentOptions = select.innerHTML;
  const firstOption = '<option value="">-- No Parent (Top Level) --</option>';
  
  const options = allCategories
    .filter(cat => !editingCategoryId || cat.id !== editingCategoryId)
    .map(cat => `<option value="${cat.id}">${cat.name}${cat.parent_name ? ' (under ' + cat.parent_name + ')' : ''}</option>`)
    .join('');
  
  select.innerHTML = firstOption + options;
}

function displayCategories(categories) {
  const listDiv = document.getElementById('categoriesList');
  
  if (categories.length === 0) {
    listDiv.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-tags fa-3x"></i>
        <p>No categories found</p>
        <button class="btn btn-primary" onclick="showAddCategoryModal()">
          <i class="fas fa-plus"></i> Add Your First Category
        </button>
      </div>
    `;
    return;
  }
  
  // Organize categories by parent
  const topLevel = categories.filter(cat => !cat.parent_id);
  const children = categories.filter(cat => cat.parent_id);
  
  listDiv.innerHTML = `
    <div class="category-tree">
      ${topLevel.map(cat => renderCategoryCard(cat, children)).join('')}
    </div>
  `;
}

function renderCategoryCard(category, allChildren) {
  const children = allChildren.filter(child => child.parent_id === category.id);
  
  return `
    <div class="category-card ${category.parent_id ? 'sub-category' : 'top-category'}">
      <div class="category-header">
        <div class="category-info">
          <h4>
            <i class="fas fa-tag"></i> ${category.name}
            ${category.parent_name ? `<span class="parent-badge">under ${category.parent_name}</span>` : ''}
          </h4>
          <p class="category-description">${category.description || 'No description'}</p>
          <div class="category-meta">
            <span class="item-count">
              <i class="fas fa-box"></i> ${category.item_count || 0} items
            </span>
            ${children.length > 0 ? `
              <span class="sub-count">
                <i class="fas fa-sitemap"></i> ${children.length} sub-categories
              </span>
            ` : ''}
          </div>
        </div>
        
        <div class="category-actions">
          <button class="btn-icon" onclick="viewCategoryDetails(${category.id})" title="View Details">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn-icon" onclick="editCategory(${category.id})" title="Edit">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-icon btn-danger" onclick="deleteCategory(${category.id}, '${category.name}')" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      
      ${children.length > 0 ? `
        <div class="sub-categories">
          ${children.map(child => renderCategoryCard(child, allChildren)).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function filterCategories() {
  const search = document.getElementById('categorySearch').value.toLowerCase();
  const filtered = allCategories.filter(category => 
    category.name.toLowerCase().includes(search) ||
    (category.description && category.description.toLowerCase().includes(search)) ||
    (category.parent_name && category.parent_name.toLowerCase().includes(search))
  );
  displayCategories(filtered);
}

function showAddCategoryModal() {
  editingCategoryId = null;
  document.getElementById('categoryModalTitle').innerHTML = '<i class="fas fa-tag"></i> Add Category';
  document.getElementById('categoryForm').reset();
  populateParentDropdown();
  document.getElementById('categoryModal').style.display = 'block';
}

function closeCategoryModal() {
  document.getElementById('categoryModal').style.display = 'none';
  editingCategoryId = null;
}

async function saveCategory(event) {
  event.preventDefault();
  
  const categoryData = {
    name: document.getElementById('categoryName').value,
    description: document.getElementById('categoryDescription').value,
    parent_id: document.getElementById('categoryParent').value || null
  };
  
  try {
    const url = editingCategoryId 
      ? `${API_URL}/categories/${editingCategoryId}`
      : `${API_URL}/categories`;
    
    const method = editingCategoryId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryData)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to save category');
    }
    
    showNotification(result.message || 'Category saved successfully!', 'success');
    closeCategoryModal();
    loadCategories();
  } catch (error) {
    showNotification('Error: ' + error.message, 'error');
  }
}

async function editCategory(id) {
  try {
    const category = allCategories.find(c => c.id === id);
    if (!category) {
      throw new Error('Category not found');
    }
    
    editingCategoryId = id;
    document.getElementById('categoryModalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Category';
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryDescription').value = category.description || '';
    
    populateParentDropdown();
    if (category.parent_id) {
      document.getElementById('categoryParent').value = category.parent_id;
    }
    
    document.getElementById('categoryModal').style.display = 'block';
  } catch (error) {
    showNotification('Error loading category: ' + error.message, 'error');
  }
}

async function deleteCategory(id, name) {
  if (!confirm(`Are you sure you want to delete category "${name}"?`)) {
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/categories/${id}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete category');
    }
    
    showNotification(result.message || 'Category deleted successfully!', 'success');
    loadCategories();
  } catch (error) {
    showNotification('Error: ' + error.message, 'error');
  }
}

async function viewCategoryDetails(id) {
  const modal = document.getElementById('categoryDetailsModal');
  const content = document.getElementById('categoryDetailsContent');
  
  modal.style.display = 'block';
  content.innerHTML = '<div class="spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
  
  try {
    const response = await fetch(`${API_URL}/categories/${id}`);
    const category = await response.json();
    
    if (!response.ok) {
      throw new Error(category.error || 'Failed to load category details');
    }
    
    content.innerHTML = `
      <div class="category-details">
        <div class="category-info-header">
          <h2><i class="fas fa-tag"></i> ${category.name}</h2>
          ${category.parent_name ? `<p class="text-muted">Parent Category: ${category.parent_name}</p>` : ''}
          <p class="category-description">${category.description || 'No description provided'}</p>
        </div>
        
        <div class="category-stats">
          <div class="stat-card">
            <div class="stat-value">${category.items?.length || 0}</div>
            <div class="stat-label">Total Items</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">QAR.${(category.items?.reduce((sum, item) => sum + (item.current_qty * item.sale_rate), 0) || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
            <div class="stat-label">Total Value</div>
          </div>
        </div>
        
        <div class="category-items">
          <h4><i class="fas fa-boxes"></i> Items in this Category</h4>
          ${category.items && category.items.length > 0 ? `
            <table class="data-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>SKU</th>
                  <th>Current Qty</th>
                  <th>Sale Rate</th>
                  <th>Stock Value</th>
                </tr>
              </thead>
              <tbody>
                ${category.items.map(item => `
                  <tr>
                    <td><strong>${item.item_name}</strong></td>
                    <td>${item.sku || 'N/A'}</td>
                    <td>${item.current_qty}</td>
                    <td>QAR.${item.sale_rate.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    <td>QAR.${(item.current_qty * item.sale_rate).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `
            <div class="empty-state-small">
              <p>No items in this category yet</p>
            </div>
          `}
        </div>
      </div>
    `;
  } catch (error) {
    content.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Error loading category details: ${error.message}</p>
      </div>
    `;
  }
}

function closeCategoryDetailsModal() {
  document.getElementById('categoryDetailsModal').style.display = 'none';
}
