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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const router = useRouter();

const privateKeyPresent = ref(false);
const kRealPresent = ref(false);

onMounted(() => {
  if (localStorage.getItem('cryptoledger_private_key')) privateKeyPresent.value = true;
  if (localStorage.getItem('cryptoledger_kreal')) kRealPresent.value = true;
});

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};
</script>
