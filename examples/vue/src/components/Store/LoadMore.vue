<script setup lang="ts">
import { computed } from "vue";

import { formatShown } from "examples/shared/outpost/formatting/formatShown";
import type { StoreResult } from "examples/shared/outpost/types/StoreResult";
import { ICONS } from "examples/shared/ui/constants/icons";
import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
import BaseIcon from "src/components/BaseIcon/BaseIcon.vue";

const props = defineProps<{
  shown: number;
  latest: StoreResult;
  loading: boolean;
}>();

const emit = defineEmits<{ loadMore: [] }>();

// What the core derived about the next page decides what the list says.
const getHint = (next: StoreResult["page"]["next"]) => {
  if (next === "unknown") {
    return "The count cannot say whether there is more, so the list asks for another page.";
  }

  if (next === null) {
    return "That is the last page the engine can serve.";
  }

  return null;
};

const hint = computed(() => getHint(props.latest.page.next));
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
    <button
      v-if="latest.page.next !== null"
      type="button"
      :disabled="loading"
      :class="buttonStyles()"
      @click="emit('loadMore')"
    >
      <span v-if="loading" class="inline-flex animate-spin">
        <BaseIcon :src="ICONS.circleNotch" size="regular" />
      </span>
      <BaseIcon v-else :src="ICONS.arrowDown" size="regular" />
      Load more
    </button>
    <p class="text-sm text-stone-500">
      {{ formatShown(shown, latest.total) }}
      <span v-if="hint !== null" class="block">{{ hint }}</span>
    </p>
  </div>
</template>
