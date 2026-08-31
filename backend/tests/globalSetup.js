const { execSync } = require('child_process');
const path = require('path');
const { testDatabaseUrl } = require('./testDbUrl');

// Runs once before the whole test run, in its own process — pushes the
// current Prisma schema onto the test database (creating it first if it
// doesn't exist yet). `db push` rather than `migrate deploy`: the test
// database is disposable, so migration history doesn't matter, and `db push`
// creates the database for us instead of requiring it to pre-exist.
module.exports = function globalSetup() {
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    stdio: 'inherit',
  });
};
