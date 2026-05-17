import { AesGcmPiiCrypto, type PiiCrypto, piiCryptoFromEnv } from '@sbtm/common';

/**
 * Injection token for the at-rest PII cipher used by the importer when writing
 * `stx_students` / `stx_guardians`. Tests override this with a fixed-key
 * `AesGcmPiiCrypto` so round-trip assertions are deterministic.
 */
export const PII_CRYPTO = Symbol('PII_CRYPTO');

export const piiCryptoProvider = {
  provide: PII_CRYPTO,
  useFactory: (): PiiCrypto => piiCryptoFromEnv(),
};

export { AesGcmPiiCrypto, type PiiCrypto };
