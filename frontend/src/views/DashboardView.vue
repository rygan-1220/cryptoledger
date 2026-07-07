<template>
  <div class="min-h-screen bg-background p-8">
    <div class="max-w-6xl mx-auto space-y-6">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-display font-bold text-text-main">Dashboard</h1>
        <a :href="`${API_BASE}/dashboard/export?format=csv`" target="_blank"
           class="bg-primary text-white px-4 py-2 rounded hover:bg-primary-hover text-sm font-medium transition">
          Export CSV
        </a>
      </div>

      <!-- Summary Cards -->
      <div v-if="summary" class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-surface border border-border rounded p-5 shadow-sm">
          <p class="text-xs text-text-muted uppercase font-medium mb-1">Total Expenses</p>
          <p class="text-3xl font-bold text-text-main">{{ summary.total_count }}</p>
        </div>
        <div class="bg-surface border border-border rounded p-5 shadow-sm">
          <p class="text-xs text-text-muted uppercase font-medium mb-1">Total Amount</p>
          <p class="text-3xl font-bold text-text-main">RM {{ fmtNum(summary.total_amount) }}</p>
        </div>
        <div class="bg-yellow-50 border border-yellow-200 rounded p-5 shadow-sm">
          <p class="text-xs text-yellow-600 uppercase font-medium mb-1">Pending</p>
          <p class="text-3xl font-bold text-yellow-700">{{ summary.pending_count }}</p>
        </div>
        <div class="bg-green-50 border border-green-200 rounded p-5 shadow-sm">
          <p class="text-xs text-green-600 uppercase font-medium mb-1">Approved ($)</p>
          <p class="text-3xl font-bold text-green-700">RM {{ fmtNum(summary.approved_amount) }}</p>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Status Donut -->
        <div class="bg-surface border border-border rounded p-6 shadow-sm">
          <h3 class="font-bold text-text-main mb-4">Expense Status</h3>
          <div class="relative h-52 flex items-center justify-center">
            <canvas ref="donutRef"></canvas>
          </div>
        </div>

        <!-- Monthly Trend -->
        <div class="bg-surface border border-border rounded p-6 shadow-sm">
          <h3 class="font-bold text-text-main mb-4">Monthly Spend</h3>
          <div class="h-52">
            <canvas ref="trendRef"></canvas>
          </div>
        </div>
      </div>

      <!-- By Department Table + By Category Chart -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Dept Table -->
        <div class="bg-surface border border-border rounded p-6 shadow-sm">
          <h3 class="font-bold text-text-main mb-4">By Department</h3>
          <table class="w-full text-sm">
            <thead class="text-text-muted uppercase text-xs">
              <tr>
                <th class="pb-2 text-left">Dept</th>
                <th class="pb-2 text-right">Count</th>
                <th class="pb-2 text-right">Total</th>
                <th class="pb-2 text-center">Pending</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="d in byDept" :key="d.dept_id">
                <td class="py-2 font-medium text-text-main">{{ d.dept_name }}</td>
                <td class="py-2 text-right text-text-muted">{{ d.count }}</td>
                <td class="py-2 text-right font-medium">RM {{ fmtNum(d.total_amount) }}</td>
                <td class="py-2 text-center">
                  <span v-if="d.pending > 0" class="bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5 rounded-full">{{ d.pending }}</span>
                  <span v-else class="text-text-muted text-xs">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- By Category Bar -->
        <div class="bg-surface border border-border rounded p-6 shadow-sm">
          <h3 class="font-bold text-text-main mb-4">By Category</h3>
          <div class="h-52">
            <canvas ref="categoryRef"></canvas>
          </div>
        </div>
      </div>

      <!-- Top Projects -->
      <div class="bg-surface border border-border rounded p-6 shadow-sm">
        <h3 class="font-bold text-text-main mb-4">Top Projects</h3>
        <table class="w-full text-sm">
          <thead class="text-text-muted uppercase text-xs">
            <tr>
              <th class="pb-2 text-left">Project ID</th>
              <th class="pb-2 text-right">Expenses</th>
              <th class="pb-2 text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="p in byProject" :key="p.project_id">
              <td class="py-2 font-mono text-text-main">{{ p.project_id }}</td>
              <td class="py-2 text-right text-text-muted">{{ p.count }}</td>
              <td class="py-2 text-right font-medium">RM {{ fmtNum(p.total_amount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Chart, registerables } from 'chart.js';
import api from '../services/api';

Chart.register(...registerables);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const summary    = ref(null);
const byDept     = ref([]);
const byProject  = ref([]);

const donutRef   = ref(null);
const trendRef   = ref(null);
const categoryRef= ref(null);

let charts = [];

const COLORS = {
  pending:  '#FCD34D',
  approved: '#34D399',
  rejected: '#F87171'
};

const PALETTE = ['#6366F1','#8B5CF6','#EC4899','#14B8A6','#F59E0B','#10B981','#3B82F6','#EF4444'];

const fmtNum = (n) => parseFloat(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

onMounted(async () => {
  const [sumRes, deptRes, catRes, projRes, trendRes] = await Promise.all([
    api.get('/dashboard/summary'),
    api.get('/dashboard/by-department'),
    api.get('/dashboard/by-category'),
    api.get('/dashboard/by-project'),
    api.get('/dashboard/monthly-trends')
  ]);

  summary.value   = sumRes.data;
  byDept.value    = deptRes.data;
  byProject.value = projRes.data;

  // Status Donut
  if (donutRef.value && summary.value) {
    const s = summary.value;
    const c = new Chart(donutRef.value, {
      type: 'doughnut',
      data: {
        labels: ['Pending', 'Approved', 'Rejected'],
        datasets: [{ data: [s.pending_count, s.approved_count, s.rejected_count], backgroundColor: [COLORS.pending, COLORS.approved, COLORS.rejected], borderWidth: 0 }]
      },
      options: { plugins: { legend: { position: 'bottom' } }, cutout: '65%' }
    });
    charts.push(c);
  }

  // Monthly Trend
  if (trendRef.value && trendRes.data.length) {
    const c = new Chart(trendRef.value, {
      type: 'bar',
      data: {
        labels: trendRes.data.map(r => r.month),
        datasets: [{ label: 'Total ($)', data: trendRes.data.map(r => parseFloat(r.total_amount)), backgroundColor: '#6366F1', borderRadius: 4 }]
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
    charts.push(c);
  }

  // By Category
  if (categoryRef.value && catRes.data.length) {
    const c = new Chart(categoryRef.value, {
      type: 'bar',
      data: {
        labels: catRes.data.map(r => r.category),
        datasets: [{ label: 'Total ($)', data: catRes.data.map(r => parseFloat(r.total_amount)), backgroundColor: catRes.data.map((_, i) => PALETTE[i % PALETTE.length]), borderRadius: 4 }]
      },
      options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
    });
    charts.push(c);
  }
});

onBeforeUnmount(() => charts.forEach(c => c.destroy()));
</script>
