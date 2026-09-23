import { For, Show } from "solid-js";
import type { Component } from "solid-js";

import {
  BRAND_OPTIONS,
  CATEGORY_OPTIONS,
  RATING_OPTIONS,
} from "examples/shared/outpost/constants/filters";
import { FACET_NOTES } from "examples/shared/outpost/constants/labels";
import { PRICE_BAND_OPTIONS } from "examples/shared/outpost/constants/store";
import { formatFacetCount } from "examples/shared/outpost/formatting/formatFacetCount";
import type { Brand } from "examples/shared/outpost/types/Brand";
import type { Category } from "examples/shared/outpost/types/Category";
import type { PriceBand } from "examples/shared/outpost/types/PriceBand";
import type { StoreResult } from "examples/shared/outpost/types/StoreResult";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { getFacetCountsNote } from "examples/shared/outpost/utils/getFacetCountsNote";
import { getRequestedFacet } from "examples/shared/outpost/utils/getRequestedFacet";
import { ICONS } from "examples/shared/ui/constants/icons";
import { FACET_NOTE_TONES } from "examples/shared/ui/constants/tones";
import { checkStyles } from "examples/shared/ui/styles/checkStyles";
import { dotStyles } from "examples/shared/ui/styles/dotStyles";
import { LEGEND_CLASS_NAME } from "examples/shared/ui/styles/legendStyles";
import { BaseIcon } from "src/components/BaseIcon/BaseIcon";
import { FacetGroup } from "src/components/Store/FacetGroup";

type FilterPanelProps = {
  state: StoreState;
  latest: StoreResult | null;
  onBrandToggle: (brand: Brand) => void;
  onCategoryToggle: (category: Category) => void;
  onPriceBandSelect: (priceBand: PriceBand) => void;
  onMinRatingSelect: (minRating: number | null) => void;
  onInStockToggle: () => void;
  onClearPress: () => void;
};

const isBrand = (value: string): value is Brand =>
  BRAND_OPTIONS.some((option) => option.value === value);

const isCategory = (value: string): value is Category =>
  CATEGORY_OPTIONS.some((option) => option.value === value);

const getFacets = (latest: StoreResult | null) => {
  if (latest === null) {
    return { brand: null, category: null, inStock: null };
  }

  return {
    brand: getRequestedFacet(latest, "brand"),
    category: getRequestedFacet(latest, "category"),
    inStock: getRequestedFacet(latest, "inStock"),
  };
};

export const FilterPanel: Component<FilterPanelProps> = (props) => {
  const facets = () => getFacets(props.latest);
  const note = () => getFacetCountsNote(props.state, props.latest);
  const inStockCount = () => formatFacetCount(facets().inStock, true);

  const handleBrandToggle = (value: string) => {
    if (!isBrand(value)) {
      return;
    }

    props.onBrandToggle(value);
  };

  const handleCategoryToggle = (value: string) => {
    if (!isCategory(value)) {
      return;
    }

    props.onCategoryToggle(value);
  };

  const handleRatingSelect = (value: number) => {
    if (value === 0) {
      props.onMinRatingSelect(null);

      return;
    }

    props.onMinRatingSelect(value);
  };

  return (
    <div class="flex flex-col gap-5">
      <div class="flex items-start gap-2 px-2 text-xs leading-relaxed text-stone-500">
        <span
          aria-hidden="true"
          class={dotStyles({ tone: FACET_NOTE_TONES[note()] })}
        />
        <span class="-mt-0.5">{FACET_NOTES[note()]}</span>
      </div>
      <FacetGroup
        title="Category"
        facet={facets().category}
        options={CATEGORY_OPTIONS}
        selected={props.state.categories}
        onToggle={handleCategoryToggle}
      />
      <FacetGroup
        title="Brand"
        facet={facets().brand}
        options={BRAND_OPTIONS}
        selected={props.state.brands}
        onToggle={handleBrandToggle}
      />
      <fieldset class="flex flex-col gap-0.5">
        <legend class={LEGEND_CLASS_NAME}>Price</legend>
        <For each={PRICE_BAND_OPTIONS}>
          {(option) => (
            <label
              class={checkStyles({
                checked: props.state.priceBand === option.value,
              })}
            >
              <input
                type="radio"
                name="price"
                checked={props.state.priceBand === option.value}
                onChange={() => props.onPriceBandSelect(option.value)}
                class="size-4 accent-amber-600"
              />
              {option.label}
            </label>
          )}
        </For>
      </fieldset>
      <fieldset class="flex flex-col gap-0.5">
        <legend class={LEGEND_CLASS_NAME}>Rating</legend>
        <For each={RATING_OPTIONS}>
          {(option) => {
            const checked = () => (props.state.minRating ?? 0) === option.value;

            return (
              <label class={checkStyles({ checked: checked() })}>
                <input
                  type="radio"
                  name="rating"
                  checked={checked()}
                  onChange={() => handleRatingSelect(option.value)}
                  class="size-4 accent-amber-600"
                />
                {option.label}
              </label>
            );
          }}
        </For>
      </fieldset>
      <fieldset class="flex flex-col gap-0.5">
        <legend class={LEGEND_CLASS_NAME}>Availability</legend>
        <label class={checkStyles({ checked: props.state.inStockOnly })}>
          <input
            type="checkbox"
            checked={props.state.inStockOnly}
            onChange={() => props.onInStockToggle()}
            class="size-4 accent-amber-600"
          />
          <span class="min-w-0 flex-1">In stock only</span>
          <Show when={inStockCount()}>
            {(count) => (
              <span class="font-mono text-xs text-stone-500 tabular-nums">
                {count()}
              </span>
            )}
          </Show>
        </label>
      </fieldset>
      <button
        type="button"
        onClick={() => props.onClearPress()}
        class="mx-2 inline-flex items-center gap-1.5 self-start text-sm font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
      >
        <BaseIcon src={ICONS.eraser} size="small" />
        Clear filters
      </button>
    </div>
  );
};
