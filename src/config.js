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
  maxMsgSize: {
    doc: "Max message size in bytes",
    format: Number,
    default: 8 * 1024, // 8kb
    env: "MAX_MSG_SIZE",
  },
});

module.exports = config;
