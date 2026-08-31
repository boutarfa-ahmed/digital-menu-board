const { defineConfig } = require('vitest/config');
const { testDatabaseUrl } = require('./tests/testDbUrl');

module.exports = defineConfig({
  test: {
    environment: 'node',
    // The rest of the codebase is CommonJS (no "type": "module"); requiring
    // the `vitest` package itself doesn't work from a CJS file, so expose
    // describe/it/expect as globals instead of importing them per test file.
    globals: true,
    globalSetup: './tests/globalSetup.js',
    // Set before any test file's imports run, so every module that reads
    // process.env.DATABASE_URL (src/db.js, prisma/seed.js as a child process,
    // ...) sees the test database, never the dev/prod one.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl(),
    },
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
