const { app, BrowserWindow, Menu, shell, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const {
  DEFAULT_SERVER_URL,
  SERVER_INSTANCES,
  normalizeServerUrl
} = require('./server-config.cjs');

let mainWindow;
let selectorWindow;
let selectedServer = DEFAULT_SERVER_URL;

const WINSPARKLE_APPCAST_URL = 'https://github.com/erikraft/Drop/releases/latest/download/winsparkle-appcast.xml';
const WINSPARKLE_PUBLIC_KEY = 'qviSQDE3gE0r4NBLiLlBRMkPWQ7MbNnSZGnP4zlD4XI=';
let winSparkle;

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'server-settings.json');
}

function readSavedServer() {
  try {
    const settings = JSON.parse(fs.readFileSync(getSettingsPath(), 'utf8'));
    return normalizeServerUrl(settings.serverUrl);
  } catch {
    return null;
  }
}

function saveServer(url) {
  const normalizedUrl = normalizeServerUrl(url);
  const settingsPath = getSettingsPath();
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify({ serverUrl: normalizedUrl }, null, 2), 'utf8');
  selectedServer = normalizedUrl;
  return normalizedUrl;
}

function isSelectorSender(event) {
  return Boolean(selectorWindow && event.sender === selectorWindow.webContents);
}

ipcMain.handle('desktop-server:get-options', (event) => {
  if (!isSelectorSender(event)) throw new Error('Unauthorized server selector request.');
  return { currentServer: selectedServer, servers: SERVER_INSTANCES };
});

ipcMain.handle('desktop-server:save', (event, url) => {
  if (!isSelectorSender(event)) throw new Error('Unauthorized server selector request.');
  return saveServer(url);
});

ipcMain.on('desktop-server:close', (event) => {
  if (isSelectorSender(event)) selectorWindow.close();
});

function showServerSelector() {
  if (selectorWindow) {
    selectorWindow.focus();
    return Promise.resolve(selectedServer);
  }

  return new Promise((resolve) => {
    selectorWindow = new BrowserWindow({
      width: 620,
      height: 600,
      minWidth: 540,
      minHeight: 520,
      resizable: true,
      title: 'ErikrafT Drop™ — Server',
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'server-selector-preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    selectorWindow.on('closed', () => {
      selectorWindow = null;
      resolve(selectedServer || DEFAULT_SERVER_URL);
    });

    selectorWindow.loadFile(path.join(__dirname, 'server-selector.html'));
  });
}

function createApplicationMenu() {
  const template = [
    {
      label: 'ErikrafT Drop™',
      submenu: [
        {
          label: 'Change server…',
          click: async () => {
            const previousServer = selectedServer;
            const nextServer = await showServerSelector();
            if (mainWindow && nextServer && nextServer !== previousServer) {
              await mainWindow.loadURL(nextServer);
            }
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'close' }]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

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

async function createWindow() {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    let matchesSelectedServer = false;
    try {
      matchesSelectedServer = new URL(webContents.getURL()).origin === new URL(selectedServer).origin;
    } catch {
      matchesSelectedServer = false;
    }

    if (matchesSelectedServer && ['media', 'display-capture', 'mediaKeySystem'].includes(permission)) {
      return callback(true);
    }
    callback(false);
  });

  const windowIcon = process.platform === 'win32'
    ? path.join(app.getAppPath(), 'desktop', 'assets', 'icon.ico')
    : path.join(app.getAppPath(), 'packaging', 'linux', 'icons', 'android-chrome-512x512.png');

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

  await mainWindow.loadURL(selectedServer);
  initializeWinSparkle();
}

app.whenReady().then(async () => {
  selectedServer = readSavedServer() || DEFAULT_SERVER_URL;
  createApplicationMenu();

  if (!readSavedServer()) {
    await showServerSelector();
  }

  await createWindow();
});

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
