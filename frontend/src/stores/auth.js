import { defineStore } from 'pinia';
import api from '../services/api';
import { unwrapKReal, loadPrivateKey } from '../services/cryptoService';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
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

        // Re-unwrap K_real using the stored RSA private key (survives logout)
        const { wrapped_kreal_for_user } = response.data;
        if (wrapped_kreal_for_user) {
          try {
            const privateKey = await loadPrivateKey();
            if (privateKey) {
              await unwrapKReal(wrapped_kreal_for_user, privateKey);
              console.info('[CryptoLedger] K_real restored from login.');
            } else {
              console.warn('[CryptoLedger] Private key not found — cannot restore K_real.');
            }
          } catch (keyErr) {
            console.warn('[CryptoLedger] K_real restore failed:', keyErr.message);
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
