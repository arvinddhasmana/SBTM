import jwt from 'jsonwebtoken';

/**
 * Generates a valid internal service JWT using the default dev secret.
 * Used by unit and integration tests to authenticate requests against routes
 * protected by internalServiceAuthMiddleware.
 */
export function makeServiceToken(
    secret = process.env.INTERNAL_SERVICE_SECRET ?? 'dev_internal_secret',
): string {
    return jwt.sign({ sub: 'test-service' }, secret, {
        issuer: 'sbtm-internal',
        expiresIn: '5m',
    });
}
