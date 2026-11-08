import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('browser networking logs message types, not message payloads or credentials', () => {
    const network = read('../public/scripts/network.js');
    assert.ok(network.includes("console.log('WS receive:', msg.type)"));
    assert.ok(network.includes('console.log("WS send:", msg.type)'));
    assert.ok(!network.includes("console.log('WS receive:', msg)"));
    assert.ok(!network.includes('console.log("WS send:", msg)'));
    assert.ok(!network.includes('console.log("Config loaded:", config)'));
    assert.ok(!network.includes("console.log('RTC: opening connection with config:'"));
    assert.ok(!network.includes("console.log('RTC:', JSON.parse(message))"));
    assert.ok(!network.includes('deletedRoomSecret);'));
});

test('other runtime logs do not serialize broadcast, page-agent, bot, or full server configuration data', () => {
    const tabs = read('../public/scripts/browser-tabs-connector.js');
    const pageAgent = read('../public/scripts/page-agent-ai.js');
    const server = read('../server/index.js');
    const bot = read('../Discord/Bot/src/client/dropClient.js');

    assert.ok(!tabs.includes("console.log('Broadcast:', e.data)"));
    assert.ok(!pageAgent.includes("console.info('[Page Agent]', message)"));
    assert.ok(!server.includes('JSON.stringify(conf, null, 4)'));
    assert.ok(!bot.includes('rawMessage);'));
});
