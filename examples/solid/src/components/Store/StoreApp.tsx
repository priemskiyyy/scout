import clsx from "clsx";
import { createSignal, createUniqueId, Show } from "solid-js";
import type { Component } from "solid-js";

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
import { BaseIcon } from "src/components/BaseIcon/BaseIcon";
import { IconTile } from "src/components/IconTile/IconTile";
import { SegmentedControl } from "src/components/SegmentedControl/SegmentedControl";
import { ActiveFilters } from "src/components/Store/ActiveFilters";
import { FilterPanel } from "src/components/Store/FilterPanel";
import { SearchField } from "src/components/Store/SearchField";
import { SearchPresets } from "src/components/Store/SearchPresets";
import { StoreResults } from "src/components/Store/StoreResults";
import { StoreStatusBar } from "src/components/Store/StoreStatusBar";
import { StoreToolbar } from "src/components/Store/StoreToolbar";
import type { StoreQuery } from "src/types/StoreQuery";

type StoreAppProps = {
  state: StoreState;
  query: StoreQuery;
  status: SearchStatus;
  dispatch: (action: StoreAction) => void;
  onStopPress: () => void;
  onSkipInvalidPress: () => void;
  onRestartPress: () => void;
};

export const StoreApp: Component<StoreAppProps> = (props) => {
  const filtersId = createUniqueId();
  const [filtersOpen, setFiltersOpen] = createSignal(false);
  const latest = () => getLatestPage(props.query);
  const filterCount = () => getActiveFilters(props.state).length;
  const engineName = () => ENGINE_GUIDES[props.state.engine].name;

  return (
    <section
      aria-label="Outpost store"
      class={clsx("flex min-w-0 flex-col overflow-hidden", CARD_CLASS_NAME)}
    >
      <header class="flex flex-wrap items-center gap-3 border-b border-stone-200 px-4 py-3 dark:border-stone-800">
        <div class="mr-auto flex items-center gap-2">
          <IconTile src={ICONS.compass} size="small" />
          <div class="flex flex-col leading-tight">
            <span class="font-semibold">Outpost</span>
            <span class="text-xs text-stone-500">Outdoor gear</span>
          </div>
        </div>
        <SegmentedControl
          label="Engine"
          options={ENGINE_OPTIONS}
          value={props.state.engine}
          onSelect={(engine) =>
            props.dispatch({ type: "ENGINE_SELECTED", engine })
          }
        />
      </header>
      <div class="flex flex-col gap-3 border-b border-stone-200 px-4 py-4 dark:border-stone-800">
        <SearchField
          value={props.state.query}
          searching={props.query.isFetching}
          onChange={(value) =>
            props.dispatch({ type: "QUERY_CHANGED", query: value })
          }
          onStopPress={props.onStopPress}
        />
        <SearchPresets
          query={props.state.query}
          onSelect={(preset) =>
            props.dispatch({ type: "PRESET_SELECTED", query: preset })
          }
        />
      </div>
      <div class="flex flex-col gap-3 px-4 pt-4">
        <StoreToolbar
          state={props.state}
          latest={latest()}
          searching={props.query.isFetching}
          onProfileSelect={(profile) =>
            props.dispatch({ type: "PROFILE_SELECTED", profile })
          }
          onSortSelect={(sort) =>
            props.dispatch({ type: "SORT_SELECTED", sort })
          }
          onFacetsToggle={() => props.dispatch({ type: "FACETS_TOGGLED" })}
          onHighlightsToggle={() =>
            props.dispatch({ type: "HIGHLIGHTS_TOGGLED" })
          }
        />
        <button
          type="button"
          aria-expanded={filtersOpen()}
          aria-controls={filtersId}
          onClick={() => setFiltersOpen((open) => !open)}
          class={clsx(buttonStyles({ size: "small" }), "self-start md:hidden")}
        >
          <BaseIcon src={ICONS.slidersHorizontal} size="small" />
          Filters
          <Show when={filterCount() > 0}>
            <span class="rounded-full bg-amber-600 px-1.5 text-xs text-white">
              {filterCount()}
            </span>
          </Show>
        </button>
      </div>
      <div class="grid min-w-0 md:grid-cols-[13.5rem_minmax(0,1fr)]">
        <aside
          id={filtersId}
          aria-label="Filters"
          class="border-b border-stone-200 p-3 md:block md:border-r md:border-b-0 dark:border-stone-800"
          classList={{ hidden: !filtersOpen() }}
        >
          <FilterPanel
            state={props.state}
            latest={latest()}
            onBrandToggle={(brand) =>
              props.dispatch({ type: "BRAND_TOGGLED", brand })
            }
            onCategoryToggle={(category) =>
              props.dispatch({ type: "CATEGORY_TOGGLED", category })
            }
            onPriceBandSelect={(priceBand) =>
              props.dispatch({ type: "PRICE_BAND_SELECTED", priceBand })
            }
            onMinRatingSelect={(minRating) =>
              props.dispatch({ type: "MIN_RATING_SELECTED", minRating })
            }
            onInStockToggle={() => props.dispatch({ type: "IN_STOCK_TOGGLED" })}
            onClearPress={() => props.dispatch({ type: "FILTERS_CLEARED" })}
          />
        </aside>
        <div class="flex min-w-0 flex-col gap-4 p-4">
          <ActiveFilters state={props.state} onRemove={props.dispatch} />
          <StoreResults
            status={props.status}
            query={props.query}
            state={props.state}
            engineName={engineName()}
            onFacetsToggle={() => props.dispatch({ type: "FACETS_TOGGLED" })}
            onHighlightsToggle={() =>
              props.dispatch({ type: "HIGHLIGHTS_TOGGLED" })
            }
            onEmptySetToggle={() =>
              props.dispatch({ type: "EMPTY_SET_TOGGLED" })
            }
            onClearPress={() => props.dispatch({ type: "FILTERS_CLEARED" })}
            onSkipInvalidPress={props.onSkipInvalidPress}
            onRestartPress={props.onRestartPress}
          />
        </div>
      </div>
      <StoreStatusBar engine={props.state.engine} />
    </section>
  );
};
