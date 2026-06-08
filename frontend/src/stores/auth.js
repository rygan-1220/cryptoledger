import { defineStore } from 'pinia';
import api from '../services/api';
import { unwrapKReal, loadPrivateKey, decryptKRealWithKEK, generateRSAKeyPair, exportPublicKey, savePrivateKey, deriveKEK, encryptKRealWithKEK, getDevicePublicKey } from '../services/cryptoService';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    settings: {
      companyName: 'CryptoLedger',
      workspaceId: 'default'
    },
    loading: false,
    error: null,
    requiresSetup: false
  }),
  actions: {
    async register(payload) {
      try {
        this.loading = true;
        const response = await api.post('/auth/register', payload);
        return response.data;
      } catch (err) {
        this.error = err.response?.data?.error || 'Registration failed';
        throw new Error(this.error);
      } finally {
        this.loading = false;
      }
    },

    async login(email, password) {
      try {
        this.loading = true;
        const response = await api.post('/auth/login', { email, password });
        this.user = response.data.user;
        if (response.data.settings) this.settings = response.data.settings;

        // Restore K_real: try RSA unwrap first (same-device), fall back to KEK (cross-device)
        const { wrapped_kreal_for_user, encrypted_kreal_pwd } = response.data;
        if (wrapped_kreal_for_user) {
          let kRealRestored = false;

          // Path A: Attempt RSA unwrap using the locally stored private key
          try {
            const privateKey = await loadPrivateKey();
            if (privateKey) {
              await unwrapKReal(wrapped_kreal_for_user, privateKey);
              kRealRestored = true;
              console.info('[CryptoLedger] K_real restored via RSA unwrap (same-device).');
            }
          } catch (rsaErr) {
            // RSA unwrap may fail if K_real was wrapped with a different device's public key
            console.warn('[CryptoLedger] RSA unwrap failed:', rsaErr.message);
          }

          // Safety net: if RSA unwrap failed but K_real is already in localStorage
          // (e.g., from a previous session where the KEK backup wasn't created yet),
          // treat it as restored so we can create the backup below.
          if (!kRealRestored) {
            const existingKReal = localStorage.getItem('cryptoledger_kreal');
            if (existingKReal) {
              kRealRestored = true;
              console.info('[CryptoLedger] K_real found in local storage (from previous session).');
            }
          }

          // If K_real is available but no KEK backup exists on the server, create one now.
          // This must happen outside the RSA try block so it runs regardless of which
          // path restored K_real (RSA unwrap, localStorage, or KEK fallback below).
          if (kRealRestored && !encrypted_kreal_pwd) {
            try {
              const kRealHex = localStorage.getItem('cryptoledger_kreal');
              if (kRealHex) {
                const kek = await deriveKEK(password, email);
                const backup = await encryptKRealWithKEK(kRealHex, kek);
                await api.put('/auth/backup-key', { encrypted_kreal_pwd: backup });
                console.info('[CryptoLedger] KEK backup created during login.');
              }
            } catch (backupErr) {
              console.warn('[CryptoLedger] KEK backup creation failed (non-fatal):', backupErr.message);
            }
          }

          // Ensure the current device's public key is recorded in user_public_keys.
          // This is a safety net for users who registered before the registration
          // flow auto-inserted into user_public_keys (migration 006 era).
          if (kRealRestored) {
            try {
              const devicePubKey = await getDevicePublicKey();
              if (devicePubKey) {
                const deviceName = navigator.userAgent?.slice(0, 200) || 'Unknown device';
                await api.put('/auth/register-device', {
                  public_key_pem: devicePubKey,
                  device_name: deviceName
                });
              }
            } catch (deviceErr) {
              // Non-fatal: the server already has this key on file, or the call failed.
              // Signature verification will still work via the users.public_key_pem column.
            }
          }

          // Path B: KEK fallback (new device, or RSA unwrap failed due to key mismatch)
          if (!kRealRestored && encrypted_kreal_pwd) {
            try {
              console.info('[CryptoLedger] Attempting password-based K_real recovery...');
              const kRealHex = await decryptKRealWithKEK(encrypted_kreal_pwd, password, email);
              localStorage.setItem('cryptoledger_kreal', kRealHex);
              kRealRestored = true;
              console.info('[CryptoLedger] K_real restored via password-derived KEK.');

              // Generate a fresh RSA key pair for this device (for digital signatures)
              const newKeyPair = await generateRSAKeyPair();
              await savePrivateKey(newKeyPair.privateKey);
              const newPubKey = await exportPublicKey(newKeyPair.publicKey);
              const deviceName = navigator.userAgent?.slice(0, 200) || 'Unknown device';
              await api.put('/auth/register-device', {
                public_key_pem: newPubKey,
                device_name: deviceName
              });
              console.info('[CryptoLedger] New device signing key registered.');
            } catch (kekErr) {
              console.warn('[CryptoLedger] KEK recovery failed:', kekErr.message);
            }
          }

          if (!kRealRestored) {
            console.warn('[CryptoLedger] K_real could not be restored. Encrypted expenses will be unreadable.');
          }
        }

        return response.data;
      } catch (err) {
        this.error = err.response?.data?.error || 'Login failed';
        throw new Error(this.error);
      } finally {
        this.loading = false;
      }
    },

    async backupKey(encryptedKRealPwd) {
      await api.put('/auth/backup-key', { encrypted_kreal_pwd: encryptedKRealPwd });
    },

    async logout() {
      await api.post('/auth/logout');
      this.user = null;
      // Only remove K_real (department session key) — NOT the private key.
      // The RSA private key is device-bound and must persist across sessions.
      localStorage.removeItem('cryptoledger_kreal');
    },

    async fetchMe() {
      try {
        const response = await api.get('/auth/me');
        this.user = response.data.user;
        if (response.data.settings) this.settings = response.data.settings;
        this.requiresSetup = false;
      } catch (err) {
        this.user = null;
        if (err.response?.status === 503) {
          this.requiresSetup = true;
          throw err;
        }
      }
    }
  }
});
