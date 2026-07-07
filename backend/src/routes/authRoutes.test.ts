import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';

const TEST_SECRET = 'auth-routes-test-secret';

describe('POST /api/auth/login', () => {
  let app: ReturnType<typeof import('../app').createApp>;
  let resetDbForTests: typeof import('../db').resetDbForTests;

  beforeAll(async () => {
    process.env.TURSO_DATABASE_URL = ':memory:';
    process.env.JWT_SECRET = TEST_SECRET;
    delete process.env.TURSO_AUTH_TOKEN;

    const dbModule = await import('../db');
    resetDbForTests = dbModule.resetDbForTests;

    await resetDbForTests();

    const db = await dbModule.getDb();
    const passwordHash = await bcrypt.hash('correct-password', 10);

    await db.run(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      ['admin1', passwordHash, 'admin']
    );

    const appModule = await import('../app');
    app = appModule.createApp();
  });

  afterAll(async () => {
    await resetDbForTests();
  });

  it('returns 200 with a token and safe user object for correct credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin1', password: 'correct-password' });

    expect(response.status).toBe(200);
    expect(typeof response.body.token).toBe('string');
    expect(response.body.token.split('.')).toHaveLength(3);
    expect(response.body.user).toMatchObject({
      username: 'admin1',
      role: 'admin',
    });
    expect(response.body.user).not.toHaveProperty('password_hash');
    expect(response.body).not.toHaveProperty('password_hash');
  });

  it('returns a token that verifies and contains the admin role', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin1', password: 'correct-password' });

    const payload = jwt.verify(response.body.token, TEST_SECRET) as jwt.JwtPayload;

    expect(payload.username).toBe('admin1');
    expect(payload.role).toBe('admin');
  });

  it('returns a generic 401 for the correct username and wrong password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin1', password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid credentials' });
  });

  it('returns the same generic 401 for an unknown username', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'missing-user', password: 'wrong-password' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid credentials' });
  });

  it('returns the route validation status for missing username or password', async () => {
    const missingUsername = await request(app)
      .post('/api/auth/login')
      .send({ password: 'correct-password' });

    const missingPassword = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin1' });

    expect(missingUsername.status).toBe(401);
    expect(missingUsername.body).toEqual({ error: 'Invalid credentials' });
    expect(missingPassword.status).toBe(401);
    expect(missingPassword.body).toEqual({ error: 'Invalid credentials' });
  });
});
