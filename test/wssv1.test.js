const assert = require('assert');
const WebSocket = require('ws');
const { wssV1 } = require('../src/servers/wssv1');
const { test } = require('node:test');

test('wssV1: should be an instance of WebSocket.Server', () => {
  assert(wssV1 instanceof WebSocket.Server);
});

test('wssV1: should have a broadcast method', () => {
  assert.strictEqual(typeof wssV1.broadcast, 'function');
});
