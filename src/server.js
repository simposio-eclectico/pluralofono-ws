const http = require("http");
const logger = require('pino')();

const { registerWSEndpoints } = require("./router");
const { wssV1 } = require("./servers/wssv1");
const { wssV2 } = require("./servers/wssv2");
const { wssSignal } = require("./servers/wssSignal");

const PORT = 9870;
const server = http.createServer();

server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

// Enrutamiento
registerWSEndpoints(server, { '/v1': wssV1, '/v2': wssV2, '/signaling': wssSignal });