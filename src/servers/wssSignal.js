const WebSocket = require("ws");
const logger = require('pino')();
const config = require('../config');

const PEERS = {}; // Almacena pares de peers por sala/ID

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
    const data = JSON.parse(message);
    
    // Registra el peer y su sala
    if (data.type === 'register') {
      const { room, peerId } = data;
      if (!PEERS[room]) PEERS[room] = {};
      PEERS[room][peerId] = ws; // Guarda la conexión WebSocket
      return;
    }

    // Reenvía mensajes de señalización al peer destino
    if (data.type === 'signal') {
      const { room, targetPeerId, signal } = data;
      const targetPeer = PEERS[room]?.[targetPeerId];
      if (targetPeer) {
        targetPeer.send(JSON.stringify({
          type: 'signal',
          senderPeerId: data.peerId,
          signal,
        }));
      }
    }
  });

  ws.on('close', () => {
    // Limpia peers desconectados
    const rooms = Object.keys(PEERS);
    for (const room of rooms) {
      const peerIds = Object.keys(PEERS[room]);
      for (const peerId of peerIds) {
        if (PEERS[room][peerId] === ws) {
          delete PEERS[room][peerId];
          break;
        }
      }
      if (Object.keys(PEERS[room]).length === 0) {
        delete PEERS[room];
      }
    }
  });
});

module.exports = { wssSignal };