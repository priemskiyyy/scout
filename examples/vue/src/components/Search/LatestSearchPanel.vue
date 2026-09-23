<script setup lang="ts">
import type { QueryKey } from "@tanstack/vue-query";
import { computed } from "vue";

import { STATUS_LABELS } from "examples/shared/outpost/constants/labels";
import { formatJson } from "examples/shared/outpost/formatting/formatJson";
import { formatSearchCode } from "examples/shared/outpost/formatting/formatSearchCode";
import type { SearchStatus } from "examples/shared/outpost/types/SearchStatus";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { getFacetCountsNote } from "examples/shared/outpost/utils/getFacetCountsNote";
import { getLatestPage } from "examples/shared/outpost/utils/getLatestPage";
import { ICONS } from "examples/shared/ui/constants/icons";
import { STATUS_TONES } from "examples/shared/ui/constants/tones";
import { CARD_CLASS_NAME } from "examples/shared/ui/styles/cardStyles";
import ToneBadge from "src/components/Badge/ToneBadge.vue";
import CodeDetails from "src/components/Code/CodeDetails.vue";
import IconTile from "src/components/IconTile/IconTile.vue";
import SearchCode from "src/components/Search/SearchCode.vue";
import SearchFacts from "src/components/Search/SearchFacts.vue";
import SearchFailure from "src/components/Search/SearchFailure.vue";
import type { StoreView } from "src/types/StoreView";

const props = defineProps<{
  state: StoreState;
  view: StoreView;
  queryKey: QueryKey;
  status: SearchStatus;
}>();

const latest = computed(() => getLatestPage(props.view));
const code = computed(() => formatSearchCode(props.state.engine, props.state));
</script>

<template>
  <section
    aria-label="Latest search"
    class="flex h-full min-w-0 flex-col gap-4 p-5"
    :class="CARD_CLASS_NAME"
  >
    <header class="flex flex-col gap-1.5">
      <div class="flex flex-wrap items-center gap-2">
        <IconTile :src="ICONS.binoculars" size="small" />
        <h3
          class="text-base font-semibold tracking-tight text-stone-800 dark:text-stone-200"
        >
          Latest search
        </h3>
        <div class="ml-auto">
          <ToneBadge :tone="STATUS_TONES[status]">
            {{ STATUS_LABELS[status] }}
          </ToneBadge>
        </div>
      </div>
      <p class="text-sm text-stone-500 dark:text-stone-400">
        The search the store just ran: the code that built it, what came back,
        and how sure the engine was.
      </p>
    </header>
    <SearchCode :code="code" />
    <SearchFailure v-if="view.error !== null" :error="view.error" />
    <p v-else-if="latest === null" class="text-sm text-stone-500">
      Waiting for the engine…
    </p>
    <!-- Keyed by the page, so each new answer mounts afresh and flashes. -->
    <div
      v-else
      :key="view.dataUpdatedAt"
      class="-m-2 flex animate-flash flex-col gap-3 rounded-xl p-2 motion-reduce:animate-none"
    >
      <SearchFacts :latest="latest" :note="getFacetCountsNote(state, latest)" />
      <CodeDetails
        summary="The latest page, with its first two hits"
        label="The latest page"
        :code="formatJson({ ...latest, hits: latest.hits.slice(0, 2) })"
      />
    </div>
    <CodeDetails
      summary="Its query key"
      label="Query key"
      :code="formatJson(queryKey)"
    />
  </section>
</template>
