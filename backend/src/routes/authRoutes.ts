import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const router = Router();

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

//#region debug-point login-500-error-bootstrap
const debugConfig = (() => {
  try {
    const envPath = resolve(process.cwd(), '.dbg', 'login-500-error.env');
    const envContents = readFileSync(envPath, 'utf8');
    const pairs = envContents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separatorIndex = line.indexOf('=');
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)] as const;
      });

    return {
      serverUrl: pairs.find(([key]) => key === 'DEBUG_SERVER_URL')?.[1],
      sessionId: pairs.find(([key]) => key === 'DEBUG_SESSION_ID')?.[1] ?? 'login-500-error',
    };
  } catch {
    return {
      serverUrl: undefined,
      sessionId: 'login-500-error',
    };
  }
})();

const reportDebugEvent = async (point: string, payload: Record<string, unknown>) => {
  if (!debugConfig.serverUrl) return;

  try {
    await fetch(debugConfig.serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: debugConfig.sessionId,
        point,
        hypothesisId: 'login-route',
        runId: 'pre',
        timestamp: new Date().toISOString(),
        payload,
      }),
    });
  } catch {
    // Intentionally swallow debug transport failures.
  }
};
//#endregion debug-point login-500-error-bootstrap

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    //#region debug-point login-500-error-request
    await reportDebugEvent('login-request', {
      hasUsername: typeof username === 'string',
      usernameLength: typeof username === 'string' ? username.trim().length : null,
      hasPassword: typeof password === 'string',
      passwordLength: typeof password === 'string' ? password.length : null,
    });
    //#endregion debug-point login-500-error-request

    if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
      //#region debug-point login-500-error-invalid-body
      await reportDebugEvent('login-invalid-body', {
        hasUsername: isNonEmptyString(username),
        hasPassword: isNonEmptyString(password),
      });
      //#endregion debug-point login-500-error-invalid-body
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const db = await getDb();
    const user = await db.get<{ id: number; username: string; password_hash: string; role: 'admin' | 'staff' }>(
      'SELECT id, username, password_hash, role FROM users WHERE username = ?',
      [username]
    );

    //#region debug-point login-500-error-user-lookup
    await reportDebugEvent('login-user-lookup', {
      username,
      userFound: Boolean(user),
      userId: user?.id ?? null,
      role: user?.role ?? null,
      hasPasswordHash: typeof user?.password_hash === 'string',
    });
    //#endregion debug-point login-500-error-user-lookup

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    //#region debug-point login-500-error-password-check
    await reportDebugEvent('login-password-check', {
      userId: user.id,
      passwordMatch,
    });
    //#endregion debug-point login-500-error-password-check

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    //#region debug-point login-500-error-jwt-secret
    await reportDebugEvent('login-jwt-secret', {
      hasJwtSecret: Boolean(jwtSecret),
      jwtSecretLength: jwtSecret?.length ?? 0,
    });
    //#endregion debug-point login-500-error-jwt-secret

    if (!jwtSecret) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      jwtSecret,
      { expiresIn: '8h' }
    );

    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error: any) {
    //#region debug-point login-500-error-catch
    await reportDebugEvent('login-catch', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
      status: error?.status ?? null,
      name: error instanceof Error ? error.name : null,
    });
    //#endregion debug-point login-500-error-catch

    const status = error.status ?? 500;
    res.status(status).json({ error: 'Internal server error' });
  }
});

export default router;
