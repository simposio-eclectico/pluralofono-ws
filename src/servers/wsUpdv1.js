const dgram = require('dgram');
const logger = require('pino')();
const config = require('../config');

const PORT = config.get('udpPort');
const MAX_MSG_SIZE = config.get('maxMsgSize');

// Guardamos los clientes como { address, port }
const ACTIVE_OSC = new Map(); // Map<`${address}:${port}`, {address, port, lastSeen}>

const server = dgram.createSocket('udp4');

server.on('error', (err) => {
  logger.error(`UDP server error:\n${err.stack}`);
  server.close();
});

server.on('message', (msg, rinfo) => {
  if (msg.length > MAX_MSG_SIZE) {
    logger.warn(`Mensaje UDP demasiado grande de ${rinfo.address}:${rinfo.port}, ignorando.`);
    return;
  }
  let data;
  try {
    data = JSON.parse(msg);
  } catch (err) {
    logger.warn(`Mensaje UDP no es JSON válido de ${rinfo.address}:${rinfo.port}`);
    return;
  }
  // Registrar cliente si no existe
  const clientKey = `${rinfo.address}:${rinfo.port}`;
  ACTIVE_OSC.set(clientKey, { address: rinfo.address, port: rinfo.port, lastSeen: Date.now() });
  logger.info(`Mensaje recibido de ${clientKey}:`, data);

  // Broadcast a todos los clientes menos el remitente
  const response = Buffer.from(JSON.stringify({ ...data, from: clientKey }));
  for (const [key, client] of ACTIVE_OSC.entries()) {
    if (key !== clientKey) {
      server.send(response, 0, response.length, client.port, client.address, (err) => {
        if (err) logger.error(`Error enviando a ${client.address}:${client.port}:`, err);
      });
    }
  }
});

// Heartbeat simple: elimina clientes inactivos
setInterval(() => {
  const now = Date.now();
  for (const [key, client] of ACTIVE_OSC.entries()) {
    if (now - client.lastSeen > config.get('pingTimeout')) {
      ACTIVE_OSC.delete(key);
    }
  }
}, config.get('pingTimeout'));

server.on('listening', () => {
  const address = server.address();
  logger.info(`UDP server listening ${address.address}:${address.port}`);
});

server.bind(PORT);

module.exports = server;
