<script setup lang="ts">
import type { SearchFacet } from "@priemskiyyy/scout";

import { formatFacetCount } from "examples/shared/outpost/formatting/formatFacetCount";
import type { FacetOption } from "examples/shared/outpost/types/FacetOption";
import { checkStyles } from "examples/shared/ui/styles/checkStyles";
import { LEGEND_CLASS_NAME } from "examples/shared/ui/styles/legendStyles";

defineProps<{
  title: string;
  facet: SearchFacet<string> | null;
  options: readonly FacetOption[];
  selected: readonly string[];
}>();

const emit = defineEmits<{ toggle: [value: string] }>();
</script>

<template>
  <fieldset class="flex flex-col gap-0.5">
    <legend :class="LEGEND_CLASS_NAME">{{ title }}</legend>
    <label
      v-for="option in options"
      :key="option.value"
      :class="checkStyles({ checked: selected.includes(option.value) })"
    >
      <input
        type="checkbox"
        :checked="selected.includes(option.value)"
        class="size-4 accent-amber-600"
        @change="emit('toggle', option.value)"
      />
      <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
      <span
        v-if="formatFacetCount(facet, option.value) !== null"
        class="font-mono text-xs text-stone-500 tabular-nums"
      >
        {{ formatFacetCount(facet, option.value) }}
      </span>
    </label>
  </fieldset>
</template>
