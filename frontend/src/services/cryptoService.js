// Cryptographic operations for the frontend using Web Crypto API
export const generateRSAKeyPair = async () => {
  return await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );
};

export const exportPublicKey = async (publicKey) => {
  const exported = await window.crypto.subtle.exportKey('spki', publicKey);
  const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
  const exportedAsBase64 = window.btoa(exportedAsString);
  return `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;
};

// Store private key in IndexedDB (simplified with localStorage for prototype, ideally use IndexedDB)
export const savePrivateKey = async (privateKey) => {
  const exported = await window.crypto.subtle.exportKey('pkcs8', privateKey);
  const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
  const exportedAsBase64 = window.btoa(exportedAsString);
  localStorage.setItem('cryptoledger_private_key', exportedAsBase64);
};

export const loadPrivateKey = async () => {
  const b64 = localStorage.getItem('cryptoledger_private_key');
  if (!b64) return null;
  const binaryDerString = window.atob(b64);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }
  return await window.crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['decrypt']
  );
};

export const unwrapKReal = async (wrappedKRealBase64, privateKey) => {
  const encryptedBuffer = new Uint8Array(window.atob(wrappedKRealBase64).split('').map(c => c.charCodeAt(0)));
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    encryptedBuffer
  );
  // Store K_real in localStorage or memory
  const kRealHex = Array.from(new Uint8Array(decryptedBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  localStorage.setItem('cryptoledger_kreal', kRealHex);
  return kRealHex;
};
