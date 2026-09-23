<script setup lang="ts">
import { formatStoreHeadline } from "examples/shared/outpost/formatting/formatStoreHeadline";
import { ACCURACY_LABELS } from "examples/shared/outpost/constants/labels";
import {
  PROFILE_OPTIONS,
  SORT_OPTIONS,
} from "examples/shared/outpost/constants/store";
import type { ProfileName } from "examples/shared/outpost/types/ProfileName";
import type { SortName } from "examples/shared/outpost/types/SortName";
import type { StoreResult } from "examples/shared/outpost/types/StoreResult";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { ICONS } from "examples/shared/ui/constants/icons";
import { ACCURACY_TONES } from "examples/shared/ui/constants/tones";
import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
import { FIELD_CLASS_NAME } from "examples/shared/ui/styles/fieldStyles";
import ToneBadge from "src/components/Badge/ToneBadge.vue";
import BaseIcon from "src/components/BaseIcon/BaseIcon.vue";
import SegmentedControl from "src/components/SegmentedControl/SegmentedControl.vue";

defineProps<{
  state: StoreState;
  latest: StoreResult | null;
  searching: boolean;
}>();

const emit = defineEmits<{
  profileSelect: [profile: ProfileName];
  sortSelect: [sort: SortName];
  facetsToggle: [];
  highlightsToggle: [];
}>();

const isSortName = (value: string): value is SortName =>
  SORT_OPTIONS.some((option) => option.value === value);

const handleSortChange = (event: Event) => {
  if (!(event.target instanceof HTMLSelectElement)) {
    return;
  }

  const { value } = event.target;

  if (!isSortName(value)) {
    return;
  }

  emit("sortSelect", value);
};
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <p aria-live="polite" class="text-lg font-semibold tracking-tight">
        {{ formatStoreHeadline(latest, searching) }}
      </p>
      <ToneBadge
        v-if="latest !== null"
        :tone="ACCURACY_TONES[latest.total.accuracy]"
      >
        {{ ACCURACY_LABELS[latest.total.accuracy] }}
      </ToneBadge>
      <label
        class="ml-auto flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400"
      >
        Sort
        <select
          :value="state.sort"
          :class="FIELD_CLASS_NAME"
          @change="handleSortChange"
        >
          <option
            v-for="option in SORT_OPTIONS"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <SegmentedControl
        label="Search in"
        :options="PROFILE_OPTIONS"
        :value="state.profile"
        @select="emit('profileSelect', $event)"
      />
      <div class="ml-auto flex flex-wrap gap-2">
        <button
          type="button"
          :aria-pressed="state.facets"
          :class="buttonStyles({ size: 'small', pressed: state.facets })"
          @click="emit('facetsToggle')"
        >
          <BaseIcon :src="ICONS.listNumbers" size="small" />
          Facet counts
        </button>
        <button
          type="button"
          :aria-pressed="state.highlights"
          :class="buttonStyles({ size: 'small', pressed: state.highlights })"
          @click="emit('highlightsToggle')"
        >
          <BaseIcon :src="ICONS.highlighter" size="small" />
          Highlights
        </button>
      </div>
    </div>
  </div>
</template>
