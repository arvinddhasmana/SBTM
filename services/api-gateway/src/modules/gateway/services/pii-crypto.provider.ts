import {
  AesGcmPiiCrypto,
  type PiiCrypto,
  piiCryptoFromEnv,
} from '@sbtm/common';

/**
 * Injection token for the at-rest PII cipher used by api-gateway when reading
 * `stx_students` / `stx_guardians` columns (legal_name, preferred_name, etc.).
 * Matches the importer's provider shape — same `SBTM_PII_KEY` env, same
 * `AesGcmPiiCrypto` impl — so reads decrypt what the importer wrote.
 *
 * Tests override this with a fixed-key `AesGcmPiiCrypto` or stub.
 */
export const PII_CRYPTO = Symbol('PII_CRYPTO');

export const piiCryptoProvider = {
  provide: PII_CRYPTO,
  useFactory: (): PiiCrypto => piiCryptoFromEnv(),
};

export { AesGcmPiiCrypto, type PiiCrypto };
