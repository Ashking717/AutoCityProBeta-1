// preload.js - Electron Preload Script (Minimal for HTTP-based backend)
const { contextBridge, ipcRenderer } = require('electron');

// Expose utility functions for backup/restore
contextBridge.exposeInMainWorld('electronAPI', {
  // Backup & Restore via dialog
  backupDatabase: () => ipcRenderer.invoke('backup-database'),
  restoreDatabase: () => ipcRenderer.invoke('restore-database'),
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getDbPath: () => ipcRenderer.invoke('get-db-path'),
  
  // Flag to indicate we're in Electron
  isElectron: true
});

console.log('✅ Preload script loaded - Running in Electron mode');