// Cryptographic operations for the frontend using Web Crypto API

// ─── Helpers ───────────────────────────────────────────────────────────────
const bufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary);
};

const importKReal = async (kRealHex) => {
  const kRealBuffer = new Uint8Array(kRealHex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
  return window.crypto.subtle.importKey('raw', kRealBuffer, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
};

// ─── RSA Key Generation & Storage ──────────────────────────────────────────
export const generateRSAKeyPair = async () => {
  return window.crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt']
  );
};

export const exportPublicKey = async (publicKey) => {
  const exported = await window.crypto.subtle.exportKey('spki', publicKey);
  return `-----BEGIN PUBLIC KEY-----\n${bufferToBase64(exported)}\n-----END PUBLIC KEY-----`;
};

export const savePrivateKey = async (privateKey) => {
  const exported = await window.crypto.subtle.exportKey('pkcs8', privateKey);
  localStorage.setItem('cryptoledger_private_key', bufferToBase64(exported));
};

export const loadPrivateKey = async () => {
  const b64 = localStorage.getItem('cryptoledger_private_key');
  if (!b64) return null;
  const der = Uint8Array.from(window.atob(b64), c => c.charCodeAt(0));
  return window.crypto.subtle.importKey('pkcs8', der, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['decrypt']);
};

// Derive the public key PEM from the stored private key.
// Used when the client needs to identify which device key to use (e.g. K_session request).
export const getDevicePublicKey = async () => {
  const b64 = localStorage.getItem('cryptoledger_private_key');
  if (!b64) return null;
  const der = Uint8Array.from(window.atob(b64), c => c.charCodeAt(0));
  const privateKey = await window.crypto.subtle.importKey(
    'pkcs8', der,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true, ['decrypt']
  );
  // Export the public key portion via JWK, then reconstruct SPKI
  const jwk = await window.crypto.subtle.exportKey('jwk', privateKey);
  const publicKey = await window.crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RSA-OAEP-256', ext: true },
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true, ['encrypt']
  );
  const spki = await window.crypto.subtle.exportKey('spki', publicKey);
  return `-----BEGIN PUBLIC KEY-----\n${bufferToBase64(spki)}\n-----END PUBLIC KEY-----`;
};

// ─── K_real Distribution ───────────────────────────────────────────────────
export const unwrapKReal = async (wrappedKRealBase64, privateKey) => {
  let pk = privateKey;
  if (!pk) {
    pk = await loadPrivateKey();
    if (!pk) throw new Error('RSA Private key not found in device storage.');
  }
  const encryptedBuffer = Uint8Array.from(window.atob(wrappedKRealBase64), c => c.charCodeAt(0));
  const decryptedBuffer = await window.crypto.subtle.decrypt({ name: 'RSA-OAEP' }, pk, encryptedBuffer);
  const kRealHex = Array.from(new Uint8Array(decryptedBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  localStorage.setItem('cryptoledger_kreal', kRealHex);
  return kRealHex;
};

// ─── Layer 1: Decrypt metadata ─────────────────────────────────────────────
export const decryptLayer1 = async (layer1Ciphertext, kRealHex) => {
  const key = await importKReal(kRealHex);
  const iv       = Uint8Array.from(window.atob(layer1Ciphertext.iv),        c => c.charCodeAt(0));
  const authTag  = Uint8Array.from(window.atob(layer1Ciphertext.authTag),   c => c.charCodeAt(0));
  const ct       = Uint8Array.from(window.atob(layer1Ciphertext.ciphertext),c => c.charCodeAt(0));

  // WebCrypto expects ciphertext + authTag concatenated
  const combined = new Uint8Array(ct.length + authTag.length);
  combined.set(ct);
  combined.set(authTag, ct.length);

  const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, combined);
  return JSON.parse(new TextDecoder().decode(decrypted));
};

// ─── Receipt: Decrypt encrypted receipt → Blob ───────────────────────────
export const decryptReceiptFile = async (encReceipt, kRealHex) => {
  const key = await importKReal(kRealHex);
  const iv      = Uint8Array.from(window.atob(encReceipt.iv),       c => c.charCodeAt(0));
  const authTag = Uint8Array.from(window.atob(encReceipt.authTag),  c => c.charCodeAt(0));
  const ct      = Uint8Array.from(window.atob(encReceipt.ciphertext),c => c.charCodeAt(0));

  const combined = new Uint8Array(ct.length + authTag.length);
  combined.set(ct);
  combined.set(authTag, ct.length);

  const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, combined);
  return new Blob([decrypted], { type: encReceipt.mime_type || 'application/octet-stream' });
};


// ─── Layer 1: Encrypt metadata (vendor_name + description) ─────────────────
export const encryptLayer1 = async (plaintextObj, kRealHex) => {
  const key = await importKReal(kRealHex);
  const iv  = window.crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(JSON.stringify(plaintextObj));

  const encryptedBuffer = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc);
  const bytes = new Uint8Array(encryptedBuffer);

  return {
    iv:         bufferToBase64(iv),
    authTag:    bufferToBase64(bytes.slice(-16)),      // last 16 bytes
    ciphertext: bufferToBase64(bytes.slice(0, -16))   // everything before
  };
};


// ─── Receipt: Encrypt raw file ArrayBuffer with K_real ─────────────────────
// Returns { iv, authTag, ciphertext } all base64, plus mime_type
export const encryptReceiptFile = async (arrayBuffer, kRealHex, mimeType) => {
  const key = await importKReal(kRealHex);
  const iv  = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, arrayBuffer);
  const bytes = new Uint8Array(encryptedBuffer);

  return {
    iv:         bufferToBase64(iv),
    authTag:    bufferToBase64(bytes.slice(-16)),
    ciphertext: bufferToBase64(bytes.slice(0, -16)),
    mime_type:  mimeType
  };
};

// ─── File Hash: SHA-256 of the encrypted ciphertext ────────────────────────
// Sign this, NOT the raw plaintext file
export const hashEncryptedFile = async (encryptedReceiptCiphertextBase64) => {
  const bytes  = Uint8Array.from(window.atob(encryptedReceiptCiphertextBase64), c => c.charCodeAt(0));
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
};

// ─── Password-Derived KEK (Key Encryption Key) ────────────────────────────
// Derives a 256-bit AES key from the user's password via PBKDF2.
// This KEK is used to encrypt K_real for cross-device recovery.
// The password never leaves the client in plaintext form beyond the initial
// bcrypt auth exchange; the derived KEK is never sent to the server.

export const deriveKEK = async (password, email) => {
  // Use SHA-256(email) as the PBKDF2 salt for deterministic derivation
  const salt = await window.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(email.toLowerCase().trim())
  );

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 210000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return window.crypto.subtle.importKey(
    'raw',
    derivedBits,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
};

// Encrypt K_real (hex string) with the password-derived KEK for server-side backup.
// Returns a JSON string containing iv, authTag, and ciphertext as base64.
export const encryptKRealWithKEK = async (kRealHex, kek) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const kRealBytes = new Uint8Array(
    kRealHex.match(/.{1,2}/g).map(b => parseInt(b, 16))
  );

  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    kek,
    kRealBytes
  );
  const bytes = new Uint8Array(encrypted);

  return JSON.stringify({
    iv: bufferToBase64(iv),
    authTag: bufferToBase64(bytes.slice(-16)),
    ciphertext: bufferToBase64(bytes.slice(0, -16))
  });
};

// Decrypt K_real from the password-encrypted backup blob.
// Used on a new device where the RSA private key is not available.
// Returns the K_real hex string ready for Layer 1 operations.
export const decryptKRealWithKEK = async (encryptedKRealJson, password, email) => {
  const kek = await deriveKEK(password, email);
  const { iv, authTag, ciphertext } = JSON.parse(encryptedKRealJson);

  const ivBytes = Uint8Array.from(window.atob(iv), c => c.charCodeAt(0));
  const ctBytes = Uint8Array.from(window.atob(ciphertext), c => c.charCodeAt(0));
  const atBytes = Uint8Array.from(window.atob(authTag), c => c.charCodeAt(0));

  const combined = new Uint8Array(ctBytes.length + atBytes.length);
  combined.set(ctBytes);
  combined.set(atBytes, ctBytes.length);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    kek,
    combined
  );

  return Array.from(new Uint8Array(decrypted))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// ─── Digital Signature (RSASSA-PKCS1-v1_5) ─────────────────────────────────
// Signs any string payload using the stored private key
export const signPayload = async (payloadString) => {
  const b64 = localStorage.getItem('cryptoledger_private_key');
  if (!b64) throw new Error('Private key missing');
  const der = Uint8Array.from(window.atob(b64), c => c.charCodeAt(0));

  const privateKey = await window.crypto.subtle.importKey(
    'pkcs8', der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const sig = await window.crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    new TextEncoder().encode(payloadString)
  );
  return bufferToBase64(sig);
};
