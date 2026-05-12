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

      <div class="bg-background p-6 rounded-lg mb-8 border border-border">
        <h2 class="text-xl font-bold mb-4">Cryptographic Keys</h2>
        
        <div class="mb-5">
          <p class="font-bold mb-1">Private Key Status:</p>
          <p :class="privateKeyPresent ? 'text-green-600 font-medium' : 'text-ember font-medium'">
            {{ privateKeyPresent ? 'Loaded securely in local storage.' : 'MISSING! You will not be able to decrypt your expenses.' }}
          </p>
        </div>
        
        <div class="mb-6">
          <p class="font-bold mb-1">Department K_real Status:</p>
          <p :class="kRealPresent ? 'text-green-600 font-medium' : 'text-ember font-medium'">
            {{ kRealPresent ? 'Loaded for Layer 1 encryption/decryption.' : 'MISSING! E2E encryption unavailable.' }}
          </p>
        </div>

        <button @click="exportKey" :disabled="!privateKeyPresent" class="bg-primary text-white px-5 py-2.5 rounded hover:bg-primary-hover font-medium transition disabled:opacity-50">
          Export My Private Key (Backup)
        </button>
      </div>
      
      <button @click="handleLogout" class="border border-ember text-ember px-5 py-2.5 font-medium rounded hover:bg-ember hover:text-white transition">
        Logout
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const router = useRouter();

const privateKeyPresent = ref(false);
const kRealPresent = ref(false);

onMounted(() => {
  // Check localStorage for keys
  if (localStorage.getItem('cryptoledger_private_key')) privateKeyPresent.value = true;
  if (localStorage.getItem('cryptoledger_kreal')) kRealPresent.value = true;
});

const exportKey = () => {
  const b64 = localStorage.getItem('cryptoledger_private_key');
  if (!b64) return;
  const binaryDerString = window.atob(b64);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }
  // Convert to Blob and download
  const blob = new Blob([binaryDer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cryptoledger_private_key.bin';
  a.click();
  URL.revokeObjectURL(url);
};

const handleLogout = async () => {
  await authStore.logout();  // clears K_real only, private key stays
  router.push('/login');
};
</script>
