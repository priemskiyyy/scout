<script setup lang="ts">
import { computed } from "vue";

import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { getSearchProblem } from "examples/shared/outpost/utils/getSearchProblem";
import { ICONS, PROBLEM_ICONS } from "examples/shared/ui/constants/icons";
import { PROBLEM_TONES } from "examples/shared/ui/constants/tones";
import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
import BaseIcon from "src/components/BaseIcon/BaseIcon.vue";
import SearchProblem from "src/components/Store/SearchProblem.vue";

const props = defineProps<{
  error: Error;
  engineName: string;
  state: StoreState;
}>();

const emit = defineEmits<{
  facetsToggle: [];
  highlightsToggle: [];
  retry: [];
  skipInvalid: [];
  restart: [];
}>();

const problem = computed(() => getSearchProblem(props.error, props.engineName));
</script>

<template>
  <SearchProblem
    :icon="PROBLEM_ICONS[problem.code]"
    :tone="PROBLEM_TONES[problem.code]"
    :code="problem.code"
    :title="problem.title"
    :message="problem.message"
    :explanation="problem.explanation"
  >
    <button
      v-if="problem.action === 'retry'"
      type="button"
      :class="buttonStyles()"
      @click="emit('retry')"
    >
      <BaseIcon :src="ICONS.arrowClockwise" size="regular" />
      Try again
    </button>
    <template v-if="problem.action === 'narrow'">
      <button
        v-if="state.facets"
        type="button"
        :class="buttonStyles()"
        @click="emit('facetsToggle')"
      >
        Search without facet counts
      </button>
      <button
        v-if="state.highlights"
        type="button"
        :class="buttonStyles()"
        @click="emit('highlightsToggle')"
      >
        Search without highlights
      </button>
    </template>
    <button
      v-if="problem.action === 'skip-invalid'"
      type="button"
      :class="buttonStyles()"
      @click="emit('skipInvalid')"
    >
      Skip invalid documents
    </button>
    <button
      v-if="problem.action === 'restart'"
      type="button"
      :class="buttonStyles()"
      @click="emit('restart')"
    >
      <BaseIcon :src="ICONS.power" size="regular" />
      Restart Scout
    </button>
  </SearchProblem>
</template>
