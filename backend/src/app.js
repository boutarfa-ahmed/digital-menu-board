require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Loaded before anything else: this throws at boot if a required secret is
// missing or weak, so a misconfigured deploy fails loudly instead of running
// with forgeable tokens.
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

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

app.use(errorHandler({ isProduction: env.isProduction }));

module.exports = app;
