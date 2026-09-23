<script setup lang="ts">
import { computed, ref, useId } from "vue";

import { ENGINE_OPTIONS } from "examples/shared/outpost/constants/engineOptions";
import { ENGINE_GUIDES } from "examples/shared/outpost/constants/engines";
import type { SearchStatus } from "examples/shared/outpost/types/SearchStatus";
import type { StoreAction } from "examples/shared/outpost/types/StoreAction";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { getActiveFilters } from "examples/shared/outpost/utils/getActiveFilters";
import { getLatestPage } from "examples/shared/outpost/utils/getLatestPage";
import { ICONS } from "examples/shared/ui/constants/icons";
import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
import { CARD_CLASS_NAME } from "examples/shared/ui/styles/cardStyles";
import BaseIcon from "src/components/BaseIcon/BaseIcon.vue";
import IconTile from "src/components/IconTile/IconTile.vue";
import SegmentedControl from "src/components/SegmentedControl/SegmentedControl.vue";
import ActiveFilters from "src/components/Store/ActiveFilters.vue";
import FilterPanel from "src/components/Store/FilterPanel.vue";
import SearchField from "src/components/Store/SearchField.vue";
import SearchPresets from "src/components/Store/SearchPresets.vue";
import StoreResults from "src/components/Store/StoreResults.vue";
import StoreStatusBar from "src/components/Store/StoreStatusBar.vue";
import StoreToolbar from "src/components/Store/StoreToolbar.vue";
import type { StoreView } from "src/types/StoreView";

const props = defineProps<{
  state: StoreState;
  view: StoreView;
  status: SearchStatus;
}>();

const emit = defineEmits<{
  action: [action: StoreAction];
  stop: [];
  retry: [];
  loadMore: [];
  skipInvalid: [];
  restart: [];
}>();

const filtersId = useId();
const filtersOpen = ref(false);
const latest = computed(() => getLatestPage(props.view));
const filterCount = computed(() => getActiveFilters(props.state).length);
const engineName = computed(() => ENGINE_GUIDES[props.state.engine].name);

const handleFiltersClick = () => {
  filtersOpen.value = !filtersOpen.value;
};
</script>

<template>
  <section
    aria-label="Outpost store"
    class="flex min-w-0 flex-col overflow-hidden"
    :class="CARD_CLASS_NAME"
  >
    <header
      class="flex flex-wrap items-center gap-3 border-b border-stone-200 px-4 py-3 dark:border-stone-800"
    >
      <div class="mr-auto flex items-center gap-2">
        <IconTile :src="ICONS.compass" size="small" />
        <div class="flex flex-col leading-tight">
          <span class="font-semibold">Outpost</span>
          <span class="text-xs text-stone-500">Outdoor gear</span>
        </div>
      </div>
      <SegmentedControl
        label="Engine"
        :options="ENGINE_OPTIONS"
        :value="state.engine"
        @select="emit('action', { type: 'ENGINE_SELECTED', engine: $event })"
      />
    </header>
    <div
      class="flex flex-col gap-3 border-b border-stone-200 px-4 py-4 dark:border-stone-800"
    >
      <SearchField
        :value="state.query"
        :searching="view.isFetching"
        @change="emit('action', { type: 'QUERY_CHANGED', query: $event })"
        @stop="emit('stop')"
      />
      <SearchPresets
        :query="state.query"
        @select="emit('action', { type: 'PRESET_SELECTED', query: $event })"
      />
    </div>
    <div class="flex flex-col gap-3 px-4 pt-4">
      <StoreToolbar
        :state="state"
        :latest="latest"
        :searching="view.isFetching"
        @profile-select="
          emit('action', { type: 'PROFILE_SELECTED', profile: $event })
        "
        @sort-select="emit('action', { type: 'SORT_SELECTED', sort: $event })"
        @facets-toggle="emit('action', { type: 'FACETS_TOGGLED' })"
        @highlights-toggle="emit('action', { type: 'HIGHLIGHTS_TOGGLED' })"
      />
      <button
        type="button"
        :aria-expanded="filtersOpen"
        :aria-controls="filtersId"
        :class="[buttonStyles({ size: 'small' }), 'self-start md:hidden']"
        @click="handleFiltersClick"
      >
        <BaseIcon :src="ICONS.slidersHorizontal" size="small" />
        Filters
        <span
          v-if="filterCount > 0"
          class="rounded-full bg-amber-600 px-1.5 text-xs text-white"
        >
          {{ filterCount }}
        </span>
      </button>
    </div>
    <div class="grid min-w-0 md:grid-cols-[13.5rem_minmax(0,1fr)]">
      <aside
        :id="filtersId"
        aria-label="Filters"
        class="border-b border-stone-200 p-3 md:block md:border-r md:border-b-0 dark:border-stone-800"
        :class="{ hidden: !filtersOpen }"
      >
        <FilterPanel
          :state="state"
          :latest="latest"
          @brand-toggle="
            emit('action', { type: 'BRAND_TOGGLED', brand: $event })
          "
          @category-toggle="
            emit('action', { type: 'CATEGORY_TOGGLED', category: $event })
          "
          @price-band-select="
            emit('action', { type: 'PRICE_BAND_SELECTED', priceBand: $event })
          "
          @min-rating-select="
            emit('action', { type: 'MIN_RATING_SELECTED', minRating: $event })
          "
          @in-stock-toggle="emit('action', { type: 'IN_STOCK_TOGGLED' })"
          @clear="emit('action', { type: 'FILTERS_CLEARED' })"
        />
      </aside>
      <div class="flex min-w-0 flex-col gap-4 p-4">
        <ActiveFilters :state="state" @remove="emit('action', $event)" />
        <StoreResults
          :status="status"
          :view="view"
          :state="state"
          :engine-name="engineName"
          @facets-toggle="emit('action', { type: 'FACETS_TOGGLED' })"
          @highlights-toggle="emit('action', { type: 'HIGHLIGHTS_TOGGLED' })"
          @empty-set-toggle="emit('action', { type: 'EMPTY_SET_TOGGLED' })"
          @clear="emit('action', { type: 'FILTERS_CLEARED' })"
          @retry="emit('retry')"
          @load-more="emit('loadMore')"
          @skip-invalid="emit('skipInvalid')"
          @restart="emit('restart')"
        />
      </div>
    </div>
    <StoreStatusBar :engine="state.engine" />
  </section>
</template>
