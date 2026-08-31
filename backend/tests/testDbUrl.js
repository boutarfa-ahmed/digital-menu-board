require('dotenv').config();

// Tests never run against the dev/prod database — they point at a separate
// logical database (same Postgres instance, different name) so seed-guard
// tests can freely wipe/reseed without touching real data.
function testDatabaseUrl() {
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = '/galaxyfood_test';
  return url.toString();
}

module.exports = { testDatabaseUrl };
