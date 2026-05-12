import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import LoginView    from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';

const routes = [
  { path: '/', redirect: '/expenses' },
  { path: '/setup',    name: 'Setup',    component: () => import('../views/SetupView.vue') },
  { path: '/login',    name: 'Login',    component: LoginView },
  { path: '/register', name: 'Register', component: RegisterView },

  // Employee
  {
    path: '/expenses',
    name: 'MyExpenses',
    component: () => import('../views/MyExpensesView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/expenses/new',
    name: 'SubmitExpense',
    component: () => import('../views/SubmitExpenseView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/expenses/:id',
    name: 'ExpenseDetail',
    component: () => import('../views/ExpenseDetailView.vue'),
    meta: { requiresAuth: true }
  },

  // Profile
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/ProfileView.vue'),
    meta: { requiresAuth: true }
  },

  // Privileged
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true }
  },

  // Department Manager
  {
    path: '/department/expenses',
    name: 'DeptExpenses',
    component: () => import('../views/DeptExpensesView.vue'),
    meta: { requiresAuth: true }
  },

  // Finance / Admin / CEO
  {
    path: '/admin/expenses',
    name: 'AllExpenses',
    component: () => import('../views/AllExpensesView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/audit-logs',
    name: 'AuditLogs',
    component: () => import('../views/AuditLogsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/integrity',
    name: 'Integrity',
    component: () => import('../views/IntegrityView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/users',
    name: 'UserManagement',
    component: () => import('../views/UserManagementView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/departments',
    name: 'DepartmentManagement',
    component: () => import('../views/DepartmentManagementView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/setup-account',
    name: 'SetupAccount',
    component: () => import('../views/SetupAccountView.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  // 1. If not authenticated yet, try to fetch user
  if (!authStore.user) {
    try {
      await authStore.fetchMe();
    } catch (e) {
      // Ignored: fetchMe sets requiresSetup = true on 503
    }
  }

  // 2. Priority check: Handle system initialization state
  if (authStore.requiresSetup) {
    // If not initialized, only allow Setup pages
    if (to.name !== 'Setup' && to.name !== 'SetupAccount') {
      return '/setup';
    }
  } else {
    // If ALREADY initialized, block access to the Setup wizard
    if (to.name === 'Setup') {
      return '/login';
    }
  }

  // 3. Navigation logic
  const isAuthenticated = !!authStore.user;

  // Protect routes
  if (to.meta.requiresAuth && !isAuthenticated) {
    return '/login';
  }

  // Redirect if already logged in
  if (isAuthenticated && (to.name === 'Login' || to.name === 'Register' || to.name === 'Setup')) {
    return '/expenses';
  }
});

export default router;
