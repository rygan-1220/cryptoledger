import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// Mock the api module
vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from '../../services/api';
import { useExpenseStore } from '../../stores/expenses';

describe('Expenses Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with loading=false and no error', () => {
      const store = useExpenseStore();
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
    });
  });

  describe('submitExpense', () => {
    it('should POST to /expenses and return response data', async () => {
      const store = useExpenseStore();
      const payload = { amount: '150.00', dept_id: 1, layer1_ciphertext: '...', encrypted_receipt: '...' };
      const mockResponse = { data: { expense_id: 42, message: 'Submitted' } };
      api.post.mockResolvedValueOnce(mockResponse);

      const result = await store.submitExpense(payload);

      expect(api.post).toHaveBeenCalledWith('/expenses', payload);
      expect(result).toEqual(mockResponse.data);
      expect(store.loading).toBe(false);
    });

    it('should set error and throw on failure', async () => {
      const store = useExpenseStore();
      api.post.mockRejectedValueOnce({
        response: { data: { error: 'Budget exceeded' } },
      });

      await expect(store.submitExpense({})).rejects.toThrow('Budget exceeded');
      expect(store.error).toBe('Budget exceeded');
      expect(store.loading).toBe(false);
    });

    it('should use default error message when no response body', async () => {
      const store = useExpenseStore();
      api.post.mockRejectedValueOnce(new Error('Network Error'));

      await expect(store.submitExpense({})).rejects.toThrow('Failed to submit expense');
    });
  });

  describe('fetchMyExpenses', () => {
    it('should GET /expenses with pagination and filters', async () => {
      const store = useExpenseStore();
      const mockData = { data: [{ id: 1 }], total: 1, page: 1, limit: 20 };
      api.get.mockResolvedValueOnce({ data: mockData });

      const result = await store.fetchMyExpenses(2, 10, { status: 'pending' });

      expect(api.get).toHaveBeenCalledWith('/expenses', {
        params: { page: 2, limit: 10, status: 'pending' },
      });
      expect(result).toEqual(mockData);
    });

    it('should default to page=1, limit=20, no filters', async () => {
      const store = useExpenseStore();
      api.get.mockResolvedValueOnce({ data: { data: [], total: 0 } });

      await store.fetchMyExpenses();

      expect(api.get).toHaveBeenCalledWith('/expenses', {
        params: { page: 1, limit: 20 },
      });
    });
  });

  describe('fetchDeptExpenses', () => {
    it('should GET /expenses/department with params', async () => {
      const store = useExpenseStore();
      const mockData = { data: [{ id: 5 }], total: 1, page: 1, limit: 20 };
      api.get.mockResolvedValueOnce({ data: mockData });

      const result = await store.fetchDeptExpenses(1, 50, { dept_id: 2 });

      expect(api.get).toHaveBeenCalledWith('/expenses/department', {
        params: { page: 1, limit: 50, dept_id: 2 },
      });
      expect(result).toEqual(mockData);
    });
  });

  describe('fetchAllExpenses', () => {
    it('should GET /expenses/all with params', async () => {
      const store = useExpenseStore();
      api.get.mockResolvedValueOnce({ data: { data: [], total: 0 } });

      await store.fetchAllExpenses(3, 100, {});

      expect(api.get).toHaveBeenCalledWith('/expenses/all', {
        params: { page: 3, limit: 100 },
      });
    });
  });

  describe('fetchExpenseById', () => {
    it('should GET /expenses/:id', async () => {
      const store = useExpenseStore();
      const mockDetail = { expense: { id: 77 }, layer1_ciphertext: '...', encrypted_receipt: '...' };
      api.get.mockResolvedValueOnce({ data: mockDetail });

      const result = await store.fetchExpenseById(77);

      expect(api.get).toHaveBeenCalledWith('/expenses/77');
      expect(result).toEqual(mockDetail);
    });
  });

  describe('deleteExpense', () => {
    it('should DELETE /expenses/:id', async () => {
      const store = useExpenseStore();
      api.delete.mockResolvedValueOnce({ data: { message: 'Deleted' } });

      await store.deleteExpense(99);

      expect(api.delete).toHaveBeenCalledWith('/expenses/99');
    });
  });

  describe('updateStatus', () => {
    it('should PATCH /expenses/:id/status with status and reason', async () => {
      const store = useExpenseStore();
      const mockResponse = { data: { message: 'Approved' } };
      api.patch.mockResolvedValueOnce(mockResponse);

      const result = await store.updateStatus(10, 'approved', 'Looks good');

      expect(api.patch).toHaveBeenCalledWith('/expenses/10/status', {
        status: 'approved',
        reason: 'Looks good',
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should allow null reason', async () => {
      const store = useExpenseStore();
      api.patch.mockResolvedValueOnce({ data: {} });

      await store.updateStatus(10, 'rejected', null);

      expect(api.patch).toHaveBeenCalledWith('/expenses/10/status', {
        status: 'rejected',
        reason: null,
      });
    });
  });
});
