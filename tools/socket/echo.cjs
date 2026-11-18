const { WebSocketServer } = require("ws");
const server = new WebSocketServer({
  host: process.env.HOST || "127.0.0.1",
  port: Number(process.env.PORT || 8124),
  maxPayload: 65536,
});
server.on("connection", (connection) => {
  connection.on("error", () => connection.terminate());
  connection.on("message", (data, binary) => connection.send(data, { binary }));
});
