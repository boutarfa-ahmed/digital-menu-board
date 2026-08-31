const { execFileSync } = require('child_process');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { testDatabaseUrl } = require('./testDbUrl');

const BACKEND_DIR = path.resolve(__dirname, '..');
const DATABASE_URL = testDatabaseUrl();

function runSeed(envOverrides) {
  return execFileSync('node', ['prisma/seed.js'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, DATABASE_URL, SEED_ADMIN_PASSWORD: 'seed-test-pass', ...envOverrides },
    encoding: 'utf8',
  });
}

// This is the fix from the pre-deploy audit: the seed script deletes all
// menu/category/screen/theme data before recreating demo content, which is
// fine against an empty dev database and catastrophic against a real one a
// restaurant has since filled in. It must refuse to run in that situation
// unless someone explicitly opts in with SEED_FORCE=yes.
describe('seed script: production guard against destructive reseed', () => {
  let prisma;

  beforeAll(() => {
    prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
    // Seed once in a non-production env to guarantee the test database is
    // non-empty before the guard is exercised.
    runSeed({ NODE_ENV: 'test' });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('has data to protect', async () => {
    const count = await prisma.category.count();
    expect(count).toBeGreaterThan(0);
  });

  it('refuses to run (and exits non-zero) in production against a non-empty database', () => {
    expect(() => runSeed({ NODE_ENV: 'production' })).toThrow();

    // The bug this test caught while writing it: main().catch(console.error)
    // only logged the rejection, the process still exited 0. A CI pipeline
    // checking the exit code would never have noticed the refusal.
  });

  it('does not touch existing data when it refuses', async () => {
    const before = await prisma.category.count();
    try {
      runSeed({ NODE_ENV: 'production' });
    } catch {
      // expected — see previous test
    }
    const after = await prisma.category.count();
    expect(after).toBe(before);
  });

  it('proceeds when SEED_FORCE=yes is explicitly set', () => {
    expect(() => runSeed({ NODE_ENV: 'production', SEED_FORCE: 'yes' })).not.toThrow();
  });
});
