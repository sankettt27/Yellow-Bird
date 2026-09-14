/**
 * Electron Main Process for YellowBird Admin Portal.
 * Launches the desktop application window for school administrators.
 */

const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

let mainWindow = null;

const isDev = process.env.NODE_ENV === 'development';
const ADMIN_WEB_URL = process.env.ADMIN_URL || 'https://yellow-bird-eosin.vercel.app/admin';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 868,
    minWidth: 1024,
    minHeight: 700,
    title: 'YellowBird Admin Portal',
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Try loading the cloud admin portal, or local build if offline
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173/admin');
  } else {
    mainWindow.loadURL(ADMIN_WEB_URL).catch(() => {
      // Offline fallback: load local frontend dist
      const localAdminPath = path.join(__dirname, 'dist', 'admin.html');
      mainWindow.loadFile(localAdminPath);
    });
  }

  // Gracefully show window once ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external links safely in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://maps.google.com') || url.startsWith('http://maps.google.com')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createAppMenu();
}

function createAppMenu() {
  const template = [
    {
      label: 'Portal',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow && mainWindow.reload(),
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => mainWindow && mainWindow.webContents.reloadIgnoringCache(),
        },
        { type: 'separator' },
        {
          label: 'Toggle Full Screen',
          accelerator: 'F11',
          click: () => mainWindow && mainWindow.setFullScreen(!mainWindow.isFullScreen()),
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'Alt+F4',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'toggledevtools' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'YellowBird Documentation',
          click: () => shell.openExternal('https://yellow-bird-eosin.vercel.app'),
        },
        {
          label: 'About YellowBird Admin',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About YellowBird',
              message: 'YellowBird School Transport Fleet Management',
              detail: 'Version 1.0.0\nCloud-Connected School Bus Live Tracking System',
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
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
