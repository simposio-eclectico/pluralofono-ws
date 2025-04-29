const http = require("http");
const logger = require('pino')();

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const { registerWSEndpoints } = require("./router");
const { wssV1 } = require("./servers/wssv1");
const { wssV2 } = require("./servers/wssv2");
const { wssSignal } = require("./servers/wssSignal");
const config = require("./config");

const PORT = config.get("port");
const server = http.createServer();

server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

// Enrutamiento
try {
  registerWSEndpoints(server, { '/v1': wssV1, '/v2': wssV2, '/signaling': wssSignal });
} catch (error) {
  logger.error('Error en enrutamiento');
  logger.error(error);
}