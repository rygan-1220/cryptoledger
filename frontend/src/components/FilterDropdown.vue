<template>
  <div class="relative" ref="containerRef">
    <button
      @click="open = !open"
      class="border border-border rounded px-3 py-1.5 text-sm w-full text-left flex items-center justify-between gap-2 hover:border-gray-400 transition"
    >
      <span v-if="modelValue.length === 0" class="text-text-muted">{{ placeholder }}</span>
      <span v-else class="text-text-main">{{ modelValue.length }} selected</span>
      <svg class="w-3.5 h-3.5 text-text-muted transition-transform" :class="{ 'rotate-180': open }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
    </button>

    <!-- Dropdown -->
    <div v-if="open" class="absolute z-50 mt-1 w-full bg-surface border border-border rounded-lg shadow-lg py-1">
      <div class="max-h-48 overflow-y-auto">
        <label
          v-for="opt in options"
          :key="opt.value"
          class="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm"
        >
          <input
            type="checkbox"
            :checked="modelValue.includes(opt.value)"
            @change="toggle(opt.value)"
            class="rounded border-gray-300 text-primary focus:ring-primary/30"
          />
          <span class="text-text-main">{{ opt.label }}</span>
        </label>
      </div>
      <div v-if="modelValue.length > 0" class="border-t border-border px-3 py-1.5">
        <button @click="clear" class="text-xs text-primary hover:underline">Clear all</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  options: { type: Array, default: () => [] },  // [{ value, label }]
  modelValue: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Select...' },
});

const emit = defineEmits(['update:modelValue', 'change']);

const open = ref(false);
const containerRef = ref(null);

const toggle = (val) => {
  const next = modelValue.value.includes(val)
    ? modelValue.value.filter(v => v !== val)
    : [...modelValue.value, val];
  emit('update:modelValue', next);
  emit('change', next);
};

const clear = () => {
  emit('update:modelValue', []);
  emit('change', []);
};

const modelValue = computed(() => props.modelValue);

// Close on outside click
const onClickOutside = (e) => {
  if (containerRef.value && !containerRef.value.contains(e.target)) {
    open.value = false;
  }
};

onMounted(() => document.addEventListener('click', onClickOutside));
onUnmounted(() => document.removeEventListener('click', onClickOutside));
</script>
