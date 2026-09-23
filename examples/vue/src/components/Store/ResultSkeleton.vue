<script setup lang="ts">
import { CARD_CLASS_NAME } from "examples/shared/ui/styles/cardStyles";

const PLACEHOLDERS = [1, 2, 3, 4];
</script>

<template>
  <ul aria-label="Loading results" class="flex flex-col gap-2.5">
    <li
      v-for="placeholder in PLACEHOLDERS"
      :key="placeholder"
      class="flex animate-pulse gap-3 p-3"
      :class="CARD_CLASS_NAME"
    >
      <span
        class="size-12 shrink-0 rounded-2xl bg-stone-200 dark:bg-stone-800"
      />
      <span class="flex flex-1 flex-col gap-2 pt-1">
        <span class="h-3 w-24 rounded bg-stone-200 dark:bg-stone-800" />
        <span class="h-4 w-40 rounded bg-stone-200 dark:bg-stone-800" />
        <span class="h-3 w-full rounded bg-stone-200 dark:bg-stone-800" />
      </span>
    </li>
  </ul>
</template>
