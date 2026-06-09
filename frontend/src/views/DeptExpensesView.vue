<template>
  <div class="min-h-screen bg-background p-8">
    <div class="max-w-5xl mx-auto">
      <h1 class="text-3xl font-display font-bold text-text-main mb-6">Department Expenses</h1>

      <div v-if="loading" class="text-text-muted text-center py-16">Loading…</div>
      <div v-else-if="!expenses.length" class="bg-surface border border-border rounded-xl p-16 text-center">
        <p class="text-text-muted">No department expenses found.</p>
      </div>
      <div v-else class="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
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
                <span :class="statusClass(exp.status)" class="px-2 py-1 rounded-full text-xs font-medium capitalize">{{ exp.status }}</span>
              </td>
              <td class="px-5 py-3 text-center flex gap-2 justify-center">
                <router-link :to="`/expenses/${exp.expense_id}`" class="text-primary hover:underline text-xs">View</router-link>
                <template v-if="canApprove(exp)">
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
            <button @click="changePage(page-1)" :disabled="page<=1" class="px-3 py-1 rounded border border-border disabled:opacity-40">Prev</button>
            <button @click="changePage(page+1)" :disabled="expenses.length < limit" class="px-3 py-1 rounded border border-border disabled:opacity-40">Next</button>
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useExpenseStore } from '../stores/expenses';
import PayoutOverlay from '../components/PayoutOverlay.vue';

const authStore = useAuthStore();
const store    = useExpenseStore();

// Payout overlay state
const payoutVisible = ref(false);
const payoutExpenseId = ref('');
const payoutAmount = ref(0);
const payoutEmployeeName = ref('');

const expenses = ref([]);
const total    = ref(0);
const page     = ref(1);
const limit    = ref(20);
const loading  = ref(true);

const fetch = async () => {
  loading.value = true;
  try {
    const res = await store.fetchDeptExpenses(page.value, limit.value);
    expenses.value = res.data;
    total.value    = res.total;
  } finally { loading.value = false; }
};

onMounted(fetch);
const changePage = (p) => { page.value = p; fetch(); };

const canApprove = (exp) => {
  const role = authStore.user?.role;
  // Stage 1: Dept Manager approves pending expenses in their department
  if (role === 'dept_manager') return exp.status === 'pending';
  // Stage 2: Finance Manager approves dept_approved (first) or payout_failed (retry after fix)
  if (role === 'finance_manager') return ['dept_approved', 'payout_failed'].includes(exp.status);
  return false;
};

const handleStatus = async (id, status) => {
  let reason = null;
  if (status === 'rejected') {
    reason = prompt('Please enter a reason for rejection:');
    if (!reason) return;
  } else {
    if (!confirm('Approve this expense?')) return;
  }
  try {
    const res = await store.updateStatus(id, status, reason);
    // If finance manager approved (status → 'finance_approved'), show payout overlay
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
