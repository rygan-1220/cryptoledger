<template>
  <div class="min-h-screen bg-background p-8">
    <div class="max-w-5xl mx-auto">
      <h1 class="text-3xl font-display font-bold text-text-main mb-6">Department Expenses</h1>

      <!-- Filters -->
      <div class="bg-surface border border-border rounded p-4 mb-6 flex gap-4 flex-wrap items-start">
        <div class="w-48">
          <p class="text-xs text-text-muted mb-1">Status</p>
          <FilterDropdown
            v-model="filters.status"
            :options="statusOptions"
            placeholder="All Statuses"
            @change="fetch"
          />
        </div>
        <div>
          <p class="text-xs text-text-muted mb-1">&nbsp;</p>
          <label class="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" v-model="filters.include_deleted" @change="fetch" class="rounded border-gray-300 text-primary focus:ring-primary/30" />
            <span class="text-text-muted">Include deleted</span>
          </label>
        </div>
      </div>

      <div v-if="loading" class="text-text-muted text-center py-16">Loading…</div>
      <div v-else-if="!expenses.length" class="bg-surface border border-border rounded p-16 text-center">
        <p class="text-text-muted">No department expenses found.</p>
      </div>
      <div v-else class="bg-surface border border-border rounded overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-border text-text-muted uppercase text-xs tracking-wide">
            <tr>
              <th class="px-5 py-3 text-left">Date</th>
              <th class="px-5 py-3 text-left">Employee</th>
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
              <td class="px-5 py-3 text-text-muted">{{ exp.employee_name }}</td>
              <td class="px-5 py-3">{{ exp.category }}</td>
              <td class="px-5 py-3 text-text-muted">{{ exp.project_id }}</td>
              <td class="px-5 py-3 text-right font-medium">${{ parseFloat(exp.amount).toFixed(2) }}</td>
              <td class="px-5 py-3 text-center">
                <span v-if="exp.deleted" class="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-500 line-through">Deleted</span>
                <span v-else :class="statusClass(exp.status)" class="px-2 py-1 rounded-full text-xs font-medium capitalize">{{ exp.status.replace('_',' ') }}</span>
              </td>
              <td class="px-5 py-3 text-center flex gap-2 justify-center">
                <router-link :to="`/expenses/${exp.expense_id}`" class="text-primary hover:underline text-xs">View</router-link>
                <template v-if="!exp.deleted && canApprove(exp)">
                  <button @click="handleStatus(exp.expense_id, 'approved')" class="text-green-600 hover:underline text-xs">Approve</button>
                  <button @click="handleStatus(exp.expense_id, 'rejected')" class="text-ember hover:underline text-xs">Reject</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="flex justify-between items-center px-5 py-3 border-t border-border text-sm text-text-muted">
          <span>Showing {{ expenses.length }} of {{ total }}</span>
          <div class="flex gap-2">
            <button @click="changePage(page-1)" :disabled="page<=1" class="px-3 py-1 rounded border border-border disabled:opacity-40 hover:bg-gray-50">Prev</button>
            <button @click="changePage(page+1)" :disabled="expenses.length < limit" class="px-3 py-1 rounded border border-border disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        </div>
      </div>

      <!-- Payout Overlay -->
      <PayoutOverlay
        :visible="payoutVisible"
        :expense-id="payoutExpenseId"
        :amount="payoutAmount"
        :employee-name="payoutEmployeeName"
        @close="payoutVisible = false"
        @cancelled="onPayoutCancelled"
      />

      <!-- Action Confirmation Dialog -->
      <ActionDialog
        :visible="dialogVisible"
        :mode="dialogMode"
        :title="dialogMode === 'reject' ? 'Reject Expense' : 'Approve Expense'"
        :message="dialogMode === 'reject' ? 'Please provide a reason for rejecting this expense.' : 'Are you sure you want to approve this expense?'"
        :confirm-label="dialogMode === 'reject' ? 'Reject' : 'Approve'"
        :loading="approving"
        @confirm="onDialogConfirm"
        @cancel="dialogVisible = false"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useExpenseStore } from '../stores/expenses';
import PayoutOverlay from '../components/PayoutOverlay.vue';
import ActionDialog from '../components/ActionDialog.vue';
import FilterDropdown from '../components/FilterDropdown.vue';

const authStore = useAuthStore();
const store    = useExpenseStore();

// Payout overlay state
const payoutVisible = ref(false);
const payoutExpenseId = ref('');
const payoutAmount = ref(0);
const payoutEmployeeName = ref('');

// Action dialog state
const dialogVisible = ref(false);
const dialogMode = ref('confirm');
const pendingExpenseId = ref(null);
const approving = ref(false);

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

const expenses = ref([]);
const total    = ref(0);
const page     = ref(1);
const limit    = ref(20);
const loading  = ref(true);

const fetch = async () => {
  loading.value = true;
  try {
    const params = {
      status: filters.status.length ? filters.status.join(',') : '',
      include_deleted: filters.include_deleted ? 'true' : '',
    };
    const res = await store.fetchDeptExpenses(page.value, limit.value, params);
    expenses.value = res.data;
    total.value    = res.total;
  } finally { loading.value = false; }
};

onMounted(fetch);
const changePage = (p) => { page.value = p; fetch(); };

const canApprove = (exp) => {
  if (exp.deleted) return false;
  const role = authStore.user?.role;
  if (role === 'dept_manager') return exp.status === 'pending';
  if (role === 'finance_manager') return ['dept_approved', 'payout_failed'].includes(exp.status);
  return false;
};

const handleStatus = (id, status) => {
  pendingExpenseId.value = id;
  dialogMode.value = status === 'rejected' ? 'reject' : 'confirm';
  dialogVisible.value = true;
};

const onDialogConfirm = async (reason) => {
  dialogVisible.value = false;
  const id = pendingExpenseId.value;
  const status = dialogMode.value === 'reject' ? 'rejected' : 'approved';
  approving.value = true;
  try {
    const res = await store.updateStatus(id, status, reason || null);
    if (res.newStatus === 'finance_approved') {
      const exp = expenses.value.find(e => e.expense_id === id);
      if (exp) {
        payoutExpenseId.value = id;
        payoutAmount.value = parseFloat(exp.amount);
        payoutEmployeeName.value = exp.employee_name || 'Employee';
        payoutVisible.value = true;
      }
    }
    fetch();
  } catch (e) {
    alert(e);
  } finally {
    approving.value = false;
  }
};

const onPayoutCancelled = () => {
  payoutVisible.value = false;
  fetch();
};

const formatDate  = (d) => new Date(d).toLocaleDateString('en-MY', { day:'2-digit', month:'short', year:'numeric' });
const statusClass = (s) => ({
  pending:          'bg-yellow-100 text-yellow-700',
  dept_approved:    'bg-blue-100 text-blue-700',
  finance_approved: 'bg-indigo-100 text-indigo-700',
  paid:             'bg-green-100 text-green-700',
  payout_failed:    'bg-orange-100 text-orange-700',
  rejected:         'bg-red-100 text-red-700'
}[s] || '');
</script>
