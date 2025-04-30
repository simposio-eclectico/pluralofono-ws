const WebSocket = require("ws");
const pino = require('pino')();
const logger = pino.child({module: 'wssAvro'});
const config = require('../config');

const wssAvro = new WebSocket.Server({ noServer: true });
const ACTIVE_OSC = new Map(); // Map<ws.id, response>
const MAX_MSG_SIZE = config.get('maxMsgSize');

/**
 * Agrega función broadcast a WebSocket
 * @param {*} msg
 */
wssAvro.broadcast = function broadcast(msg) {
  process.nextTick(() => {
    wssAvro.clients.forEach(function each(client) {
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
  wssAvro.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      ACTIVE_OSC.delete(ws.id);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, config.get("pingTimeout"));

wssAvro.on("open", function open() {
  logger.info("connected");
  wssAvro.send(Date.now());
});

wssAvro.on("error", function (error) {
  const elapsed = Date.now() - start;
  logger.info("Socket closed after %dms", elapsed);
  logger.error(error);
});

wssAvro.on("close", function close() {
  clearInterval(interval);
});

wssAvro.on("connection", function connection(ws, req) {
  if (ws._socket) ws._socket.setNoDelay(true);
  ws.isAlive = true;
  ws.on('pong', function() {
    ws.isAlive = true;
  });

  ws.id = crypto.randomUUID();
  const user = req.url.split("=")[1];
  logger.info(`new user: ${user} - ${ws.id}`);

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
      const response = { data, connectionId: ws.id, user };
      ACTIVE_OSC.set(ws.id, response);
      wssAvro.broadcast(data); // lo valida sabiendo que NO es string sino binario
    } catch (err) {
      logger.error(err, 'Error en mensaje ws: ' + err.message);
      ws.close(1011, 'Internal error'); // 1011 = Internal Error
    }
  });

  // Lista de clientes
  setInterval(() => {
    if (ACTIVE_OSC.size > 0) {
      // logger.info("sending broadcast"); TODO: granualar a verbose con pino o winston
      wssAvro.broadcast(JSON.stringify({ type: 'peers', data: Object.fromEntries(ACTIVE_OSC)}));
    }
  }, config.get("pingTimeout"));
});


module.exports = { wssAvro };