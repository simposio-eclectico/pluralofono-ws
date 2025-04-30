const WebSocket = require("ws");
const logger = require('pino')();
const config = require('../config');

const wssV1 = new WebSocket.Server({ noServer: true });
const ACTIVE_OSC = new Map(); // Map<ws.id, response>
const MAX_MSG_SIZE = config.get('maxMsgSize');

/**
 * Agrega función broadcast a WebSocket
 * @param {*} msg
 */
wssV1.broadcast = function broadcast(msg) {
  process.nextTick(() => {
    wssV1.clients.forEach(function each(client) {
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
  wssV1.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      ACTIVE_OSC.delete(ws.id);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, config.get("pingTimeout"));

wssV1.on("open", function open() {
  logger.info("connected");
  wssV1.send(Date.now());
});

wssV1.on("error", function (error) {
  const elapsed = Date.now() - start;
  logger.info("Socket closed after %dms", elapsed);
  logger.error(error);
});

wssV1.on("close", function close() {
  clearInterval(interval);
});

wssV1.on("connection", function connection(ws, req) {
  if (ws._socket) ws._socket.setNoDelay(true);
  ws.isAlive = true;
  ws.on('pong', function() {
    ws.isAlive = true;
  });

  ws.id = crypto.randomUUID();
  const user = req.url.split("=")[1];
  logger.info("new user: ", req.url, user, ws.id);

  ws.on("message", function incoming(data) {
    try {
      if (typeof data === 'string' && Buffer.byteLength(data, 'utf8') > MAX_MSG_SIZE) {
        logger.warn(`Mensaje demasiado grande de ${ws.id}, cerrando conexión.`);
        ws.close(1009, 'Message too large'); // 1009 = Close frame: Message too big
        return;
      }
      if (data instanceof Buffer && data.length > MAX_MSG_SIZE) {
        logger.warn(`Mensaje binario demasiado grande de ${ws.id}, cerrando conexión.`);
        ws.close(1009, 'Message too large');
        return;
      }
      const { fz, key } = JSON.parse(data);
      const response = { connectionId: ws.id, user: user, fz, key };
      ACTIVE_OSC.set(ws.id, response);
      logger.info(response);
      wssV1.broadcast(JSON.stringify(response));
    } catch (err) {
      logger.error('Error en mensaje ws:', err);
      ws.close(1011, 'Internal error'); // 1011 = Internal Error
    }
  });

  // Lista de clientes
  setInterval(() => {
    if (ACTIVE_OSC.size > 0) {
      // logger.info("sending broadcast"); TODO: granualar a verbose con pino o winston
      wssV1.broadcast(JSON.stringify(Object.fromEntries(ACTIVE_OSC)));
    }
  }, config.get("pingTimeout"));
});


module.exports = { wssV1 };