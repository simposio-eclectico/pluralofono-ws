const assert = require('assert');
const WebSocket = require('ws');
const { wssSignal } = require('../src/servers/wssSignal');
const { test } = require('node:test');

test('wssSignal: should be an instance of WebSocket.Server', () => {
  assert(wssSignal instanceof WebSocket.Server);
});

test('wssSignal: should have a broadcast method', () => {
  assert.strictEqual(typeof wssSignal.broadcast, 'function');
});
