<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-[100] flex items-center justify-center">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      <!-- Panel -->
      <div class="relative bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-8 z-10">

        <!-- Step Progress -->
        <div class="space-y-6">
          <!-- Step 1: Signature Verification -->
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 mt-0.5">
              <!-- pending -->
              <div v-if="currentStep === 0" class="w-6 h-6 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
              <!-- success -->
              <div v-else-if="verification.signature_valid" class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
              </div>
              <!-- fail -->
              <div v-else class="w-6 h-6 bg-ember rounded-full flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-bold text-sm text-text-main">Verifying digital signature...</p>
              <p v-if="currentStep > 0 && verification.signature_valid" class="text-xs text-green-600 mt-0.5">Signature verified — matches submitter's device key.</p>
              <p v-else-if="currentStep > 0 && !verification.signature_valid" class="text-xs text-ember mt-0.5">{{ verification.signature_detail || 'Signature verification failed.' }}</p>
            </div>
          </div>

          <!-- Step 2: Hash Chain Integrity -->
          <div v-if="currentStep >= 1" class="flex items-start gap-4">
            <div class="flex-shrink-0 mt-0.5">
              <div v-if="currentStep === 1" class="w-6 h-6 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
              <div v-else-if="verification.hash_chain_valid" class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
              </div>
              <div v-else class="w-6 h-6 bg-ember rounded-full flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-bold text-sm text-text-main">Verifying database integrity...</p>
              <p v-if="currentStep > 1 && verification.hash_chain_valid" class="text-xs text-green-600 mt-0.5">Hash chain intact — no tampering detected.</p>
              <p v-else-if="currentStep > 1 && !verification.hash_chain_valid" class="text-xs text-ember mt-0.5">{{ verification.hash_chain_detail || 'Hash chain verification failed.' }}</p>
            </div>
          </div>

          <!-- Step 3: Bank Status Check (fake) -->
          <div v-if="currentStep >= 2" class="flex items-start gap-4">
            <div class="flex-shrink-0 mt-0.5">
              <div v-if="currentStep === 2" class="w-6 h-6 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
              <div v-else-if="verification.submitter_has_bank_info" class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
              </div>
              <div v-else class="w-6 h-6 bg-ember rounded-full flex items-center justify-center">
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-bold text-sm text-text-main">Checking bank status...</p>
              <p v-if="currentStep > 2 && verification.submitter_has_bank_info" class="text-xs text-green-600 mt-0.5">Bank account verified.</p>
              <p v-else-if="currentStep > 2 && !verification.submitter_has_bank_info" class="text-xs text-ember mt-0.5">Employee has no bank account on file.</p>
            </div>
          </div>

          <!-- Step 4: Final Result -->
          <div v-if="currentStep >= 3" class="pt-4 border-t border-border">
            <!-- All checks passed + bank exists = SUCCESS -->
            <div v-if="allChecksPassed && verification.submitter_has_bank_info" class="text-center space-y-3">
              <div class="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
              </div>
              <h3 class="text-xl font-bold text-green-700">Payout Successful</h3>
              <p class="text-sm text-text-muted">
                ${{ parseFloat(amount).toFixed(2) }} transferred to <strong>{{ employeeName }}</strong>.
              </p>
              <p class="text-xs text-text-muted">Transaction reference: {{ txnRef }}</p>
            </div>

            <!-- Verification failed -->
            <div v-else-if="!allChecksPassed" class="text-center space-y-3">
              <div class="w-16 h-16 bg-red-100 text-ember rounded-full flex items-center justify-center mx-auto">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <h3 class="text-xl font-bold text-ember">Payout Aborted</h3>
              <p class="text-sm text-text-muted">
                Verification failed. The expense data integrity could not be confirmed.
              </p>
              <p class="text-xs text-ember italic">{{ failureReason }}</p>
              <div v-if="failingPayout" class="text-xs text-text-muted mt-2">
                <span class="inline-block w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin mr-1 align-middle"></span>
                Rejecting expense...
              </div>
              <div v-else-if="payoutRejected" class="mt-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg inline-block">
                <p class="text-xs font-bold text-orange-600 uppercase">Payout Failed</p>
                <p class="text-[10px] text-orange-500 mt-0.5">Status set to payout_failed. Fix the issue and ask Finance to re-approve.</p>
              </div>
            </div>

            <!-- All checks passed + no bank info = FAIL -->
            <div v-else class="text-center space-y-3">
              <div class="w-16 h-16 bg-red-100 text-ember rounded-full flex items-center justify-center mx-auto">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </div>
              <h3 class="text-xl font-bold text-ember">Payout Failed</h3>
              <p class="text-sm text-text-muted">
                Employee <strong>{{ employeeName }}</strong> has not set up their bank account.
              </p>
              <p class="text-xs text-text-muted">Please ask them to update their bank details in Profile.</p>
              <div v-if="failingPayout" class="text-xs text-text-muted mt-2">
                <span class="inline-block w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin mr-1 align-middle"></span>
                Updating status...
              </div>
              <div v-else-if="payoutRejected" class="mt-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg inline-block">
                <p class="text-xs font-bold text-orange-600 uppercase">Payout Failed</p>
                <p class="text-[10px] text-orange-500 mt-0.5">Status set to payout_failed. Employee must update bank info, then Finance re-approves.</p>
              </div>
            </div>

            <button @click="close" class="mt-4 w-full bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-hover transition">
              Close
            </button>
          </div>
        </div>

        <!-- Cancel button (only before final result) -->
        <div v-if="currentStep < 3 && !cancelling" class="mt-6 pt-4 border-t border-border flex justify-end">
          <button
            @click="cancelPayout"
            :disabled="cancelling"
            class="border border-gray-300 text-text-muted px-5 py-2 rounded-lg text-sm font-medium hover:border-ember hover:text-ember transition disabled:opacity-50"
          >
            {{ cancelling ? 'Cancelling...' : 'Cancel Payout' }}
          </button>
        </div>

        <!-- Cancelled state -->
        <div v-if="cancelling && !cancelled" class="mt-6 pt-4 border-t border-border text-center">
          <div class="w-6 h-6 border-2 border-gray-300 border-t-primary rounded-full animate-spin mx-auto mb-2"></div>
          <p class="text-sm text-text-muted">Cancelling payout...</p>
        </div>
        <div v-if="cancelled" class="mt-6 pt-4 border-t border-border text-center space-y-3">
          <div class="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01"/></svg>
          </div>
          <h3 class="font-bold text-amber-700">Payout Cancelled</h3>
          <p class="text-xs text-text-muted">Expense reverted to dept_approved.</p>
          <button @click="onCancelled" class="w-full bg-amber-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-amber-700 transition text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import api from '../services/api';

const props = defineProps({
  visible: Boolean,
  expenseId: String,
  amount: [Number, String],
  employeeName: String
});

const emit = defineEmits(['close', 'cancelled']);

const currentStep = ref(0);
const verification = ref({
  signature_valid: false,
  signature_detail: null,
  hash_chain_valid: false,
  hash_chain_detail: null,
  submitter_has_bank_info: false
});
const cancelling = ref(false);
const cancelled = ref(false);
const failingPayout = ref(false);
const payoutRejected = ref(false);

const txnRef = ref('');

const allChecksPassed = computed(() =>
  verification.value.signature_valid && verification.value.hash_chain_valid
);

const isSuccess = computed(() =>
  allChecksPassed.value && verification.value.submitter_has_bank_info
);

const failureReason = computed(() => {
  if (!verification.value.signature_valid) return verification.value.signature_detail;
  if (!verification.value.hash_chain_valid) return verification.value.hash_chain_detail;
  if (!verification.value.submitter_has_bank_info) return 'Employee has not set up their bank account. Please ask them to update their bank details in Profile.';
  return '';
});

const payoutSuccess = async () => {
  try {
    await api.post(`/expenses/${props.expenseId}/payout-success`);
  } catch (e) {
    console.error('Payout success API error:', e);
  }
};

const failPayout = async () => {
  failingPayout.value = true;
  try {
    await api.post(`/expenses/${props.expenseId}/fail-payout`, {
      reason: failureReason.value || 'Payout failed: verification error.'
    });
    payoutRejected.value = true;
  } catch (e) {
    console.error('Fail payout API error:', e);
    // Still mark as payout_failed for UX even if API fails
    payoutRejected.value = true;
  } finally {
    failingPayout.value = false;
  }
};

const runVerification = async () => {
  currentStep.value = 0;
  cancelling.value = false;
  cancelled.value = false;
  failingPayout.value = false;
  payoutRejected.value = false;
  verification.value = { signature_valid: false, signature_detail: null, hash_chain_valid: false, hash_chain_detail: null, submitter_has_bank_info: false };

  try {
    const res = await api.post(`/expenses/${props.expenseId}/verify`);
    verification.value = res.data;
  } catch (e) {
    verification.value.signature_valid = false;
    verification.value.signature_detail = 'Verification request failed: ' + (e.response?.data?.error || e.message);
    verification.value.hash_chain_valid = false;
    verification.value.hash_chain_detail = 'Verification request failed.';
  }

  // Step 1: Signature result shown after API returns
  currentStep.value = 1;
  await delay(3000);

  if (cancelling.value) return;

  // Step 2: Hash chain result
  currentStep.value = 2;
  await delay(3000);

  if (cancelling.value) return;

  // Step 3: Bank status (fake — result already from API)
  currentStep.value = 3;
  await delay(3000);

  if (cancelling.value) return;

  // Step 4: Final result
  if (isSuccess.value) {
    txnRef.value = 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    // Mark payout as successful in DB
    await payoutSuccess();
  } else {
    // Auto-set: payout failed → mark as payout_failed (retryable)
    await failPayout();
  }
};

const cancelPayout = async () => {
  cancelling.value = true;
  try {
    await api.post(`/expenses/${props.expenseId}/cancel-payout`);
    cancelled.value = true;
  } catch (e) {
    // Still show cancelled state even on error for UX
    cancelled.value = true;
  }
};

const onCancelled = () => {
  emit('cancelled');
  emit('close');
};

const close = () => {
  // On failure, emit cancelled so parent refreshes the list
  if (!isSuccess.value) {
    emit('cancelled');
  }
  emit('close');
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

watch(() => props.visible, (val) => {
  if (val) runVerification();
});
</script>
