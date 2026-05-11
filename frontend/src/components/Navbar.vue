<template>
  <nav class="bg-surface border-b border-border sticky top-0 z-50">
    <div class="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
      <!-- Logo -->
      <router-link to="/expenses" class="flex items-center gap-2 font-display font-bold text-lg text-text-main">
        <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
        CryptoLedger
      </router-link>

      <!-- Nav links -->
      <div class="flex items-center gap-1">
        <!-- Employee -->
        <router-link v-if="user" to="/expenses" class="nav-link" active-class="nav-link-active">My Expenses</router-link>
        <router-link v-if="isEmployee" to="/expenses/new" class="nav-link" active-class="nav-link-active">+ Submit</router-link>

        <!-- Dept Manager -->
        <router-link v-if="isManager" to="/department/expenses" class="nav-link" active-class="nav-link-active">Dept Expenses</router-link>

        <!-- Finance / Admin / CEO -->
        <router-link v-if="isPrivileged" to="/admin/expenses" class="nav-link" active-class="nav-link-active">All Expenses</router-link>
        <router-link v-if="isAdminOrCEO" to="/admin/audit-logs" class="nav-link" active-class="nav-link-active">Audit Logs</router-link>
        <router-link v-if="isAdmin" to="/admin/integrity" class="nav-link" active-class="nav-link-active">Integrity</router-link>

        <!-- Profile + role badge -->
        <span class="mx-2 h-5 w-px bg-border inline-block"></span>
        <span class="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium capitalize">{{ user?.role?.replace('_',' ') }}</span>
        <router-link to="/profile" class="nav-link ml-1" active-class="nav-link-active">Profile</router-link>
        <button @click="handleLogout" class="text-sm text-ember hover:underline ml-2">Logout</button>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const router = useRouter();

const user = computed(() => authStore.user);

const isEmployee  = computed(() => user.value && ['employee'].includes(user.value.role));
const isManager   = computed(() => user.value && user.value.role === 'dept_manager');
const isPrivileged= computed(() => user.value && ['finance_manager','admin','ceo'].includes(user.value.role));
const isAdminOrCEO= computed(() => user.value && ['admin','ceo'].includes(user.value.role));
const isAdmin     = computed(() => user.value?.role === 'admin');

const handleLogout = async () => {
  await authStore.logout();
  localStorage.removeItem('cryptoledger_private_key');
  localStorage.removeItem('cryptoledger_kreal');
  router.push('/login');
};
</script>

<style scoped>
.nav-link {
  @apply text-sm text-text-muted px-3 py-1.5 rounded hover:bg-gray-100 hover:text-text-main transition;
}
.nav-link-active {
  @apply bg-primary/10 text-primary font-medium;
}
</style>
