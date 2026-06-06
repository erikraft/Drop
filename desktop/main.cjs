const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const PORT = process.env.ERIKRAFT_DROP_DESKTOP_PORT || '33571';
let mainWindow;

async function startBundledServer() {
  process.env.PORT = PORT;
  process.env.WS_FALLBACK = process.env.WS_FALLBACK || 'true';

  const serverEntry = path.join(app.getAppPath(), 'server', 'index.js');
  await import(pathToFileURL(serverEntry).href);
}

async function createWindow() {
  await startBundledServer();

  // WebRTC and other permissions handling
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const url = webContents.getURL();
    // Only allow permissions for our local server
    if (url.startsWith(`http://127.0.0.1:${PORT}`) || url.startsWith(`http://localhost:${PORT}`)) {
      const allowedPermissions = ['media', 'display-capture', 'mediaKeySystem'];
      if (allowedPermissions.includes(permission)) {
        return callback(true);
      }
    }
    callback(false);
  });

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'ErikrafT Drop',
    icon: path.join(app.getAppPath(), 'public', 'images', 'icon-drop.svg'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  await mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
