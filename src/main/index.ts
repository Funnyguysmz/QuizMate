import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { registerAllIpcHandlers } from './ipc';
import { initDatabase } from './services/database';
import { loadSettings, saveWindowBounds } from './services/settings-store';

const isDev = process.env.ELECTRON_IS_DEV === '1';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const bounds = loadSettings().windowBounds;

  mainWindow = new BrowserWindow({
    width: bounds?.width || 1200,
    height: bounds?.height || 800,
    x: bounds?.x,
    y: bounds?.y,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 18 },
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('resize', () => {
    if (mainWindow) saveWindowBounds(mainWindow.getBounds());
  });

  mainWindow.on('move', () => {
    if (mainWindow) saveWindowBounds(mainWindow.getBounds());
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(async () => {
  initDatabase();
  registerAllIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
