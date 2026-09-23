<script setup lang="ts">
import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import { computed, onScopeDispose, shallowRef } from "vue";

import { createOutpostRuntime } from "examples/shared/outpost/runtime/createOutpostRuntime";
import type { Outpost } from "examples/shared/outpost/types/Outpost";
import type { OutpostRuntime } from "examples/shared/outpost/types/OutpostRuntime";
import type { ValidationMode } from "examples/shared/outpost/types/ValidationMode";
import { buildStoreSearch } from "examples/shared/outpost/utils/buildStoreSearch";
import { createStopSwitch } from "examples/shared/outpost/utils/createStopSwitch";
import { createStoreQueryOptions } from "examples/shared/outpost/utils/createStoreQueryOptions";
import { getSearchStatus } from "examples/shared/outpost/utils/getSearchStatus";
import PageHero from "src/components/PageHero/PageHero.vue";
import PageHeader from "src/components/PageHeader/PageHeader.vue";
import LatestSearchPanel from "src/components/Search/LatestSearchPanel.vue";
import StoreApp from "src/components/Store/StoreApp.vue";
import { useDebouncedValue } from "src/composables/useDebouncedValue";
import { useStoreState } from "src/composables/useStoreState";
import type { StoreView } from "src/types/StoreView";

const props = defineProps<{ outpost: Outpost; runtime: OutpostRuntime }>();

const queryClient = useQueryClient();
const { state, dispatch } = useStoreState();
const runtime = shallowRef(props.runtime);
const stopSwitch = createStopSwitch();
const query = useDebouncedValue(() => state.value.query, 250);

// The search is built from what the controls say once typing settles.
const searched = computed(() => ({ ...state.value, query: query.value }));

const search = computed(() =>
  buildStoreSearch(
    runtime.value.indexes[searched.value.engine],
    searched.value,
  ),
);

const options = computed(() =>
  createStoreQueryOptions(search.value, stopSwitch.getSignal),
);

const results = useInfiniteQuery(() => ({
  ...options.value,
  placeholderData: keepPreviousData,
}));

const view = computed<StoreView>(() => ({
  error: results.error.value,
  data: results.data.value,
  isPlaceholderData: results.isPlaceholderData.value,
  isFetching: results.isFetching.value,
  isFetchingNextPage: results.isFetchingNextPage.value,
  dataUpdatedAt: results.dataUpdatedAt.value,
}));

const status = computed(() => getSearchStatus(view.value));

// Your API changed how it answers, so what the page cached from it is stale.
onScopeDispose(
  props.outpost.backend.state.subscribe(() => {
    queryClient.invalidateQueries().catch(() => {});
  }),
);

const handleRetry = () => {
  results.refetch().catch(() => {});
};

const handleLoadMore = () => {
  results.fetchNextPage().catch(() => {});
};

// A disposed Scout cannot search again, so a restart replaces it.
const replaceRuntime = (validate: ValidationMode) => {
  runtime.value.dispose();

  const next = createOutpostRuntime({ ...props.outpost, validate });

  next.record({ kind: "restarted", validate });
  queryClient.removeQueries();
  runtime.value = next;
};
</script>

<template>
  <PageHeader :status="status" />
  <main class="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6">
    <PageHero />
    <div
      class="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
    >
      <StoreApp
        :state="state"
        :view="view"
        :status="status"
        @action="dispatch"
        @stop="stopSwitch.stop"
        @retry="handleRetry"
        @load-more="handleLoadMore"
        @skip-invalid="replaceRuntime('skip')"
        @restart="replaceRuntime(runtime.validate)"
      />
      <div class="min-w-0 xl:sticky xl:top-24">
        <LatestSearchPanel
          :state="searched"
          :view="view"
          :query-key="options.queryKey"
          :status="status"
        />
      </div>
    </div>
  </main>
</template>
