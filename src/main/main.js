import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, closeDatabase } from '../database/db.js';
import { registerIpcHandlers } from './ipcHandlers.js';
import { startFirebaseOrderListener, stopFirebaseOrderListener } from '../services/firebaseSyncService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1100,
    minHeight: 720,
    title: 'Billing-Soft — FMCG Billing & GST Management',
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });

  // Register IPC endpoints
  registerIpcHandlers(mainWindow);

  // Start live listening for mobile salesman orders (transient cloud queue)
  startFirebaseOrderListener(mainWindow);

  // Prevent navigation away from the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const devServerUrl = 'http://localhost:5173';

  if (isDev) {
    mainWindow.loadURL(devServerUrl).catch(() => {
      // If dev server not yet ready, load built index
      const indexPath = path.join(__dirname, '../../dist/index.html');
      mainWindow.loadFile(indexPath);
    });
  } else {
    const indexPath = path.join(__dirname, '../../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ensure single app instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    // Initialize persistent SQLite in Electron's userData folder
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'billing_soft.db');
    console.log(`[Billing-Soft] Initializing SQLite database at: ${dbPath}`);
    initDatabase(dbPath);

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    stopFirebaseOrderListener();
    closeDatabase();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    stopFirebaseOrderListener();
    closeDatabase();
  });
}
