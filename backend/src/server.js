require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Loaded before anything else: this throws at boot if a required secret is
// missing or weak, so a misconfigured deploy fails loudly instead of running
// with forgeable tokens.
const env = require('./config/env');

const app = express();

app.use(helmet());

// CORS: an explicit allowlist in production, permissive in development so the
// Vite dev servers (admin 5173, TV 5174, LAN IPs) work without ceremony.
if (env.CORS_ORIGINS.length > 0) {
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
} else if (env.isProduction) {
  throw new Error('[config] CORS_ORIGINS is required in production.');
} else {
  app.use(cors());
}

app.use(express.json({ limit: '1mb' }));

// Credential endpoints are the ones worth brute-forcing. The TV heartbeat and
// layout reads stay unthrottled — a wall of screens polling is normal traffic.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again later.' },
});

const menuRoutes = require('./routes/menu.routes');
const categoryRoutes = require('./routes/category.routes');
const uploadRoutes = require('./routes/upload.routes');
const authRoutes = require('./routes/auth.routes');
const screenRoutes = require('./routes/screen.routes');
const layoutRoutes = require('./routes/layout.routes');
const themeRoutes = require('./routes/theme.routes');

app.use('/api/menu', menuRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/screens', screenRoutes);
app.use('/api', layoutRoutes);
app.use('/api/themes', themeRoutes);

app.get('/api', (req, res) => {
  res.json({ message: 'GalaxyFood API is running' });
});

// Health probe for the kiosk/monitoring side: cheap, unauthenticated, no DB.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Central error handler. Routes used to answer with `err.message` straight from
// Prisma, leaking table and column names; in production the client now gets a
// generic message while the detail stays in the server log.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', req.method, req.originalUrl, err);
  const status = err.status || 500;
  res.status(status).json({
    error: env.isProduction && status >= 500 ? 'Internal server error' : err.message,
  });
});

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
