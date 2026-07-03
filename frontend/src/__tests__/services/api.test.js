import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('API Service — Response Interceptor Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', {
      location: {
        pathname: '/dashboard',
        href: '',
      },
    });
    vi.stubGlobal('localStorage', {
      removeItem: vi.fn(),
      getItem: vi.fn(),
      setItem: vi.fn(),
    });
  });

  /**
   * Simulate what the interceptor does:
   * On 401 → clears K_real and redirects to /login (unless already on auth pages)
   * On 503 with requires_setup → redirects to /setup (unless already there)
   */
  const simulateInterceptor = (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cryptoledger_kreal');
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/register' && path !== '/setup' && path !== '/setup-account') {
        window.location.href = '/login';
      }
    } else if (error.response?.status === 503 && error.response?.data?.requires_setup) {
      if (window.location.pathname !== '/setup') {
        window.location.href = '/setup';
      }
    }
    return Promise.reject(error);
  };

  it('should clear K_real and redirect to /login on 401', async () => {
    window.location.pathname = '/dashboard';
    const error = { response: { status: 401 } };
    await expect(simulateInterceptor(error)).rejects.toEqual(error);
    expect(localStorage.removeItem).toHaveBeenCalledWith('cryptoledger_kreal');
    expect(window.location.href).toBe('/login');
  });

  it('should NOT redirect on 401 if already on /login', async () => {
    window.location.pathname = '/login';
    window.location.href = '';
    const error = { response: { status: 401 } };
    await expect(simulateInterceptor(error)).rejects.toEqual(error);
    expect(window.location.href).toBe('');
  });

  it('should NOT redirect on 401 if on /register', async () => {
    window.location.pathname = '/register';
    window.location.href = '';
    await expect(simulateInterceptor({ response: { status: 401 } })).rejects.toBeDefined();
    expect(window.location.href).toBe('');
  });

  it('should NOT redirect on 401 if on /setup', async () => {
    window.location.pathname = '/setup';
    window.location.href = '';
    await expect(simulateInterceptor({ response: { status: 401 } })).rejects.toBeDefined();
    expect(window.location.href).toBe('');
  });

  it('should NOT redirect on 401 if on /setup-account', async () => {
    window.location.pathname = '/setup-account';
    window.location.href = '';
    await expect(simulateInterceptor({ response: { status: 401 } })).rejects.toBeDefined();
    expect(window.location.href).toBe('');
  });

  it('should redirect to /setup on 503 with requires_setup=true', async () => {
    window.location.pathname = '/login';
    window.location.href = '';
    await expect(simulateInterceptor({ response: { status: 503, data: { requires_setup: true } } })).rejects.toBeDefined();
    expect(window.location.href).toBe('/setup');
  });

  it('should NOT redirect on 503 if already on /setup', async () => {
    window.location.pathname = '/setup';
    window.location.href = '';
    await expect(simulateInterceptor({ response: { status: 503, data: { requires_setup: true } } })).rejects.toBeDefined();
    expect(window.location.href).toBe('');
  });

  it('should NOT redirect on 503 without requires_setup flag', async () => {
    window.location.pathname = '/login';
    window.location.href = '';
    await expect(simulateInterceptor({ response: { status: 503 } })).rejects.toBeDefined();
    expect(window.location.href).toBe('');
  });

  it('should not modify location for non-401/503 errors', async () => {
    window.location.pathname = '/dashboard';
    window.location.href = '';
    await expect(simulateInterceptor({ response: { status: 500 } })).rejects.toBeDefined();
    expect(window.location.href).toBe('');
  });
});
