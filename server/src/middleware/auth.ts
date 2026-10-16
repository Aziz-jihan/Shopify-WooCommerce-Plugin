import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const configuredKey = process.env.API_SECRET_KEY;

  if (!configuredKey) {
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ error: 'Server misconfiguration: API_SECRET_KEY is required in production.' });
      return;
    }
    // In local development without configured key, proceed with warning
    console.warn('[Auth] Warning: API_SECRET_KEY is not set. Allowing request in non-production.');
    return next();
  }

  const apiKeyHeader = req.headers['x-api-key'] as string | undefined;
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  const providedKey = apiKeyHeader || bearerToken;

  if (!providedKey || providedKey !== configuredKey) {
    res.status(401).json({ error: 'Unauthorized: Invalid or missing API key.' });
    return;
  }

  next();
}
