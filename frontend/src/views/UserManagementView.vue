<template>
  <div class="min-h-screen bg-background p-8">
    <div class="max-w-6xl mx-auto">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-display font-bold text-text-main">User Management</h1>
          <p class="text-text-muted mt-1 text-sm">Create invitations and manage organization access.</p>
        </div>
        <button @click="showInviteModal = true" class="bg-primary text-white px-5 py-2.5 rounded hover:bg-primary-hover font-medium transition shadow-lg shadow-primary/20">
          + Invite User
        </button>
      </div>

      <!-- Filters -->
      <div class="flex gap-4 mb-6">
        <div class="flex-1 max-w-[200px]">
          <label class="block text-[10px] font-bold text-text-muted uppercase mb-1 ml-1">Filter Role</label>
          <select v-model="filters.role" class="w-full bg-surface border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition">
            <option value="">All Roles</option>
            <option value="employee">Employee</option>
            <option value="dept_manager">Dept Manager</option>
            <option value="finance_manager">Finance Manager</option>
            <option value="admin">Admin</option>
            <option value="ceo">CEO</option>
          </select>
        </div>
        <div class="flex-1 max-w-[200px]">
          <label class="block text-[10px] font-bold text-text-muted uppercase mb-1 ml-1">Filter Department</label>
          <select v-model="filters.dept" class="w-full bg-surface border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition">
            <option value="">All Departments</option>
            <option v-for="d in departments" :key="d.dept_id" :value="d.dept_name">{{ d.dept_name }}</option>
          </select>
        </div>
      </div>

      <!-- Users Table -->
      <div v-if="loading" class="text-text-muted text-center py-16 italic">Loading users…</div>
      <div v-else class="bg-surface border border-border rounded overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-border text-text-muted uppercase text-xs tracking-wide">
            <tr>
              <th class="px-6 py-4 text-left">Username</th>
              <th class="px-6 py-4 text-left">Email</th>
              <th class="px-6 py-4 text-left">Role</th>
              <th class="px-6 py-4 text-left">Department</th>
              <th class="px-6 py-4 text-left">Status</th>
              <th class="px-6 py-4 text-left">Joined</th>
              <th class="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="user in filteredUsers" :key="user.user_id" class="hover:bg-gray-50/50 transition">
              <td class="px-6 py-4 font-medium text-text-main">{{ user.username }}</td>
              <td class="px-6 py-4 text-text-muted">{{ user.email }}</td>
              <td class="px-6 py-4">
                <span :class="roleClass(user.role)" class="px-2 py-1 rounded text-[10px] font-bold uppercase">{{ user.role.replace('_',' ') }}</span>
              </td>
              <td class="px-6 py-4 text-text-muted">{{ user.department_name || 'N/A' }}</td>
              <td class="px-6 py-4">
                <span :class="statusClass(user.status)" class="px-2 py-1 rounded-full text-[10px] font-bold uppercase">{{ user.status.replace('_', ' ') }}</span>
              </td>
              <td class="px-6 py-4 text-text-muted">{{ user.created_at ? formatDate(user.created_at) : '-' }}</td>
              <td class="px-6 py-4">
                <div class="flex items-center justify-center gap-1">
                  <!-- Activate / Deactivate Icons (Monochrome SaaS Style) -->
                  <button 
                    v-if="user.status !== 'pending_invite' && user.user_id !== authStore.user.user_id && canManageUser(user)"
                    @click="toggleActive(user)"
                    class="p-2 rounded transition-colors text-text-main hover:bg-gray-100"
                    :title="user.is_active ? 'Deactivate User' : 'Activate User'"
                  >
                    <svg v-if="user.is_active" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728A9 9 0 115.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>

                  <!-- Copy Invite Link Icon (Monochrome SaaS Style) -->
                  <button
                    v-if="user.status === 'pending_invite' && user.invite_link"
                    @click="copyUserInviteLink(user.invite_link)"
                    class="p-2 rounded transition-colors text-text-main hover:bg-gray-100"
                    title="Copy Invite Link"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Invite Modal -->
      <div v-if="showInviteModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-surface border border-border rounded w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
          <div class="p-6 border-b border-border bg-gray-50">
            <h2 class="text-xl font-display font-bold text-text-main">Invite New User</h2>
            <p class="text-xs text-text-muted mt-1">A unique setup link will be generated.</p>
          </div>
          
          <form @submit.prevent="handleInvite" class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-bold text-text-muted uppercase mb-1">Username</label>
              <input v-model="form.username" required type="text" class="w-full bg-background border border-border rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition" placeholder="johndoe" />
            </div>
            <div>
              <label class="block text-xs font-bold text-text-muted uppercase mb-1">Email Address</label>
              <input v-model="form.email" required type="email" class="w-full bg-background border border-border rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition" placeholder="john@example.com" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-text-muted uppercase mb-1">Role</label>
                <select v-model="form.role" :disabled="!isAdmin" class="w-full bg-background border border-border rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition disabled:opacity-70 disabled:cursor-not-allowed">
                  <option value="employee">Employee</option>
                  <option v-if="isAdmin" value="dept_manager">Dept Manager</option>
                  <option v-if="isAdmin" value="finance_manager">Finance Manager</option>
                  <option v-if="isAdmin" value="admin">Admin</option>
                  <option v-if="isAdmin" value="ceo">CEO</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-text-muted uppercase mb-1">Department</label>
                <select v-model="form.dept_id" :disabled="isForcedDept || isDeptManager" class="w-full bg-background border border-border rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition disabled:opacity-70 disabled:cursor-not-allowed">
                  <option v-for="d in departments" :key="d.dept_id" :value="d.dept_id">{{ d.dept_name }}</option>
                </select>
              </div>
            </div>

            <div v-if="generatedLink" class="mt-6 p-4 bg-primary/5 rounded border border-primary/20 space-y-2">
              <p class="text-xs font-bold text-primary uppercase">Invitation Link Generated:</p>
              <div class="flex gap-2">
                <input :value="generatedLink" readonly class="flex-1 bg-white border border-border rounded px-2 py-1 text-[10px] font-mono focus:outline-none" />
                <button type="button" @click="copyLink" class="bg-primary text-white px-2 py-1 rounded text-[10px] hover:bg-primary-hover">Copy</button>
              </div>
              <p class="text-[10px] text-primary/70 italic">Link expires in 7 days.</p>
            </div>

            <div class="flex gap-3 pt-4">
              <button type="button" @click="closeModal" class="flex-1 px-4 py-2 border border-border rounded text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
              <button type="submit" :disabled="inviting" class="flex-1 bg-primary text-white px-4 py-2 rounded text-sm font-medium hover:bg-primary-hover transition disabled:opacity-50">
                {{ inviting ? 'Creating…' : (generatedLink ? 'Create Another' : 'Generate Link') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const isAdmin = computed(() => ['admin', 'ceo'].includes(authStore.user?.role));
const isDeptManager = computed(() => authStore.user?.role === 'dept_manager');
const isForcedDept = computed(() => ['admin', 'ceo', 'finance_manager'].includes(form.role));

const users = ref([]);
const departments = ref([]);
const loading = ref(true);
const inviting = ref(false);
const showInviteModal = ref(false);
const generatedLink = ref('');

const filters = reactive({
  role: '',
  dept: ''
});

const filteredUsers = computed(() => {
  return users.value.filter(u => {
    const matchRole = !filters.role || u.role === filters.role;
    const matchDept = !filters.dept || u.department_name === filters.dept;
    return matchRole && matchDept;
  });
});

const form = reactive({
  username: '',
  email: '',
  role: 'employee',
  dept_id: ''
});

// Force 'Operations' for Admin/CEO/Finance Manager roles
watch(() => form.role, (newRole) => {
  if (['admin', 'ceo', 'finance_manager'].includes(newRole)) {
    const ops = departments.value.find(d => d.dept_name.toLowerCase() === 'operations');
    if (ops) form.dept_id = ops.dept_id;
  }
});

onMounted(async () => {
  await Promise.all([fetchUsers(), fetchDepts()]);
  loading.value = false;
});

const fetchUsers = async () => {
  try {
    const res = await api.get('/users');
    users.value = res.data;
  } catch (e) { console.error(e); }
};

const toggleActive = async (user) => {
  try {
    const newStatus = !user.is_active;
    await api.patch(`/users/${user.user_id}/status`, { is_active: newStatus });
    user.is_active = newStatus;
    user.status = newStatus ? 'active' : 'inactive';
  } catch (e) {
    alert(e.response?.data?.error || 'Failed to update user status');
  }
};

const canManageUser = (user) => {
  if (isAdmin.value) return true;
  if (isDeptManager.value && user.department_name === authStore.user.dept_name && user.role === 'employee') return true;
  return false;
};

const fetchDepts = async () => {
  try {
    const res = await api.get('/departments');
    departments.value = res.data.departments;
    
    // Initial selection
    if (!form.dept_id && departments.value.length) {
      // Default for employees is the inviter's dept, but if we have no dept_id yet...
      form.dept_id = authStore.user?.dept_id || departments.value[0].dept_id;
    }
  } catch (e) { console.error(e); }
};

const handleInvite = async () => {
  inviting.value = true;
  generatedLink.value = '';
  try {
    const res = await api.post('/users/invite', form);
    generatedLink.value = res.data.inviteLink;
  } catch (e) {
    alert(e.response?.data?.error || 'Invitation failed');
  } finally {
    inviting.value = false;
  }
};

const closeModal = () => {
  showInviteModal.value = false;
  generatedLink.value = '';
  form.username = '';
  form.email = '';
  form.role = 'employee';
  form.dept_id = authStore.user?.dept_id || '';
};

const copyLink = () => {
  navigator.clipboard.writeText(generatedLink.value);
  alert('Link copied to clipboard!');
};

const copyUserInviteLink = (link) => {
  navigator.clipboard.writeText(link);
  alert('Invite link copied to clipboard!');
};

const roleClass = (r) => ({
  admin: 'bg-red-100 text-red-700',
  ceo:   'bg-purple-100 text-purple-700',
  finance_manager: 'bg-green-100 text-green-700',
  dept_manager: 'bg-blue-100 text-blue-700',
  employee: 'bg-gray-100 text-gray-700'
}[r] || '');

const statusClass = (s) => ({
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-red-100 text-red-700',
  pending_invite: 'bg-yellow-100 text-yellow-700'
}[s] || 'bg-gray-100 text-gray-700');

const formatDate = (d) => new Date(d).toLocaleDateString('en-MY', { day:'2-digit', month:'short', year:'numeric' });
</script>
