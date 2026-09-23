import { Compass, SlidersHorizontal } from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";
import type { Dispatch } from "react";
import { useId, useState } from "react";

import { IconTile } from "src/components/IconTile/IconTile";
import { SegmentedControl } from "src/components/SegmentedControl/SegmentedControl";
import { ActiveFilters } from "src/components/Store/ActiveFilters";
import { FilterPanel } from "src/components/Store/FilterPanel";
import { SearchField } from "src/components/Store/SearchField";
import { SearchPresets } from "src/components/Store/SearchPresets";
import { StoreResults } from "src/components/Store/StoreResults";
import { StoreStatusBar } from "src/components/Store/StoreStatusBar";
import { StoreToolbar } from "src/components/Store/StoreToolbar";
import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
import { CARD_CLASS_NAME } from "examples/shared/ui/styles/cardStyles";
import type { SearchStatus } from "examples/shared/outpost/types/SearchStatus";
import type { StoreAction } from "examples/shared/outpost/types/StoreAction";
import type { StoreQuery } from "src/types/StoreQuery";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { ENGINE_OPTIONS } from "examples/shared/outpost/constants/engineOptions";
import { ENGINE_GUIDES } from "examples/shared/outpost/constants/engines";
import { getActiveFilters } from "examples/shared/outpost/utils/getActiveFilters";
import { getLatestPage } from "examples/shared/outpost/utils/getLatestPage";

type StoreAppProps = {
  state: StoreState;
  query: StoreQuery;
  status: SearchStatus;
  cached: number;
  dispatch: Dispatch<StoreAction>;
  onStopPress: () => void;
  onSkipInvalidPress: () => void;
  onRestartPress: () => void;
};

export const StoreApp: React.FunctionComponent<StoreAppProps> = ({
  state,
  query,
  status,
  cached,
  dispatch,
  onStopPress,
  onSkipInvalidPress,
  onRestartPress,
}) => {
  const latest = getLatestPage(query);
  const filterCount = getActiveFilters(state).length;
  const engineName = ENGINE_GUIDES[state.engine].name;
  const filtersId = useId();
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <section
      aria-label="Outpost store"
      className={clsx("flex min-w-0 flex-col overflow-hidden", CARD_CLASS_NAME)}
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-stone-200 px-4 py-3 dark:border-stone-800">
        <div className="mr-auto flex items-center gap-2">
          <IconTile icon={Compass} size="small" />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold">Outpost</span>
            <span className="text-xs text-stone-500">Outdoor gear</span>
          </div>
        </div>
        <SegmentedControl
          label="Engine"
          options={ENGINE_OPTIONS}
          value={state.engine}
          onSelect={(engine) => dispatch({ type: "ENGINE_SELECTED", engine })}
        />
      </header>
      <div className="flex flex-col gap-3 border-b border-stone-200 px-4 py-4 dark:border-stone-800">
        <SearchField
          value={state.query}
          searching={query.isFetching}
          onChange={(value) =>
            dispatch({ type: "QUERY_CHANGED", query: value })
          }
          onStopPress={onStopPress}
        />
        <SearchPresets
          query={state.query}
          onSelect={(preset) =>
            dispatch({ type: "PRESET_SELECTED", query: preset })
          }
        />
      </div>
      <div className="flex flex-col gap-3 px-4 pt-4">
        <StoreToolbar
          state={state}
          latest={latest}
          searching={query.isFetching}
          onProfileSelect={(profile) =>
            dispatch({ type: "PROFILE_SELECTED", profile })
          }
          onSortSelect={(sort) => dispatch({ type: "SORT_SELECTED", sort })}
          onFacetsToggle={() => dispatch({ type: "FACETS_TOGGLED" })}
          onHighlightsToggle={() => dispatch({ type: "HIGHLIGHTS_TOGGLED" })}
        />
        <button
          type="button"
          aria-expanded={filtersOpen}
          aria-controls={filtersId}
          onClick={() => setFiltersOpen((open) => !open)}
          className={clsx(
            buttonStyles({ size: "small" }),
            "self-start md:hidden",
          )}
        >
          <SlidersHorizontal aria-hidden="true" size={14} weight="bold" />
          Filters
          {filterCount === 0 ? null : (
            <span className="rounded-full bg-amber-600 px-1.5 text-xs text-white">
              {filterCount}
            </span>
          )}
        </button>
      </div>
      <div className="grid min-w-0 md:grid-cols-[13.5rem_minmax(0,1fr)]">
        <aside
          id={filtersId}
          aria-label="Filters"
          className={clsx(
            "border-b border-stone-200 p-3 md:block md:border-r md:border-b-0 dark:border-stone-800",
            { hidden: !filtersOpen },
          )}
        >
          <FilterPanel
            state={state}
            latest={latest}
            onBrandToggle={(brand) =>
              dispatch({ type: "BRAND_TOGGLED", brand })
            }
            onCategoryToggle={(category) =>
              dispatch({ type: "CATEGORY_TOGGLED", category })
            }
            onPriceBandSelect={(priceBand) =>
              dispatch({ type: "PRICE_BAND_SELECTED", priceBand })
            }
            onMinRatingSelect={(minRating) =>
              dispatch({ type: "MIN_RATING_SELECTED", minRating })
            }
            onInStockToggle={() => dispatch({ type: "IN_STOCK_TOGGLED" })}
            onClearPress={() => dispatch({ type: "FILTERS_CLEARED" })}
          />
        </aside>
        <div className="flex min-w-0 flex-col gap-4 p-4">
          <ActiveFilters state={state} onRemove={dispatch} />
          <StoreResults
            status={status}
            query={query}
            state={state}
            engineName={engineName}
            onFacetsToggle={() => dispatch({ type: "FACETS_TOGGLED" })}
            onHighlightsToggle={() => dispatch({ type: "HIGHLIGHTS_TOGGLED" })}
            onEmptySetToggle={() => dispatch({ type: "EMPTY_SET_TOGGLED" })}
            onClearPress={() => dispatch({ type: "FILTERS_CLEARED" })}
            onSkipInvalidPress={onSkipInvalidPress}
            onRestartPress={onRestartPress}
          />
        </div>
      </div>
      <StoreStatusBar engine={state.engine} cached={cached} />
    </section>
  );
};
