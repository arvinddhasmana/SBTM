import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const INTERNAL_SECRET = (() => {
  const secret = process.env.INTERNAL_SERVICE_SECRET;
  if (!secret) throw new Error('INTERNAL_SERVICE_SECRET environment variable is required');
  return secret;
})();
const INTERNAL_ISSUER = 'sbtm-internal';

interface ServiceTokenPayload {
  sub: string;
  iss: string;
}

/**
 * Express middleware that validates the internal service JWT on every inbound request.
 * Requests without a valid service token are rejected with 401.
 *
 * The token must be signed with INTERNAL_SERVICE_SECRET and issued by 'sbtm-internal'.
 */
export function internalServiceAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing internal service token' });
    return;
  }

  const token = authHeader.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, INTERNAL_SECRET, {
      issuer: INTERNAL_ISSUER,
    }) as ServiceTokenPayload;

    // Attach service identity to request for audit logging
    (req as Request & { serviceId?: string }).serviceId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid internal service token' });
  }
}
