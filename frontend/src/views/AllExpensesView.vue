<template>
  <div class="min-h-screen bg-background p-8">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-3xl font-display font-bold text-text-main mb-6">All Expenses</h1>

      <!-- Filters -->
      <div class="bg-surface border border-border rounded-xl p-4 mb-6 flex gap-4 flex-wrap">
        <select v-model="filters.status" @change="fetch" class="border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select v-model="filters.category" @change="fetch" class="border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="">All Categories</option>
          <option>Office Supplies</option>
          <option>Travel</option>
          <option>Meals</option>
          <option>Equipment</option>
          <option>Other</option>
        </select>
      </div>

      <div v-if="loading" class="text-text-muted text-center py-16">Loading…</div>
      <div v-else-if="!expenses.length" class="bg-surface border border-border rounded-xl p-16 text-center text-text-muted">No expenses found.</div>
      <div v-else class="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-border text-text-muted uppercase text-xs tracking-wide">
            <tr>
              <th class="px-5 py-3 text-left">Date</th>
              <th class="px-5 py-3 text-left">Dept</th>
              <th class="px-5 py-3 text-left">Category</th>
              <th class="px-5 py-3 text-left">Project</th>
              <th class="px-5 py-3 text-right">Amount</th>
              <th class="px-5 py-3 text-center">Status</th>
              <th class="px-5 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="exp in expenses" :key="exp.expense_id" class="hover:bg-gray-50 transition">
              <td class="px-5 py-3">{{ formatDate(exp.created_at) }}</td>
              <td class="px-5 py-3 text-text-muted font-mono text-xs">{{ exp.dept_id.slice(0,8) }}…</td>
              <td class="px-5 py-3">{{ exp.category }}</td>
              <td class="px-5 py-3 text-text-muted">{{ exp.project_id }}</td>
              <td class="px-5 py-3 text-right font-medium">${{ parseFloat(exp.amount).toFixed(2) }}</td>
              <td class="px-5 py-3 text-center">
                <span :class="statusClass(exp.status)" class="px-2 py-1 rounded-full text-xs font-medium capitalize">{{ exp.status }}</span>
              </td>
              <td class="px-5 py-3 text-center flex gap-2 justify-center">
                <router-link :to="`/expenses/${exp.expense_id}`" class="text-primary hover:underline text-xs">View</router-link>
                <template v-if="exp.status === 'pending' && canApprove">
                  <button @click="updateStatus(exp.expense_id,'approved')" class="text-green-600 hover:underline text-xs">Approve</button>
                  <button @click="updateStatus(exp.expense_id,'rejected')" class="text-ember hover:underline text-xs">Reject</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="flex justify-between items-center px-5 py-3 border-t border-border text-sm text-text-muted">
          <span>Showing {{ expenses.length }} of {{ total }}</span>
          <div class="flex gap-2">
            <button @click="changePage(page-1)" :disabled="page<=1" class="px-3 py-1 rounded border border-border disabled:opacity-40">Prev</button>
            <button @click="changePage(page+1)" :disabled="expenses.length < limit" class="px-3 py-1 rounded border border-border disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useExpenseStore } from '../stores/expenses';

const authStore = useAuthStore();
const store    = useExpenseStore();

const canApprove = computed(() => ['dept_manager', 'finance_manager'].includes(authStore.user?.role));
const expenses = ref([]);
const total    = ref(0);
const page     = ref(1);
const limit    = ref(20);
const loading  = ref(true);
const filters  = reactive({ status: '', category: '' });

const fetch = async () => {
  loading.value = true;
  try {
    const res = await store.fetchAllExpenses(page.value, limit.value, filters);
    expenses.value = res.data;
    total.value    = res.total;
  } finally { loading.value = false; }
};

onMounted(fetch);
const changePage = (p) => { page.value = p; fetch(); };

const updateStatus = async (id, status) => {
  if (!confirm(`${status === 'approved' ? 'Approve' : 'Reject'} this expense?`)) return;
  await store.updateStatus(id, status);
  fetch();
};

const formatDate  = (d) => new Date(d).toLocaleDateString('en-MY', { day:'2-digit', month:'short', year:'numeric' });
const statusClass = (s) => ({ pending:'bg-yellow-100 text-yellow-700', approved:'bg-green-100 text-green-700', rejected:'bg-red-100 text-red-700' }[s] || '');
</script>
