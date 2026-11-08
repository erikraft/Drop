import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

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

test('electron-builder cache uses runner.temp only in supported step-level contexts', () => {
  const workflowEnv = packagingWorkflow.split(/^jobs:/m, 1)[0];
  assert.doesNotMatch(workflowEnv, /\$\{\{\s*runner\.temp/);
  assert.match(packagingWorkflow, /ELECTRON_BUILDER_CACHE:\s*\$\{\{\s*runner\.temp\s*\}\}\/electron-builder-cache/);
  assert.match(packagingWorkflow, /path:[\s\S]*?\$\{\{\s*runner\.temp\s*\}\}\/electron-builder-cache/);
});

test('portable Windows startup skips the optional native WinSparkle updater', () => {
  const initializer = desktopMain.match(/function initializeWinSparkle\(\) \{([\s\S]*?)\n\}/)?.[1];
  assert.ok(initializer, 'WinSparkle initializer must remain available for the installer build');
  assert.match(initializer, /process\.env\.PORTABLE_EXECUTABLE_FILE/);
  assert.match(initializer, /process\.platform !== 'win32' \|\| process\.env\.PORTABLE_EXECUTABLE_FILE/);
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
