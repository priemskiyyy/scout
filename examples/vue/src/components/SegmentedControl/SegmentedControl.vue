<script setup lang="ts" generic="T extends string | number">
import type { Option } from "examples/shared/outpost/types/Option";
import { PILL_CLASS_NAME } from "examples/shared/ui/styles/pillStyles";
import { segmentStyles } from "examples/shared/ui/styles/segmentStyles";

defineProps<{ label: string; options: Option<T>[]; value: T }>();

const emit = defineEmits<{ select: [value: T] }>();
</script>

<template>
  <div role="group" :aria-label="label" :class="PILL_CLASS_NAME">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="value === option.value"
      :class="segmentStyles({ selected: value === option.value })"
      @click="emit('select', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
