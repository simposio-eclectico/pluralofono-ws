const url = require("url");
const WebSocket = require("ws");
const logger = require('pino')();
const config = require('../config');

const MAX_MSG_SIZE = config.get('maxMsgSize');
const ACTIVE_USERS = [];

// wssV2: Pluralófono DOS (Theremin) WebSocket
const wssV2 = new WebSocket.Server({ noServer: true });

/**
 * Agrega función broadcast a WebSocket
 * @param {*} msg
 */
wssV2.broadcast = function broadcast(msg) {
  process.nextTick(() => {
    wssV2.clients.forEach(function each(client) {
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
  wssV2.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      // Elimina correctamente el usuario de ACTIVE_USERS
      const parsedUrl = ws.upgradeReq ? url.parse(ws.upgradeReq.url, true) : null;
      const username = ws.username || (parsedUrl && parsedUrl.query.username);
      if (username) {
        const idx = ACTIVE_USERS.indexOf(username);
        if (idx !== -1) ACTIVE_USERS.splice(idx, 1);
      }
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, config.get("pingTimeout"));

wssV2.on("open", function open() {
  logger.info("connected");
  wssV2.send(Date.now());
});

wssV2.on("error", function (error) {
  const elapsed = Date.now() - start;
  logger.info("Socket closed after %dms", elapsed);
  logger.error(error);
});

wssV2.on("close", function close() {
  clearInterval(interval);
});

let id = 0;
let master;
wssV2.on("connection", function connection(ws, req) {
  if (ws._socket) ws._socket.setNoDelay(true);
  // TODO: SPIKE - Considerar ajustar los búferes con setRecvBufferSize y setSendBufferSize
  ws.isAlive = true;
  ws.on("pong", function () {
    ws.isAlive = true;
  });

  ws.id = id++;
  const parsedUrl = url.parse(req.url, true);
  const user = parsedUrl.query.username;
  ws.username = user;
  // Si viene el querystring noMaster, no hay distinción entre master y slave
  const noMasterMode = 'noMaster' in parsedUrl.query;
  let isMaster = false;
  if (!noMasterMode) {
    isMaster = user === "s1mpos1o" && parsedUrl.query.master;
    if (isMaster) {
      master = ws;
    }
  }
  // Verifica si el usuario ya existe
  if (ACTIVE_USERS.includes(user)) {
    ws.send(JSON.stringify({ error: "El nombre de usuario ya está en uso." }));
    ws.close();
    return;
  }
  ACTIVE_USERS.push(user);

  // procesa mensajes recibidos desde slave y los envía al master
  ws.on("message", function incoming(event) {
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
    if (event instanceof Uint8Array) {
      // binary frame: [fz, factor, wave, volume, id]
      const view = new Uint8Array([...event, ws.id]);
      if (master) {
        master.send(view, (err) => {
          if (err) logger.error("err sending", err);
        });
      } else {
        wssV2.broadcast(view);
      }
      logger.info(ws.id, "buffer", view);
    }
    if (event instanceof String) {
      // text frame
      if (master) {
        master.send(JSON.stringify(ACTIVE_USERS), (err) => {
          if (err) logger.error("err sending", err);
        });
      } else {
        wssV2.broadcast(JSON.stringify(ACTIVE_USERS));
      }
      logger.info(ws.id, "text", event);
    }
  });

  setInterval(() => {
    wssV2.broadcast("pong");
    // Si hay master definido y no estamos en modo noMaster, envía a master; si no, omite
    if (!noMasterMode && master) {
      master.send(JSON.stringify(ACTIVE_USERS), (err) => {
        logger.info(
          "new user: ",
          req.url,
          user,
          isMaster ? "master" : "slave",
          ws.id
        );
        if (err) logger.error("err sending", err);
      });
    } else {
      // En modo noMaster, loguea sin rol
      logger.info(
        "new user: ",
        req.url,
        user,
        "noMaster",
        ws.id
      );
    }
  }, 3000);
});

module.exports = { wssV1: wssV2 };