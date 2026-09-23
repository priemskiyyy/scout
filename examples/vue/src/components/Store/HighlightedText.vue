<script setup lang="ts">
import type { HighlightFragment } from "@priemskiyyy/scout";
import { computed } from "vue";

const props = defineProps<{
  fragments: readonly HighlightFragment[] | null;
  text: string;
}>();

const MARK_CLASS_NAME =
  "rounded bg-amber-200/80 px-0.5 text-inherit dark:bg-amber-500/30";

// Scout's parts are text, never markup, so a document that carries a tag
// shows the tag.
const parts = computed(() => props.fragments?.[0]?.parts ?? null);
</script>

<template>
  <template v-if="parts === null">{{ text }}</template>
  <template v-for="(part, index) in parts" v-else :key="index">
    <mark v-if="part.matched" :class="MARK_CLASS_NAME">{{ part.text }}</mark>
    <template v-else>{{ part.text }}</template>
  </template>
</template>
