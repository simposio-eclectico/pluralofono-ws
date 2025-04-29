const assert = require('assert');
const http = require('http');
const { registerWSEndpoints } = require('../src/router');
const { test } = require('node:test');

test('router: should attach an upgrade handler to the server', () => {
  const server = http.createServer();
  registerWSEndpoints(server, {});
  assert(server.listenerCount('upgrade') > 0);
  server.close();
});
