import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const CORRELATION_ID_HEADER = 'x-request-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction): void {
        const incoming = req.headers[CORRELATION_ID_HEADER] as string | undefined;
        const requestId = incoming && incoming.length > 0 ? incoming : randomUUID();

        req.headers[CORRELATION_ID_HEADER] = requestId;
        res.setHeader(CORRELATION_ID_HEADER, requestId);

        next();
    }
}
