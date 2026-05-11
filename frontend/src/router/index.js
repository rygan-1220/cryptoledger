import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: LoginView },
  { path: '/register', name: 'Register', component: RegisterView },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/ProfileView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/expenses/new',
    name: 'SubmitExpense',
    component: () => import('../views/SubmitExpenseView.vue'),
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to, from) => {
  const authStore = useAuthStore();
  
  // Try to fetch user if not loaded (e.g. on page refresh)
  if (!authStore.user) {
    await authStore.fetchMe();
  }

  if (to.meta.requiresAuth && !authStore.user) {
    return '/login';
  } else if ((to.name === 'Login' || to.name === 'Register') && authStore.user) {
    return '/profile';
  }
});

export default router;
