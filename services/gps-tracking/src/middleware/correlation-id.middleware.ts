import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const CORRELATION_ID_HEADER = 'x-request-id';

/**
 * Assigns or propagates a request correlation ID.
 * Attaches it to `req.headers` and echoes it in the response.
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers[CORRELATION_ID_HEADER] as string | undefined;
    const requestId = incoming && incoming.length > 0 ? incoming : randomUUID();

    req.headers[CORRELATION_ID_HEADER] = requestId;
    res.setHeader(CORRELATION_ID_HEADER, requestId);

    next();
}
