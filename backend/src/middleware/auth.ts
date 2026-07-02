import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export interface UserPayload {
  userId: number;
  username: string;
  role: 'admin' | 'staff';
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

const httpError = (message: string, status: number) => {
  const err: any = new Error(message);
  err.status = status;
  return err;
};

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as UserPayload;
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};
