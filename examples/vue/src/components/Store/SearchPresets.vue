<script setup lang="ts">
import { SEARCH_PRESETS } from "examples/shared/outpost/constants/store";

defineProps<{ query: string }>();

const emit = defineEmits<{ select: [query: string] }>();
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <span class="text-sm text-stone-500">Try</span>
    <button
      v-for="preset in SEARCH_PRESETS"
      :key="preset.label"
      type="button"
      :aria-pressed="preset.query === query"
      class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm text-stone-700 transition hover:border-stone-300 hover:bg-stone-50 aria-pressed:border-amber-500 aria-pressed:text-amber-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:aria-pressed:border-amber-400 dark:aria-pressed:text-amber-200"
      @click="emit('select', preset.query)"
    >
      {{ preset.label }}
    </button>
  </div>
</template>
