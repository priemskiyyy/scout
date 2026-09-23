<script lang="ts">
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
  import BaseIcon from "src/components/BaseIcon/BaseIcon.svelte";
  import IconTile from "src/components/IconTile/IconTile.svelte";
  import SegmentedControl from "src/components/SegmentedControl/SegmentedControl.svelte";
  import ActiveFilters from "src/components/Store/ActiveFilters.svelte";
  import FilterPanel from "src/components/Store/FilterPanel.svelte";
  import SearchField from "src/components/Store/SearchField.svelte";
  import SearchPresets from "src/components/Store/SearchPresets.svelte";
  import StoreResults from "src/components/Store/StoreResults.svelte";
  import StoreStatusBar from "src/components/Store/StoreStatusBar.svelte";
  import StoreToolbar from "src/components/Store/StoreToolbar.svelte";
  import type { StoreQuery } from "src/types/StoreQuery";

  type Props = {
    storeState: StoreState;
    query: StoreQuery;
    status: SearchStatus;
    cached: number;
    dispatch: (action: StoreAction) => void;
    onStopPress: () => void;
    onSkipInvalidPress: () => void;
    onRestartPress: () => void;
  };

  let {
    storeState,
    query,
    status,
    cached,
    dispatch,
    onStopPress,
    onSkipInvalidPress,
    onRestartPress,
  }: Props = $props();

  const filtersId = $props.id();

  let filtersOpen = $state(false);

  const latest = $derived(getLatestPage(query));
  const filterCount = $derived(getActiveFilters(storeState).length);
  const engineName = $derived(ENGINE_GUIDES[storeState.engine].name);
</script>

<section
  aria-label="Outpost store"
  class={["flex min-w-0 flex-col overflow-hidden", CARD_CLASS_NAME]}
>
  <header
    class="flex flex-wrap items-center gap-3 border-b border-stone-200 px-4 py-3 dark:border-stone-800"
  >
    <div class="mr-auto flex items-center gap-2">
      <IconTile icon={ICONS.compass} size="small" />
      <div class="flex flex-col leading-tight">
        <span class="font-semibold">Outpost</span>
        <span class="text-xs text-stone-500">Outdoor gear</span>
      </div>
    </div>
    <SegmentedControl
      label="Engine"
      options={ENGINE_OPTIONS}
      value={storeState.engine}
      onSelect={(engine) => dispatch({ type: "ENGINE_SELECTED", engine })}
    />
  </header>
  <div
    class="flex flex-col gap-3 border-b border-stone-200 px-4 py-4 dark:border-stone-800"
  >
    <SearchField
      value={storeState.query}
      searching={query.isFetching}
      onChange={(value) => dispatch({ type: "QUERY_CHANGED", query: value })}
      {onStopPress}
    />
    <SearchPresets
      query={storeState.query}
      onSelect={(preset) =>
        dispatch({ type: "PRESET_SELECTED", query: preset })}
    />
  </div>
  <div class="flex flex-col gap-3 px-4 pt-4">
    <StoreToolbar
      {storeState}
      {latest}
      searching={query.isFetching}
      onProfileSelect={(profile) =>
        dispatch({ type: "PROFILE_SELECTED", profile })}
      onSortSelect={(sort) => dispatch({ type: "SORT_SELECTED", sort })}
      onFacetsToggle={() => dispatch({ type: "FACETS_TOGGLED" })}
      onHighlightsToggle={() => dispatch({ type: "HIGHLIGHTS_TOGGLED" })}
    />
    <button
      type="button"
      aria-expanded={filtersOpen}
      aria-controls={filtersId}
      onclick={() => (filtersOpen = !filtersOpen)}
      class={[buttonStyles({ size: "small" }), "self-start md:hidden"]}
    >
      <BaseIcon src={ICONS.slidersHorizontal} size="small" />
      Filters
      {#if filterCount > 0}
        <span class="rounded-full bg-amber-600 px-1.5 text-xs text-white">
          {filterCount}
        </span>
      {/if}
    </button>
  </div>
  <div class="grid min-w-0 md:grid-cols-[13.5rem_minmax(0,1fr)]">
    <aside
      id={filtersId}
      aria-label="Filters"
      class={[
        "border-b border-stone-200 p-3 md:block md:border-r md:border-b-0 dark:border-stone-800",
        { hidden: !filtersOpen },
      ]}
    >
      <FilterPanel
        {storeState}
        {latest}
        onBrandToggle={(brand) => dispatch({ type: "BRAND_TOGGLED", brand })}
        onCategoryToggle={(category) =>
          dispatch({ type: "CATEGORY_TOGGLED", category })}
        onPriceBandSelect={(priceBand) =>
          dispatch({ type: "PRICE_BAND_SELECTED", priceBand })}
        onMinRatingSelect={(minRating) =>
          dispatch({ type: "MIN_RATING_SELECTED", minRating })}
        onInStockToggle={() => dispatch({ type: "IN_STOCK_TOGGLED" })}
        onClearPress={() => dispatch({ type: "FILTERS_CLEARED" })}
      />
    </aside>
    <div class="flex min-w-0 flex-col gap-4 p-4">
      <ActiveFilters {storeState} onRemove={dispatch} />
      <StoreResults
        {status}
        {query}
        {storeState}
        {engineName}
        onFacetsToggle={() => dispatch({ type: "FACETS_TOGGLED" })}
        onHighlightsToggle={() => dispatch({ type: "HIGHLIGHTS_TOGGLED" })}
        onEmptySetToggle={() => dispatch({ type: "EMPTY_SET_TOGGLED" })}
        onClearPress={() => dispatch({ type: "FILTERS_CLEARED" })}
        {onSkipInvalidPress}
        {onRestartPress}
      />
    </div>
  </div>
  <StoreStatusBar engine={storeState.engine} {cached} />
</section>
