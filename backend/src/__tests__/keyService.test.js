const crypto = require('crypto');

// Mock process.env.K_SYSTEM so cryptoService doesn't fail on require
const K_SYSTEM = crypto.randomBytes(32);
const K_SYSTEM_B64 = K_SYSTEM.toString('base64');
process.env.K_SYSTEM = K_SYSTEM_B64;

const { wrapKRealForUser } = require('../services/keyService');

// Generate a real RSA key pair for testing
const generateTestKeyPair = () => {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
};

/**
 * Build a properly encrypted K_real system buffer.
 * This mimics what happens when the setup process encrypts K_real with K_system.
 */
function buildWrappedKRealSystem(kRealHex) {
  const kSystem = Buffer.from(process.env.K_SYSTEM, 'base64');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', kSystem, iv);
  let encrypted = cipher.update(kRealHex, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: [12 bytes IV] [16 bytes AuthTag] [Ciphertext]
  return Buffer.concat([iv, authTag, encrypted]);
}

describe('keyService', () => {
  let publicKeyPem;
  let privateKeyPem;

  beforeAll(() => {
    const keys = generateTestKeyPair();
    publicKeyPem = keys.publicKey;
    privateKeyPem = keys.privateKey;
  });

  describe('wrapKRealForUser', () => {
    it('should return a base64-encoded wrapped key for valid input', () => {
      const kRealHex = crypto.randomBytes(32).toString('hex');
      const wrappedKRealSystem = buildWrappedKRealSystem(kRealHex);

      const wrapped = wrapKRealForUser(wrappedKRealSystem, publicKeyPem);

      expect(typeof wrapped).toBe('string');
      expect(wrapped.length).toBeGreaterThan(0);
      // Should be valid base64
      expect(() => Buffer.from(wrapped, 'base64')).not.toThrow();
    });

    it('should produce non-empty result', () => {
      const kRealHex = crypto.randomBytes(32).toString('hex');
      const wrappedKRealSystem = buildWrappedKRealSystem(kRealHex);

      const wrapped = wrapKRealForUser(wrappedKRealSystem, publicKeyPem);
      expect(wrapped.length).toBeGreaterThan(0);
    });

    it('should produce valid base64 output', () => {
      const kRealHex = crypto.randomBytes(32).toString('hex');
      const wrappedKRealSystem = buildWrappedKRealSystem(kRealHex);

      const wrapped = wrapKRealForUser(wrappedKRealSystem, publicKeyPem);
      const decoded = Buffer.from(wrapped, 'base64');
      // RSA-2048 output should be 256 bytes
      expect(decoded.length).toBe(256);
    });

    it('should produce different output for different public keys', () => {
      const kRealHex = crypto.randomBytes(32).toString('hex');
      const wrappedKRealSystem = buildWrappedKRealSystem(kRealHex);

      const wrapped1 = wrapKRealForUser(wrappedKRealSystem, publicKeyPem);

      // Different key pair
      const keys2 = generateTestKeyPair();
      const wrapped2 = wrapKRealForUser(wrappedKRealSystem, keys2.publicKey);

      expect(wrapped1).not.toBe(wrapped2);
    });

    it('should throw with an invalid public key PEM', () => {
      const kRealHex = crypto.randomBytes(32).toString('hex');
      const wrappedKRealSystem = buildWrappedKRealSystem(kRealHex);

      expect(() => wrapKRealForUser(wrappedKRealSystem, 'not-a-valid-pem')).toThrow();
    });

    it('should unwrap successfully with the matching private key', () => {
      const kRealHex = crypto.randomBytes(32).toString('hex');
      const wrappedKRealSystem = buildWrappedKRealSystem(kRealHex);

      const wrapped = wrapKRealForUser(wrappedKRealSystem, publicKeyPem);
      const encrypted = Buffer.from(wrapped, 'base64');

      // Decrypt with the private key
      const decrypted = crypto.privateDecrypt(
        {
          key: privateKeyPem,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        encrypted,
      );

      const recoveredHex = decrypted.toString('hex');
      expect(recoveredHex).toBe(kRealHex);
    });
  });
});
