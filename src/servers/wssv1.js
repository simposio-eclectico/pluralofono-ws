const WebSocket = require("ws");
const logger = require('pino')();

const wss = new WebSocket.Server({ noServer: true });
const ACTIVE_OSC = {};

/**
 * Agrega función broadcast a WebSocket
 * @param {*} msg
 */
wss.broadcast = function broadcast(msg) {
  process.nextTick(() => {
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  });
};

/**
 * Intervalo para enviar hearbeats
 */
const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      delete ACTIVE_OSC[ws.id];
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, 60000);

function heartbeat(id) {
  clearTimeout(this.pingTimeout);

  // Use `WebSocket#terminate()`, which immediately destroys the connection,
  // instead of `WebSocket#close()`, which waits for the close timer.
  // Delay should be equal to the interval at which your server
  // sends out pings plus a conservative assumption of the latency.
  this.pingTimeout = setTimeout(() => {
    if (id) {
      delete ACTIVE_OSC[ws.id];
    }
    this.terminate();
  }, 30000 + 1000);
}

wss.on("open", function open() {
  logger.info("connected");
  heartbeat();
  wss.send(Date.now());
});

wss.on("error", function (error) {
  const elapsed = Date.now() - start;
  logger.info("Socket closed after %dms", elapsed);
  logger.error(error);
});

wss.on("close", function close() {
  clearInterval(interval);
});

wss.on("connection", function connection(ws, req) {
  ws.id = crypto.randomUUID();
  const user = req.url.split("=")[1];
  logger.info("new user: ", req.url, user, ws.id);
  ws.isAlive = true;

  ws.on("ping", heartbeat);

  ws.on("message", function incoming(data) {
    const { fz, key } = JSON.parse(data);
    const response = { connectionId: ws.id, user: user, fz, key };
    ACTIVE_OSC[ws.id] = response;
    logger.info(response);
    wss.broadcast(JSON.stringify(response));
  });

  // Lista de clientes
  setInterval(() => {
    if (Object.values(ACTIVE_OSC).length > 0) {
      // logger.info("sending broadcast"); TODO: granualar a verbose con pino o winston
      wss.broadcast(JSON.stringify(ACTIVE_OSC));
    }
  }, 1000);
});

