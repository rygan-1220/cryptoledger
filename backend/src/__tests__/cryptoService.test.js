const crypto = require('crypto');

// ─── Mock K_SYSTEM before requiring the service ──────────────────────────
// cryptoService reads process.env.K_SYSTEM at call time, so we can set it per test
const K_SYSTEM_B64 = crypto.randomBytes(32).toString('base64');
process.env.K_SYSTEM = K_SYSTEM_B64;

const { encryptSystem, decryptSystem } = require('../services/cryptoService');

describe('cryptoService', () => {
  describe('encryptSystem / decryptSystem round-trip', () => {
    it('should encrypt and decrypt a plain string back to the original', () => {
      const plaintext = 'Hello, CryptoLedger!';
      const encrypted = encryptSystem(plaintext);
      const decrypted = decryptSystem(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt JSON objects (stringified)', () => {
      const obj = { vendor_name: 'Acme Corp', amount: 150.0, dept_id: 3 };
      const encrypted = encryptSystem(obj);
      const decrypted = decryptSystem(encrypted);

      expect(JSON.parse(decrypted)).toEqual(obj);
    });

    it('should produce different ciphertext for the same plaintext (random IV)', () => {
      const plaintext = 'deterministic test';
      const ct1 = encryptSystem(plaintext);
      const ct2 = encryptSystem(plaintext);

      // IV is 12 random bytes — ciphertexts should differ
      expect(ct1.equals(ct2)).toBe(false);
    });

    it('should produce at least 28 bytes (12 IV + 16 authTag + 1+ ciphertext)', () => {
      const encrypted = encryptSystem('x');
      expect(encrypted.length).toBeGreaterThanOrEqual(28);
    });

    it('should handle empty string', () => {
      const encrypted = encryptSystem('');
      const decrypted = decryptSystem(encrypted);
      expect(decrypted).toBe('');
    });

    it('should handle Unicode / emoji', () => {
      const plaintext = '💰 Expense: Café €42.00 — ありがとう';
      const encrypted = encryptSystem(plaintext);
      const decrypted = decryptSystem(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle long payloads (10 KB)', () => {
      const plaintext = 'A'.repeat(10_000);
      const encrypted = encryptSystem(plaintext);
      const decrypted = decryptSystem(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('tamper resistance', () => {
    it('should fail decryption if ciphertext is modified', () => {
      const encrypted = encryptSystem('sensitive data');
      // Flip a byte in the ciphertext portion (after IV + authTag)
      const tampered = Buffer.from(encrypted);
      tampered[30] ^= 0xFF;

      expect(() => decryptSystem(tampered)).toThrow();
    });

    it('should fail decryption if authTag is modified', () => {
      const encrypted = encryptSystem('sensitive data');
      const tampered = Buffer.from(encrypted);
      tampered[13] ^= 0xFF; // inside authTag

      expect(() => decryptSystem(tampered)).toThrow();
    });

    it('should fail decryption with wrong key', () => {
      const originalKey = process.env.K_SYSTEM;
      const encrypted = encryptSystem('secret');

      // Switch to a different key
      process.env.K_SYSTEM = crypto.randomBytes(32).toString('base64');
      expect(() => decryptSystem(encrypted)).toThrow();

      // Restore
      process.env.K_SYSTEM = originalKey;
    });
  });

  describe('buffer format', () => {
    it('should have 12-byte IV at the start', () => {
      const encrypted = encryptSystem('test');
      const iv = encrypted.subarray(0, 12);
      expect(iv).toHaveLength(12);
    });

    it('should have 16-byte authTag after the IV', () => {
      const encrypted = encryptSystem('test');
      const authTag = encrypted.subarray(12, 28);
      expect(authTag).toHaveLength(16);
    });

    it('ciphertext portion should be non-empty', () => {
      const encrypted = encryptSystem('test');
      const ciphertext = encrypted.subarray(28);
      expect(ciphertext.length).toBeGreaterThan(0);
    });
  });
});
