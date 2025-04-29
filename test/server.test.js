const assert = require('assert');
const http = require('http');
const { registerWSEndpoints } = require('../src/router');
const { wssV1 } = require('../src/servers/wssv1');
const { wssV2 } = require('../src/servers/wssv2');
const { wssSignal } = require('../src/servers/wssSignal');
const { test } = require('node:test');

test('server: should start HTTP server and attach endpoints without throwing', () => {
  const server = http.createServer();
  assert.doesNotThrow(() => {
    registerWSEndpoints(server, { '/v1': wssV1, '/v2': wssV2, '/signaling': wssSignal });
  });
  server.close();
});
