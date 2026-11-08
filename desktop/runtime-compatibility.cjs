'use strict';

const COMPATIBILITY_RUNTIME_ENV_VARS = Object.freeze([
  'WINEPREFIX',
  'WINELOADERNOEXEC',
  'WINEDLLPATH',
  'WINEDEBUG',
  'WINEARCH'
]);

function isCompatibilityRuntime(env = process.env) {
  if (env.ERIKRAFT_DROP_COMPATIBILITY_RUNTIME === '1'
      || env.ERIKRAFT_DROP_DISABLE_NATIVE_UPDATER === '1') {
    return true;
  }

  return COMPATIBILITY_RUNTIME_ENV_VARS.some(name =>
    typeof env[name] === 'string' && env[name].trim().length > 0
  );
}

module.exports = { isCompatibilityRuntime };
