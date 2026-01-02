// main.js - Electron Main Process with Embedded Express Server
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let serverProcess;
const PORT = 5001;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Auto City Accounting Pro',
    backgroundColor: '#667eea',
    show: false
  });

  // Wait for server to start before loading frontend
  setTimeout(() => {
    mainWindow.loadFile(path.join(__dirname, 'frontend/index.html'));
  }, 3000); // Increased from 2000 to 3000ms

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  // Open DevTools only if there's an error (comment out for production)
  // mainWindow.webContents.on('did-finish-load', () => {
  //   mainWindow.webContents.openDevTools();
  // });

  // Log any console messages from renderer
  mainWindow.webContents.on('console-message', (event, level, message) => {
    if (level >= 2) { // Only log warnings and errors
      console.log('Frontend:', message);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  // Start the Express server as a child process using Electron's Node.js
  // In production, backend is unpacked from asar to allow spawning
  let serverScript = path.join(__dirname, 'backend/server.js');
  
  // Check if running from asar (packaged app)
  if (serverScript.includes('app.asar')) {
    // Replace app.asar with app.asar.unpacked for backend files
    serverScript = serverScript.replace('app.asar', 'app.asar.unpacked');
  }
  
  console.log('======================================');
  console.log('Starting Auto City Backend Server');
  console.log('Server script:', serverScript);
  console.log('Current directory:', __dirname);
  console.log('Electron path:', process.execPath);
  console.log('Is packaged:', app.isPackaged);
  console.log('======================================');
  
  // Verify the server script exists
  if (!fs.existsSync(serverScript)) {
    console.error('❌ Server script not found:', serverScript);
    dialog.showErrorBox('Server Error', `Cannot find server script:\n${serverScript}`);
    return;
  }
  
  // Set up module paths for the backend to find dependencies
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  const unpackedNodeModules = nodeModulesPath.replace('app.asar', 'app.asar.unpacked');
  
  console.log('📦 Node modules path:', nodeModulesPath);
  
  // Use process.execPath (Electron's node) instead of 'node' (system node)
  serverProcess = spawn(process.execPath, [serverScript], {
    cwd: path.dirname(serverScript), // Use backend directory as cwd
    env: { 
      ...process.env, 
      PORT: PORT,
      ELECTRON_RUN_AS_NODE: '1', // Run as Node.js, not Electron renderer
      NODE_PATH: nodeModulesPath, // Tell Node where to find modules
      USER_DATA_PATH: app.getPath('userData'), // Pass user data directory to server
      IS_PACKAGED: app.isPackaged ? 'true' : 'false' // Tell server if we're in production
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });

  let serverReady = false;

  serverProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    console.log(`[Server] ${output}`);
    
    // Detect when server is ready
    if (output.includes('Server running') || output.includes('listening on port')) {
      serverReady = true;
      console.log('✅ Backend server is ready!');
    }
  });

  serverProcess.stderr.on('data', (data) => {
    const error = data.toString().trim();
    console.error(`[Server Error] ${error}`);
  });

  serverProcess.on('error', (err) => {
    console.error('❌ Failed to start server:', err);
    if (mainWindow) {
      dialog.showErrorBox('Server Error', `Failed to start backend server:\n${err.message}`);
    }
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    if (code !== 0 && code !== null) {
      console.error('❌ Server crashed unexpectedly!');
      if (mainWindow && !serverReady) {
        dialog.showErrorBox('Server Crashed', 
          `Backend server failed to start.\n\nExit code: ${code}\n\nPlease check the console for details.`);
      }
    }
  });

  // Prevent server from being garbage collected
  process.on('exit', () => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
    }
  });

  console.log('✅ Backend server process started on port', PORT);
}

function stopServer() {
  if (serverProcess && !serverProcess.killed) {
    console.log('Stopping server...');
    serverProcess.kill('SIGTERM');
    
    // Force kill after 2 seconds if not stopped
    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
    }, 2000);
    
    console.log('✅ Backend server stopped');
  }
}

// App Events
app.whenReady().then(() => {
  // Start the backend server first
  startServer();
  
  // Then create the window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopServer();
});

app.on('will-quit', () => {
  stopServer();
});

// Handle backup/restore from frontend
ipcMain.handle('backup-database', async () => {
  const dbPath = path.join(__dirname, 'backend/tally.db');
  
  const savePath = dialog.showSaveDialogSync(mainWindow, {
    title: 'Backup Database',
    defaultPath: `autocity-backup-${Date.now()}.db`,
    filters: [{ name: 'Database Files', extensions: ['db'] }]
  });

  if (savePath) {
    return new Promise((resolve, reject) => {
      fs.copyFile(dbPath, savePath, (err) => {
        if (err) {
          reject({ error: 'Backup failed: ' + err.message });
        } else {
          resolve({ success: true, message: 'Database backed up successfully!', path: savePath });
        }
      });
    });
  }
  return { error: 'Backup cancelled' };
});

ipcMain.handle('restore-database', async () => {
  const dbPath = path.join(__dirname, 'backend/tally.db');
  
  const openPath = dialog.showOpenDialogSync(mainWindow, {
    title: 'Restore Database',
    filters: [{ name: 'Database Files', extensions: ['db'] }],
    properties: ['openFile']
  });

  if (openPath && openPath[0]) {
    return new Promise((resolve, reject) => {
      // Stop server before restoring
      stopServer();
      
      setTimeout(() => {
        fs.copyFile(openPath[0], dbPath, (err) => {
          if (err) {
            reject({ error: 'Restore failed: ' + err.message });
          } else {
            // Restart server after restore
            startServer();
            resolve({ success: true, message: 'Database restored successfully! Please restart the app.' });
          }
        });
      }, 1000);
    });
  }
  return { error: 'Restore cancelled' };
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-db-path', () => {
  return path.join(__dirname, 'backend/tally.db');
});

console.log('✅ Auto City Accounting - Electron Main Process Started');