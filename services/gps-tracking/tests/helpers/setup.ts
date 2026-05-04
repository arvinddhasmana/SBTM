/**
 * Jest global setup — runs before any test module is loaded.
 *
 * Sets environment variables required by Express middleware that validate
 * them at module-load time (IIFE pattern in internal-service-auth.middleware.ts).
 *
 * The value 'dev_internal_secret' matches the hardcoded test constant used in
 * internal-service-auth.middleware.spec.ts so that middleware spec tests can
 * sign and verify tokens with the same key.
 */
process.env.INTERNAL_SERVICE_SECRET = 'dev_internal_secret';
