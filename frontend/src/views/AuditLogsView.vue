<template>
  <div class="min-h-screen bg-background p-8">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-3xl font-display font-bold text-text-main mb-6">Audit Logs</h1>

      <!-- Filters -->
      <div class="bg-surface border border-border rounded-xl p-4 mb-6 flex flex-wrap gap-3">
        <select v-model="filters.action" @change="fetch" class="border border-border rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none">
          <option value="">All Actions</option>
          <option>CREATE</option>
          <option>APPROVE</option>
          <option>REJECT</option>
          <option>DELETE</option>
          <option>VIEW_PLAINTEXT</option>
          <option>VERIFY</option>
        </select>
        <input v-model="filters.from" @change="fetch" type="date" class="border border-border rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none" placeholder="From" />
        <input v-model="filters.to" @change="fetch" type="date" class="border border-border rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none" placeholder="To" />
      </div>

      <div v-if="loading" class="text-text-muted text-center py-16">Loading…</div>
      <div v-else-if="!logs.length" class="text-text-muted text-center py-16">No audit logs found.</div>
      <div v-else class="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-border text-text-muted uppercase text-xs tracking-wide">
            <tr>
              <th class="px-5 py-3 text-left">Timestamp</th>
              <th class="px-5 py-3 text-left">Actor</th>
              <th class="px-5 py-3 text-left">Action</th>
              <th class="px-5 py-3 text-left">Expense ID</th>
              <th class="px-5 py-3 text-left">Metadata</th>
              <th class="px-5 py-3 text-left font-mono">Hash</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="log in logs" :key="log.log_id" class="hover:bg-gray-50 transition">
              <td class="px-5 py-3 text-text-muted whitespace-nowrap">{{ fmtTime(log.timestamp) }}</td>
              <td class="px-5 py-3 text-text-main">{{ log.actor_name || log.actor_id?.slice(0,8) + '…' }}</td>
              <td class="px-5 py-3">
                <span :class="actionClass(log.action)" class="px-2 py-0.5 rounded-full text-xs font-medium">{{ log.action }}</span>
              </td>
              <td class="px-5 py-3 font-mono text-xs text-text-muted">{{ log.expense_id ? log.expense_id.slice(0,8) + '…' : '—' }}</td>
              <td class="px-5 py-3 text-text-muted text-xs max-w-[150px] truncate" :title="JSON.stringify(log.metadata)">{{ JSON.stringify(log.metadata) }}</td>
              <td class="px-5 py-3 font-mono text-xs text-text-muted">{{ log.hash?.slice(0,12) }}…</td>
            </tr>
          </tbody>
        </table>
        <div class="flex justify-between items-center px-5 py-3 border-t border-border text-sm text-text-muted">
          <span>Showing {{ logs.length }} of {{ total }}</span>
          <div class="flex gap-2">
            <button @click="changePage(page-1)" :disabled="page<=1" class="px-3 py-1 rounded border border-border disabled:opacity-40">Prev</button>
            <button @click="changePage(page+1)" :disabled="logs.length < limit" class="px-3 py-1 rounded border border-border disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import api from '../services/api';

const logs    = ref([]);
const total   = ref(0);
const page    = ref(1);
const limit   = ref(20);
const loading = ref(true);
const filters = reactive({ action: '', from: '', to: '' });

const fetch = async () => {
  loading.value = true;
  try {
    const res = await api.get('/audit-logs', { params: { page: page.value, limit: limit.value, ...filters } });
    logs.value  = res.data.data;
    total.value = res.data.total;
  } finally { loading.value = false; }
};

onMounted(fetch);
const changePage = (p) => { page.value = p; fetch(); };

const fmtTime = (d) => new Date(d).toLocaleString('en-MY', { dateStyle:'medium', timeStyle:'short' });
const actionClass = (a) => ({
  CREATE:         'bg-blue-100 text-blue-700',
  APPROVE:        'bg-green-100 text-green-700',
  REJECT:         'bg-red-100 text-red-700',
  DELETE:         'bg-gray-100 text-gray-600',
  VIEW_PLAINTEXT: 'bg-amber-100 text-amber-700',
  VERIFY:         'bg-purple-100 text-purple-700'
}[a] || 'bg-gray-100 text-gray-600');
</script>
