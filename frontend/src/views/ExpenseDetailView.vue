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
            <span :class="statusClass(expense.status)" class="px-3 py-1 rounded-full text-sm font-medium capitalize">
              {{ expense.status }}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-4 mt-4">
            <div><p class="text-text-muted text-xs">Amount</p><p class="font-bold text-2xl text-text-main">${{ parseFloat(expense.amount).toFixed(2) }}</p></div>
            <div><p class="text-text-muted text-xs">Category</p><p class="text-text-main font-medium">{{ expense.category }}</p></div>
            <div><p class="text-text-muted text-xs">Project</p><p class="text-text-main">{{ expense.project_id }}</p></div>
            <div><p class="text-text-muted text-xs">Submitted</p><p class="text-text-main">{{ formatDate(expense.created_at) }}</p></div>
          </div>
        </div>

        <!-- Layer 1 decrypted data -->
        <div class="bg-blue-50 border border-blue-100 rounded-xl p-6">
          <h3 class="font-bold text-blue-800 mb-3 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
            Encrypted Details (Layer 1)
          </h3>

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
        </div>

        <!-- K_session panel for privileged roles -->
        <div v-if="isPrivileged && !decrypted" class="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 class="font-bold text-amber-800 mb-2">Privileged Access — K_session Required</h3>
          <p class="text-sm text-amber-700 mb-3">You need a temporary session key to decrypt this expense's details.</p>
          <button @click="requestSession" :disabled="sessionLoading" class="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700 transition text-sm disabled:opacity-50">
            {{ sessionLoading ? 'Requesting…' : 'Request K_session' }}
          </button>
          <p v-if="sessionError" class="text-ember text-sm mt-2">{{ sessionError }}</p>
        </div>

        <!-- Audit -->
        <div class="bg-surface border border-border rounded-xl p-6">
          <p class="text-text-muted text-xs font-medium uppercase mb-1">Integrity Hash</p>
          <p class="font-mono text-xs text-text-muted break-all">{{ expense.hash }}</p>
          <p class="text-text-muted text-xs font-medium uppercase mt-3 mb-1">Prev Hash</p>
          <p class="font-mono text-xs text-text-muted break-all">{{ expense.prev_hash }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useExpenseStore } from '../stores/expenses';
import api from '../services/api';

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

// K_session
const sessionLoading = ref(false);
const sessionError   = ref('');

let layer1Raw = null;   // { iv, authTag, ciphertext } from server
let encReceipt= null;   // { iv, authTag, ciphertext, mime_type } from server

const isPrivileged = computed(() =>
  ['finance_manager','admin','ceo'].includes(authStore.user?.role)
);

const fileExtension = computed(() => {
  const mime = expense.value?.file_mime_type || '';
  return mime.split('/')[1] || 'bin';
});

onMounted(async () => {
  try {
    const data = await store.fetchExpenseById(route.params.id);
    expense.value    = data.expense;
    layer1Raw        = data.layer1_ciphertext;
    encReceipt       = data.encrypted_receipt;
  } catch (e) { error.value = e.message || 'Failed to load expense'; }
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
    const res = await api.post('/session-keys/request', { target_dept_id: expense.value.dept_id });
    const { wrapped_kreal_for_requester } = res.data;

    // Unwrap K_real using requester's RSA private key
    const { unwrapKReal } = await import('../services/cryptoService');
    const kRealHex = await unwrapKReal(wrapped_kreal_for_requester, null); // null = use stored key
    // Now decrypt using the unwrapped K_real
    await decryptData();
  } catch (e) {
    sessionError.value = e.message || 'K_session request failed';
  } finally { sessionLoading.value = false; }
};

const formatDate = (d) => new Date(d).toLocaleDateString('en-MY', { day:'2-digit', month:'short', year:'numeric' });
const statusClass = (s) => ({
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700'
}[s] || '');
</script>
