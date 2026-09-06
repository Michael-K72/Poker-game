import http from "node:http";
import { WebSocketServer } from "ws";
import { BRAND } from "@mk/shared";

const PORT = Number(process.env.PORT ?? 4001);

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        service: "mk-game-server",
        brand: BRAND.name,
        uptime: process.uptime(),
      }),
    );
    return;
  }
  res.writeHead(404);
  res.end("Not found");
});

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (socket) => {
  socket.send(
    JSON.stringify({
      type: "hello",
      message: "MK Poker Royale game server — private rooms coming online",
    }),
  );
  socket.on("message", (raw) => {
    // Intent-only protocol will land in Phase 10–11
    void raw;
  });
});

server.listen(PORT, () => {
  console.log(`[mk-game-server] listening on :${PORT}`);
});
