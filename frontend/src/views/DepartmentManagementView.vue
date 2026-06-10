<template>
  <div class="min-h-screen bg-background p-8">
    <div class="max-w-4xl mx-auto">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-display font-bold text-text-main">Department Management</h1>
          <p class="text-text-muted mt-1 text-sm">Create and view organizational departments.</p>
        </div>
        <button 
          v-if="isAdmin"
          @click="showCreateModal = true" 
          class="bg-primary text-white px-5 py-2.5 rounded hover:bg-primary-hover font-medium transition shadow-lg shadow-primary/20"
        >
          + Add Department
        </button>
      </div>

      <!-- Departments Table -->
      <div v-if="loading" class="text-text-muted text-center py-16 italic">Loading departments…</div>
      <div v-else class="bg-surface border border-border rounded overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-border text-text-muted uppercase text-xs tracking-wide">
            <tr>
              <th class="px-6 py-4 text-left">Department Name</th>
              <th class="px-6 py-4 text-left">Members</th>
              <th class="px-6 py-4 text-left">Created Date</th>
              <th class="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="dept in departments" :key="dept.dept_id" class="hover:bg-gray-50/50 transition">
              <td class="px-6 py-4 font-medium text-text-main">{{ dept.dept_name }}</td>
              <td class="px-6 py-4 text-text-muted">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" :class="dept.user_count > 0 ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'">{{ dept.user_count || 0 }} Users</span>
              </td>
              <td class="px-6 py-4 text-text-muted">{{ dept.created_at ? formatDate(dept.created_at) : '-' }}</td>
              <td class="px-6 py-4">
                <div class="flex items-center justify-center">
                  <button
                    @click="deleteDept(dept)"
                    :disabled="parseInt(dept.user_count) > 0"
                    :title="parseInt(dept.user_count) > 0 ? 'Cannot delete — department still has members or records' : 'Delete Department'"
                    class="p-2 rounded transition-colors"
                    :class="parseInt(dept.user_count) > 0
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-text-main hover:bg-red-50 hover:text-red-500'"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="departments.length === 0">
              <td colspan="4" class="px-6 py-8 text-center text-text-muted italic">No departments found.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Create Modal -->
      <div v-if="showCreateModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-surface border border-border rounded w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
          <div class="p-6 border-b border-border bg-gray-50">
            <h2 class="text-xl font-display font-bold text-text-main">New Department</h2>
            <p class="text-xs text-text-muted mt-1">A secure sub-ledger will be initialized automatically.</p>
          </div>
          
          <form @submit.prevent="handleCreate" class="p-6 space-y-4">
            <div>
              <label class="block text-xs font-bold text-text-muted uppercase mb-1">Department Name</label>
              <input v-model="form.dept_name" required type="text" class="w-full bg-background border border-border rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition" placeholder="e.g. Marketing" />
            </div>

            <div class="flex gap-3 pt-4">
              <button type="button" @click="closeModal" class="flex-1 px-4 py-2 border border-border rounded text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
              <button type="submit" :disabled="creating" class="flex-1 bg-primary text-white px-4 py-2 rounded text-sm font-medium hover:bg-primary-hover transition disabled:opacity-50">
                {{ creating ? 'Creating…' : 'Create' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const isAdmin = computed(() => ['admin', 'ceo'].includes(authStore.user?.role));

const departments = ref([]);
const loading = ref(true);
const creating = ref(false);
const showCreateModal = ref(false);

const form = reactive({
  dept_name: ''
});

onMounted(async () => {
  await fetchDepts();
  loading.value = false;
});

const fetchDepts = async () => {
  try {
    const res = await api.get('/departments');
    departments.value = res.data.departments;
  } catch (e) {
    console.error(e);
  }
};

const handleCreate = async () => {
  creating.value = true;
  try {
    await api.post('/departments', form);
    await fetchDepts();
    closeModal();
  } catch (e) {
    alert(e.response?.data?.error || 'Failed to create department');
  } finally {
    creating.value = false;
  }
};

const deleteDept = async (dept) => {
  if (!confirm(`Delete "${dept.dept_name}"? This cannot be undone.`)) return;
  try {
    await api.delete(`/departments/${dept.dept_id}`);
    await fetchDepts();
  } catch (e) {
    alert(e.response?.data?.error || 'Failed to delete department');
  }
};

const closeModal = () => {
  showCreateModal.value = false;
  form.dept_name = '';
};

const formatDate = (d) => new Date(d).toLocaleDateString('en-MY', { day:'2-digit', month:'short', year:'numeric' });
</script>
