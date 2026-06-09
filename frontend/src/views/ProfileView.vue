<template>
  <div class="min-h-screen bg-background text-text-main p-8">
    <div class="max-w-4xl mx-auto bg-surface p-8 rounded-xl shadow-md border border-border">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-display font-bold text-text-main">Profile & Key Management</h1>
      </div>
      
      <div v-if="authStore.user" class="mb-8">
        <h2 class="text-xl font-bold mb-3">User Details</h2>
        <div class="space-y-2">
          <p><strong>Username:</strong> <span class="text-text-muted">{{ authStore.user.username }}</span></p>
          <p><strong>Email:</strong> <span class="text-text-muted">{{ authStore.user.email }}</span></p>
          <p><strong>Department:</strong> <span class="text-text-muted">{{ authStore.user.dept_name || 'N/A' }}</span></p>
          <p><strong>Role:</strong> <span class="uppercase text-primary font-bold">{{ authStore.user.role }}</span></p>
        </div>
      </div>

      <!-- Bank Information -->
      <div class="bg-background p-6 rounded-lg mb-8 border border-border">
        <h2 class="text-xl font-bold mb-4">Bank Information</h2>
        <p class="text-xs text-text-muted mb-4">Required for expense payout. Your banking details are stored securely.</p>

        <div v-if="bankSaved" class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          Bank information saved successfully.
        </div>
        <div v-if="bankError" class="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-ember text-sm">
          {{ bankError }}
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-text-muted uppercase mb-1">Bank Name</label>
            <input
              v-model="bankForm.bank_name"
              class="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g., Maybank, CIMB, Hong Leong"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-text-muted uppercase mb-1">Bank Account No</label>
            <input
              v-model="bankForm.bank_account_no"
              class="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Enter your account number"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-text-muted uppercase mb-1">Account Holder Name</label>
            <input
              v-model="bankForm.account_holder_name"
              class="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Name on the bank account"
            />
          </div>
          <button
            @click="saveBankInfo"
            :disabled="savingBank"
            class="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary-hover transition disabled:opacity-50 text-sm"
          >
            {{ savingBank ? 'Saving...' : 'Save Bank Info' }}
          </button>
        </div>
      </div>

      <div class="bg-background p-6 rounded-lg mb-8 border border-border">
        <h2 class="text-xl font-bold mb-4">Cryptographic Keys</h2>

        <!-- K_real Status -->
        <div class="mb-5">
          <p class="font-bold mb-1">Department K_real (Encryption Key):</p>
          <p :class="kRealPresent ? 'text-green-600 font-medium' : 'text-ember font-medium'">
            {{ kRealPresent ? 'Loaded for Layer 1 encryption/decryption.' : 'MISSING! E2E encryption unavailable.' }}
          </p>
          <p class="text-xs text-text-muted mt-1">
            Recovered automatically on any device using your password. This is your most important key — without it, encrypted expenses cannot be read.
          </p>
        </div>

        <div class="border-t border-border my-5"></div>

        <!-- RSA Signing Key -->
        <div class="mb-4">
          <p class="font-bold mb-1">RSA Signing Key (Per-Device):</p>
          <p :class="privateKeyPresent ? 'text-green-600 font-medium' : 'text-ember font-medium'">
            {{ privateKeyPresent ? 'Present in local storage.' : 'MISSING! A new one will be auto-generated on next login.' }}
          </p>
          <p class="text-xs text-text-muted mt-1">
            Used to sign expense submissions. Each device auto-generates its own key — losing it is harmless. A fresh key pair is created automatically when needed.
          </p>
        </div>

        <!-- Password recovery info -->
        <div class="mt-4 bg-amber-50 border border-amber-400 rounded-lg p-3">
          <p class="text-amber-900 text-xs leading-relaxed">
            <strong>Your password is your master recovery key.</strong> K_real is backed up to the server encrypted with a key derived from your password (PBKDF2, 210k iterations). The server never sees the derived key or the plaintext K_real. If you forget your password, encrypted expenses cannot be decrypted on any new device.
          </p>
        </div>
      </div>
      
      <button @click="handleLogout" class="border border-ember text-ember px-5 py-2.5 font-medium rounded hover:bg-ember hover:text-white transition">
        Logout
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import api from '../services/api';

const authStore = useAuthStore();
const router = useRouter();

const privateKeyPresent = ref(false);
const kRealPresent = ref(false);

const bankForm = reactive({
  bank_name: '',
  bank_account_no: '',
  account_holder_name: ''
});
const savingBank = ref(false);
const bankSaved = ref(false);
const bankError = ref('');

const fetchBankInfo = async () => {
  try {
    const res = await api.get('/auth/me');
    if (res.data.user) {
      bankForm.bank_name = res.data.user.bank_name || '';
      bankForm.bank_account_no = res.data.user.bank_account_no || '';
      bankForm.account_holder_name = res.data.user.account_holder_name || '';
    }
  } catch (e) {
    console.error('Failed to fetch bank info:', e);
  }
};

const saveBankInfo = async () => {
  savingBank.value = true;
  bankSaved.value = false;
  bankError.value = '';
  try {
    await api.put('/auth/profile', {
      bank_name: bankForm.bank_name,
      bank_account_no: bankForm.bank_account_no,
      account_holder_name: bankForm.account_holder_name
    });
    // Update auth store so navbar etc. has latest bank info
    if (authStore.user) {
      authStore.user.bank_name = bankForm.bank_name;
      authStore.user.bank_account_no = bankForm.bank_account_no;
      authStore.user.account_holder_name = bankForm.account_holder_name;
    }
    bankSaved.value = true;
    setTimeout(() => { bankSaved.value = false; }, 4000);
  } catch (e) {
    bankError.value = e.response?.data?.error || e.message || 'Failed to save bank info';
  } finally {
    savingBank.value = false;
  }
};

onMounted(async () => {
  if (localStorage.getItem('cryptoledger_private_key')) privateKeyPresent.value = true;
  if (localStorage.getItem('cryptoledger_kreal')) kRealPresent.value = true;
  await fetchBankInfo();
});

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};
</script>
