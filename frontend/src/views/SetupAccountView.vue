<template>
  <div class="min-h-screen bg-background flex flex-col justify-center py-12 px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h1 class="text-center text-4xl font-display font-black text-primary tracking-tight mb-2">CryptoLedger</h1>
      <h2 class="text-center text-2xl font-display font-bold text-text-main">Set Up Your Account</h2>
      <p class="mt-2 text-center text-sm text-text-muted">Complete your registration to access the secure ledger.</p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-surface py-8 px-4 border border-border shadow-2xl rounded sm:px-10">
        
        <div v-if="verifying" class="text-center py-8">
          <p class="text-text-muted animate-pulse italic">Verifying invitation…</p>
        </div>

        <div v-else-if="inviteData" class="space-y-6">
          <div class="p-4 bg-gray-50 border border-border rounded">
            <p class="text-[10px] font-bold text-text-muted uppercase mb-1">Invited User</p>
            <p class="text-sm font-medium text-text-main">{{ inviteData.username }} ({{ inviteData.email }})</p>
            <p class="text-[10px] text-text-muted mt-1 uppercase tracking-widest">{{ inviteData.role }} | {{ inviteData.dept_id.slice(0,8) }}…</p>
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-5">
            <div>
              <label class="block text-xs font-bold text-text-muted uppercase mb-1">Set Your Password</label>
              <input v-model="password" required type="password" class="w-full bg-background border border-border rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition" placeholder="Min 8 characters" />
            </div>

            <div>
              <label class="block text-xs font-bold text-text-muted uppercase mb-1">Confirm Password</label>
              <input v-model="confirmPassword" required type="password" class="w-full bg-background border border-border rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition" placeholder="••••••••" />
            </div>

            <div v-if="status" class="p-4 bg-primary/5 border border-primary/20 rounded">
              <p class="text-xs text-primary font-medium flex items-center gap-2">
                <svg class="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                {{ status }}
              </p>
            </div>

            <div v-if="error" class="text-ember text-xs font-medium text-center">{{ error }}</div>

            <button type="submit" :disabled="submitting || !passwordsMatch" class="w-full flex justify-center py-3 px-4 border border-transparent rounded shadow-lg text-sm font-bold text-white bg-primary hover:bg-primary-hover focus:outline-none transition disabled:opacity-50">
              {{ submitting ? 'Processing…' : 'Complete Registration' }}
            </button>
          </form>
          
          <p class="text-[10px] text-text-muted text-center italic">
            Note: This device will be registered as your primary secure access point. 
            A private key will be generated and stored locally in your browser.
          </p>
        </div>

        <div v-else class="text-center py-8">
          <p class="text-ember font-medium">Link invalid or expired.</p>
          <router-link to="/login" class="text-primary hover:underline text-sm mt-4 block">Go to Login</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../services/api';
import { generateRSAKeyPair, exportPublicKey, savePrivateKey } from '../services/cryptoService';

const route = useRoute();
const router = useRouter();

const token = computed(() => route.query.token);
const verifying = ref(true);
const inviteData = ref(null);
const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const status = ref('');
const submitting = ref(false);

const passwordsMatch = computed(() => password.value && password.value === confirmPassword.value);

onMounted(async () => {
  if (!token.value) {
    verifying.value = false;
    return;
  }
  try {
    const res = await api.get(`/users/invite/${token.value}`);
    inviteData.value = res.data;
  } catch (e) {
    console.error(e);
  } finally {
    verifying.value = false;
  }
});

const handleSubmit = async () => {
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters.';
    return;
  }
  
  submitting.value = true;
  error.value = '';
  
  try {
    status.value = 'Generating cryptographic keys…';
    const keyPair = await generateRSAKeyPair();
    const publicKeyPem = await exportPublicKey(keyPair.publicKey);
    
    status.value = 'Securing private key locally…';
    await savePrivateKey(keyPair.privateKey);
    
    status.value = 'Finalizing account setup…';
    await api.post('/users/setup-account', {
      token: token.value,
      password: password.value,
      public_key_pem: publicKeyPem
    });
    
    alert('Account setup complete! Please login.');
    router.push('/login');
  } catch (e) {
    error.value = e.response?.data?.error || 'Setup failed. Please try again.';
    status.value = '';
  } finally {
    submitting.value = false;
  }
};
</script>
