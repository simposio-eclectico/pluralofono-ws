const http = require("http");
const url = require("url");
const WebSocket = require("ws");

const PORT = 9870;
const server = http.createServer();
const ACTIVE_USERS = [];

// WebSocket server para /v1
const wssV1 = new WebSocket.Server({ noServer: true });

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Maneja el upgrade para diferentes endpoints
server.on("upgrade", (request, socket, head) => {
  const pathname = url.parse(request.url).pathname;
  if (pathname === "/v1") {
    wssV1.handleUpgrade(request, socket, head, function done(ws) {
      wssV1.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});
/**
 * Agrega función broadcast a WebSocket
 * @param {*} msg
 */
wssV1.broadcast = function broadcast(msg) {
  wssV1.clients.forEach(function each(client) {
    client.send(msg);
  });
};

/**
 * Intervalo para enviar hearbeats
 */
const interval = setInterval(function ping() {
  wssV1.clients.forEach(function each(ws) {
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
}, 60000);

function heartbeat(id) {
  clearTimeout(this.pingTimeout);

  // Use `WebSocket#terminate()`, which immediately destroys the connection,
  // instead of `WebSocket#close()`, which waits for the close timer.
  // Delay should be equal to the interval at which your server
  // sends out pings plus a conservative assumption of the latency.
  this.pingTimeout = setTimeout(() => {
    if (id) {
      delete ACTIVE_USERS[ws.id];
    }
    this.terminate();
  }, 30000 + 1000);
}

wssV1.on("open", function open() {
  console.log("connected");
  heartbeat();
  wssV1.send(Date.now());
});

wssV1.on("error", function (error) {
  const elapsed = Date.now() - start;
  console.log("Socket closed after %dms", elapsed);
  console.error(error);
});

wssV1.on("close", function close() {
  clearInterval(interval);
});

let id = 0;
let master;
wssV1.on("connection", function connection(ws, req) {
  ws.id = id++;
  const parsedUrl = url.parse(req.url, true);
  const user = parsedUrl.query.username;
  ws.username = user; // Guarda el nombre para referencia en heartbeat
  const isMaster = user === "s1mpos1o" && parsedUrl.query.master;
  if (isMaster) {
    master = ws;
  }
  // Verifica si el usuario ya existe
  if (ACTIVE_USERS.includes(user)) {
    ws.send(JSON.stringify({ error: "El nombre de usuario ya está en uso." }));
    ws.close();
    return;
  }
  ACTIVE_USERS.push(user);
  ws.isAlive = true;

  ws.on("pong", function () {
    ws.isAlive = true;
  });

  // procesa mensajes recibidos desde slave y los envía al master
  ws.on("message", function incoming(event) {
    if (event instanceof Uint8Array) {
      // binary frame: [fz, factor, wave, volume, id]
      const view = new Uint8Array([...event, ws.id]);
      master?.send(view, (err) => {
        if (err) console.error("err sending", err);
      });
      console.log(ws.id, "buffer", view);
    }
    if (event instanceof String) {
      // text frame
      master?.send(JSON.stringify(ACTIVE_USERS), (err) => {
        if (err) console.error("err sending", err);
      });
      console.log(ws.id, "text", event);
    }
  });

  setInterval(() => {
    wssV1.broadcast("pong");
    master?.send(JSON.stringify(ACTIVE_USERS), (err) => {
      console.log(
        "new user: ",
        req.url,
        user,
        isMaster ? "master" : "slave",
        ws.id
      );
      if (err) console.error("err sending", err);
    });
  }, 3000);
});