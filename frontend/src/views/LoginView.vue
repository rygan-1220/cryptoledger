<template>
  <div class="min-h-screen flex items-center justify-center bg-background">
    <div class="max-w-md w-full bg-surface p-8 rounded-xl shadow-md border border-border">
      <h2 class="text-3xl font-display text-text-main font-bold text-center mb-6">Login</h2>
      
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-text-main font-medium mb-1">Email</label>
          <input v-model="form.email" type="email" class="w-full bg-background text-text-main border border-border rounded px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition" required />
        </div>
        
        <div>
          <label class="block text-text-main font-medium mb-1">Password</label>
          <input v-model="form.password" type="password" class="w-full bg-background text-text-main border border-border rounded px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition" required />
        </div>

        <div v-if="error" class="text-ember text-sm mt-2">{{ error }}</div>
        
        <button type="submit" :disabled="loading" class="w-full bg-primary text-white font-medium py-3 mt-4 rounded hover:bg-primary-hover transition disabled:opacity-50">
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>
      </form>
      
      <p class="text-text-muted text-center mt-6 text-sm">
        Don't have an account? <router-link to="/register" class="text-primary hover:underline font-medium">Register here</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';


const router = useRouter();
const authStore = useAuthStore();

const form = reactive({
  email: '',
  password: ''
});

const loading = ref(false);
const error = ref('');

const handleLogin = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    await authStore.login(form.email, form.password);
    router.push('/expenses');
  } catch (err) {
    error.value = err.message || 'Login failed';
  } finally {
    loading.value = false;
  }
};

</script>
