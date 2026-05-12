<template>
  <div class="min-h-screen bg-background flex flex-col justify-center py-12 px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-3xl">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-display font-black text-primary tracking-tight">CryptoLedger</h1>
        <p class="text-text-muted mt-2">Enterprise Setup Wizard</p>
      </div>

      <div class="bg-surface border border-border shadow-2xl rounded-3xl overflow-hidden">
        
        <!-- Progress Bar -->
        <div class="flex h-1 bg-gray-100">
          <div :style="{ width: ((step / 5) * 100) + '%' }" class="bg-primary transition-all duration-500"></div>
        </div>

        <div class="p-8 sm:p-12">
          <!-- Step 1: Infrastructure & Organization -->
          <div v-if="step === 1" class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h2 class="text-2xl font-display font-bold text-text-main">Welcome to CryptoLedger</h2>
              <p class="text-sm text-text-muted mt-1">Let's configure your workspace and infrastructure.</p>
            </div>
            
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-text-muted uppercase mb-1">Company Name</label>
                <input v-model="form.companyName" required class="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="e.g. Acme Corp" />
              </div>
              <div>
                <label class="block text-xs font-bold text-text-muted uppercase mb-1">Workspace ID</label>
                <input v-model="form.workspaceId" required class="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-primary" placeholder="acme-corp" />
              </div>
              <div class="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <label class="block text-xs font-bold text-text-muted uppercase mb-1">Database URL (PostgreSQL)</label>
                  <input v-model="form.dbUrl" required class="w-full bg-background border border-border rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-text-muted uppercase mb-1">Redis URL</label>
                  <input v-model="form.redisUrl" required class="w-full bg-background border border-border rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
            </div>
            <div class="flex justify-end pt-4">
              <button @click="nextStep" :disabled="!form.companyName || !form.workspaceId" class="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-hover transition disabled:opacity-50">Next: Departments →</button>
            </div>
          </div>

          <!-- Step 2: Department Topology -->
          <div v-if="step === 2" class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h2 class="text-2xl font-display font-bold text-text-main">Department Topology</h2>
              <p class="text-sm text-text-muted mt-1">Define the departments in your organization. 'Operations' is mandatory for System Admin.</p>
            </div>
            
            <div class="space-y-3">
              <div class="flex items-center gap-3 p-3 bg-gray-50 border border-border rounded-xl">
                <span class="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-bold uppercase">System</span>
                <span class="font-medium text-text-main">Operations</span>
                <span class="ml-auto text-xs text-text-muted italic">Cannot be removed</span>
              </div>
              
              <div v-for="(dept, index) in form.departments" :key="index" class="flex items-center gap-3">
                <input v-model="form.departments[index]" class="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Department Name" />
                <button @click="removeDept(index)" class="p-3 text-ember hover:bg-red-50 rounded-xl transition">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
              
              <button @click="addDept" class="flex items-center gap-2 text-primary font-medium text-sm hover:underline p-2">
                <span>+ Add Department</span>
              </button>
            </div>

            <div class="flex justify-between pt-4">
              <button @click="prevStep" class="text-text-muted hover:text-text-main px-4 py-2 font-medium">← Back</button>
              <button @click="nextStep" :disabled="form.departments.some(d => !d.trim())" class="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-hover transition disabled:opacity-50">Next: Managers →</button>
            </div>
          </div>

          <!-- Step 3: Genesis Managers -->
          <div v-if="step === 3" class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h2 class="text-2xl font-display font-bold text-text-main">Genesis Managers</h2>
              <p class="text-sm text-text-muted mt-1">Assign an initial manager for each department. They will receive an invitation link.</p>
            </div>

            <div v-if="form.departments.length === 0" class="p-4 bg-blue-50 text-blue-700 rounded-xl text-sm border border-blue-100">
              No custom departments created. You can proceed to Admin setup.
            </div>
            
            <div class="space-y-6 max-h-[400px] overflow-y-auto pr-2">
              <div v-for="(dept, index) in form.departments" :key="index" class="p-5 bg-surface border border-border rounded-xl space-y-4">
                <h3 class="font-bold text-text-main border-b border-border pb-2">{{ dept }} <span class="text-xs text-text-muted font-normal ml-2">Department Manager</span></h3>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-bold text-text-muted uppercase mb-1">Full Name</label>
                    <input v-model="form.managers[index].name" required class="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Manager Name" />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-text-muted uppercase mb-1">Email Address</label>
                    <input v-model="form.managers[index].email" required type="email" class="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="manager@example.com" />
                  </div>
                </div>
              </div>
            </div>

            <div class="flex justify-between pt-4">
              <button @click="prevStep" class="text-text-muted hover:text-text-main px-4 py-2 font-medium">← Back</button>
              <button @click="nextStep" :disabled="!managersValid" class="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-hover transition disabled:opacity-50">Next: Admin Account →</button>
            </div>
          </div>

          <!-- Step 4: Genesis Admin -->
          <div v-if="step === 4" class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h2 class="text-2xl font-display font-bold text-text-main">Genesis Admin</h2>
              <p class="text-sm text-text-muted mt-1">Create the master administrator account. This account holds the root keys.</p>
            </div>
            
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-text-muted uppercase mb-1">Full Name</label>
                <input v-model="form.adminName" required class="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Admin Name" />
              </div>
              <div>
                <label class="block text-xs font-bold text-text-muted uppercase mb-1">Email Address</label>
                <input v-model="form.adminEmail" required type="email" class="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="admin@example.com" />
              </div>
              <div>
                <label class="block text-xs font-bold text-text-muted uppercase mb-1">Password</label>
                <input v-model="form.adminPassword" required type="password" class="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="••••••••" />
              </div>
            </div>

            <div class="flex justify-between pt-4">
              <button @click="prevStep" class="text-text-muted hover:text-text-main px-4 py-2 font-medium">← Back</button>
              <button @click="nextStep" :disabled="!form.adminName || !form.adminEmail || form.adminPassword.length < 8" class="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-hover transition disabled:opacity-50">Review & Ignite →</button>
            </div>
          </div>

          <!-- Step 5: The Ignition -->
          <div v-if="step === 5" class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div v-if="!ignitionComplete">
              <h2 class="text-2xl font-display font-bold text-text-main mb-2">Ready for Ignition</h2>
              <p class="text-sm text-text-muted mb-6">Review your configuration. Click Ignite to generate all cryptographic keys and initialize the system.</p>
              
              <div class="bg-gray-50 p-4 rounded-xl border border-border text-sm space-y-2 mb-6">
                <p><strong>Organization:</strong> {{ form.companyName }} ({{ form.workspaceId }})</p>
                <p><strong>Departments:</strong> Operations, {{ form.departments.join(', ') }}</p>
                <p><strong>Admin:</strong> {{ form.adminName }} ({{ form.adminEmail }})</p>
              </div>

              <div v-if="error" class="text-ember text-sm mb-4 bg-red-50 p-3 rounded-lg border border-red-100">{{ error }}</div>

              <div class="flex justify-between items-center pt-4 border-t border-border">
                <button @click="prevStep" :disabled="igniting" class="text-text-muted hover:text-text-main px-4 py-2 font-medium disabled:opacity-50">← Back</button>
                <button @click="igniteSystem" :disabled="igniting" class="bg-gradient-to-r from-primary to-blue-600 text-white px-8 py-4 rounded-xl font-black text-lg hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 flex items-center gap-2">
                  <svg v-if="igniting" class="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  {{ igniting ? statusMsg : 'IGNITE SYSTEM 🔥' }}
                </button>
              </div>
            </div>

            <!-- Completion View -->
            <div v-else class="space-y-6">
              <div class="text-center">
                <div class="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                </div>
                <h2 class="text-3xl font-display font-black text-text-main">System Online</h2>
                <p class="text-text-muted mt-2">CryptoLedger has been successfully initialized.</p>
              </div>

              <!-- Recovery Phrase -->
              <div class="bg-amber-50 border border-amber-200 rounded-2xl p-6 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                <h3 class="font-bold text-amber-800 flex items-center gap-2 mb-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  Master Recovery Phrase
                </h3>
                <p class="text-sm text-amber-700 mb-4">Store these 12 words in a secure, offline location. They are the <strong>ONLY</strong> way to recover the root system keys if the server configuration is lost.</p>
                
                <div class="grid grid-cols-4 gap-2 bg-white p-4 rounded-xl border border-amber-100 font-mono text-sm">
                  <div v-for="(word, i) in recoveryPhrase.split(' ')" :key="i" class="flex items-center gap-2 bg-amber-50 px-3 py-2 rounded">
                    <span class="text-amber-400 text-xs select-none">{{ i + 1 }}.</span>
                    <span class="font-bold text-amber-900">{{ word }}</span>
                  </div>
                </div>
              </div>

              <!-- Manager Invite Links -->
              <div v-if="managerInvites.length > 0" class="bg-surface border border-border rounded-2xl p-6">
                <h3 class="font-bold text-text-main mb-4">Department Manager Invites</h3>
                <p class="text-xs text-text-muted mb-4">Share these one-time setup links securely with your assigned managers.</p>
                <div class="space-y-3">
                  <div v-for="invite in managerInvites" :key="invite.email" class="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg border border-border">
                    <div class="flex justify-between items-center">
                      <span class="font-bold text-sm">{{ invite.deptName }}</span>
                      <span class="text-xs text-text-muted">{{ invite.email }}</span>
                    </div>
                    <div class="flex gap-2 mt-1">
                      <input :value="invite.link" readonly class="flex-1 bg-white border border-border rounded px-2 py-1 text-[10px] font-mono focus:outline-none" />
                      <button @click="copy(invite.link)" class="bg-primary text-white px-3 py-1 rounded text-[10px] hover:bg-primary-hover">Copy</button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="pt-6 flex justify-center">
                <button @click="finishSetup" class="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-hover transition text-lg w-full">
                  I have saved the Recovery Phrase. Go to Login →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import { generateRSAKeyPair, exportPublicKey, savePrivateKey, decryptLayer1 } from '../services/cryptoService';

const router = useRouter();
const step = ref(1);

const form = reactive({
  companyName: '',
  workspaceId: '',
  dbUrl: 'postgresql://cryptoledger:password@localhost:5432/cryptoledger_db',
  redisUrl: 'redis://localhost:6379',
  departments: [],
  managers: [],
  adminName: '',
  adminEmail: '',
  adminPassword: ''
});

// Watch departments to sync managers array
watch(() => form.departments, (newDepts) => {
  const newManagers = newDepts.map((_, i) => {
    return form.managers[i] || { name: '', email: '' };
  });
  form.managers = newManagers;
}, { deep: true });

const managersValid = computed(() => {
  if (form.departments.length === 0) return true;
  return form.managers.every(m => m.name.trim() && m.email.trim() && m.email.includes('@'));
});

const nextStep = () => { if (step.value < 5) step.value++; };
const prevStep = () => { if (step.value > 1) step.value--; };

const addDept = () => { form.departments.push(''); };
const removeDept = (index) => { form.departments.splice(index, 1); };

const igniting = ref(false);
const statusMsg = ref('');
const error = ref('');
const ignitionComplete = ref(false);
const recoveryPhrase = ref('');
const managerInvites = ref([]);

const copy = (text) => navigator.clipboard.writeText(text);

const igniteSystem = async () => {
  igniting.value = true;
  error.value = '';
  
  try {
    statusMsg.value = 'Generating Admin RSA Keys...';
    const keyPair = await generateRSAKeyPair();
    const rsaPublicKey = await exportPublicKey(keyPair.publicKey);
    await savePrivateKey(keyPair.privateKey);

    statusMsg.value = 'Initializing System & DB...';
    
    // The massive ignition payload
    const payload = {
      companyName: form.companyName,
      workspaceId: form.workspaceId,
      dbUrl: form.dbUrl,
      redisUrl: form.redisUrl,
      departments: form.departments.filter(d => d.trim() !== ''),
      managers: form.managers, // Sent to backend to generate invites
      adminName: form.adminName,
      adminEmail: form.adminEmail,
      password: form.adminPassword,
      rsaPublicKey
    };

    const res = await api.post('/setup/ignite', payload);
    
    statusMsg.value = 'Securing Management Keys...';
    const { wrapped_management_key, recoveryPhrase: phrase, invites } = res.data;
    
    // Decrypt the operations K_real
    const { unwrapKReal } = await import('../services/cryptoService');
    const rawKReal = await unwrapKReal(wrapped_management_key, null);
    
    // Store it locally for auto-login/usage
    localStorage.setItem('cryptoledger_kreal', rawKReal);
    
    recoveryPhrase.value = phrase;
    managerInvites.value = invites || [];
    ignitionComplete.value = true;
  } catch (e) {
    console.error(e);
    error.value = e.response?.data?.error || e.message || 'Ignition failed. Check console.';
  } finally {
    igniting.value = false;
  }
};

const finishSetup = () => {
  router.push('/login');
};
</script>
