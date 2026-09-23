<script setup lang="ts">
import { computed } from "vue";

import { ICONS } from "examples/shared/ui/constants/icons";
import { CODE_BLOCK_CLASS_NAME } from "examples/shared/ui/styles/codeStyles";
import {
  codeBlockStyles,
  detailsStyles,
  summaryStyles,
} from "examples/shared/ui/styles/detailsStyles";
import BaseIcon from "src/components/BaseIcon/BaseIcon.vue";

const props = withDefaults(
  defineProps<{
    summary: string;
    label: string;
    code: string;
    variant?: "boxed" | "quiet";
  }>(),
  { variant: "boxed" },
);

const blockClass = computed(() => [
  codeBlockStyles({ variant: props.variant }),
  CODE_BLOCK_CLASS_NAME,
]);
</script>

<template>
  <details :class="detailsStyles({ variant })">
    <summary :class="summaryStyles({ variant })">
      <span
        class="text-stone-400 transition-transform group-open:rotate-90 motion-reduce:transition-none"
      >
        <BaseIcon :src="ICONS.caretRight" size="small" />
      </span>
      {{ summary }}
    </summary>
    <pre :aria-label="label" :class="blockClass">{{ code }}</pre>
  </details>
</template>
