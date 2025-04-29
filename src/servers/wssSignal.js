const WebSocket = require("ws");
const logger = require('pino')();
const config = require('../config');

const PEERS = new Map(); // Map<room, Map<peerId, ws>>
const MAX_MSG_SIZE = config.get('maxMsgSize');

// wssSignal: WebSocket de señalización para WebRTC
const wssSignal = new WebSocket.Server({ noServer: true });

// Broadcast optimizado para signaling (si se requiere)
wssSignal.broadcast = function broadcast(msg) {
  process.nextTick(() => {
    wssSignal.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  });
};

// Intervalo para enviar pings cada 30s y limpiar conexiones muertas
setInterval(function ping() {
  wssSignal.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, config.get("pingTimeout"));

wssSignal.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', function() {
    ws.isAlive = true;
  });
  logger.info("signaling connection");

  ws.on('message', (message) => {
    try {
      if (typeof message === 'string' && Buffer.byteLength(message, 'utf8') > MAX_MSG_SIZE) {
        logger.warn(`Mensaje demasiado grande, cerrando conexión.`);
        ws.close(1009, 'Message too large');
        return;
      }
      if (message instanceof Buffer && message.length > MAX_MSG_SIZE) {
        logger.warn(`Mensaje binario demasiado grande, cerrando conexión.`);
        ws.close(1009, 'Message too large');
        return;
      }
      const data = JSON.parse(message);
      // Registra el peer y su sala
      if (data.type === 'register') {
        const { room, peerId } = data;
        if (!PEERS.has(room)) PEERS.set(room, new Map());
        PEERS.get(room).set(peerId, ws); // Guarda la conexión WebSocket
        return;
      }
      // Reenvía mensajes de señalización al peer destino
      if (data.type === 'signal') {
        const { room, targetPeerId, signal } = data;
        const targetPeer = PEERS.get(room)?.get(targetPeerId);
        if (targetPeer) {
          targetPeer.send(JSON.stringify({
            type: 'signal',
            senderPeerId: data.peerId,
            signal,
          }));
        }
      }
    } catch (err) {
      logger.error('Error en mensaje ws:', err);
      ws.close(1011, 'Internal error'); // 1011 = Internal Error
    }
  });

  ws.on('close', () => {
    // Limpia peers desconectados
    for (const [room, peersMap] of PEERS.entries()) {
      for (const [peerId, peerWs] of peersMap.entries()) {
        if (peerWs === ws) {
          peersMap.delete(peerId);
        }
      }
      if (peersMap.size === 0) {
        PEERS.delete(room);
      }
    }
  });
});

module.exports = { wssSignal };