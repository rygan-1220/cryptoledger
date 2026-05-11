<template>
  <div class="min-h-screen bg-background p-8">
    <div class="max-w-5xl mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-display font-bold text-text-main">My Expenses</h1>
        <router-link to="/expenses/new" class="bg-primary text-white px-4 py-2 rounded hover:bg-primary-hover font-medium transition">
          + New Expense
        </router-link>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-text-muted text-center py-16">Loading expenses…</div>

      <!-- Empty -->
      <div v-else-if="!expenses.length" class="bg-surface border border-border rounded-xl p-16 text-center">
        <p class="text-text-muted text-lg">No expenses yet.</p>
        <router-link to="/expenses/new" class="text-primary hover:underline mt-2 inline-block">Submit your first expense →</router-link>
      </div>

      <!-- Table -->
      <div v-else class="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-border text-text-muted uppercase text-xs tracking-wide">
            <tr>
              <th class="px-5 py-3 text-left">Date</th>
              <th class="px-5 py-3 text-left">Category</th>
              <th class="px-5 py-3 text-left">Project</th>
              <th class="px-5 py-3 text-right">Amount</th>
              <th class="px-5 py-3 text-center">Status</th>
              <th class="px-5 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="exp in expenses" :key="exp.expense_id" class="hover:bg-gray-50 transition">
              <td class="px-5 py-3 text-text-main">{{ formatDate(exp.created_at) }}</td>
              <td class="px-5 py-3 text-text-main">{{ exp.category }}</td>
              <td class="px-5 py-3 text-text-muted">{{ exp.project_id }}</td>
              <td class="px-5 py-3 text-right font-medium text-text-main">${{ parseFloat(exp.amount).toFixed(2) }}</td>
              <td class="px-5 py-3 text-center">
                <span :class="statusClass(exp.status)" class="px-2 py-1 rounded-full text-xs font-medium capitalize">
                  {{ exp.status.replace('_',' ') }}
                </span>
              </td>
              <td class="px-5 py-3 text-center">
                <router-link :to="`/expenses/${exp.expense_id}`" class="text-primary hover:underline text-xs">View</router-link>
                <span v-if="exp.status === 'pending'" class="mx-2 text-border">|</span>
                <button v-if="exp.status === 'pending'" @click="deleteExpense(exp.expense_id)" class="text-ember hover:underline text-xs">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="flex justify-between items-center px-5 py-3 border-t border-border text-sm text-text-muted">
          <span>Showing {{ expenses.length }} of {{ total }}</span>
          <div class="flex gap-2">
            <button @click="changePage(page - 1)" :disabled="page <= 1" class="px-3 py-1 rounded border border-border disabled:opacity-40 hover:bg-gray-50">Prev</button>
            <button @click="changePage(page + 1)" :disabled="expenses.length < limit" class="px-3 py-1 rounded border border-border disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useExpenseStore } from '../stores/expenses';

const store   = useExpenseStore();
const expenses = ref([]);
const total   = ref(0);
const page    = ref(1);
const limit   = ref(20);
const loading = ref(true);

const fetchExpenses = async () => {
  loading.value = true;
  try {
    const res = await store.fetchMyExpenses(page.value, limit.value);
    expenses.value = res.data;
    total.value    = res.total;
  } finally { loading.value = false; }
};

onMounted(fetchExpenses);

const changePage = (p) => { page.value = p; fetchExpenses(); };

const deleteExpense = async (id) => {
  if (!confirm('Delete this expense? This cannot be undone.')) return;
  await store.deleteExpense(id);
  fetchExpenses();
};

const formatDate = (d) => new Date(d).toLocaleDateString('en-MY', { day:'2-digit', month:'short', year:'numeric' });

const statusClass = (s) => ({
  pending:       'bg-yellow-100 text-yellow-700',
  dept_approved: 'bg-blue-100 text-blue-700',
  approved:      'bg-green-100 text-green-700',
  rejected:      'bg-red-100 text-red-700'
}[s] || 'bg-gray-100 text-gray-600');
</script>
