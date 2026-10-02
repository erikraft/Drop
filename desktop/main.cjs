const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');

const PORT = process.env.ERIKRAFT_DROP_DESKTOP_PORT || '33571';
let mainWindow;

const WINSPARKLE_APPCAST_URL = 'https://github.com/erikraft/Drop/releases/latest/download/winsparkle-appcast.xml';
const WINSPARKLE_PUBLIC_KEY = 'I1hkOS5ZuDcGcQFu6OGxdKW+bwwUIaUTJheD0bNy4VQ=';
let winSparkle;

function initializeWinSparkle() {
  if (process.platform !== 'win32') return;

  try {
    const koffi = require('koffi');
    const dllPath = app.isPackaged
      ? path.join(process.resourcesPath, 'WinSparkle', 'WinSparkle.dll')
      : path.join(app.getAppPath(), 'desktop', 'WinSparkle', 'WinSparkle.dll');

    if (!fs.existsSync(dllPath)) {
      console.warn('[WinSparkle] WinSparkle.dll not found:', dllPath);
      return;
    }

    const lib = koffi.load(dllPath);
    const setAppcastUrl = lib.func('win_sparkle_set_appcast_url', 'void', ['str']);
    const setPublicKey = lib.func('win_sparkle_set_eddsa_public_key', 'int', ['str']);
    const setAppDetails = lib.func('win_sparkle_set_app_details', 'void', ['str16', 'str16', 'str16']);
    const setAutomaticChecks = lib.func('win_sparkle_set_automatic_check_for_updates', 'void', ['int']);
    const setCheckInterval = lib.func('win_sparkle_set_update_check_interval', 'void', ['int']);
    const init = lib.func('win_sparkle_init', 'void', []);
    const cleanup = lib.func('win_sparkle_cleanup', 'void', []);
    const checkWithUi = lib.func('win_sparkle_check_update_with_ui', 'void', []);

    setAppcastUrl(WINSPARKLE_APPCAST_URL);
    if (!setPublicKey(WINSPARKLE_PUBLIC_KEY)) {
      throw new Error('WinSparkle rejected the configured Ed25519 public key.');
    }
    setAppDetails('ErikrafT', 'ErikrafT Drop™', app.getVersion());
    setAutomaticChecks(1);
    setCheckInterval(86400);
    init();

    winSparkle = { cleanup, checkWithUi };
    console.log('[WinSparkle] initialized for', app.getVersion());
  } catch (error) {
    console.warn('[WinSparkle] disabled:', error.message);
  }
}

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

  const windowIcon = process.platform === 'win32'
    ? path.join(app.getAppPath(), 'desktop', 'assets', 'icon.ico')
    : path.join(app.getAppPath(), 'public', 'images', 'icon-drop.svg');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'ErikrafT Drop™',
    icon: windowIcon,
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
  initializeWinSparkle();
}

app.whenReady().then(createWindow);

app.on('before-quit', () => {
  if (winSparkle) {
    try { winSparkle.cleanup(); } catch (error) { console.warn('[WinSparkle] cleanup failed:', error.message); }
    winSparkle = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
