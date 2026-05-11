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
