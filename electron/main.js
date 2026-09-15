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
  const iconPath = path.join(__dirname, 'icon.ico');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 868,
    minWidth: 1024,
    minHeight: 700,
    title: 'YellowBird Admin Portal',
    backgroundColor: '#0f172a',
    show: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  /**
   * Admin-only session guard — clears any stale parent/driver tokens
   * from localStorage before the admin portal loads. This prevents
   * the desktop .exe from ever showing a parent or driver dashboard.
   */
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      try {
        var u = localStorage.getItem('user');
        if (u) {
          var role = JSON.parse(u).role;
          if (role === 'driver' || role === 'parent') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            sessionStorage.removeItem('access_token');
            sessionStorage.removeItem('user');
            window.location.reload();
          }
        }
      } catch(e) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
    `);
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
          label: 'Create Desktop Shortcut & Add to Start Menu',
          click: () => {
            if (process.platform === 'win32') {
              try {
                const targetPath = process.execPath;
                const workingDir = path.dirname(targetPath);
                const desktopLnk = path.join(app.getPath('desktop'), 'YellowBird Admin Portal.lnk');
                const startMenuLnk = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'YellowBird Admin Portal.lnk');
                const iconLocation = path.join(workingDir, 'icon.ico');

                const opts = {
                  target: targetPath,
                  cwd: workingDir,
                  description: 'YellowBird School Transport Fleet Management Admin Portal',
                  appUserModelId: 'com.yellowbird.admin',
                  icon: iconLocation,
                  iconIndex: 0,
                };
                shell.writeShortcutLink(desktopLnk, 'create', opts);
                shell.writeShortcutLink(startMenuLnk, 'create', opts);

                const { dialog } = require('electron');
                dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: 'Shortcuts Created',
                  message: 'YellowBird Admin shortcuts created successfully!',
                  detail: '1. Shortcut added to your Desktop.\n2. Added to your Windows Start Menu (you can now search YellowBird or right-click to Pin to Start).',
                  buttons: ['OK'],
                });
              } catch (e) {
                console.error('Failed to create shortcuts:', e);
              }
            }
          },
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
