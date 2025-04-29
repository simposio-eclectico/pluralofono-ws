const assert = require('assert');
const WebSocket = require('ws');
const { wssV2 } = require('../src/servers/wssv2');
const { test } = require('node:test');

test('wssV2: should be an instance of WebSocket.Server', () => {
  assert(wssV2 instanceof WebSocket.Server);
});

test('wssV2: should have a broadcast method', () => {
  assert.strictEqual(typeof wssV2.broadcast, 'function');
});
