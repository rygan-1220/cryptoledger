<template>
  <div class="min-h-screen bg-background p-8">
    <div class="max-w-3xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <button @click="$router.back()" class="text-text-muted hover:text-text-main">← Back</button>
        <h1 class="text-2xl font-display font-bold text-text-main">Expense Detail</h1>
      </div>

      <div v-if="loading" class="text-text-muted text-center py-16">Loading…</div>
      <div v-else-if="error" class="text-ember text-center py-16">{{ error }}</div>

      <div v-else-if="expense" class="space-y-5">
        <!-- Status + meta -->
        <div class="bg-surface border border-border rounded-xl p-6">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-text-muted text-sm mb-1">Expense ID</p>
              <p class="font-mono text-xs text-text-muted">{{ expense.expense_id }}</p>
            </div>
            <span :class="statusClass(expense.status)" class="px-3 py-1 rounded-full text-sm font-medium uppercase tracking-tight">
              {{ expense.status.replace('_',' ') }}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-4 mt-4">
            <div><p class="text-text-muted text-xs">Amount</p><p class="font-bold text-2xl text-text-main">${{ parseFloat(expense.amount).toFixed(2) }}</p></div>
            <div><p class="text-text-muted text-xs">Category</p><p class="text-text-main font-medium">{{ expense.category }}</p></div>
            <div><p class="text-text-muted text-xs">Project</p><p class="text-text-main">{{ expense.project_id }}</p></div>
            <div><p class="text-text-muted text-xs">Submitted</p><p class="text-text-main">{{ formatDate(expense.created_at) }}</p></div>
            <div><p class="text-text-muted text-xs">Employee</p><p class="text-text-main">{{ expense.employee_name || expense.user_id }}</p></div>
            <div><p class="text-text-muted text-xs">Department</p><p class="text-text-main">{{ expense.dept_name || expense.dept_id }}</p></div>
          </div>

          <!-- Approve / Reject -->
          <template v-if="canApprove">
            <div class="mt-5 pt-4 border-t border-border flex justify-end gap-3">
              <button @click="handleStatus('rejected')" :disabled="approving" class="border border-gray-300 text-text-muted px-4 py-2 rounded text-sm font-medium hover:border-ember hover:text-ember transition disabled:opacity-50">
                {{ approving ? '...' : 'Reject' }}
              </button>
              <button @click="handleStatus('approved')" :disabled="approving" class="bg-primary text-white px-4 py-2 rounded hover:bg-primary-hover transition disabled:opacity-50 text-sm font-medium">
                {{ approving ? '...' : 'Approve' }}
              </button>
            </div>
          </template>
        </div>

        <!-- Progress Stepper -->
        <div class="bg-surface border border-border rounded-xl p-6">
          <h3 class="text-sm font-bold text-text-main mb-6 uppercase tracking-widest">Approval Progress</h3>
          <div class="relative flex justify-between items-start max-w-2xl mx-auto">
            <!-- Background line -->
            <div class="absolute top-5 left-0 w-full h-0.5 bg-gray-100 -z-0"></div>

            <!-- Step 1: Submission -->
            <div class="relative z-10 flex flex-col items-center text-center w-24">
              <div class="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold mb-2 shadow-lg shadow-primary/20">✓</div>
              <p class="text-xs font-bold text-text-main">Submitted</p>
              <p class="text-[10px] text-text-muted mt-1">{{ formatDate(expense.created_at) }}</p>
            </div>

            <!-- Step 2: Dept Manager -->
            <div class="relative z-10 flex flex-col items-center text-center w-24">
              <div :class="[
                'w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 transition-all duration-500 border-2',
                deptPassed ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' :
                deptRejected ? 'bg-ember border-ember text-white' : 'bg-white border-gray-200 text-text-muted'
              ]">
                <span v-if="deptPassed">✓</span>
                <span v-else-if="deptRejected">!</span>
                <span v-else>2</span>
              </div>
              <p :class="['text-xs font-bold', deptPassed ? 'text-text-main' : 'text-text-muted']">Dept Review</p>
              <p v-if="deptRejected" class="text-[10px] text-ember mt-1 font-bold italic uppercase tracking-tighter">Rejected</p>
              <p v-else-if="deptPassed" class="text-[10px] text-primary mt-1 font-medium uppercase tracking-tighter">Approved</p>
            </div>

            <!-- Step 3: Finance Manager -->
            <div class="relative z-10 flex flex-col items-center text-center w-24">
              <div :class="[
                'w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 transition-all duration-500 border-2',
                financePassed ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' :
                financeRejected ? 'bg-ember border-ember text-white' : 'bg-white border-gray-200 text-text-muted'
              ]">
                <span v-if="financePassed">✓</span>
                <span v-else-if="financeRejected">!</span>
                <span v-else>3</span>
              </div>
              <p :class="['text-xs font-bold', financePassed ? 'text-text-main' : 'text-text-muted']">Finance Review</p>
              <p v-if="financeRejected" class="text-[10px] text-ember mt-1 font-bold italic uppercase tracking-tighter">Rejected</p>
              <p v-else-if="financePassed" class="text-[10px] text-primary mt-1 font-medium uppercase tracking-tighter">Approved</p>
            </div>

            <!-- Step 4: Payout -->
            <div class="relative z-10 flex flex-col items-center text-center w-24">
              <div :class="[
                'w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 transition-all duration-500 border-2',
                payoutDone ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20' :
                payoutFailed ? 'bg-orange-500 border-orange-500 text-white' :
                financePassed ? 'bg-white border-primary text-primary' : 'bg-white border-gray-200 text-text-muted'
              ]">
                <span v-if="payoutDone">✓</span>
                <span v-else-if="payoutFailed">!</span>
                <!-- spinning indicator when payout is in progress (finance_approved but not yet paid/failed) -->
                <svg v-else-if="financePassed" class="w-5 h-5 animate-spin text-primary" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                <span v-else>4</span>
              </div>
              <p :class="['text-xs font-bold', payoutDone ? 'text-green-600' : payoutFailed ? 'text-orange-600' : 'text-text-muted']">Payout</p>
              <p v-if="payoutDone" class="text-[10px] text-green-600 mt-1 font-medium uppercase tracking-tighter">Paid Out</p>
              <p v-else-if="payoutFailed" class="text-[10px] text-orange-600 mt-1 font-bold uppercase tracking-tighter">Failed</p>
              <p v-else-if="financePassed" class="text-[10px] text-primary/60 mt-1 font-medium uppercase tracking-tighter animate-pulse">Processing...</p>
            </div>
          </div>

          <!-- Payout Failed Detail Box -->
          <div v-if="isPayoutFailed" class="mt-8 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div class="flex items-start gap-3">
              <div class="p-1 bg-orange-500 text-white rounded mt-0.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01"/></svg>
              </div>
              <div>
                <p class="text-sm font-bold text-orange-700">Payout Failed</p>
                <p class="text-sm text-orange-600 mt-1 italic">"{{ expense.rejection_reason }}"</p>
                <p class="text-xs text-orange-500 mt-1">Finance approved but automatic payout could not be completed. Fix the issue and ask Finance Manager to re-approve.</p>
              </div>
            </div>
          </div>

          <!-- Rejection Detail Box -->
          <div v-if="expense.status === 'rejected'" class="mt-8 p-4 bg-red-50 border border-red-100 rounded-lg">
            <div class="flex items-start gap-3">
              <div class="p-1 bg-ember text-white rounded mt-0.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <div>
                <p class="text-sm font-bold text-ember">Rejection Reason</p>
                <p class="text-sm text-red-700 mt-1 italic">"{{ expense.rejection_reason }}"</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Layer 1 decrypted data -->
        <div class="bg-blue-50 border border-blue-100 rounded-xl p-6">
          <h3 class="font-bold text-blue-800 mb-3 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
            Encrypted Details (Layer 1)
          </h3>

          <!-- Privileged user without K_session: show only request button, not decrypt -->
          <div v-if="isPrivileged && !decrypted">
            <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p class="text-sm text-amber-800 mb-2 font-medium">Privileged Access — K_session Required</p>
              <p class="text-xs text-amber-700 mb-3">You need a temporary session key to decrypt this expense's details.</p>
              <button @click="requestSession" :disabled="sessionLoading" class="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700 transition text-sm disabled:opacity-50">
                {{ sessionLoading ? 'Requesting…' : 'Request K_session' }}
              </button>
              <p v-if="sessionError" class="text-ember text-sm mt-2">{{ sessionError }}</p>
            </div>
          </div>

          <!-- Regular user (or privileged after K_session obtained): show decrypt -->
          <template v-else>
            <div v-if="!decrypted && !decryptError">
              <button @click="decryptData" :disabled="decrypting" class="bg-primary text-white px-4 py-2 rounded hover:bg-primary-hover transition disabled:opacity-50 text-sm">
                {{ decrypting ? 'Decrypting…' : 'Decrypt & View Details' }}
              </button>
              <p class="text-xs text-blue-600 mt-2">Uses your local K_real key — no data leaves your device.</p>
            </div>

            <div v-if="decryptError" class="text-ember text-sm">{{ decryptError }}</div>

            <div v-if="decrypted" class="space-y-3">
              <div><p class="text-xs text-blue-600 font-medium uppercase">Vendor Name</p><p class="text-text-main">{{ decrypted.vendor_name }}</p></div>
              <div><p class="text-xs text-blue-600 font-medium uppercase">Description</p><p class="text-text-main">{{ decrypted.description }}</p></div>

              <!-- Receipt -->
              <div v-if="receiptUrl">
                <p class="text-xs text-blue-600 font-medium uppercase mb-1">Receipt</p>
                <div v-if="expense.file_mime_type?.startsWith('image/')">
                  <img :src="receiptUrl" class="max-h-64 rounded border border-blue-200" alt="Receipt" />
                </div>
                <a v-else :href="receiptUrl" :download="`receipt.${fileExtension}`" class="text-primary hover:underline text-sm">
                  Download Receipt ({{ expense.file_mime_type }})
                </a>
              </div>
            </div>
          </template>
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
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useExpenseStore } from '../stores/expenses';
import api from '../services/api';
import PayoutOverlay from '../components/PayoutOverlay.vue';
import ActionDialog from '../components/ActionDialog.vue';

const route     = useRoute();
const authStore = useAuthStore();
const store     = useExpenseStore();

const expense     = ref(null);
const loading     = ref(true);
const error       = ref('');
const decrypted   = ref(null);
const decryptError= ref('');
const decrypting  = ref(false);
const receiptUrl  = ref(null);

// Approve / Reject
const approving = ref(false);
const dialogVisible = ref(false);
const dialogMode = ref('confirm'); // 'confirm' | 'reject'

// K_session
const sessionLoading = ref(false);
const sessionError   = ref('');

// Payout overlay
const payoutVisible = ref(false);
const payoutExpenseId = ref('');
const payoutAmount = ref(0);
const payoutEmployeeName = ref('');

let layer1Raw = null;   // { iv, authTag, ciphertext } from server
let encReceipt= null;   // { iv, authTag, ciphertext, mime_type } from server

const isPrivileged = computed(() =>
  ['finance_manager','admin','ceo'].includes(authStore.user?.role)
);

// ─── Approve / Reject logic (same as AllExpensesView) ──────────────────────
const canApprove = computed(() => {
  const exp = expense.value;
  if (!exp) return false;
  const role = authStore.user?.role;
  if (role === 'dept_manager') return exp.status === 'pending';
  if (role === 'finance_manager') return ['dept_approved', 'payout_failed'].includes(exp.status);
  return false;
});

const handleStatus = (status) => {
  dialogMode.value = status === 'rejected' ? 'reject' : 'confirm';
  dialogVisible.value = true;
};

const onDialogConfirm = async (reason) => {
  dialogVisible.value = false;
  const status = dialogMode.value === 'reject' ? 'rejected' : 'approved';
  approving.value = true;
  try {
    const res = await store.updateStatus(route.params.id, status, reason || null);
    await loadExpense();
    if (res.newStatus === 'finance_approved') {
      payoutExpenseId.value = route.params.id;
      payoutAmount.value = parseFloat(expense.value.amount);
      payoutEmployeeName.value = expense.value.employee_name || 'Employee';
      payoutVisible.value = true;
    }
  } catch (e) {
    alert(e);
  } finally {
    approving.value = false;
  }
};

const onPayoutCancelled = () => {
  payoutVisible.value = false;
  loadExpense();
};

// ─── Stepper helpers ───────────────────────────────────────────────────────
const deptPassed = computed(() =>
  ['dept_approved','finance_approved','paid','payout_failed'].includes(expense.value?.status) ||
  (expense.value?.status === 'rejected' && expense.value?.rejected_by_role !== 'dept_manager')
);
const deptRejected = computed(() =>
  expense.value?.status === 'rejected' && expense.value?.rejected_by_role === 'dept_manager'
);
const financePassed = computed(() =>
  ['finance_approved','paid','payout_failed'].includes(expense.value?.status)
);
const financeRejected = computed(() =>
  expense.value?.status === 'rejected' && expense.value?.rejected_by_role !== 'dept_manager'
);
const isPaid = computed(() => expense.value?.status === 'paid');
const isPayoutFailed = computed(() => expense.value?.status === 'payout_failed');
const payoutDone = computed(() => expense.value?.status === 'paid');
const payoutFailed = computed(() => expense.value?.status === 'payout_failed');

const fileExtension = computed(() => {
  const mime = expense.value?.file_mime_type || '';
  return mime.split('/')[1] || 'bin';
});

// ─── Load expense ──────────────────────────────────────────────────────────
const loadExpense = async () => {
  try {
    const data = await store.fetchExpenseById(route.params.id);
    expense.value    = data.expense;
    layer1Raw        = data.layer1_ciphertext;
    encReceipt       = data.encrypted_receipt;
  } catch (e) {
    error.value = e.message || 'Failed to load expense';
    throw e;
  }
};

onMounted(async () => {
  loading.value = true;
  try {
    await loadExpense();
  } catch (e) { /* error already set */ }
  finally { loading.value = false; }
});

// ─── Decrypt using local K_real (works for own dept) ─────────────────────
const decryptData = async () => {
  decrypting.value  = true;
  decryptError.value = '';
  try {
    const kRealHex = localStorage.getItem('cryptoledger_kreal');
    if (!kRealHex) throw new Error('K_real not found. Please re-login.');

    const { decryptLayer1, decryptReceiptFile } = await import('../services/cryptoService');

    decrypted.value = await decryptLayer1(layer1Raw, kRealHex);

    if (encReceipt) {
      const blob = await decryptReceiptFile(encReceipt, kRealHex);
      receiptUrl.value = URL.createObjectURL(blob);
    }
  } catch (e) {
    decryptError.value = e.message || 'Decryption failed';
  } finally { decrypting.value = false; }
};

// ─── K_session request (privileged roles, cross-dept) ────────────────────
const requestSession = async () => {
  sessionLoading.value = true;
  sessionError.value   = '';
  try {
    const { unwrapKReal, getDevicePublicKey } = await import('../services/cryptoService');
    const devicePubKey = await getDevicePublicKey();
    const res = await api.post('/session-keys/request', {
      target_dept_id: expense.value.dept_id,
      public_key_pem: devicePubKey
    });
    const { wrapped_kreal_for_requester } = res.data;

    // Unwrap K_real using this device's RSA private key
    const kRealHex = await unwrapKReal(wrapped_kreal_for_requester, null);
    // Now decrypt using the unwrapped K_real
    await decryptData();
  } catch (e) {
    sessionError.value = e.message || 'K_session request failed';
  } finally { sessionLoading.value = false; }
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
