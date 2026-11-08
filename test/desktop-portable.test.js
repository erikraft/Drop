import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import compatibility from '../desktop/runtime-compatibility.cjs';

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const builderConfig = fs.readFileSync(new URL('../electron-builder.yml', import.meta.url), 'utf8');
const desktopMain = fs.readFileSync(new URL('../desktop/main.cjs', import.meta.url), 'utf8');
const packagingWorkflow = fs.readFileSync(new URL('../.github/workflows/packaging-pr-check.yml', import.meta.url), 'utf8');
const releaseWorkflow = fs.readFileSync(new URL('../.github/workflows/desktop-release.yml', import.meta.url), 'utf8');

test('Windows packaging keeps NSIS and adds a separately named portable x64 target', () => {
  assert.match(builderConfig, /win:\s*\n\s*target:\s*\n\s*- nsis\s*\n\s*- portable/);
  assert.match(builderConfig, /^portable:\s*\n\s*artifactName: .*\$\{arch\}-portable\.\$\{ext\}/m);
  assert.match(packageJson.scripts['package:windows'], /electron-builder@27\.0\.0-alpha\.9 --win --x64 --publish never/);
  assert.doesNotMatch(packageJson.scripts['package:windows'], /--win nsis\b/);
});

test('portable Windows startup skips the optional native WinSparkle updater', () => {
  const initializer = desktopMain.match(/function initializeWinSparkle\(\) \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(initializer, 'WinSparkle initializer must remain available for the installer build');
  assert.match(initializer, /process\.env\.PORTABLE_EXECUTABLE_FILE/);
  assert.match(initializer, /process\.platform !== 'win32' \|\| process\.env\.PORTABLE_EXECUTABLE_FILE/);
});

test('Wine and Winlator environments skip the optional native updater', () => {
  const initializer = desktopMain.match(/function initializeWinSparkle\\(\\) \\{([\\s\\S]*?)\\n\\}/)?.[1];
  assert.ok(initializer, 'WinSparkle initializer must remain available for native Windows builds');
  assert.match(initializer, /isCompatibilityRuntime\\(\\)/);
  assert.equal(compatibility.isCompatibilityRuntime({ WINEPREFIX: '/compat/prefix' }), true);
  assert.equal(compatibility.isCompatibilityRuntime({ WINELOADERNOEXEC: '1' }), true);
  assert.equal(compatibility.isCompatibilityRuntime({ WINEDLLPATH: '/compat/dlls' }), true);
  assert.equal(compatibility.isCompatibilityRuntime({ ERIKRAFT_DROP_COMPATIBILITY_RUNTIME: '1' }), true);
  assert.equal(compatibility.isCompatibilityRuntime({ ERIKRAFT_DROP_DISABLE_NATIVE_UPDATER: '1' }), true);
  assert.equal(compatibility.isCompatibilityRuntime({}), false);
});

test('PR packaging validation checks both executable variants', () => {
  assert.match(packagingWorkflow, /node --test test\/desktop-portable\.test\.js/);
  assert.match(packagingWorkflow, /\*-win-x64\.exe/);
  assert.match(packagingWorkflow, /\*-win-x64-portable\.exe/);
  assert.match(packagingWorkflow, /Windows NSIS installer was not generated/);
  assert.match(packagingWorkflow, /Windows portable executable was not generated/);
});

test('release signing continues to select the NSIS installer, not the portable executable', () => {
  assert.match(releaseWorkflow, /\*-win-x64\.exe/);
  assert.match(releaseWorkflow, /\*-win-x64-portable\.exe/);
  assert.match(releaseWorkflow, /Generate signed WinSparkle appcast/);
});
