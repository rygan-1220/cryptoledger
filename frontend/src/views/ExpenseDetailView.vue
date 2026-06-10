<template>
  <div class="min-h-screen bg-background p-8">
    <div class="max-w-3xl mx-auto">
      <div class="flex items-center gap-3 mb-6">
        <button @click="$router.back()" class="text-text-muted hover:text-text-main">← Back</button>
        <h1 class="text-2xl font-display font-bold text-text-main">Expense Detail</h1>
      </div>

      <div v-if="loading" class="text-text-muted text-center py-16">Loading…</div>
      <div v-else-if="error" class="text-ember text-center py-16">{{ error }}</div>

      <div v-else-if="expense" class="space-y-4">
        <!-- ═══ UNIFIED CARD ═══ -->
        <div class="bg-surface border border-border rounded shadow-sm overflow-hidden">

          <!-- ── Section 1: Status + Info ── -->
          <div class="p-5 sm:p-6">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <span v-if="expense.deleted" class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gray-200 text-gray-500 line-through mb-1">Deleted</span>
                <span v-else :class="statusClass(expense.status)" class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide mb-1">
                  {{ expense.status.replace('_',' ') }}
                </span>
                <p class="text-3xl font-bold text-text-main">${{ parseFloat(expense.amount).toFixed(2) }}</p>
              </div>
              <p class="font-mono text-[10px] text-text-muted text-right shrink-0 select-all leading-relaxed">{{ expense.expense_id }}</p>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 mt-5">
              <div>
                <p class="text-[10px] font-bold text-text-muted uppercase tracking-wide">Employee</p>
                <p class="text-sm text-text-main mt-0.5">{{ expense.employee_name || expense.user_id }}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold text-text-muted uppercase tracking-wide">Department</p>
                <p class="text-sm text-text-main mt-0.5">{{ expense.dept_name || expense.dept_id }}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold text-text-muted uppercase tracking-wide">Category</p>
                <p class="text-sm text-text-main mt-0.5">{{ expense.category }}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold text-text-muted uppercase tracking-wide">Project</p>
                <p class="text-sm text-text-main mt-0.5">{{ expense.project_id }}</p>
              </div>
            </div>

            <p class="text-[10px] text-text-muted mt-3">Submitted {{ formatDate(expense.created_at) }}</p>

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

          <hr class="border-border">

          <!-- ── Section 2: Approval Progress ── -->
          <div class="p-5 sm:p-6">
            <h4 class="text-[10px] font-bold text-text-muted uppercase tracking-wide mb-5">Progress</h4>

            <div class="relative flex justify-between items-start max-w-xl mx-auto">
              <div class="absolute top-3.5 left-0 w-full h-px bg-gray-200"></div>

              <!-- Step 1: Submitted (always done) -->
              <div class="relative z-10 flex flex-col items-center text-center" style="width:60px">
                <div class="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">✓</div>
                <p class="text-[10px] font-bold text-text-main mt-1.5 leading-tight">Submitted</p>
                <p class="text-[9px] text-text-muted leading-tight">{{ formatDate(expense.created_at) }}</p>
              </div>

              <!-- Step 2: Dept -->
              <div class="relative z-10 flex flex-col items-center text-center" style="width:60px">
                <div :class="[
                  'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors',
                  deptPassed ? 'bg-primary text-white' :
                  deptRejected ? 'bg-ember text-white' : 'bg-white border border-gray-300 text-text-muted'
                ]">
                  <span v-if="deptPassed">✓</span>
                  <span v-else-if="deptRejected">!</span>
                  <span v-else>2</span>
                </div>
                <p :class="['text-[10px] font-bold mt-1.5 leading-tight', deptPassed ? 'text-text-main' : 'text-text-muted']">Dept</p>
                <p v-if="deptRejected" class="text-[9px] text-ember font-bold uppercase leading-tight">Rejected</p>
                <p v-else-if="deptPassed" class="text-[9px] text-primary uppercase leading-tight">Approved</p>
              </div>

              <!-- Step 3: Finance -->
              <div class="relative z-10 flex flex-col items-center text-center" style="width:60px">
                <div :class="[
                  'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors',
                  financePassed ? 'bg-primary text-white' :
                  financeRejected ? 'bg-ember text-white' : 'bg-white border border-gray-300 text-text-muted'
                ]">
                  <span v-if="financePassed">✓</span>
                  <span v-else-if="financeRejected">!</span>
                  <span v-else>3</span>
                </div>
                <p :class="['text-[10px] font-bold mt-1.5 leading-tight', financePassed ? 'text-text-main' : 'text-text-muted']">Finance</p>
                <p v-if="financeRejected" class="text-[9px] text-ember font-bold uppercase leading-tight">Rejected</p>
                <p v-else-if="financePassed" class="text-[9px] text-primary uppercase leading-tight">Approved</p>
              </div>

              <!-- Step 4: Payout -->
              <div class="relative z-10 flex flex-col items-center text-center" style="width:60px">
                <div :class="[
                  'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors',
                  payoutDone ? 'bg-green-500 text-white' :
                  payoutFailed ? 'bg-orange-500 text-white' :
                  financePassed ? 'bg-white border border-primary text-primary' : 'bg-white border border-gray-300 text-text-muted'
                ]">
                  <span v-if="payoutDone">✓</span>
                  <span v-else-if="payoutFailed">!</span>
                  <svg v-else-if="financePassed" class="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <span v-else>4</span>
                </div>
                <p :class="['text-[10px] font-bold mt-1.5 leading-tight', payoutDone ? 'text-green-600' : payoutFailed ? 'text-orange-600' : 'text-text-muted']">Payout</p>
                <p v-if="payoutDone" class="text-[9px] text-green-600 uppercase leading-tight">Paid</p>
                <p v-else-if="payoutFailed" class="text-[9px] text-orange-600 font-bold uppercase leading-tight">Failed</p>
                <p v-else-if="financePassed" class="text-[9px] text-primary/60 uppercase leading-tight">Pending</p>
              </div>
            </div>

            <!-- Alerts: Payout Failed / Rejected -->
            <div v-if="isPayoutFailed" class="mt-5 p-3 bg-orange-50 border border-orange-200 rounded text-sm">
              <p class="font-bold text-orange-700 inline">Payout Failed</p>
              <p class="text-orange-600 inline"> — "{{ expense.rejection_reason }}"</p>
              <p class="text-xs text-orange-500 mt-1">Finance approved but automatic payout could not be completed. Fix the issue and ask Finance to re-approve.</p>
            </div>
            <div v-if="expense.status === 'rejected'" class="mt-5 p-3 bg-red-50 border border-red-100 rounded text-sm">
              <p class="font-bold text-ember inline">Rejected</p>
              <p class="text-red-700 inline"> — "{{ expense.rejection_reason }}"</p>
            </div>
          </div>

          <hr class="border-border">

          <!-- ── Section 3: Sensitive Details (collapsible) ── -->
          <div class="p-5 sm:p-6">
            <button @click="detailsOpen = !detailsOpen" class="w-full flex items-center justify-between group">
              <div class="flex items-center gap-2.5">
                <h4 class="text-[10px] font-bold text-text-muted uppercase tracking-wide">Details</h4>
                <span v-if="!decrypted" class="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">Encrypted</span>
                <span v-else class="text-[9px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-medium">Unlocked</span>
              </div>
              <svg class="w-4 h-4 text-text-muted transition-transform duration-200" :class="detailsOpen ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>

            <div v-if="detailsOpen" class="mt-4">

              <!-- State 1: Privileged cross-dept without access -->
              <div v-if="isPrivileged && !decrypted" class="bg-amber-50 border border-amber-200 rounded p-5 text-center">
                <p class="text-sm font-bold text-amber-800 mb-1">Access Required</p>
                <p class="text-xs text-amber-700 mb-4">This expense belongs to a different department. Request access to view the vendor, description, and receipt.</p>
                <button @click="requestSession" :disabled="sessionLoading" class="bg-amber-600 text-white px-5 py-2.5 rounded text-sm font-bold hover:bg-amber-700 transition disabled:opacity-50">
                  {{ sessionLoading ? 'Requesting Access…' : 'Request Access' }}
                </button>
                <p class="text-[10px] text-amber-600 mt-3">Accessing these details will be recorded in the audit log.</p>
                <p v-if="sessionError" class="text-ember text-sm mt-3">{{ sessionError }}</p>
              </div>

              <!-- State 2: Same-dept / access granted — not yet decrypted -->
              <template v-else>
                <div v-if="!decrypted && !decryptError" class="text-center py-4">
                  <p class="text-sm text-text-muted mb-4">The vendor name, description, and receipt are encrypted. Click below to unlock them on your device.</p>
                  <button @click="decryptData" :disabled="decrypting" class="bg-primary text-white px-5 py-2.5 rounded text-sm font-bold hover:bg-primary-hover transition disabled:opacity-50">
                    {{ decrypting ? 'Unlocking…' : 'View Details' }}
                  </button>
                  <p class="text-[10px] text-text-muted mt-3">Details are unlocked on your device. Viewing will be recorded in the audit log.</p>
                </div>

                <div v-if="decryptError" class="bg-red-50 border border-red-200 rounded p-4 text-center">
                  <p class="text-sm text-ember font-medium">{{ decryptError }}</p>
                </div>

                <!-- State 3: Decrypted -->
                <div v-if="decrypted" class="space-y-4">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="bg-gray-50 rounded p-3">
                      <p class="text-[10px] font-bold text-text-muted uppercase mb-0.5">Vendor</p>
                      <p class="text-text-main font-medium">{{ decrypted.vendor_name }}</p>
                    </div>
                    <div class="bg-gray-50 rounded p-3 sm:col-span-2">
                      <p class="text-[10px] font-bold text-text-muted uppercase mb-0.5">Description</p>
                      <p class="text-text-main">{{ decrypted.description }}</p>
                    </div>
                  </div>

                  <div v-if="receiptUrl" class="bg-gray-50 rounded p-3">
                    <p class="text-[10px] font-bold text-text-muted uppercase mb-2">Receipt</p>
                    <div v-if="expense.file_mime_type?.startsWith('image/')">
                      <img :src="receiptUrl" class="max-h-64 rounded border border-border" alt="Receipt" />
                    </div>
                    <a v-else :href="receiptUrl" :download="`receipt.${fileExtension}`" class="text-primary hover:underline text-sm font-medium">
                      Download ({{ expense.file_mime_type }})
                    </a>
                  </div>

                  <div class="flex items-center gap-2 text-[10px] text-text-muted pt-2 border-t border-border">
                    <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                    Unlocked on your device &bull; Access recorded in audit log
                  </div>
                </div>
              </template>
            </div>
          </div>

        </div><!-- /unified card -->
      </div>
    </div>

    <!-- Payout Overlay -->
    <PayoutOverlay
      :visible="payoutVisible"
      :expense-id="payoutExpenseId"
      :amount="payoutAmount"
      :employee-name="payoutEmployeeName"
      @close="onPayoutClose"
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

// Collapsible details section
const detailsOpen = ref(false);
const isOwner = computed(() => expense.value?.user_id === authStore.user?.user_id);

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
  if (!exp || exp.deleted) return false;
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

const onPayoutClose = () => {
  payoutVisible.value = false;
  loadExpense();
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
    detailsOpen.value = isOwner.value;
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

    // Log VIEW_PLAINTEXT after actual plaintext access (fire-and-forget)
    api.post(`/expenses/${route.params.id}/log-plaintext-view`).catch(() => {});
    detailsOpen.value = true;
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
