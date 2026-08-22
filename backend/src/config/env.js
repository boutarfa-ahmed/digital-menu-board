// Boot-time environment contract.
//
// The secrets used to fall back to hardcoded strings ('galaxyfood_secret_key'),
// so a deploy that forgot its .env still booted — and signed tokens anybody
// reading this repo could forge. Missing or weak secrets now kill the process
// at startup instead of shipping a silently insecure server.
const MIN_SECRET_LENGTH = 32;

const KNOWN_BAD = new Set([
  'galaxyfood_secret_key',
  'galaxyfood_refresh_secret_key',
  'secret',
  'changeme',
]);

function readSecret(name) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `[config] ${name} is required. Generate one with: openssl rand -hex 32`
    );
  }
  if (KNOWN_BAD.has(value)) {
    throw new Error(`[config] ${name} still uses a default/example value — replace it.`);
  }
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `[config] ${name} must be at least ${MIN_SECRET_LENGTH} characters (got ${value.length}).`
    );
  }
  return value;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  JWT_SECRET: readSecret('JWT_SECRET'),
  JWT_REFRESH_SECRET: readSecret('JWT_REFRESH_SECRET'),
  // Pilot: the admin logs in once for a working session. The refresh-token
  // interceptor lands in Phase 2, at which point this drops back to minutes.
  ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || '8h',
  REFRESH_TOKEN_EXPIRES_IN: parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN || '30', 10),
  // Comma-separated allowlist, e.g. "https://admin.galaxy.ch,https://tv.galaxy.ch".
  // Empty in development = reflect any origin (Vite dev servers on random ports).
  CORS_ORIGINS: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};

env.isProduction = env.NODE_ENV === 'production';

if (env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
  throw new Error('[config] JWT_SECRET and JWT_REFRESH_SECRET must differ.');
}

module.exports = env;
