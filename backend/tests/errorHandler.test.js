const express = require('express');
const request = require('supertest');
const errorHandler = require('../src/middleware/errorHandler');

function buildApp({ isProduction }) {
  const app = express();

  app.get('/boom-500', (req, res, next) => {
    next(new Error('relation "User" does not exist in schema "public"'));
  });

  app.get('/boom-400', (req, res, next) => {
    const err = new Error('Valid email is required');
    err.status = 400;
    next(err);
  });

  app.use(errorHandler({ isProduction }));
  return app;
}

// This is the fix from the pre-deploy audit: routes used to answer with
// `err.message` straight from Prisma, which leaks table/column names to
// whoever is poking the API. The central handler must swallow 5xx detail in
// production while still surfacing 4xx validation messages, which are meant
// for the client.
describe('central error handler', () => {
  it('hides the raw error message behind a generic one in production for 5xx errors', async () => {
    const res = await request(buildApp({ isProduction: true })).get('/boom-500');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
    expect(res.body.error).not.toMatch(/relation|schema/i);
  });

  it('still returns the real message outside production, to help debugging', async () => {
    const res = await request(buildApp({ isProduction: false })).get('/boom-500');

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/relation "User" does not exist/);
  });

  it('passes through 4xx messages in every environment — they are meant for the client', async () => {
    const prodRes = await request(buildApp({ isProduction: true })).get('/boom-400');
    expect(prodRes.status).toBe(400);
    expect(prodRes.body.error).toBe('Valid email is required');

    const devRes = await request(buildApp({ isProduction: false })).get('/boom-400');
    expect(devRes.status).toBe(400);
    expect(devRes.body.error).toBe('Valid email is required');
  });
});
