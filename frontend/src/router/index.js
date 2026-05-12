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
  if (!authStore.user) {
    await authStore.fetchMe();
  }

  if (to.meta.requiresAuth && !authStore.user) return '/login';
  if ((to.name === 'Login' || to.name === 'Register' || to.name === 'Setup') && authStore.user) return '/expenses';
});

export default router;
