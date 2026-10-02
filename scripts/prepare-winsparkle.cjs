const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const crypto = require('crypto');

const VERSION = '0.9.4';
const ZIP_URL = 'https://github.com/vslavik/winsparkle/releases/download/v0.9.4/WinSparkle-0.9.4.zip';
const ZIP_SHA256 = '6037df37fc263bd1650a1c4949681a9d40ffe991d01f35892a406cb5d103c976';
const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'desktop', 'WinSparkle', 'WinSparkle.dll');

if (fs.existsSync(destination)) process.exit(0);
fs.mkdirSync(path.dirname(destination), { recursive: true });

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'erikraft-winsparkle-'));
const zipPath = path.join(tmpDir, 'WinSparkle-' + VERSION + '.zip');
const extractDir = path.join(tmpDir, 'extracted');
fs.mkdirSync(extractDir);

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' });
}

try {
  if (process.platform === 'win32') {
    const psPath = zipPath.replace(/'/g, "''");
    const extractPath = extractDir.replace(/'/g, "''");
    run('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      "$ErrorActionPreference = 'Stop'; Invoke-WebRequest -UseBasicParsing -Uri '" + ZIP_URL + "' -OutFile '" + psPath + "'"
    ]);
    const digest = crypto.createHash('sha256').update(fs.readFileSync(zipPath)).digest('hex');
    if (digest !== ZIP_SHA256) throw new Error('WinSparkle archive SHA-256 mismatch: ' + digest);
    run('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      "$ErrorActionPreference = 'Stop'; Expand-Archive -LiteralPath '" + psPath + "' -DestinationPath '" + extractPath + "' -Force"
    ]);
  } else {
    run('curl', ['-fsSL', '--retry', '3', '-o', zipPath, ZIP_URL]);
    const digest = crypto.createHash('sha256').update(fs.readFileSync(zipPath)).digest('hex');
    if (digest !== ZIP_SHA256) throw new Error('WinSparkle archive SHA-256 mismatch: ' + digest);
    run('unzip', ['-q', '-o', zipPath, '-d', extractDir]);
  }

  const candidates = [
    path.join(extractDir, 'WinSparkle-' + VERSION, 'x64', 'Release', 'WinSparkle.dll'),
    path.join(extractDir, 'x64', 'Release', 'WinSparkle.dll')
  ];
  const source = candidates.find(fs.existsSync);
  if (!source) throw new Error('WinSparkle x64 Release/WinSparkle.dll was not found in the official archive.');
  fs.copyFileSync(source, destination);
  console.log('Prepared WinSparkle ' + VERSION + ': ' + destination);
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
