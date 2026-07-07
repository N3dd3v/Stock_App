import request from 'supertest';

describe('createApp', () => {
  it('returns 401 for GET /api/stocks without a token', async () => {
    process.env.TURSO_DATABASE_URL = ':memory:';
    process.env.JWT_SECRET = 'test-secret';
    delete process.env.TURSO_AUTH_TOKEN;

    const { resetDbForTests } = await import('./db');
    await resetDbForTests();

    const { createApp } = await import('./app.js');
    const app = createApp();

    const response = await request(app).get('/api/stocks');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });
});
