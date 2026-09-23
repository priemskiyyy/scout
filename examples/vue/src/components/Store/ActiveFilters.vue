<script setup lang="ts">
import { computed } from "vue";

import type { StoreAction } from "examples/shared/outpost/types/StoreAction";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { getActiveFilters } from "examples/shared/outpost/utils/getActiveFilters";
import { ICONS } from "examples/shared/ui/constants/icons";
import BaseIcon from "src/components/BaseIcon/BaseIcon.vue";

const props = defineProps<{ state: StoreState }>();

const emit = defineEmits<{ remove: [action: StoreAction] }>();

const filters = computed(() => getActiveFilters(props.state));
</script>

<template>
  <ul
    v-if="filters.length > 0"
    aria-label="Active filters"
    class="flex flex-wrap gap-1.5"
  >
    <li v-for="filter in filters" :key="filter.key">
      <button
        type="button"
        :aria-label="`Remove ${filter.label}`"
        class="inline-flex items-center gap-1 rounded-full bg-amber-100 py-1 pr-2 pl-3 text-sm font-medium text-amber-900 transition hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-100 dark:hover:bg-amber-900"
        @click="emit('remove', filter.remove)"
      >
        {{ filter.label }}
        <BaseIcon :src="ICONS.x" size="xsmall" />
      </button>
    </li>
  </ul>
</template>
