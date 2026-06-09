<template>
  <div class="min-h-screen bg-background text-text-main p-4 sm:p-8">
    <div class="max-w-4xl mx-auto">

      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-display font-bold text-text-main">My Profile</h1>
        <p class="text-sm text-text-muted mt-1">Manage your account, bank details, and security settings.</p>
      </div>

      <!-- ── Section 1: User Details ── -->
      <section class="bg-surface rounded-2xl shadow-md border border-border p-6 sm:p-8 mb-6">
        <div class="flex items-center gap-3 mb-6">
          <span class="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">1</span>
          <h2 class="text-xl font-bold">User Details</h2>
        </div>

        <div v-if="authStore.user" class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <span class="block text-xs font-bold text-text-muted uppercase mb-0.5">Username</span>
            <span class="text-text-main text-sm">{{ authStore.user.username }}</span>
          </div>
          <div>
            <span class="block text-xs font-bold text-text-muted uppercase mb-0.5">Email</span>
            <span class="text-text-main text-sm">{{ authStore.user.email }}</span>
          </div>
          <div>
            <span class="block text-xs font-bold text-text-muted uppercase mb-0.5">Department</span>
            <span class="text-text-main text-sm">{{ authStore.user.dept_name || 'N/A' }}</span>
          </div>
          <div>
            <span class="block text-xs font-bold text-text-muted uppercase mb-0.5">Role</span>
            <span class="uppercase text-primary font-bold text-sm">{{ authStore.user.role }}</span>
          </div>
        </div>
        <div v-else class="text-text-muted text-sm">Loading user details…</div>
      </section>

      <!-- ── Section 2: Bank Information ── -->
      <section class="bg-surface rounded-2xl shadow-md border border-border p-6 sm:p-8 mb-6">
        <div class="flex items-center gap-3 mb-6">
          <span class="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">2</span>
          <h2 class="text-xl font-bold">Bank Information</h2>
        </div>

        <!-- View mode: bank info already saved -->
        <div v-if="hasBankInfo && !editingBank">
          <div class="flex items-center gap-2 mb-4">
            <span class="inline-flex items-center gap-1 text-green-700 text-xs font-medium bg-green-50 px-2.5 py-1 rounded-full">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
              On File
            </span>
          </div>
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-3 flex-1">
              <div>
                <span class="block text-xs font-bold text-text-muted uppercase mb-0.5">Bank</span>
                <span class="text-text-main text-sm font-medium">{{ bankForm.bank_name }}</span>
              </div>
              <div>
                <span class="block text-xs font-bold text-text-muted uppercase mb-0.5">Account No.</span>
                <span class="text-text-main text-sm font-medium">{{ maskedAccountNo }}</span>
              </div>
              <div>
                <span class="block text-xs font-bold text-text-muted uppercase mb-0.5">Account Holder</span>
                <span class="text-text-main text-sm font-medium">{{ bankForm.account_holder_name }}</span>
              </div>
            </div>
            <button
              @click="startEditBank"
              class="shrink-0 border border-border text-text-main px-4 py-2 rounded-xl text-sm font-medium hover:bg-background transition"
            >
              Edit Bank Info
            </button>
          </div>
        </div>

        <!-- Edit / first-time mode -->
        <div v-else>
          <p class="text-xs text-text-muted mb-5">Required for expense payout. Your banking details are stored securely.</p>

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
                class="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g., Maybank, CIMB, Hong Leong"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-text-muted uppercase mb-1">Bank Account No</label>
              <input
                v-model="bankForm.bank_account_no"
                class="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Enter your account number"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-text-muted uppercase mb-1">Account Holder Name</label>
              <input
                v-model="bankForm.account_holder_name"
                class="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Name on the bank account"
              />
            </div>
            <div class="flex gap-2 pt-1">
              <button
                @click="saveBankInfo"
                :disabled="savingBank"
                class="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary-hover transition disabled:opacity-50 text-sm"
              >
                {{ savingBank ? 'Saving...' : 'Save Bank Info' }}
              </button>
              <button
                v-if="hasBankInfo"
                @click="cancelEditBank"
                class="border border-border text-text-muted px-5 py-2.5 rounded-xl font-medium hover:bg-background transition text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Section 3: Security Status ── -->
      <section class="bg-surface rounded-2xl shadow-md border border-border p-6 sm:p-8 mb-6">
        <div class="flex items-center gap-3 mb-6">
          <span class="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">3</span>
          <h2 class="text-xl font-bold">Security Status</h2>
        </div>

        <div class="space-y-5">
          <!-- Encryption status -->
          <div class="flex items-start gap-3">
            <div class="mt-0.5 shrink-0">
              <span v-if="allKeysPresent" class="inline-block w-3 h-3 rounded-full bg-green-500"></span>
              <span v-else class="inline-block w-3 h-3 rounded-full bg-amber-500"></span>
            </div>
            <div>
              <p class="text-sm font-medium text-text-main">
                {{ allKeysPresent ? 'Your encryption keys are active' : 'Encryption setup incomplete' }}
              </p>
              <p class="text-xs text-text-muted mt-0.5">
                {{ allKeysPresent ? 'Your expenses are protected with end-to-end encryption.' : 'Some keys are missing. Try logging out and back in to restore them.' }}
              </p>
            </div>
          </div>

          <!-- Device signature status -->
          <div class="flex items-start gap-3">
            <div class="mt-0.5 shrink-0">
              <span v-if="privateKeyPresent" class="inline-block w-3 h-3 rounded-full bg-green-500"></span>
              <span v-else class="inline-block w-3 h-3 rounded-full bg-amber-500"></span>
            </div>
            <div>
              <p class="text-sm font-medium text-text-main">
                {{ privateKeyPresent ? 'Device signature key ready' : 'Device key not found' }}
              </p>
              <p class="text-xs text-text-muted mt-0.5">
                {{ privateKeyPresent ? 'Your device can sign expense submissions.' : 'A new device key will be created on your next login.' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Password reminder -->
        <div class="mt-6 bg-amber-50 border border-amber-400 rounded-lg p-3">
          <p class="text-amber-900 text-xs leading-relaxed">
            <strong>Your password is your recovery key.</strong> If you forget your password, you won't be able to access encrypted expenses on a new device. Keep it safe.
          </p>
        </div>
      </section>

      <!-- Logout -->
      <div class="flex justify-end">
        <button @click="handleLogout" class="border border-ember text-ember px-5 py-2.5 font-medium rounded-xl hover:bg-ember hover:text-white transition text-sm">
          Logout
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import api from '../services/api';

const authStore = useAuthStore();
const router = useRouter();

const privateKeyPresent = ref(false);
const kRealPresent = ref(false);
const allKeysPresent = computed(() => privateKeyPresent.value && kRealPresent.value);

const bankForm = reactive({
  bank_name: '',
  bank_account_no: '',
  account_holder_name: ''
});
const savingBank = ref(false);
const bankSaved = ref(false);
const bankError = ref('');
const editingBank = ref(false);

const hasBankInfo = computed(() => {
  return !!(bankForm.bank_name || bankForm.bank_account_no || bankForm.account_holder_name);
});

const maskedAccountNo = computed(() => {
  const acc = bankForm.bank_account_no;
  if (!acc) return '';
  if (acc.length <= 4) return acc;
  return '••••' + acc.slice(-4);
});

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

const startEditBank = () => {
  editingBank.value = true;
  bankSaved.value = false;
  bankError.value = '';
};

const cancelEditBank = () => {
  editingBank.value = false;
  bankSaved.value = false;
  bankError.value = '';
  fetchBankInfo();
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
    if (authStore.user) {
      authStore.user.bank_name = bankForm.bank_name;
      authStore.user.bank_account_no = bankForm.bank_account_no;
      authStore.user.account_holder_name = bankForm.account_holder_name;
    }
    bankSaved.value = true;
    editingBank.value = false;
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

  console.log('[CryptoLedger] Profile — Key Status:', {
    rsaPrivateKey: privateKeyPresent.value ? 'Present in local storage' : 'Missing — will be auto-generated on next login',
    kReal: kRealPresent.value ? 'Loaded for Layer 1 encryption/decryption' : 'Missing — E2E encryption unavailable',
    allKeysPresent: allKeysPresent.value,
    kRealNote: 'Recovered automatically on any device using your password. This is your most important key.',
    rsaNote: 'Per-device signing key. Each device auto-generates its own — losing it is harmless.',
    recoveryNote: 'K_real is backed up to the server encrypted with a password-derived KEK (PBKDF2, 210k iterations). The server never sees the derived key or plaintext K_real.'
  });

  await fetchBankInfo();
});

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};
</script>
