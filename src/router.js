const url = require("url");

/**
 * Registra los endpoints WebSocket en el servidor HTTP base.
 * @param {http.Server} server - Servidor HTTP
 * @param {Object} endpoints - Diccionario de endpoints { '/v1': wssV1, ... }
 */
function registerWSEndpoints(server, endpoints) {
  server.on("upgrade", (request, socket, head) => {
    const pathname = url.parse(request.url).pathname;
    if (endpoints[pathname]) {
      endpoints[pathname].handleUpgrade(request, socket, head, function done(ws) {
        endpoints[pathname].emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });
}

module.exports = { registerWSEndpoints };
