/**
 * Advanced Analytics & Reporting
 * Enhanced analytics features for profit trends, forecasting, and customer insights
 */

// ============================================
// ANALYTICS DASHBOARD
// ============================================

/**
 * Load Analytics Section
 */
async function loadAnalyticsSection() {
  const container = document.getElementById('analyticsSection');
  
  container.innerHTML = `
    <div class="analytics-dashboard">
      <div class="section-header">
        <h2>Advanced Analytics</h2>
        <div class="date-range-selector">
          <input type="date" id="analyticsStartDate" />
          <span>to</span>
          <input type="date" id="analyticsEndDate" />
          <button onclick="refreshAnalytics()" class="btn-primary">Refresh</button>
        </div>
      </div>
      
      <!-- Tabs -->
      <div class="analytics-tabs">
        <button class="tab-btn active" data-tab="profit">Profit Trends</button>
        <button class="tab-btn" data-tab="forecast">Sales Forecast</button>
        <button class="tab-btn" data-tab="customers">Customer Analytics</button>
        <button class="tab-btn" data-tab="products">Product Performance</button>
      </div>
      
      <!-- Tab Content -->
      <div class="tab-content active" id="profitTab">
        <div id="profitTrendsContainer"></div>
      </div>
      
      <div class="tab-content" id="forecastTab">
        <div id="forecastContainer"></div>
      </div>
      
      <div class="tab-content" id="customersTab">
        <div id="customerAnalyticsContainer"></div>
      </div>
      
      <div class="tab-content" id="productsTab">
        <div id="productPerformanceContainer"></div>
      </div>
    </div>
  `;
  
  // Set default dates (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  document.getElementById('analyticsStartDate').value = startDate.toISOString().split('T')[0];
  document.getElementById('analyticsEndDate').value = endDate.toISOString().split('T')[0];
  
  // Setup tab switching
  setupAnalyticsTabs();
  
  // Load initial data
  loadProfitTrends();
}

/**
 * Setup Analytics Tabs
 */
function setupAnalyticsTabs() {
  document.querySelectorAll('.analytics-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active class from all tabs
      document.querySelectorAll('.analytics-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab
      btn.classList.add('active');
      const tabName = btn.dataset.tab;
      document.getElementById(`${tabName}Tab`).classList.add('active');
      
      // Load corresponding data
      switch(tabName) {
        case 'profit':
          loadProfitTrends();
          break;
        case 'forecast':
          loadSalesForecast();
          break;
        case 'customers':
          loadCustomerAnalytics();
          break;
        case 'products':
          loadProductPerformance();
          break;
      }
    });
  });
}

// ============================================
// PROFIT TRENDS
// ============================================

/**
 * Load Profit Trends
 */
async function loadProfitTrends() {
  const container = document.getElementById('profitTrendsContainer');
  container.innerHTML = '<div class="loading">Loading profit trends...</div>';
  
  try {
    const startDate = document.getElementById('analyticsStartDate').value;
    const endDate = document.getElementById('analyticsEndDate').value;
    const groupBy = 'day'; // Can be day, week, or month
    
    const response = await authenticatedFetch(
      `${API_URL}/analytics/profit-trends?startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`
    );
    
    const trends = await response.json();
    
    displayProfitTrends(trends);
  } catch (error) {
    container.innerHTML = `<div class="error">Failed to load profit trends: ${error.message}</div>`;
  }
}

/**
 * Display Profit Trends
 */
function displayProfitTrends(trends) {
  const container = document.getElementById('profitTrendsContainer');
  
  if (trends.length === 0) {
    container.innerHTML = '<div class="empty-state">No profit data available for the selected period</div>';
    return;
  }
  
  // Calculate totals
  const totals = {
    revenue: trends.reduce((sum, t) => sum + t.total_revenue, 0),
    cost: trends.reduce((sum, t) => sum + t.total_cost, 0),
    profit: trends.reduce((sum, t) => sum + t.total_profit, 0),
    transactions: trends.reduce((sum, t) => sum + t.transaction_count, 0)
  };
  
  const avgMargin = totals.revenue > 0 ? ((totals.profit / totals.revenue) * 100).toFixed(2) : 0;
  
  const html = `
    <div class="profit-summary-cards">
      <div class="stat-card">
        <div class="stat-label">Total Revenue</div>
        <div class="stat-value">₹${formatNumber(totals.revenue)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Cost</div>
        <div class="stat-value">₹${formatNumber(totals.cost)}</div>
      </div>
      <div class="stat-card success">
        <div class="stat-label">Total Profit</div>
        <div class="stat-value">₹${formatNumber(totals.profit)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg Margin</div>
        <div class="stat-value">${avgMargin}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Transactions</div>
        <div class="stat-value">${totals.transactions}</div>
      </div>
    </div>
    
    <div class="chart-container">
      <h3>Profit Trend Chart</h3>
      <canvas id="profitTrendChart"></canvas>
    </div>
    
    <div class="profit-table-container">
      <h3>Detailed Breakdown</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Period</th>
            <th>Revenue</th>
            <th>Cost</th>
            <th>Profit</th>
            <th>Margin %</th>
            <th>Transactions</th>
          </tr>
        </thead>
        <tbody>
          ${trends.map(trend => `
            <tr>
              <td>${trend.period}</td>
              <td>₹${formatNumber(trend.total_revenue)}</td>
              <td>₹${formatNumber(trend.total_cost)}</td>
              <td class="${trend.total_profit >= 0 ? 'text-success' : 'text-danger'}">
                ₹${formatNumber(trend.total_profit)}
              </td>
              <td>${trend.avg_margin.toFixed(2)}%</td>
              <td>${trend.transaction_count}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  container.innerHTML = html;
  
  // Draw chart
  drawProfitChart(trends);
}

/**
 * Draw Profit Chart using Chart.js
 */
function drawProfitChart(trends) {
  const ctx = document.getElementById('profitTrendChart');
  
  if (!ctx) return;
  
  // Destroy existing chart if any
  if (window.profitChart) {
    window.profitChart.destroy();
  }
  
  window.profitChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trends.map(t => t.period),
      datasets: [
        {
          label: 'Revenue',
          data: trends.map(t => t.total_revenue),
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          tension: 0.4
        },
        {
          label: 'Profit',
          data: trends.map(t => t.total_profit),
          borderColor: '#2ecc71',
          backgroundColor: 'rgba(46, 204, 113, 0.1)',
          tension: 0.4
        },
        {
          label: 'Cost',
          data: trends.map(t => t.total_cost),
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': ₹' + formatNumber(context.parsed.y);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '₹' + formatNumber(value);
            }
          }
        }
      }
    }
  });
}

// ============================================
// SALES FORECAST
// ============================================

/**
 * Load Sales Forecast
 */
async function loadSalesForecast() {
  const container = document.getElementById('forecastContainer');
  container.innerHTML = '<div class="loading">Generating sales forecast...</div>';
  
  try {
    const days = 30; // Forecast for next 30 days
    
    const response = await authenticatedFetch(
      `${API_URL}/analytics/forecast?days=${days}`
    );
    
    const forecast = await response.json();
    
    displayForecast(forecast);
  } catch (error) {
    container.innerHTML = `<div class="error">Failed to generate forecast: ${error.message}</div>`;
  }
}

/**
 * Display Sales Forecast
 */
function displayForecast(forecast) {
  const container = document.getElementById('forecastContainer');
  
  if (!forecast || forecast.length === 0) {
    container.innerHTML = '<div class="empty-state">Insufficient data to generate forecast</div>';
    return;
  }
  
  const totalPredicted = forecast.reduce((sum, f) => sum + f.predictedSales, 0);
  const avgConfidence = forecast.reduce((sum, f) => sum + f.confidenceLevel, 0) / forecast.length;
  
  const html = `
    <div class="forecast-summary">
      <div class="stat-card">
        <div class="stat-label">30-Day Predicted Sales</div>
        <div class="stat-value">₹${formatNumber(totalPredicted)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Average Confidence</div>
        <div class="stat-value">${avgConfidence.toFixed(1)}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Forecast Period</div>
        <div class="stat-value">${forecast.length} days</div>
      </div>
    </div>
    
    <div class="chart-container">
      <h3>Sales Forecast Chart</h3>
      <canvas id="forecastChart"></canvas>
    </div>
    
    <div class="forecast-table">
      <h3>Daily Forecast</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Predicted Sales</th>
            <th>Predicted Transactions</th>
            <th>Confidence Level</th>
          </tr>
        </thead>
        <tbody>
          ${forecast.slice(0, 10).map(f => `
            <tr>
              <td>${new Date(f.date).toLocaleDateString()}</td>
              <td>₹${formatNumber(f.predictedSales)}</td>
              <td>${f.predictedTransactions}</td>
              <td>
                <div class="confidence-bar">
                  <div class="confidence-fill" style="width: ${f.confidenceLevel}%; background: ${getConfidenceColor(f.confidenceLevel)}"></div>
                  <span>${f.confidenceLevel.toFixed(1)}%</span>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${forecast.length > 10 ? '<div class="text-center">Showing first 10 days...</div>' : ''}
    </div>
  `;
  
  container.innerHTML = html;
  
  drawForecastChart(forecast);
}

/**
 * Draw Forecast Chart
 */
function drawForecastChart(forecast) {
  const ctx = document.getElementById('forecastChart');
  
  if (!ctx) return;
  
  if (window.forecastChart) {
    window.forecastChart.destroy();
  }
  
  window.forecastChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: forecast.map(f => new Date(f.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: 'Predicted Sales',
        data: forecast.map(f => f.predictedSales),
        borderColor: '#9b59b6',
        backgroundColor: 'rgba(155, 89, 182, 0.1)',
        borderDash: [5, 5],
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return 'Predicted: ₹' + formatNumber(context.parsed.y);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '₹' + formatNumber(value);
            }
          }
        }
      }
    }
  });
}

// ============================================
// CUSTOMER ANALYTICS
// ============================================

/**
 * Load Customer Analytics
 */
async function loadCustomerAnalytics() {
  const container = document.getElementById('customerAnalyticsContainer');
  container.innerHTML = '<div class="loading">Loading customer analytics...</div>';
  
  try {
    const response = await authenticatedFetch(`${API_URL}/analytics/customers`);
    const analytics = await response.json();
    
    displayCustomerAnalytics(analytics);
  } catch (error) {
    container.innerHTML = `<div class="error">Failed to load customer analytics: ${error.message}</div>`;
  }
}

/**
 * Display Customer Analytics
 */
function displayCustomerAnalytics(analytics) {
  const container = document.getElementById('customerAnalyticsContainer');
  
  if (analytics.length === 0) {
    container.innerHTML = '<div class="empty-state">No customer data available</div>';
    return;
  }
  
  // Segment customers
  const active = analytics.filter(c => c.status === 'Active');
  const moderate = analytics.filter(c => c.status === 'Moderate');
  const inactive = analytics.filter(c => c.status === 'Inactive');
  
  const html = `
    <div class="customer-segment-cards">
      <div class="stat-card success">
        <div class="stat-label">Active Customers</div>
        <div class="stat-value">${active.length}</div>
        <div class="stat-subtitle">Purchased in last 30 days</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-label">Moderate Customers</div>
        <div class="stat-value">${moderate.length}</div>
        <div class="stat-subtitle">Purchased in last 90 days</div>
      </div>
      <div class="stat-card danger">
        <div class="stat-label">Inactive Customers</div>
        <div class="stat-value">${inactive.length}</div>
        <div class="stat-subtitle">No purchase in 90+ days</div>
      </div>
    </div>
    
    <div class="top-customers">
      <h3>Top 10 Customers by Lifetime Value</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Phone</th>
            <th>Total Purchases</th>
            <th>Transactions</th>
            <th>Avg Purchase</th>
            <th>Last Purchase</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${analytics.slice(0, 10).map(customer => `
            <tr>
              <td><strong>${customer.name}</strong></td>
              <td>${customer.phone || '-'}</td>
              <td>₹${formatNumber(customer.total_purchases)}</td>
              <td>${customer.total_transactions}</td>
              <td>₹${formatNumber(customer.average_purchase)}</td>
              <td>${customer.last_purchase_date ? new Date(customer.last_purchase_date).toLocaleDateString() : '-'}</td>
              <td>
                <span class="badge badge-${getStatusBadgeClass(customer.status)}">
                  ${customer.status}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  container.innerHTML = html;
}

// ============================================
// PRODUCT PERFORMANCE
// ============================================

/**
 * Load Product Performance
 */
async function loadProductPerformance() {
  const container = document.getElementById('productPerformanceContainer');
  container.innerHTML = '<div class="loading">Loading product performance...</div>';
  
  try {
    const startDate = document.getElementById('analyticsStartDate').value;
    const endDate = document.getElementById('analyticsEndDate').value;
    
    const response = await authenticatedFetch(
      `${API_URL}/analytics/top-items?startDate=${startDate}&endDate=${endDate}&limit=20`
    );
    
    const products = await response.json();
    
    displayProductPerformance(products);
  } catch (error) {
    container.innerHTML = `<div class="error">Failed to load product performance: ${error.message}</div>`;
  }
}

/**
 * Display Product Performance
 */
function displayProductPerformance(products) {
  const container = document.getElementById('productPerformanceContainer');
  
  if (products.length === 0) {
    container.innerHTML = '<div class="empty-state">No product data available</div>';
    return;
  }
  
  const html = `
    <div class="product-performance-table">
      <h3>Top 20 Selling Products</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Product</th>
            <th>Category</th>
            <th>Quantity Sold</th>
            <th>Revenue</th>
            <th>Profit</th>
            <th>Margin %</th>
            <th>Transactions</th>
          </tr>
        </thead>
        <tbody>
          ${products.map((product, index) => `
            <tr>
              <td><strong>#${index + 1}</strong></td>
              <td>${product.item_name}</td>
              <td>${product.category || '-'}</td>
              <td>${formatNumber(product.total_quantity)}</td>
              <td>₹${formatNumber(product.total_revenue)}</td>
              <td class="${product.total_profit >= 0 ? 'text-success' : 'text-danger'}">
                ₹${formatNumber(product.total_profit)}
              </td>
              <td>${product.avg_margin ? product.avg_margin.toFixed(2) : 0}%</td>
              <td>${product.transaction_count}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  container.innerHTML = html;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format Number with commas
 */
function formatNumber(num) {
  if (!num) return '0.00';
  return parseFloat(num).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Get Confidence Color
 */
function getConfidenceColor(confidence) {
  if (confidence >= 80) return '#2ecc71';
  if (confidence >= 60) return '#f39c12';
  return '#e74c3c';
}

/**
 * Get Status Badge Class
 */
function getStatusBadgeClass(status) {
  switch(status) {
    case 'Active': return 'success';
    case 'Moderate': return 'warning';
    case 'Inactive': return 'danger';
    default: return 'secondary';
  }
}

/**
 * Refresh Analytics
 */
function refreshAnalytics() {
  const activeTab = document.querySelector('.analytics-tabs .tab-btn.active').dataset.tab;
  
  switch(activeTab) {
    case 'profit':
      loadProfitTrends();
      break;
    case 'forecast':
      loadSalesForecast();
      break;
    case 'customers':
      loadCustomerAnalytics();
      break;
    case 'products':
      loadProductPerformance();
      break;
  }
}

// Make sure Chart.js is loaded
// Add this to your HTML: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
