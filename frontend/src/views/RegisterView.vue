<template>
  <div class="min-h-screen flex items-center justify-center bg-background">
    <div class="max-w-md w-full bg-surface p-8 rounded-xl shadow-md border border-border">
      <h2 class="text-3xl font-display text-text-main font-bold text-center mb-6">Register to CryptoLedger</h2>
      
      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label class="block text-text-main font-medium mb-1">Username</label>
          <input v-model="form.username" type="text" class="w-full bg-background text-text-main border border-border rounded px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition" required />
        </div>
        
        <div>
          <label class="block text-text-main font-medium mb-1">Email</label>
          <input v-model="form.email" type="email" class="w-full bg-background text-text-main border border-border rounded px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition" required />
        </div>
        
        <div>
          <label class="block text-text-main font-medium mb-1">Password</label>
          <input v-model="form.password" type="password" class="w-full bg-background text-text-main border border-border rounded px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition" required minlength="8" />
        </div>
        
        <div>
          <label class="block text-text-main font-medium mb-1">Department</label>
          <select v-model="form.dept_id" class="w-full bg-background text-text-main border border-border rounded px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition" required>
            <option value="" disabled>Select your department</option>
            <option v-for="dept in departments" :key="dept.dept_id" :value="dept.dept_id">
              {{ dept.dept_name }}
            </option>
          </select>
        </div>

        <div v-if="error" class="text-ember text-sm mt-2">{{ error }}</div>
        
        <button type="submit" :disabled="loading" class="w-full bg-primary text-white font-medium py-3 mt-4 rounded hover:bg-primary-hover transition disabled:opacity-50">
          {{ loading ? 'Generating Keys...' : 'Register' }}
        </button>
      </form>
      
      <p class="text-text-muted text-center mt-6 text-sm">
        Already have an account? <router-link to="/login" class="text-primary hover:underline font-medium">Login here</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { generateRSAKeyPair, exportPublicKey, savePrivateKey, unwrapKReal } from '../services/cryptoService';
import api from '../services/api';

const router = useRouter();
const authStore = useAuthStore();

const departments = ref([]);
const form = reactive({
  username: '',
  email: '',
  password: '',
  role: 'employee',
  dept_id: '' 
});

const loading = ref(false);
const error = ref('');

onMounted(async () => {
  try {
    const res = await api.get('/departments');
    departments.value = res.data.departments;
  } catch (err) {
    console.error('Failed to load departments', err);
    error.value = 'Failed to load departments. Please refresh.';
  }
});

const handleRegister = async () => {
  if (!form.dept_id) {
    error.value = 'Department is required';
    return;
  }

  loading.value = true;
  error.value = '';
  
  try {
    // 1. Generate RSA Keys
    const keyPair = await generateRSAKeyPair();
    
    // 2. Export public key to PEM
    const publicKeyPem = await exportPublicKey(keyPair.publicKey);
    
    // 3. Save private key locally
    await savePrivateKey(keyPair.privateKey);
    
    // 4. Send to server
    const payload = {
      ...form,
      public_key_pem: publicKeyPem
    };
    
    const response = await authStore.register(payload);
    
    // 5. Unwrap K_real if provided
    if (response.wrapped_kreal_for_user) {
      await unwrapKReal(response.wrapped_kreal_for_user, keyPair.privateKey);
    }
    
    // Redirect to login
    router.push('/login');
  } catch (err) {
    console.error(err);
    error.value = err.message || 'Registration failed';
  } finally {
    loading.value = false;
  }
};
</script>
