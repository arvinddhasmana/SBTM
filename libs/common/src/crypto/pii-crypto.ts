import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Minimal envelope for at-rest PII columns (BYTEA in Postgres). Used for
 * stx_students / stx_guardians where columns like legal_name, date_of_birth,
 * email, phone, home_address are sensitive.
 *
 * Format: `[12-byte IV][16-byte GCM tag][ciphertext...]`
 * AAD: none (single key, no record-level binding) — keep simple for MVP.
 *
 * Key source: 32 raw bytes, supplied base64-encoded via env (`SBTM_PII_KEY`).
 * In tests, pass a fixed key buffer to `new AesGcmPiiCrypto(key)`.
 *
 * Followup: swap `AesGcmPiiCrypto` for an envelope-encryption impl (per-record
 * DEK wrapped by a KMS-managed KEK) once a KMS provider is wired. The
 * `PiiCrypto` interface stays stable across that swap.
 */
export interface PiiCrypto {
  encrypt(plaintext: string | null | undefined): Buffer | null;
  /** Returns null for null/undefined input. Throws on tamper / wrong key. */
  decrypt(ciphertext: Buffer | null | undefined): string | null;
}

const IV_LEN = 12;
const TAG_LEN = 16;

export class AesGcmPiiCrypto implements PiiCrypto {
  constructor(private readonly key: Buffer) {
    if (key.length !== 32) {
      throw new Error(`SBTM_PII_KEY must decode to 32 bytes, got ${key.length}`);
    }
  }

  encrypt(plaintext: string | null | undefined): Buffer | null {
    if (plaintext == null) return null;
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ct]);
  }

  decrypt(ciphertext: Buffer | null | undefined): string | null {
    if (ciphertext == null) return null;
    if (ciphertext.length < IV_LEN + TAG_LEN) {
      throw new Error(`pii ciphertext too short: ${ciphertext.length}`);
    }
    const iv = ciphertext.subarray(0, IV_LEN);
    const tag = ciphertext.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ct = ciphertext.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  }
}

/**
 * Reads `SBTM_PII_KEY` (base64-encoded 32 bytes) from the given env object.
 * Throws if missing or malformed — services that touch PII must fail at boot
 * rather than silently writing plaintext.
 */
export function piiCryptoFromEnv(env: NodeJS.ProcessEnv = process.env): PiiCrypto {
  const raw = env.SBTM_PII_KEY;
  if (!raw) {
    throw new Error('SBTM_PII_KEY env var is required (base64-encoded 32 bytes)');
  }
  let key: Buffer;
  try {
    key = Buffer.from(raw, 'base64');
  } catch {
    throw new Error('SBTM_PII_KEY is not valid base64');
  }
  return new AesGcmPiiCrypto(key);
}

/**
 * Constant-time equality on two ciphertexts. Useful when looking up an
 * already-encrypted lookup key (e.g. guardian email_ct dedupe) without
 * leaking timing info — though for the MVP guardians are deduped via a
 * deterministic hash column rather than ciphertext compare.
 */
export function ciphertextEquals(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}
