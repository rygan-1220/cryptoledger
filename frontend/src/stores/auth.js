import { defineStore } from 'pinia';
import api from '../services/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    loading: false,
    error: null
  }),
  actions: {
    async register(payload) {
      try {
        this.loading = true;
        const response = await api.post('/auth/register', payload);
        return response.data;
      } catch (err) {
        this.error = err.response?.data?.error || 'Registration failed';
        throw this.error;
      } finally {
        this.loading = false;
      }
    },
    async login(email, password) {
      try {
        this.loading = true;
        const response = await api.post('/auth/login', { email, password });
        this.user = response.data.user;
        return response.data;
      } catch (err) {
        this.error = err.response?.data?.error || 'Login failed';
        throw this.error;
      } finally {
        this.loading = false;
      }
    },
    async logout() {
      await api.post('/auth/logout');
      this.user = null;
    },
    async fetchMe() {
      try {
        const response = await api.get('/auth/me');
        this.user = response.data.user;
      } catch (err) {
        this.user = null;
      }
    }
  }
});
