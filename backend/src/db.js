// Single PrismaClient for the whole process.
//
// Each `new PrismaClient()` opens its own connection pool; the codebase used to
// create one per route/service file (8 pools for one server). SQLite tolerates
// it, Postgres does not — it exhausts max_connections. Import this instead.
const { PrismaClient } = require('@prisma/client');

const prisma = global.__galaxyPrisma || new PrismaClient();

// nodemon reloads the module graph without killing the process, so cache the
// client on `global` to avoid leaking a pool on every restart in dev.
if (process.env.NODE_ENV !== 'production') {
  global.__galaxyPrisma = prisma;
}

module.exports = prisma;
