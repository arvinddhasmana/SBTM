import { randomBytes } from 'node:crypto';
import { AesGcmPiiCrypto, ciphertextEquals, piiCryptoFromEnv } from './pii-crypto';

describe('AesGcmPiiCrypto', () => {
  const key = randomBytes(32);
  const crypto = new AesGcmPiiCrypto(key);

  it('round-trips utf8 strings', () => {
    for (const plain of ['hello', '', 'Renée O’Connor', '日本語', '𝟙𝟚𝟛']) {
      const ct = crypto.encrypt(plain)!;
      expect(Buffer.isBuffer(ct)).toBe(true);
      expect(crypto.decrypt(ct)).toBe(plain);
    }
  });

  it('produces fresh IV per call (ciphertexts differ for same plaintext)', () => {
    const a = crypto.encrypt('same')!;
    const b = crypto.encrypt('same')!;
    expect(a.equals(b)).toBe(false);
    expect(crypto.decrypt(a)).toBe('same');
    expect(crypto.decrypt(b)).toBe('same');
  });

  it('passes null/undefined through', () => {
    expect(crypto.encrypt(null)).toBeNull();
    expect(crypto.encrypt(undefined)).toBeNull();
    expect(crypto.decrypt(null)).toBeNull();
    expect(crypto.decrypt(undefined)).toBeNull();
  });

  it('throws on tampered ciphertext', () => {
    const ct = crypto.encrypt('secret')!;
    const tampered = Buffer.from(ct);
    tampered[tampered.length - 1] ^= 0x01;
    expect(() => crypto.decrypt(tampered)).toThrow();
  });

  it('throws on tampered tag', () => {
    const ct = crypto.encrypt('secret')!;
    const tampered = Buffer.from(ct);
    tampered[12] ^= 0x01; // first tag byte
    expect(() => crypto.decrypt(tampered)).toThrow();
  });

  it('throws on too-short buffer', () => {
    expect(() => crypto.decrypt(Buffer.alloc(10))).toThrow(/too short/);
  });

  it('rejects wrong key length at construction', () => {
    expect(() => new AesGcmPiiCrypto(Buffer.alloc(16))).toThrow(/32 bytes/);
  });

  it('decrypt fails with a different key', () => {
    const other = new AesGcmPiiCrypto(randomBytes(32));
    const ct = crypto.encrypt('secret')!;
    expect(() => other.decrypt(ct)).toThrow();
  });
});

describe('piiCryptoFromEnv', () => {
  it('reads SBTM_PII_KEY (base64 32 bytes)', () => {
    const key = randomBytes(32).toString('base64');
    const c = piiCryptoFromEnv({ SBTM_PII_KEY: key } as NodeJS.ProcessEnv);
    const ct = c.encrypt('x')!;
    expect(c.decrypt(ct)).toBe('x');
  });

  it('throws when missing', () => {
    expect(() => piiCryptoFromEnv({} as NodeJS.ProcessEnv)).toThrow(/required/);
  });

  it('throws when wrong length', () => {
    const bad = Buffer.alloc(16).toString('base64');
    expect(() => piiCryptoFromEnv({ SBTM_PII_KEY: bad } as NodeJS.ProcessEnv)).toThrow(/32 bytes/);
  });
});

describe('ciphertextEquals', () => {
  it('returns true for identical buffers and false otherwise', () => {
    const a = Buffer.from([1, 2, 3, 4]);
    const b = Buffer.from([1, 2, 3, 4]);
    const c = Buffer.from([1, 2, 3, 5]);
    expect(ciphertextEquals(a, b)).toBe(true);
    expect(ciphertextEquals(a, c)).toBe(false);
    expect(ciphertextEquals(a, Buffer.from([1, 2, 3]))).toBe(false);
  });
});
