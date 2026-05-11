const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

// Encrypt payload with K_system
function encryptSystem(payload) {
  const kSystem = Buffer.from(process.env.K_SYSTEM, 'base64');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, kSystem, iv);

  let encrypted = cipher.update(typeof payload === 'string' ? payload : JSON.stringify(payload), 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Return a single buffer containing iv + authTag + ciphertext
  // Format: [12 bytes IV] [16 bytes AuthTag] [Ciphertext]
  return Buffer.concat([iv, authTag, encrypted]);
}

// Decrypt payload with K_system
function decryptSystem(buffer) {
  const kSystem = Buffer.from(process.env.K_SYSTEM, 'base64');
  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const ciphertext = buffer.subarray(28);

  const decipher = crypto.createDecipheriv(ALGORITHM, kSystem, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString('utf8');
}

module.exports = {
  encryptSystem,
  decryptSystem
};
