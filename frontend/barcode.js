/**
 * Barcode Scanner Integration
 * Supports hardware barcode scanners and camera-based scanning
 */

// ============================================
// BARCODE SCANNER STATE
// ============================================

let barcodeBuffer = '';
let barcodeTimeout = null;
let scannerActive = false;
let cameraStream = null;

/**
 * Initialize Barcode Scanner
 */
function initBarcodeScanner() {
  // Listen for keyboard input from hardware scanner
  document.addEventListener('keypress', handleBarcodeScannerInput);
  
  // Setup camera scanner button
  setupCameraScanner();
}

/**
 * Handle Hardware Barcode Scanner Input
 */
function handleBarcodeScannerInput(e) {
  // Hardware scanners typically send characters rapidly followed by Enter
  clearTimeout(barcodeTimeout);
  
  if (e.key === 'Enter') {
    if (barcodeBuffer.length > 0) {
      processScannedBarcode(barcodeBuffer);
      barcodeBuffer = '';
    }
  } else {
    barcodeBuffer += e.key;
    
    // Reset buffer after 100ms of no input
    barcodeTimeout = setTimeout(() => {
      barcodeBuffer = '';
    }, 100);
  }
}

/**
 * Process Scanned Barcode
 */
async function processScannedBarcode(barcode) {
  // Only process if in POS or Stock section
  const activeSection = getCurrentSection();
  
  if (activeSection !== 'sales' && activeSection !== 'stock') {
    return;
  }
  
  showScannerFeedback('Scanning...', 'info');
  
  try {
    const response = await authenticatedFetch(`${API_URL}/barcode/scan`, {
      method: 'POST',
      body: JSON.stringify({
        barcode: barcode.trim(),
        scanType: activeSection === 'sales' ? 'pos' : 'stock_check'
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Item not found');
    }
    
    // Handle based on section
    if (activeSection === 'sales') {
      addItemToCart(result.item);
      showScannerFeedback(`Added: ${result.item.name}`, 'success');
    } else {
      displayScannedItemInfo(result.item);
      showScannerFeedback(`Found: ${result.item.name}`, 'success');
    }
    
    playBeepSound('success');
    
  } catch (error) {
    showScannerFeedback(error.message, 'error');
    playBeepSound('error');
  }
}

/**
 * Add Item to POS Cart
 */
function addItemToCart(item) {
  // Check if item already in cart
  const existingItem = salesCart.find(i => i.id === item.id);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    salesCart.push({
      id: item.id,
      name: item.name,
      barcode: item.barcode,
      price: item.price,
      quantity: 1,
      stock: item.stock
    });
  }
  
  updateCartDisplay();
  calculateTotal();
}

/**
 * Display Scanned Item Info (Stock Check)
 */
function displayScannedItemInfo(item) {
  const modal = createModal('Scanned Item Information', `
    <div class="scanned-item-info">
      <div class="item-detail-row">
        <strong>Item Name:</strong>
        <span>${item.name}</span>
      </div>
      <div class="item-detail-row">
        <strong>Barcode:</strong>
        <span class="barcode-text">${item.barcode}</span>
      </div>
      <div class="item-detail-row">
        <strong>Price:</strong>
        <span>₹${item.price.toFixed(2)}</span>
      </div>
      <div class="item-detail-row">
        <strong>Stock:</strong>
        <span class="${item.stock <= 5 ? 'text-danger' : 'text-success'}">
          ${item.stock} units
        </span>
      </div>
      <div class="item-detail-row">
        <strong>Category:</strong>
        <span>${item.category || '-'}</span>
      </div>
      
      <div class="item-actions">
        <button onclick="viewItemDetails(${item.id})" class="btn-primary">
          View Full Details
        </button>
        <button onclick="closeModal()" class="btn-secondary">
          Close
        </button>
      </div>
    </div>
  `);
}

// ============================================
// CAMERA-BASED BARCODE SCANNER
// ============================================

/**
 * Setup Camera Scanner
 */
function setupCameraScanner() {
  // Add camera scanner button to POS section
  const posHeader = document.querySelector('#sales .section-header');
  if (posHeader && !document.getElementById('cameraScanBtn')) {
    const scanBtn = document.createElement('button');
    scanBtn.id = 'cameraScanBtn';
    scanBtn.className = 'btn-secondary';
    scanBtn.innerHTML = '<i class="icon-camera"></i> Scan with Camera';
    scanBtn.onclick = openCameraScanner;
    posHeader.appendChild(scanBtn);
  }
}

/**
 * Open Camera Scanner
 */
async function openCameraScanner() {
  const modal = createModal('Camera Barcode Scanner', `
    <div class="camera-scanner-container">
      <video id="cameraScannerVideo" autoplay playsinline style="width: 100%; max-width: 640px; border-radius: 8px;"></video>
      <div id="scannerOverlay" class="scanner-overlay">
        <div class="scanner-line"></div>
      </div>
      <div id="scannerStatus" class="scanner-status">
        Position barcode within the frame
      </div>
      <div class="scanner-actions">
        <button onclick="stopCameraScanner()" class="btn-danger">Stop Scanner</button>
      </div>
    </div>
  `, 'large');
  
  try {
    await startCameraScanning();
  } catch (error) {
    showError('Failed to access camera: ' + error.message);
    closeModal();
  }
}

/**
 * Start Camera Scanning
 */
async function startCameraScanning() {
  try {
    // Request camera access
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' } // Use back camera on mobile
    });
    
    const video = document.getElementById('cameraScannerVideo');
    video.srcObject = cameraStream;
    
    scannerActive = true;
    
    // Use Quagga library for barcode detection
    initQuaggaScanner();
    
  } catch (error) {
    throw new Error('Camera access denied or not available');
  }
}

/**
 * Initialize Quagga Barcode Scanner
 */
function initQuaggaScanner() {
  if (typeof Quagga === 'undefined') {
    console.error('Quagga library not loaded');
    showError('Barcode scanner library not loaded. Please refresh the page.');
    return;
  }
  
  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: document.querySelector('#cameraScannerVideo'),
      constraints: {
        facingMode: "environment"
      }
    },
    decoder: {
      readers: [
        "ean_reader",
        "ean_8_reader",
        "code_128_reader",
        "code_39_reader",
        "upc_reader",
        "upc_e_reader"
      ]
    },
    locate: true
  }, function(err) {
    if (err) {
      console.error('Quagga initialization error:', err);
      showError('Failed to initialize barcode scanner');
      return;
    }
    
    console.log("Quagga initialization successful");
    Quagga.start();
  });
  
  // Handle detected barcodes
  Quagga.onDetected(handleCameraBarcode);
}

/**
 * Handle Camera Detected Barcode
 */
async function handleCameraBarcode(result) {
  if (!scannerActive) return;
  
  const code = result.codeResult.code;
  
  // Stop scanner temporarily to prevent multiple scans
  scannerActive = false;
  Quagga.stop();
  
  document.getElementById('scannerStatus').textContent = 'Processing...';
  
  try {
    await processScannedBarcode(code);
    
    // Close scanner modal after successful scan
    setTimeout(() => {
      stopCameraScanner();
      closeModal();
    }, 1000);
    
  } catch (error) {
    document.getElementById('scannerStatus').textContent = 'Error: ' + error.message;
    
    // Restart scanner after 2 seconds
    setTimeout(() => {
      scannerActive = true;
      Quagga.start();
      document.getElementById('scannerStatus').textContent = 'Position barcode within the frame';
    }, 2000);
  }
}

/**
 * Stop Camera Scanner
 */
function stopCameraScanner() {
  scannerActive = false;
  
  if (typeof Quagga !== 'undefined') {
    Quagga.stop();
  }
  
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
}

// ============================================
// BARCODE GENERATION & PRINTING
// ============================================

/**
 * Generate Barcode for Item
 */
async function generateBarcodeForItem(itemId) {
  try {
    const response = await authenticatedFetch(`${API_URL}/barcode/generate`, {
      method: 'POST',
      body: JSON.stringify({ itemId, barcodeType: 'ean13' })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to generate barcode');
    }
    
    showSuccess(`Barcode generated: ${result.barcode}`);
    
    // Refresh item display
    if (typeof loadStockSection === 'function') {
      loadStockSection();
    }
    
  } catch (error) {
    showError(error.message);
  }
}

/**
 * Show Barcode Generator Modal
 */
function showBarcodeGeneratorModal(itemId, itemName) {
  const modal = createModal('Generate Barcode', `
    <div class="barcode-generator">
      <p>Generate barcode for: <strong>${itemName}</strong></p>
      
      <div class="form-group">
        <label>Barcode Type</label>
        <select id="barcodeType">
          <option value="ean13">EAN-13</option>
          <option value="code128">Code 128</option>
          <option value="code39">Code 39</option>
        </select>
      </div>
      
      <div class="form-actions">
        <button onclick="closeModal()" class="btn-secondary">Cancel</button>
        <button onclick="confirmGenerateBarcode(${itemId})" class="btn-primary">
          Generate Barcode
        </button>
      </div>
    </div>
  `);
}

/**
 * Confirm Generate Barcode
 */
async function confirmGenerateBarcode(itemId) {
  const barcodeType = document.getElementById('barcodeType').value;
  
  await generateBarcodeForItem(itemId, barcodeType);
  closeModal();
}

/**
 * Print Barcode Labels
 */
async function printBarcodeLabels(itemId, itemName, barcode) {
  const modal = createModal('Print Barcode Labels', `
    <div class="barcode-print-form">
      <p>Print labels for: <strong>${itemName}</strong></p>
      <p>Barcode: <code>${barcode}</code></p>
      
      <div class="form-group">
        <label>Number of Labels</label>
        <input type="number" id="labelQuantity" value="1" min="1" max="100" />
      </div>
      
      <div class="form-group">
        <label>Label Template</label>
        <select id="labelTemplate">
          <option value="small">Small (30x20mm)</option>
          <option value="medium">Medium (50x30mm)</option>
          <option value="large">Large (70x40mm)</option>
        </select>
      </div>
      
      <div class="barcode-preview">
        <h4>Preview</h4>
        <svg id="barcodePreview"></svg>
      </div>
      
      <div class="form-actions">
        <button onclick="closeModal()" class="btn-secondary">Cancel</button>
        <button onclick="confirmPrintLabels(${itemId})" class="btn-primary">
          Add to Print Queue
        </button>
      </div>
    </div>
  `);
  
  // Generate barcode preview using JsBarcode
  if (typeof JsBarcode !== 'undefined') {
    JsBarcode("#barcodePreview", barcode, {
      format: "EAN13",
      width: 2,
      height: 60,
      displayValue: true
    });
  }
}

/**
 * Confirm Print Labels
 */
async function confirmPrintLabels(itemId) {
  const quantity = parseInt(document.getElementById('labelQuantity').value);
  const template = document.getElementById('labelTemplate').value;
  
  try {
    const response = await authenticatedFetch(`${API_URL}/barcode/print`, {
      method: 'POST',
      body: JSON.stringify({ itemId, quantity, template })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to queue print job');
    }
    
    showSuccess(result.message);
    closeModal();
    
  } catch (error) {
    showError(error.message);
  }
}

// ============================================
// BULK BARCODE IMPORT
// ============================================

/**
 * Show Bulk Barcode Import Modal
 */
function showBulkBarcodeImport() {
  const modal = createModal('Bulk Import Items with Barcodes', `
    <div class="bulk-import-container">
      <p>Import multiple items with barcodes from CSV file</p>
      
      <div class="csv-template">
        <h4>CSV Format Required:</h4>
        <code>name,barcode,price,stock,category</code>
        <br>
        <small>Example: "Brake Pad,2001234567890,1500,50,Brakes"</small>
      </div>
      
      <div class="form-group">
        <label>Upload CSV File</label>
        <input type="file" id="bulkImportFile" accept=".csv" />
      </div>
      
      <div id="importPreview" style="max-height: 300px; overflow-y: auto; margin: 20px 0;"></div>
      
      <div class="form-actions">
        <button onclick="closeModal()" class="btn-secondary">Cancel</button>
        <button onclick="processBulkImport()" class="btn-primary">
          Import Items
        </button>
      </div>
    </div>
  `);
  
  document.getElementById('bulkImportFile').addEventListener('change', previewBulkImport);
}

/**
 * Preview Bulk Import
 */
function previewBulkImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(event) {
    const csv = event.target.result;
    const lines = csv.split('\n');
    
    // Parse CSV
    const items = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const [name, barcode, price, stock, category] = line.split(',').map(s => s.trim());
      items.push({ name, barcode, price: parseFloat(price), stock: parseInt(stock), category });
    }
    
    // Show preview
    const preview = document.getElementById('importPreview');
    preview.innerHTML = `
      <h4>Preview (${items.length} items)</h4>
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Barcode</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          ${items.slice(0, 5).map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.barcode}</td>
              <td>₹${item.price}</td>
              <td>${item.stock}</td>
              <td>${item.category || '-'}</td>
            </tr>
          `).join('')}
          ${items.length > 5 ? `<tr><td colspan="5" class="text-center">...and ${items.length - 5} more</td></tr>` : ''}
        </tbody>
      </table>
    `;
    
    window.bulkImportItems = items;
  };
  
  reader.readAsText(file);
}

/**
 * Process Bulk Import
 */
async function processBulkImport() {
  if (!window.bulkImportItems || window.bulkImportItems.length === 0) {
    showError('No items to import');
    return;
  }
  
  try {
    const response = await authenticatedFetch(`${API_URL}/barcode/bulk-import`, {
      method: 'POST',
      body: JSON.stringify({ items: window.bulkImportItems })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Import failed');
    }
    
    showSuccess(`Successfully imported ${result.imported} items. Failed: ${result.failed}`);
    
    if (result.failed > 0) {
      console.log('Import errors:', result.errors);
    }
    
    closeModal();
    
    // Refresh stock section
    if (typeof loadStockSection === 'function') {
      loadStockSection();
    }
    
  } catch (error) {
    showError(error.message);
  }
}

// ============================================
// SCANNER FEEDBACK
// ============================================

/**
 * Show Scanner Feedback
 */
function showScannerFeedback(message, type = 'info') {
  // Remove existing feedback
  const existing = document.getElementById('scannerFeedback');
  if (existing) existing.remove();
  
  // Create feedback element
  const feedback = document.createElement('div');
  feedback.id = 'scannerFeedback';
  feedback.className = `scanner-feedback scanner-feedback-${type}`;
  feedback.textContent = message;
  
  document.body.appendChild(feedback);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    feedback.classList.add('fade-out');
    setTimeout(() => feedback.remove(), 300);
  }, 3000);
}

/**
 * Play Beep Sound
 */
function playBeepSound(type = 'success') {
  const audio = new Audio();
  
  if (type === 'success') {
    // Success beep (higher frequency)
    audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiZ7yvHPfzUHLIHN8tiJNwgZaLvt559NEAxPpuPwtmMcBjiP1vLMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiZ7yvHPfzUHLIHN8tiJNwgZaLvt559NEAxPpuPwtmMcBjiP1vLMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiZ7yvHPfzUHLIHN8tiJNwgZaLvt559NEAxPpuPwtmMcBjiP1vLMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiZ7yvHPfzUHLIHN8tiJNwgZaLvt559NEAxPpuPwtmMcBjiP1vLMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiZ7yvHPfzUHLIHN8tiJNwgZaLvt559NEAxPpuPwtmMcBjiP1vLMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiZ7yvHPfzUHLIHN8tiJNwgZaLvt559NEAxPpuPwtmMcBjiP1vLMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiZ7yvHPfzUHLIHN8tiJNwgZaLvt559NEAxPpuPwtmMcBjiP1vLMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiZ7yvHPfzUHLIHN8tiJNwgZaLvt559NEAxPpuPwtmMcBjiP1vLMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiZ7yvHPfzUHLIHN8tiJNwgZaLvt559NEAxPpuPwtmMcBjiP1vLMeSwFJHfH8N2QQAoUXrTp66hVFA==';
  } else {
    // Error beep (lower frequency)
    audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiZ7yvHPfzUHLIHN8tiJNwgZaLvt559NEAxPpuPwtmMcBjiP1vLMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiZ7yvHPfzUHLIHN8tiJNwgZaLvt559NEAxPpuPwtmMcBjiP1vLMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiZ7yvHPfzUHLIHN8tiJNwgZaLvt559NEAxPpuPwtmMcBjiP1vLMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiZ7yvHPfzUHLIHN8tiJNwgZaLvt559NEAxPpuPwtmMcBjiP1vLMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiZ7yvHPfzUHLIHN8tiJNwgZaLvt559NEAxPpuPwtmMcBjiP1vLMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiZ7yvHPfzUHLIHN8tiJNwgZaLvt559NEAxPpuPwtmMcBjiP1vLMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiZ7yvHPfzUHLIHN8tiJNwgZaLvt559NEAxPpuPwtmMcBjiP1vLMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiZ7yvHPfzUHLIHN8tiJNwgZaLvt559NEAxPpuPwtmMcBjiP1vLMeSwFJHfH8N2QQAoUXrTp66hVFA==';
  }
  
  audio.volume = 0.3;
  audio.play().catch(() => {}); // Ignore if autoplay blocked
}

// ============================================
// INITIALIZE
// ============================================

// Initialize barcode scanner when document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBarcodeScanner);
} else {
  initBarcodeScanner();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  stopCameraScanner();
});
