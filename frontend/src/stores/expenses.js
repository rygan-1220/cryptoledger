import { defineStore } from 'pinia';
import api from '../services/api';

export const useExpenseStore = defineStore('expenses', {
  state: () => ({
    expenses: [],
    loading: false,
    error: null
  }),
  actions: {
    async submitExpense(payload) {
      try {
        this.loading = true;
        const response = await api.post('/expenses', payload);
        return response.data;
      } catch (err) {
        this.error = err.response?.data?.error || 'Failed to submit expense';
        throw this.error;
      } finally {
        this.loading = false;
      }
    }
  }
});
