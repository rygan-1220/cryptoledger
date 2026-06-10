<template>
  <div class="min-h-screen bg-background text-text-main p-4 sm:p-8">
    <div class="max-w-5xl mx-auto">

      <!-- Page Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <h1 class="text-3xl font-display font-bold text-text-main">Submit Expense</h1>
          <router-link to="/expenses" class="text-sm text-text-muted hover:text-text-main transition">← Back to My Expenses</router-link>
        </div>
        <p class="text-sm text-text-muted mt-1">Submit a new expense with end-to-end encrypted details and receipt.</p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-5">

        <!-- Desktop: side-by-side 7/5 | Mobile: stacked -->
        <div class="grid grid-cols-1 lg:grid-cols-12 lg:gap-5">

          <!-- ── Left Column: Encrypted Details (7/12) ── -->
          <div class="lg:col-span-7">
            <section class="bg-surface rounded shadow-md border border-border p-5 sm:p-6 h-full flex flex-col">
              <div class="flex items-center gap-3 mb-6">
                <span class="w-9 h-9 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">1</span>
                <div>
                  <h2 class="text-lg font-bold text-text-main">Encrypted Details</h2>
                  <p class="text-xs text-text-muted">Vendor &amp; receipt info — encrypted with your department key (K_real).</p>
                </div>
              </div>

              <div class="flex-1 flex flex-col space-y-4">
                <div>
                  <label class="block text-xs font-bold text-text-muted uppercase mb-1">Vendor Name</label>
                  <input v-model="form.vendor_name" type="text" class="w-full bg-background border border-border rounded px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition" placeholder="e.g. Grab, Office Depot" required />
                </div>
                <div>
                  <label class="block text-xs font-bold text-text-muted uppercase mb-1">Description</label>
                  <textarea v-model="form.description" rows="3" class="w-full bg-background border border-border rounded px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition resize-none" placeholder="What was this expense for?" required></textarea>
                </div>
                <div class="flex-1 flex flex-col">
                  <label class="block text-xs font-bold text-text-muted uppercase mb-1">Receipt File</label>
                  <p class="text-xs text-text-muted mb-2">JPEG, PNG, or PDF — max 5 MB</p>
                  <div
                    class="relative border-2 border-dashed rounded p-4 text-center cursor-pointer transition flex-1 flex items-center justify-center"
                    :class="fileInfo ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-gray-400'"
                    @click="fileInput.click()"
                    @dragover.prevent="$event.currentTarget.classList.add('border-primary/60','bg-primary/5')"
                    @dragleave.prevent="$event.currentTarget.classList.remove('border-primary/60','bg-primary/5')"
                    @drop.prevent="handleDrop"
                  >
                    <input ref="fileInput" @change="handleFileSelect" type="file" accept="image/jpeg,image/png,application/pdf" class="hidden" />
                    <div v-if="!fileInfo">
                      <svg class="w-8 h-8 text-text-muted mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                      <p class="text-sm text-text-muted">Drag &amp; drop your receipt here, or <span class="text-primary font-medium">browse</span></p>
                    </div>
                    <div v-else class="flex items-center gap-3">
                      <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      <div class="text-left">
                        <p class="text-sm font-medium text-text-main">{{ fileInfo.name }}</p>
                        <p class="text-xs text-text-muted">{{ (fileInfo.size / 1024).toFixed(1) }} KB · {{ fileInfo.type }}</p>
                      </div>
                      <button type="button" @click.stop="removeFile" class="ml-2 p-1 rounded hover:bg-red-50 text-text-muted hover:text-ember transition">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- ── Right Column: Expense Details (5/12) ── -->
          <div class="lg:col-span-5">
            <section class="bg-surface rounded shadow-md border border-border p-5 sm:p-6 h-full flex flex-col">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-6">
                  <span class="w-9 h-9 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">2</span>
                  <div>
                    <h2 class="text-lg font-bold text-text-main">Expense Details</h2>
                    <p class="text-xs text-text-muted">Amount, date, project, and category.</p>
                  </div>
                </div>

                <div class="space-y-4">
                <div>
                  <label class="block text-xs font-bold text-text-muted uppercase mb-1">Amount ($)</label>
                  <input v-model.number="form.amount" type="number" step="0.01" min="0.01" class="w-full bg-background border border-border rounded px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition" placeholder="0.00" required />
                </div>
                <div>
                  <label class="block text-xs font-bold text-text-muted uppercase mb-1">Date</label>
                  <input v-model="form.date" type="date" class="w-full bg-background border border-border rounded px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition" required />
                </div>
                <div>
                  <label class="block text-xs font-bold text-text-muted uppercase mb-1">Project ID</label>
                  <input v-model="form.project_id" type="text" class="w-full bg-background border border-border rounded px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition" placeholder="e.g. PROJ-001" required />
                </div>
                <div>
                  <label class="block text-xs font-bold text-text-muted uppercase mb-1">Category</label>
                  <select v-model="form.category" class="w-full bg-background border border-border rounded px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition" required>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Travel">Travel</option>
                    <option value="Meals">Meals</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              </div> <!-- /flex-1 -->

              <!-- Submit Button (inside card, bottom) -->
              <div class="mt-auto pt-5 border-t border-border">
                <button type="submit" :disabled="loading" class="w-full bg-primary text-white font-bold py-3 rounded hover:bg-primary-hover transition disabled:opacity-50 text-sm shadow-lg shadow-primary/20">
                  {{ loading ? 'Processing…' : 'Submit Secure Expense' }}
                </button>
              </div>
            </section>
          </div>
        </div>

        <!-- ── Processing Steps ── -->
        <section v-if="loading" class="bg-surface rounded shadow-md border border-border p-6">
          <h3 class="text-sm font-bold text-text-main mb-4 flex items-center gap-2">
            <svg class="w-4 h-4 animate-spin text-primary" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
            Processing Expense...
          </h3>
          <div class="space-y-2.5">
            <div v-for="s in steps" :key="s.n" class="flex items-center gap-3">
              <div class="w-5 h-5 rounded-full flex items-center justify-center shrink-0" :class="step >= s.n ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'">
                <span v-if="step > s.n" class="text-xs font-bold">✓</span>
                <span v-else-if="step === s.n" class="text-[10px] font-bold">{{ s.n }}</span>
                <span v-else class="text-[10px]">{{ s.n }}</span>
              </div>
              <span class="text-sm" :class="step >= s.n ? 'text-text-main font-medium' : 'text-text-muted'">{{ s.label }}</span>
            </div>
          </div>
        </section>

        <!-- ── Error ── -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded p-4 flex items-start gap-3">
          <svg class="w-5 h-5 text-ember shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <div>
            <p class="text-sm font-bold text-red-700">Submission Failed</p>
            <p class="text-sm text-red-600 mt-0.5">{{ error }}</p>
          </div>
        </div>

        <!-- ── Success ── -->
        <div v-if="success" class="bg-green-50 border border-green-200 rounded p-6 text-center">
          <div class="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          </div>
          <h3 class="text-lg font-bold text-green-700">Expense Submitted</h3>
          <p class="text-sm text-green-600 mt-1">Your expense has been encrypted, signed, and submitted for approval.</p>
          <router-link to="/expenses" class="inline-block mt-4 text-sm text-primary font-medium hover:underline">View My Expenses →</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useExpenseStore } from '../stores/expenses';
import {
  encryptLayer1,
  encryptReceiptFile,
  hashEncryptedFile,
  signPayload
} from '../services/cryptoService';

const authStore  = useAuthStore();
const expenseStore = useExpenseStore();

const form = reactive({
  vendor_name: '',
  description: '',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  project_id: '',
  category: 'Office Supplies'
});

const fileInput   = ref(null);
const fileInfo     = ref(null);   // { name, size, type, arrayBuffer }
const loading      = ref(false);
const step         = ref(0);
const error        = ref('');
const success      = ref(false);

const steps = [
  { n: 1, label: 'Encrypting receipt file…' },
  { n: 2, label: 'Computing file hash…' },
  { n: 3, label: 'Encrypting metadata (Layer 1)…' },
  { n: 4, label: 'Signing payload with device key…' },
  { n: 5, label: 'Submitting to server…' },
];

// ── File selection ──────────────────────────────────────────────────────────
const processFile = async (file) => {
  if (!file) { fileInfo.value = null; return; }
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'File exceeds 5 MB limit';
    if (fileInput.value) fileInput.value.value = '';
    return;
  }
  const arrayBuffer = await file.arrayBuffer();
  fileInfo.value = { name: file.name, size: file.size, type: file.type, arrayBuffer };
};

const handleFileSelect = async (e) => {
  await processFile(e.target.files[0]);
};

const handleDrop = async (e) => {
  e.currentTarget.classList.remove('border-primary/60', 'bg-primary/5');
  const file = e.dataTransfer.files[0];
  await processFile(file);
};

const removeFile = () => {
  fileInfo.value = null;
  if (fileInput.value) fileInput.value.value = '';
};

// ── Submit ──────────────────────────────────────────────────────────────────
const handleSubmit = async () => {
  if (!fileInfo.value) { error.value = 'Please select a receipt file'; return; }
  loading.value = true;
  step.value    = 0;
  error.value   = '';
  success.value = false;

  try {
    const kReal = localStorage.getItem('cryptoledger_kreal');
    if (!kReal) throw new Error('Department key (K_real) missing. Please re-login.');

    // ── Step 1: Encrypt receipt file as raw ArrayBuffer ───────────────────
    step.value = 1;
    const encrypted_receipt = await encryptReceiptFile(
      fileInfo.value.arrayBuffer,
      kReal,
      fileInfo.value.type
    );

    // ── Step 2: SHA-256 of encrypted ciphertext (not the raw file) ────────
    step.value = 2;
    const file_hash = await hashEncryptedFile(encrypted_receipt.ciphertext);

    // ── Step 3: Encrypt Layer 1 metadata ─────────────────────────────────
    step.value = 3;
    const layer1_ciphertext = await encryptLayer1(
      { vendor_name: form.vendor_name, description: form.description },
      kReal
    );

    // ── Step 4: Build pattern + sign ─────────────────────────────────────
    step.value = 4;
    const pattern = {
      amount:     form.amount,
      project_id: form.project_id,
      dept_id:    authStore.user.dept_id,
      category:   form.category,
      date:       form.date
    };
    const payloadToSign    = JSON.stringify({ layer1_ciphertext, pattern, file_hash });
    const digital_signature = await signPayload(payloadToSign);

    // ── Step 5: Submit to server ──────────────────────────────────────────
    step.value = 5;
    await expenseStore.submitExpense({
      layer1_ciphertext,
      pattern,
      digital_signature,
      encrypted_receipt,  // { iv, authTag, ciphertext, mime_type }
      file_hash           // hex SHA-256 of encrypted ciphertext
    });

    success.value = true;
    form.vendor_name  = '';
    form.description  = '';
    form.amount       = '';
    form.project_id   = '';
    fileInfo.value    = null;
  } catch (err) {
    console.error(err);
    error.value = err.message || 'Submission failed';
  } finally {
    loading.value = false;
    step.value    = 0;
  }
};
</script>
