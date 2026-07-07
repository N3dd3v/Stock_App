import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { requireAuth, requireAdmin, type UserPayload } from './auth';

const TEST_SECRET = 'auth-test-secret';

const createMockResponse = () => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const createRequest = (authorization?: string) =>
  ({
    headers: authorization ? { authorization } : {},
  } as Request);

describe('requireAuth', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;
  });

  it('calls next and attaches the payload for a valid token', () => {
    const payload: UserPayload = {
      userId: 1,
      username: 'admin1',
      role: 'admin',
    };
    const token = jwt.sign(payload, TEST_SECRET);
    const req = createRequest(`Bearer ${token}`);
    const res = createMockResponse();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject(payload);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when the Authorization header is missing', () => {
    const req = createRequest();
    const res = createMockResponse();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when the header does not start with Bearer", () => {
    const req = createRequest('Token abc123');
    const res = createMockResponse();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for a garbage token string', () => {
    const req = createRequest('Bearer definitely-not-a-jwt');
    const res = createMockResponse();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for a token signed with a different secret', () => {
    const token = jwt.sign(
      { userId: 2, username: 'staff1', role: 'staff' },
      'different-secret'
    );
    const req = createRequest(`Bearer ${token}`);
    const res = createMockResponse();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for an expired token', () => {
    const token = jwt.sign(
      { userId: 3, username: 'expired-user', role: 'admin' },
      TEST_SECRET,
      { expiresIn: '-1s' }
    );
    const req = createRequest(`Bearer ${token}`);
    const res = createMockResponse();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireAdmin', () => {
  it('calls next when req.user.role is admin', () => {
    const req = {
      user: { userId: 1, username: 'admin1', role: 'admin' },
    } as Request;
    const res = createMockResponse();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when req.user.role is staff', () => {
    const req = {
      user: { userId: 2, username: 'staff1', role: 'staff' },
    } as Request;
    const res = createMockResponse();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });
});
