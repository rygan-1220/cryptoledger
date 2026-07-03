import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// Mock the api module before importing the store
vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
  },
}));

// Mock cryptoService to avoid Web Crypto API calls
vi.mock('../../services/cryptoService', () => ({
  unwrapKReal: vi.fn(),
  loadPrivateKey: vi.fn(),
  decryptKRealWithKEK: vi.fn(),
  generateRSAKeyPair: vi.fn(),
  exportPublicKey: vi.fn(),
  savePrivateKey: vi.fn(),
  deriveKEK: vi.fn(),
  encryptKRealWithKEK: vi.fn(),
  getDevicePublicKey: vi.fn(),
}));

import api from '../../services/api';
import { useAuthStore } from '../../stores/auth';

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('initial state', () => {
    it('should initialize with null user and default settings', () => {
      const store = useAuthStore();
      expect(store.user).toBeNull();
      expect(store.settings).toEqual({
        companyName: 'CryptoLedger',
        workspaceId: 'default',
      });
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
      expect(store.requiresSetup).toBe(false);
    });
  });

  describe('register', () => {
    it('should call POST /auth/register and return data', async () => {
      const store = useAuthStore();
      const mockResponse = { data: { message: 'Registration successful', user: { id: 1 } } };
      api.post.mockResolvedValueOnce(mockResponse);

      const result = await store.register({
        username: 'newuser',
        email: 'new@example.com',
        password: 'Password123!',
      });

      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        username: 'newuser',
        email: 'new@example.com',
        password: 'Password123!',
      });
      expect(result).toEqual(mockResponse.data);
      expect(store.loading).toBe(false);
    });

    it('should set error and throw on failure', async () => {
      const store = useAuthStore();
      const err = { response: { data: { error: 'Email taken' } } };
      api.post.mockRejectedValueOnce(err);

      await expect(store.register({})).rejects.toThrow('Email taken');
      expect(store.error).toBe('Email taken');
      expect(store.loading).toBe(false);
    });
  });

  describe('login', () => {
    it('should set user on successful login', async () => {
      const store = useAuthStore();
      const mockUser = { user_id: 1, username: 'test', email: 'test@example.com', role: 'employee' };
      api.post.mockResolvedValueOnce({
        data: { user: mockUser, settings: { companyName: 'TestCo', workspaceId: 'ws1' }, wrapped_kreal_for_user: null, encrypted_kreal_pwd: null },
      });

      const result = await store.login('test@example.com', 'Password123!');

      expect(store.user).toEqual(mockUser);
      expect(store.settings.companyName).toBe('TestCo');
      expect(result.user).toEqual(mockUser);
      expect(store.loading).toBe(false);
    });

    it('should throw and set error on failed login', async () => {
      const store = useAuthStore();
      api.post.mockRejectedValueOnce({
        response: { data: { error: 'Invalid credentials' } },
      });

      await expect(store.login('bad@test.com', 'wrong')).rejects.toThrow('Invalid credentials');
      expect(store.error).toBe('Invalid credentials');
      expect(store.user).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      const store = useAuthStore();
      api.post.mockRejectedValueOnce(new Error('Network Error'));

      await expect(store.login('test@example.com', 'pass')).rejects.toThrow('Login failed');
      expect(store.error).toBe('Login failed');
    });
  });

  describe('logout', () => {
    it('should call POST /auth/logout and clear user', async () => {
      const store = useAuthStore();
      store.user = { user_id: 1, email: 'test@example.com' };
      localStorage.setItem('cryptoledger_kreal', 'some-kreal-hex');
      api.post.mockResolvedValueOnce({ data: { message: 'Logged out' } });

      await store.logout();

      expect(api.post).toHaveBeenCalledWith('/auth/logout');
      expect(store.user).toBeNull();
      expect(localStorage.getItem('cryptoledger_kreal')).toBeNull();
      // Private key should NOT be removed
    });
  });

  describe('fetchMe', () => {
    it('should set user from GET /auth/me response', async () => {
      const store = useAuthStore();
      const mockUser = { user_id: 1, email: 'test@example.com', role: 'employee' };
      api.get.mockResolvedValueOnce({
        data: { user: mockUser, settings: { companyName: 'Co', workspaceId: 'ws' } },
      });

      await store.fetchMe();

      expect(api.get).toHaveBeenCalledWith('/auth/me');
      expect(store.user).toEqual(mockUser);
      expect(store.requiresSetup).toBe(false);
    });

    it('should set requiresSetup=true on 503', async () => {
      const store = useAuthStore();
      const err = { response: { status: 503, data: { requires_setup: true } } };
      api.get.mockRejectedValueOnce(err);

      await expect(store.fetchMe()).rejects.toEqual(err);
      expect(store.requiresSetup).toBe(true);
      expect(store.user).toBeNull();
    });

    it('should clear user on non-503 error', async () => {
      const store = useAuthStore();
      store.user = { user_id: 1 };
      api.get.mockRejectedValueOnce({ response: { status: 500 } });

      try { await store.fetchMe(); } catch (_) { /* expected */ }
      expect(store.user).toBeNull();
    });
  });
});
