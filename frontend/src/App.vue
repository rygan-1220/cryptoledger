<template>
  <div class="min-h-screen bg-background">
    <Navbar v-if="authStore.user" />
    <router-view />
  </div>
</template>

<script setup>
import { useAuthStore } from './stores/auth';
import Navbar from './components/Navbar.vue';

const authStore = useAuthStore();
</script>
