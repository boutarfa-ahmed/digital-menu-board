const { WebSocketServer } = require('ws');

let wss = null;

// Attach a WebSocket server to the HTTP server (one per process).
function attachWs(server) {
  if (wss) return wss;
  wss = new WebSocketServer({ server });
  wss.on('connection', (socket) => {
    // heartbeat: respond to ping frames (ws handles this automatically for client pings)
    socket.isAlive = true;
    socket.on('pong', () => {
      socket.isAlive = true;
    });
  });

  // terminate dead connections
  const interval = setInterval(() => {
    wss.clients.forEach((socket) => {
      if (socket.isAlive === false) return socket.terminate();
      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);
  wss.on('close', () => clearInterval(interval));

  return wss;
}

// Broadcast a JSON message to every connected client.
function broadcast(payload) {
  if (!wss) return;
  const message = JSON.stringify(payload);
  wss.clients.forEach((socket) => {
    if (socket.readyState === socket.OPEN) {
      socket.send(message);
    }
  });
}

module.exports = { attachWs, broadcast };
