import test from 'node:test';
import assert from 'node:assert/strict';
import {redactSensitiveConfig} from '../server/debug-redaction.js';

test('redacts nested TURN credentials and other sensitive configuration values', () => {
    const config = {
        debugMode: true,
        rtcConfig: {
            iceServers: [
                {
                    urls: 'turn:turn.example.invalid:3478',
                    username: 'turn-user',
                    credential: 'turn-password'
                }
            ]
        },
        apiToken: 'private-token',
        public: { name: 'ErikrafT Drop' }
    };

    const redacted = redactSensitiveConfig(config);

    assert.equal(redacted.rtcConfig.iceServers[0].username, '[REDACTED]');
    assert.equal(redacted.rtcConfig.iceServers[0].credential, '[REDACTED]');
    assert.equal(redacted.apiToken, '[REDACTED]');
    assert.equal(redacted.public.name, 'ErikrafT Drop');
    assert.equal(config.rtcConfig.iceServers[0].credential, 'turn-password');
});

test('redaction handles arrays, null values, and primitive values', () => {
    assert.deepEqual(redactSensitiveConfig([null, 3, { password: 'x' }]), [null, 3, { password: '[REDACTED]' }]);
    assert.equal(redactSensitiveConfig(null), null);
    assert.equal(redactSensitiveConfig('safe'), 'safe');
});
