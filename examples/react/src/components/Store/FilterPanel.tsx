import { Eraser } from "@phosphor-icons/react";
import type React from "react";

import { FacetGroup } from "src/components/Store/FacetGroup";
import { formatFacetCount } from "examples/shared/outpost/formatting/formatFacetCount";
import { checkStyles } from "examples/shared/ui/styles/checkStyles";
import { LEGEND_CLASS_NAME } from "examples/shared/ui/styles/legendStyles";
import { dotStyles } from "examples/shared/ui/styles/dotStyles";
import type { Brand } from "examples/shared/outpost/types/Brand";
import type { Category } from "examples/shared/outpost/types/Category";
import type { PriceBand } from "examples/shared/outpost/types/PriceBand";
import type { StoreResult } from "examples/shared/outpost/types/StoreResult";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import {
  BRAND_OPTIONS,
  CATEGORY_OPTIONS,
  RATING_OPTIONS,
} from "examples/shared/outpost/constants/filters";
import { FACET_NOTES } from "examples/shared/outpost/constants/labels";
import { PRICE_BAND_OPTIONS } from "examples/shared/outpost/constants/store";
import { FACET_NOTE_TONES } from "examples/shared/ui/constants/tones";
import { getFacetCountsNote } from "examples/shared/outpost/utils/getFacetCountsNote";
import { getRequestedFacet } from "examples/shared/outpost/utils/getRequestedFacet";

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

export const FilterPanel: React.FunctionComponent<FilterPanelProps> = ({
  state,
  latest,
  onBrandToggle,
  onCategoryToggle,
  onPriceBandSelect,
  onMinRatingSelect,
  onInStockToggle,
  onClearPress,
}) => {
  const facets = getFacets(latest);
  const note = getFacetCountsNote(state, latest);
  const inStockCount = formatFacetCount(facets.inStock, true);

  const handleBrandToggle = (value: string) => {
    if (!isBrand(value)) {
      return;
    }

    onBrandToggle(value);
  };

  const handleCategoryToggle = (value: string) => {
    if (!isCategory(value)) {
      return;
    }

    onCategoryToggle(value);
  };

  const handleRatingSelect = (value: number) => {
    if (value === 0) {
      onMinRatingSelect(null);

      return;
    }

    onMinRatingSelect(value);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-2 px-2 text-xs leading-relaxed text-stone-500">
        <span
          aria-hidden="true"
          className={dotStyles({ tone: FACET_NOTE_TONES[note] })}
        />
        <span className="-mt-0.5">{FACET_NOTES[note]}</span>
      </div>
      <FacetGroup
        title="Category"
        facet={facets.category}
        options={CATEGORY_OPTIONS}
        selected={state.categories}
        onToggle={handleCategoryToggle}
      />
      <FacetGroup
        title="Brand"
        facet={facets.brand}
        options={BRAND_OPTIONS}
        selected={state.brands}
        onToggle={handleBrandToggle}
      />
      <fieldset className="flex flex-col gap-0.5">
        <legend className={LEGEND_CLASS_NAME}>Price</legend>
        {PRICE_BAND_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={checkStyles({
              checked: state.priceBand === option.value,
            })}
          >
            <input
              type="radio"
              name="price"
              checked={state.priceBand === option.value}
              onChange={() => onPriceBandSelect(option.value)}
              className="size-4 accent-amber-600"
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      <fieldset className="flex flex-col gap-0.5">
        <legend className={LEGEND_CLASS_NAME}>Rating</legend>
        {RATING_OPTIONS.map((option) => {
          const checked = (state.minRating ?? 0) === option.value;

          return (
            <label key={option.value} className={checkStyles({ checked })}>
              <input
                type="radio"
                name="rating"
                checked={checked}
                onChange={() => handleRatingSelect(option.value)}
                className="size-4 accent-amber-600"
              />
              {option.label}
            </label>
          );
        })}
      </fieldset>
      <fieldset className="flex flex-col gap-0.5">
        <legend className={LEGEND_CLASS_NAME}>Availability</legend>
        <label className={checkStyles({ checked: state.inStockOnly })}>
          <input
            type="checkbox"
            checked={state.inStockOnly}
            onChange={onInStockToggle}
            className="size-4 accent-amber-600"
          />
          <span className="min-w-0 flex-1">In stock only</span>
          {inStockCount === null ? null : (
            <span className="font-mono text-xs text-stone-500 tabular-nums">
              {inStockCount}
            </span>
          )}
        </label>
      </fieldset>
      <button
        type="button"
        onClick={onClearPress}
        className="mx-2 inline-flex items-center gap-1.5 self-start text-sm font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
      >
        <Eraser aria-hidden="true" size={14} weight="bold" />
        Clear filters
      </button>
    </div>
  );
};
