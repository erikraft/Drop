#!/usr/bin/env node

/**
 * ErikrafT Drop™ - Tor Onion Service Key Helper Script
 *
 * Converts a Tor v3 private key file (`hs_ed25519_secret_key`) to Base64 format
 * suitable for setting the `ONION_PRIVATE_KEY_BASE64` environment variable in Render.
 *
 * Usage:
 *   node scripts/generate-onion-key.js <path-to-hs_ed25519_secret_key>
 */

import fs from 'fs';
import path from 'path';

function main() {
    const keyPath = process.argv[2] || './hs_ed25519_secret_key';

    if (!fs.existsSync(keyPath)) {
        console.error(`\n[ERROR] Key file not found at: ${path.resolve(keyPath)}`);
        console.error(`\nUsage:`);
        console.error(`  node scripts/generate-onion-key.js <path-to-hs_ed25519_secret_key>\n`);
        console.error(`To generate a new Tor v3 key locally:`);
        console.error(`  1. Install Tor locally.`);
        console.error(`  2. Run: tor --HiddenServiceDir ./temp_onion --HiddenServicePort 80 127.0.0.1:3000`);
        console.error(`  3. Stop Tor after files are generated in ./temp_onion.`);
        console.error(`  4. Run: node scripts/generate-onion-key.js ./temp_onion/hs_ed25519_secret_key`);
        console.error(`  5. Securely delete ./temp_onion folder.\n`);
        process.exit(1);
    }

    try {
        const keyData = fs.readFileSync(keyPath);
        const base64Key = keyData.toString('base64');

        console.log('\n===============================================================');
        console.log(' ErikrafT Drop™ - Tor v3 Key Base64 Output');
        console.log('===============================================================\n');
        console.log('Set this value as ONION_PRIVATE_KEY_BASE64 in Render Secret / Env:\n');
        console.log(base64Key);
        console.log('\n===============================================================');
        console.log(' Security Reminder: Never commit or share this key string publicly!');
        console.log('===============================================================\n');
    } catch (err) {
        console.error('\n[ERROR] Failed to read key file:', err.message);
        process.exit(1);
    }
}

main();
