<script setup lang="ts">
import { flattenHits } from "@priemskiyyy/scout-tanstack-query";
import { computed } from "vue";

import type { SearchStatus } from "examples/shared/outpost/types/SearchStatus";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { ICONS } from "examples/shared/ui/constants/icons";
import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
import EmptyState from "src/components/EmptyState/EmptyState.vue";
import LoadMore from "src/components/Store/LoadMore.vue";
import ResultCard from "src/components/Store/ResultCard.vue";
import ResultSkeleton from "src/components/Store/ResultSkeleton.vue";
import StoreProblem from "src/components/Store/StoreProblem.vue";
import type { StoreView } from "src/types/StoreView";

const props = defineProps<{
  status: SearchStatus;
  view: StoreView;
  state: StoreState;
  engineName: string;
}>();

const emit = defineEmits<{
  facetsToggle: [];
  highlightsToggle: [];
  emptySetToggle: [];
  clear: [];
  retry: [];
  loadMore: [];
  skipInvalid: [];
  restart: [];
}>();

const latest = computed(() => props.view.data?.pages.at(-1) ?? null);
const hits = computed(() => flattenHits(props.view.data));
</script>

<template>
  <StoreProblem
    v-if="view.error !== null"
    :error="view.error"
    :engine-name="engineName"
    :state="state"
    @facets-toggle="emit('facetsToggle')"
    @highlights-toggle="emit('highlightsToggle')"
    @retry="emit('retry')"
    @skip-invalid="emit('skipInvalid')"
    @restart="emit('restart')"
  />
  <ResultSkeleton v-else-if="latest === null" />
  <!-- The engine never saw this search: the filter said it matches nothing. -->
  <EmptyState
    v-else-if="status === 'answered-by-scout'"
    :icon="ICONS.prohibit"
    title="Nothing can match"
    description="A set with nothing in it matches nothing, so Scout answered on its own, with an exact total of zero, and never asked the engine."
  >
    <button
      type="button"
      :class="buttonStyles({ size: 'small' })"
      @click="emit('emptySetToggle')"
    >
      Remove the empty set
    </button>
  </EmptyState>
  <EmptyState
    v-else-if="hits.length === 0"
    :icon="ICONS.funnel"
    title="Nothing matches"
    description="No product matches this search and these filters. The total below says how sure the engine is of that."
  >
    <button
      type="button"
      :class="buttonStyles({ size: 'small' })"
      @click="emit('clear')"
    >
      Clear filters
    </button>
  </EmptyState>
  <div v-else class="flex flex-col gap-4">
    <ol
      aria-label="Results"
      :aria-busy="view.isPlaceholderData"
      class="flex flex-col gap-2.5 transition-opacity"
      :class="{ 'opacity-60': view.isPlaceholderData }"
    >
      <ResultCard v-for="hit in hits" :key="hit.id" :hit="hit" />
    </ol>
    <LoadMore
      :shown="hits.length"
      :latest="latest"
      :loading="view.isFetchingNextPage"
      @load-more="emit('loadMore')"
    />
  </div>
</template>
