const url = require("url");
const WebSocket = require("ws");

const ACTIVE_USERS = [];

// wssV2: Pluralófono DOS (Theremin) WebSocket
const wssV2 = new WebSocket.Server({ noServer: true });

/**
 * Agrega función broadcast a WebSocket
 * @param {*} msg
 */
wssV2.broadcast = function broadcast(msg) {
    wssV2.clients.forEach(function each(client) {
      client.send(msg);
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
  
  wssV2.on("open", function open() {
    console.log("connected");
    heartbeat();
    wssV2.send(Date.now());
  });
  
  wssV2.on("error", function (error) {
    const elapsed = Date.now() - start;
    console.log("Socket closed after %dms", elapsed);
    console.error(error);
  });
  
  wssV2.on("close", function close() {
    clearInterval(interval);
  });
  
  let id = 0;
  let master;
  wssV2.on("connection", function connection(ws, req) {
    ws.id = id++;
    const parsedUrl = url.parse(req.url, true);
    const user = parsedUrl.query.username;
    ws.username = user; // Guarda el nombre para referencia en heartbeat
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
    ws.isAlive = true;
  
    ws.on("pong", function () {
      ws.isAlive = true;
    });
  
    // procesa mensajes recibidos desde slave y los envía al master
    ws.on("message", function incoming(event) {
      if (event instanceof Uint8Array) {
        // binary frame: [fz, factor, wave, volume, id]
        const view = new Uint8Array([...event, ws.id]);
        if (master) {
          master.send(view, (err) => {
            if (err) console.error("err sending", err);
          });
        } else {
          wssV2.broadcast(view);
        }
        console.log(ws.id, "buffer", view);
      }
      if (event instanceof String) {
        // text frame
        if (master) {
          master.send(JSON.stringify(ACTIVE_USERS), (err) => {
            if (err) console.error("err sending", err);
          });
        } else {
          wssV2.broadcast(JSON.stringify(ACTIVE_USERS));
        }
        console.log(ws.id, "text", event);
      }
    });
  
    setInterval(() => {
      wssV2.broadcast("pong");
      // Si hay master definido y no estamos en modo noMaster, envía a master; si no, omite
      if (!noMasterMode && master) {
        master.send(JSON.stringify(ACTIVE_USERS), (err) => {
          console.log(
            "new user: ",
            req.url,
            user,
            isMaster ? "master" : "slave",
            ws.id
          );
          if (err) console.error("err sending", err);
        });
      } else {
        // En modo noMaster, loguea sin rol
        console.log(
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