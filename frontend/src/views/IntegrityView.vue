<template>
  <div class="min-h-screen bg-background p-8">
    <div class="max-w-4xl mx-auto space-y-6">
      <h1 class="text-3xl font-display font-bold text-text-main">Integrity & Audit</h1>

      <!-- Hash Chain Verification -->
      <div class="bg-surface border border-border rounded p-6 shadow-sm">
        <h2 class="text-xl font-bold text-text-main mb-2">Hash Chain Verification</h2>
        <p class="text-text-muted text-sm mb-4">Recomputes every expense hash and checks the linked chain for tampering.</p>
        <button @click="verifyChain" :disabled="verifying" class="bg-primary text-white px-4 py-2 rounded hover:bg-primary-hover font-medium text-sm disabled:opacity-50 transition">
          {{ verifying ? 'Verifying…' : 'Verify Hash Chain' }}
        </button>

        <div v-if="chainResult" class="mt-4 p-4 rounded" :class="chainResult.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'">
          <div class="flex items-center gap-2 font-bold" :class="chainResult.valid ? 'text-green-700' : 'text-red-700'">
            <span v-if="chainResult.valid">✓ Chain Intact</span>
            <span v-else>✗ Tampering Detected!</span>
          </div>
          <p class="text-sm mt-1" :class="chainResult.valid ? 'text-green-600' : 'text-red-600'">
            Checked {{ chainResult.checked }} records.
            <span v-if="!chainResult.valid"> — {{ chainResult.reason }}</span>
          </p>
          <p v-if="chainResult.broken_at" class="font-mono text-xs mt-1 text-red-500">Broken at: {{ chainResult.broken_at }}</p>
        </div>
      </div>

      <!-- Merkle Checkpoint -->
      <div class="bg-surface border border-border rounded p-6 shadow-sm">
        <h2 class="text-xl font-bold text-text-main mb-2">MTTBA Merkle Checkpoint</h2>
        <p class="text-text-muted text-sm mb-4">Creates a cryptographic snapshot of all new expenses since the last checkpoint using the Merkle Trim Tree-Based Authentication algorithm.</p>
        <button @click="createCheckpoint" :disabled="checkpointing" class="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-medium text-sm disabled:opacity-50 transition">
          {{ checkpointing ? 'Creating…' : 'Create Merkle Checkpoint' }}
        </button>
        <div v-if="checkpointResult" class="mt-4 p-4 bg-purple-50 border border-purple-200 rounded">
          <p class="text-purple-700 font-bold text-sm">✓ Checkpoint Created</p>
          <p class="text-xs text-purple-600 mt-1">{{ checkpointResult.record_count }} records included</p>
          <p class="font-mono text-xs text-purple-500 mt-1 break-all">Root: {{ checkpointResult.root_hash }}</p>
        </div>
        <div v-if="checkpointError" class="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">{{ checkpointError }}</div>
      </div>

      <!-- Merkle Root Log -->
      <div class="bg-surface border border-border rounded p-6 shadow-sm">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-text-main">Merkle Roots</h2>
          <button @click="loadRoots" class="text-primary text-sm hover:underline">Refresh</button>
        </div>

        <div v-if="!roots.length" class="text-text-muted text-sm">No checkpoints yet.</div>
        <div v-else class="space-y-3">
          <div v-for="r in roots" :key="r.root_id" class="border border-border rounded p-4">
            <div class="flex justify-between items-start">
              <div>
                <p class="font-mono text-xs text-text-muted">{{ r.root_id }}</p>
                <p class="font-mono text-xs text-primary mt-1 break-all">{{ r.root_hash }}</p>
                <p class="text-xs text-text-muted mt-1">{{ r.record_count }} records · by {{ r.created_by_name }} · {{ fmtTime(r.created_at) }}</p>
              </div>
              <button @click="verifyRoot(r.root_id)" class="text-sm text-primary hover:underline ml-4 flex-shrink-0">Verify</button>
            </div>
            <div v-if="rootVerifyResults[r.root_id]" class="mt-2 text-xs p-2 rounded" :class="rootVerifyResults[r.root_id].valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">
              {{ rootVerifyResults[r.root_id].valid ? '✓ Root matches recomputed hash' : '✗ Root mismatch! Data may have been tampered with.' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import api from '../services/api';

const verifying       = ref(false);
const checkpointing   = ref(false);
const chainResult     = ref(null);
const checkpointResult= ref(null);
const checkpointError = ref('');
const roots           = ref([]);
const rootVerifyResults = reactive({});

const verifyChain = async () => {
  verifying.value = true;
  chainResult.value = null;
  try {
    const res = await api.post('/integrity/verify-chain');
    chainResult.value = res.data;
  } catch (err) { chainResult.value = { valid: false, checked: 0, reason: err.message }; }
  finally { verifying.value = false; }
};

const createCheckpoint = async () => {
  checkpointing.value = true;
  checkpointResult.value = null;
  checkpointError.value  = '';
  try {
    const res = await api.post('/integrity/create-merkle-checkpoint');
    checkpointResult.value = res.data;
    await loadRoots();
  } catch (err) { checkpointError.value = err.response?.data?.error || err.message; }
  finally { checkpointing.value = false; }
};

const loadRoots = async () => {
  const res = await api.get('/integrity/merkle-roots');
  roots.value = res.data;
};

const verifyRoot = async (rootId) => {
  try {
    const res = await api.post(`/integrity/verify-merkle/${rootId}`);
    rootVerifyResults[rootId] = res.data;
  } catch (err) { rootVerifyResults[rootId] = { valid: false }; }
};

onMounted(loadRoots);

const fmtTime = (d) => new Date(d).toLocaleString('en-MY', { dateStyle:'medium', timeStyle:'short' });
</script>
