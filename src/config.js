const convict = require("convict");

const config = convict({
  port: {
    doc: "Port to listen on",
    format: "port",
    default: 9870,
    env: "PORT",
  },
  heartbeatInterval: {
    doc: "Heartbeat interval in ms",
    format: Number,
    default: 30000,
    env: "HEARTBEAT_INTERVAL",
  },
  pingTimeout: {
    doc: "Ping timeout in ms",
    format: Number,
    default: 30000,
    env: "PING_TIMEOUT",
  },
});

module.exports = config;
