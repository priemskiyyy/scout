<script setup lang="ts">
import { ICONS } from "examples/shared/ui/constants/icons";
import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
import BaseIcon from "src/components/BaseIcon/BaseIcon.vue";

defineProps<{ value: string; searching: boolean }>();

const emit = defineEmits<{ change: [value: string]; stop: [] }>();

const handleInput = (event: Event) => {
  if (!(event.target instanceof HTMLInputElement)) {
    return;
  }

  emit("change", event.target.value);
};
</script>

<template>
  <div class="relative flex items-center">
    <span class="pointer-events-none absolute left-3.5 text-stone-400">
      <BaseIcon :src="ICONS.magnifyingGlass" size="large" />
    </span>
    <input
      type="search"
      aria-label="Search the store"
      placeholder="Search tents, boots, stoves…"
      :value="value"
      class="h-12 w-full rounded-xl border border-stone-300 bg-white pr-28 pl-11 text-base shadow-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40 dark:border-stone-700 dark:bg-stone-900 dark:focus:border-amber-400 [&::-webkit-search-cancel-button]:hidden"
      @input="handleInput"
    />
    <div class="absolute right-2 flex items-center gap-1">
      <button
        v-if="searching"
        type="button"
        :class="buttonStyles({ variant: 'ghost', size: 'small' })"
        @click="emit('stop')"
      >
        <BaseIcon :src="ICONS.stop" size="small" />
        Stop
      </button>
      <button
        v-if="value !== ''"
        type="button"
        aria-label="Clear the search"
        :class="buttonStyles({ variant: 'ghost', size: 'small' })"
        @click="emit('change', '')"
      >
        <BaseIcon :src="ICONS.x" size="small" />
      </button>
    </div>
  </div>
</template>
