import { defineStore } from 'pinia';
import api from '../services/api';

export const useExpenseStore = defineStore('expenses', {
  state: () => ({
    loading: false,
    error: null
  }),
  actions: {
    async submitExpense(payload) {
      try {
        this.loading = true;
        const res = await api.post('/expenses', payload);
        return res.data;
      } catch (err) {
        this.error = err.response?.data?.error || 'Failed to submit expense';
        throw new Error(this.error);
      } finally { this.loading = false; }
    },

    async fetchMyExpenses(page = 1, limit = 20, filters = {}) {
      const res = await api.get('/expenses', { params: { page, limit, ...filters } });
      return res.data; // { data, total, page, limit }
    },

    async fetchDeptExpenses(page = 1, limit = 20, filters = {}) {
      const res = await api.get('/expenses/department', { params: { page, limit, ...filters } });
      return res.data;
    },

    async fetchAllExpenses(page = 1, limit = 20, filters = {}) {
      const res = await api.get('/expenses/all', { params: { page, limit, ...filters } });
      return res.data;
    },

    async fetchExpenseById(id) {
      const res = await api.get(`/expenses/${id}`);
      return res.data; // { expense, layer1_ciphertext, encrypted_receipt }
    },

    async deleteExpense(id) {
      await api.delete(`/expenses/${id}`);
    },

    async updateStatus(id, status, reason = null) {
      const res = await api.patch(`/expenses/${id}/status`, { status, reason });
      return res.data;
    }
  }
});
