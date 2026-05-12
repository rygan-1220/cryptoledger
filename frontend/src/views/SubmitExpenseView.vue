<template>
  <div class="min-h-screen bg-background text-text-main p-8">
    <div class="max-w-2xl mx-auto bg-surface p-8 rounded-xl shadow-md border border-border">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-display font-bold text-text-main">Submit Expense</h1>
        <router-link to="/expenses" class="text-primary hover:underline">Back to My Expenses</router-link>
      </div>
      
      <form @submit.prevent="handleSubmit" class="space-y-5">
        <!-- Layer 1: Encrypted Metadata -->
        <div class="bg-blue-50 p-4 rounded border border-blue-100">
          <h3 class="text-blue-800 font-bold mb-3 flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            Layer 1 Encrypted (End-to-End)
          </h3>
          <div class="space-y-4">
            <div>
              <label class="block font-medium mb-1">Vendor Name</label>
              <input v-model="form.vendor_name" type="text" class="w-full border border-border rounded px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" required />
            </div>
            <div>
              <label class="block font-medium mb-1">Description</label>
              <textarea v-model="form.description" rows="3" class="w-full border border-border rounded px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" required></textarea>
            </div>
            <div>
              <label class="block font-medium mb-1">Receipt File (JPEG / PNG / PDF, max 5 MB)</label>
              <input @change="handleFileSelect" type="file" accept="image/jpeg,image/png,application/pdf" class="w-full border border-border rounded px-4 py-2" required />
              <p v-if="fileInfo" class="text-text-muted text-sm mt-1">
                Selected: {{ fileInfo.name }} ({{ (fileInfo.size / 1024).toFixed(1) }} KB) · {{ fileInfo.type }}
              </p>
            </div>
          </div>
        </div>

        <!-- Pattern Layer -->
        <div class="bg-gray-50 p-4 rounded border border-border">
          <h3 class="text-gray-700 font-bold mb-3 flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            Pattern Layer (Statistical Data)
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block font-medium mb-1">Amount ($)</label>
              <input v-model.number="form.amount" type="number" step="0.01" min="0.01" class="w-full border border-border rounded px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" required />
            </div>
            <div>
              <label class="block font-medium mb-1">Date</label>
              <input v-model="form.date" type="date" class="w-full border border-border rounded px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" required />
            </div>
            <div>
              <label class="block font-medium mb-1">Project ID</label>
              <input v-model="form.project_id" type="text" class="w-full border border-border rounded px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" required />
            </div>
            <div>
              <label class="block font-medium mb-1">Category</label>
              <select v-model="form.category" class="w-full border border-border rounded px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" required>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Travel">Travel</option>
                <option value="Meals">Meals</option>
                <option value="Equipment">Equipment</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Steps indicator -->
        <div v-if="loading" class="text-sm text-text-muted space-y-1">
          <p :class="step >= 1 ? 'text-primary font-medium' : ''">1. Encrypting receipt file…</p>
          <p :class="step >= 2 ? 'text-primary font-medium' : ''">2. Computing file hash…</p>
          <p :class="step >= 3 ? 'text-primary font-medium' : ''">3. Encrypting metadata (Layer 1)…</p>
          <p :class="step >= 4 ? 'text-primary font-medium' : ''">4. Signing payload…</p>
          <p :class="step >= 5 ? 'text-primary font-medium' : ''">5. Submitting to server…</p>
        </div>

        <div v-if="error" class="text-ember text-sm">{{ error }}</div>
        <div v-if="success" class="text-green-600 font-medium text-sm">✓ Expense submitted successfully!</div>

        <button type="submit" :disabled="loading" class="w-full bg-primary text-white font-medium py-3 rounded hover:bg-primary-hover transition disabled:opacity-50">
          {{ loading ? 'Processing…' : 'Submit Secure Expense' }}
        </button>
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

const fileInfo     = ref(null);   // { name, size, type, arrayBuffer }
const loading      = ref(false);
const step         = ref(0);
const error        = ref('');
const success      = ref(false);

// ── File selection ──────────────────────────────────────────────────────────
const handleFileSelect = async (e) => {
  const file = e.target.files[0];
  if (!file) { fileInfo.value = null; return; }
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'File exceeds 5 MB limit';
    e.target.value = '';
    return;
  }
  const arrayBuffer = await file.arrayBuffer();
  fileInfo.value = { name: file.name, size: file.size, type: file.type, arrayBuffer };
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
