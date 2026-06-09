<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-[110] flex items-center justify-center">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('cancel')"></div>

      <!-- Dialog -->
      <div class="relative bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 z-10">
        <h3 class="text-lg font-bold text-text-main mb-2">{{ title }}</h3>
        <p class="text-sm text-text-muted mb-4">{{ message }}</p>

        <!-- Reject: text input for reason -->
        <div v-if="mode === 'reject'">
          <textarea
            v-model="reason"
            rows="3"
            class="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ember/50 resize-none"
            placeholder="Enter rejection reason..."
          ></textarea>
          <p v-if="reasonError" class="text-ember text-xs mt-1">{{ reasonError }}</p>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 mt-5">
          <button
            @click="$emit('cancel')"
            :disabled="loading"
            class="border border-gray-300 text-text-muted px-4 py-2 rounded text-sm font-medium hover:border-gray-400 hover:text-text-main transition disabled:opacity-50"
          >
            {{ cancelLabel }}
          </button>
          <button
            @click="onConfirm"
            :disabled="loading"
            :class="confirmClass"
            class="px-4 py-2 rounded text-sm font-medium transition disabled:opacity-50 text-white"
          >
            <span v-if="loading" class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1 align-middle"></span>
            {{ loading ? 'Processing…' : confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  visible: Boolean,
  mode: { type: String, default: 'confirm' }, // 'confirm' | 'reject'
  title: String,
  message: String,
  confirmLabel: { type: String, default: 'Confirm' },
  cancelLabel: { type: String, default: 'Cancel' },
  loading: Boolean,
});

const emit = defineEmits(['confirm', 'cancel']);

const reason = ref('');
const reasonError = ref('');

const confirmClass = computed(() => {
  if (props.mode === 'reject') return 'bg-ember hover:bg-red-600';
  return 'bg-primary hover:bg-primary-hover';
});

const onConfirm = () => {
  if (props.mode === 'reject') {
    if (!reason.value.trim()) {
      reasonError.value = 'Please enter a reason.';
      return;
    }
    emit('confirm', reason.value.trim());
  } else {
    emit('confirm');
  }
};

// Reset state when dialog opens
watch(() => props.visible, (val) => {
  if (val) {
    reason.value = '';
    reasonError.value = '';
  }
});
</script>
