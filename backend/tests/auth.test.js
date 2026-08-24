const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const prisma = require('../src/db');

const PASSWORD = 'correct-horse-battery';

async function createUser(overrides = {}) {
  return prisma.user.create({
    data: {
      name: 'Test Admin',
      email: 'test-admin@galaxy.test',
      password: await bcrypt.hash(PASSWORD, 10),
      role: 'admin',
      ...overrides,
    },
  });
}

describe('auth: login + refresh', () => {
  beforeEach(async () => {
    // RefreshToken rows cascade-delete with their user, so clearing users is
    // enough — but clear both explicitly so test order never matters.
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('logs in with correct credentials and never returns the password hash', async () => {
    await createUser();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test-admin@galaxy.test', password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
    expect(res.body.user.email).toBe('test-admin@galaxy.test');
    expect(res.body.user.password).toBeUndefined();
  });

  it('rejects a wrong password with 401 and no hint about which field was wrong', async () => {
    await createUser();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test-admin@galaxy.test', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('rejects login for an email that does not exist', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@galaxy.test', password: PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('exchanges a refresh token for a new access+refresh pair, rotating the old one', async () => {
    const user = await createUser();
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: PASSWORD });
    const oldRefreshToken = loginRes.body.refreshToken;

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toEqual(expect.any(String));
    expect(refreshRes.body.refreshToken).toEqual(expect.any(String));
    expect(refreshRes.body.refreshToken).not.toBe(oldRefreshToken);

    // Rotation means the old refresh token is now dead — reusing it must fail.
    const reuseRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefreshToken });
    expect(reuseRes.status).toBe(401);
  });

  it('rejects a garbage refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'not-a-real-token' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid refresh token');
  });
});
