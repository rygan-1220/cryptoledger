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

      <!-- Filters -->
      <div class="bg-surface border border-border rounded-xl p-4 mb-6 flex gap-4 flex-wrap items-start">
        <div class="w-48">
          <p class="text-xs text-text-muted mb-1">Status</p>
          <FilterDropdown
            v-model="filters.status"
            :options="statusOptions"
            placeholder="All Statuses"
            @change="fetchExpenses"
          />
        </div>
        <div>
          <p class="text-xs text-text-muted mb-1">&nbsp;</p>
          <label class="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" v-model="filters.include_deleted" @change="fetchExpenses" class="rounded border-gray-300 text-primary focus:ring-primary/30" />
            <span class="text-text-muted">Include deleted</span>
          </label>
        </div>
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
                <span v-if="exp.deleted" class="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-500 line-through">Deleted</span>
                <span v-else :class="statusClass(exp.status)" class="px-2 py-1 rounded-full text-xs font-medium capitalize">{{ exp.status.replace('_',' ') }}</span>
              </td>
              <td class="px-5 py-3 text-center">
                <router-link :to="`/expenses/${exp.expense_id}`" class="text-primary hover:underline text-xs">View</router-link>
                <template v-if="!exp.deleted && exp.status === 'pending'">
                  <span class="mx-2 text-border">|</span>
                  <button @click="deleteExpense(exp.expense_id)" class="text-ember hover:underline text-xs">Delete</button>
                </template>
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

    <!-- Delete Confirmation Dialog -->
    <ActionDialog
      :visible="deleteDialogVisible"
      mode="confirm"
      title="Delete Expense"
      message="Delete this expense? This cannot be undone."
      confirm-label="Delete"
      :loading="deleting"
      @confirm="onDeleteConfirm"
      @cancel="deleteDialogVisible = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useExpenseStore } from '../stores/expenses';
import ActionDialog from '../components/ActionDialog.vue';
import FilterDropdown from '../components/FilterDropdown.vue';

const store   = useExpenseStore();
const expenses = ref([]);
const total   = ref(0);
const page    = ref(1);
const limit   = ref(20);
const loading = ref(true);

// Filters
const filters = reactive({ status: [], include_deleted: false });
const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'dept_approved', label: 'Dept Approved' },
  { value: 'finance_approved', label: 'Finance Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'payout_failed', label: 'Payout Failed' },
  { value: 'rejected', label: 'Rejected' },
];

// Delete dialog
const deleteDialogVisible = ref(false);
const deleteTargetId = ref(null);
const deleting = ref(false);

const fetchExpenses = async () => {
  loading.value = true;
  try {
    const params = {
      status: filters.status.length ? filters.status.join(',') : '',
      include_deleted: filters.include_deleted ? 'true' : '',
    };
    const res = await store.fetchMyExpenses(page.value, limit.value, params);
    expenses.value = res.data;
    total.value    = res.total;
  } finally { loading.value = false; }
};

onMounted(fetchExpenses);

const changePage = (p) => { page.value = p; fetchExpenses(); };

const deleteExpense = (id) => {
  deleteTargetId.value = id;
  deleteDialogVisible.value = true;
};

const onDeleteConfirm = async () => {
  deleteDialogVisible.value = false;
  deleting.value = true;
  try {
    await store.deleteExpense(deleteTargetId.value);
    fetchExpenses();
  } catch (e) {
    alert(e);
  } finally {
    deleting.value = false;
  }
};

const formatDate = (d) => new Date(d).toLocaleDateString('en-MY', { day:'2-digit', month:'short', year:'numeric' });

const statusClass = (s) => ({
  pending:          'bg-yellow-100 text-yellow-700',
  dept_approved:    'bg-blue-100 text-blue-700',
  finance_approved: 'bg-indigo-100 text-indigo-700',
  paid:             'bg-green-100 text-green-700',
  payout_failed:    'bg-orange-100 text-orange-700',
  rejected:         'bg-red-100 text-red-700'
}[s] || 'bg-gray-100 text-gray-600');
</script>
