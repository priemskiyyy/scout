<script setup lang="ts">
import type { Tone } from "examples/shared/ui/types/Tone";
import ToneBadge from "src/components/Badge/ToneBadge.vue";
import BaseIcon from "src/components/BaseIcon/BaseIcon.vue";

defineProps<{
  icon: string;
  tone: Tone;
  code: string;
  title: string;
  message: string;
  explanation: string;
}>();
</script>

<template>
  <div
    role="alert"
    class="flex flex-col gap-3 rounded-xl border border-dashed border-stone-300 p-5 dark:border-stone-700"
  >
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-stone-500">
        <BaseIcon :src="icon" size="large" />
      </span>
      <p class="text-base font-semibold">{{ title }}</p>
      <ToneBadge :tone="tone">{{ code }}</ToneBadge>
    </div>
    <p
      class="rounded-lg bg-stone-100 px-3 py-2 font-mono text-sm leading-relaxed break-words text-stone-700 dark:bg-stone-800 dark:text-stone-300"
    >
      {{ message }}
    </p>
    <p class="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
      {{ explanation }}
    </p>
    <div class="flex flex-wrap gap-2"><slot /></div>
  </div>
</template>
