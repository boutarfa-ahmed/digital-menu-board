const env = require('./config/env');
const app = require('./app');

// Prisma's query engine takes a moment to finish its handshake after the
// client is constructed. Without this, a request landing in that window
// (e.g. the first login right after a nodemon restart) fails with
// "Engine is not yet connected" instead of just waiting.
const prisma = require('./db');

let server;
prisma
  .$connect()
  .then(() => {
    server = app.listen(env.PORT, () =>
      console.log(`Server on port ${env.PORT} (${env.NODE_ENV})`)
    );

    const { attachWs } = require('./services/broadcast');
    attachWs(server);
  })
  .catch((err) => {
    console.error('[db] failed to connect Prisma engine:', err);
    process.exit(1);
  });

module.exports = { app, get server() { return server; } };
