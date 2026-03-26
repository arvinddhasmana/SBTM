import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { internalServiceAuthMiddleware } from './internal-service-auth.middleware';

const INTERNAL_SECRET = 'dev_internal_secret';
const INTERNAL_ISSUER = 'sbtm-internal';

function makeValidToken(secret = INTERNAL_SECRET): string {
    return jwt.sign({ sub: 'api-gateway' }, secret, {
        issuer: INTERNAL_ISSUER,
        expiresIn: '5m',
    });
}

describe('internalServiceAuthMiddleware', () => {
    let mockRes: Partial<Response>;
    let mockNext: jest.Mock;

    beforeEach(() => {
        mockNext = jest.fn();
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    it('should call next() and attach serviceId for a valid token', () => {
        const token = makeValidToken();
        const mockReq = {
            headers: { authorization: `Bearer ${token}` },
        } as unknown as Request;

        internalServiceAuthMiddleware(mockReq, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect((mockReq as any).serviceId).toBe('api-gateway');
    });

    it('should respond 401 when Authorization header is absent', () => {
        const mockReq = { headers: {} } as unknown as Request;

        internalServiceAuthMiddleware(mockReq, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: 'Missing internal service token',
        });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should respond 401 when Authorization header does not start with Bearer', () => {
        const mockReq = {
            headers: { authorization: 'Basic abc123' },
        } as unknown as Request;

        internalServiceAuthMiddleware(mockReq, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should respond 401 for a token signed with the wrong secret', () => {
        const token = makeValidToken('wrong_secret');
        const mockReq = {
            headers: { authorization: `Bearer ${token}` },
        } as unknown as Request;

        internalServiceAuthMiddleware(mockReq, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: 'Invalid internal service token',
        });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should respond 401 for an expired token', () => {
        const expiredToken = jwt.sign(
            { sub: 'api-gateway' },
            INTERNAL_SECRET,
            { issuer: INTERNAL_ISSUER, expiresIn: -1 },
        );
        const mockReq = {
            headers: { authorization: `Bearer ${expiredToken}` },
        } as unknown as Request;

        internalServiceAuthMiddleware(mockReq, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should respond 401 for a malformed (non-JWT) token string', () => {
        const mockReq = {
            headers: { authorization: 'Bearer not.a.jwt' },
        } as unknown as Request;

        internalServiceAuthMiddleware(mockReq, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockNext).not.toHaveBeenCalled();
    });
});
