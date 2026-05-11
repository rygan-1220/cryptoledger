const crypto = require('crypto');
const { decryptSystem } = require('./cryptoService');

// Unwraps K_real from the database and re-wraps it for a user's RSA public key
function wrapKRealForUser(wrappedKRealSystem, publicKeyPem) {
  // 1. Decrypt K_real from K_system
  const kRealHex = decryptSystem(wrappedKRealSystem); // Should be the hex string of the 32-byte key
  const kRealBuffer = Buffer.from(kRealHex, 'hex');

  // 2. Wrap K_real using user's RSA public key with RSA-OAEP padding
  const wrappedKRealUser = crypto.publicEncrypt({
    key: publicKeyPem,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: 'sha256'
  }, kRealBuffer);

  return wrappedKRealUser.toString('base64');
}

module.exports = {
  wrapKRealForUser
};
