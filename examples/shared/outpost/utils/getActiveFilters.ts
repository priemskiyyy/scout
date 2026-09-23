import type { ActiveFilter } from "examples/shared/outpost/types/ActiveFilter";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { RATING_OPTIONS } from "examples/shared/outpost/constants/filters";
import { CATEGORY_LABELS } from "examples/shared/outpost/constants/labels";
import { PRICE_BAND_OPTIONS } from "examples/shared/outpost/constants/store";

/**
 * Every filter the store is applying, each with the action that removes it,
 * so the chips above the results can take one away.
 *
 * @example
 * ```ts
 * getActiveFilters({ ...initialStoreState, inStockOnly: true });
 * // [{ key: "inStock", label: "In stock", remove: { type: "IN_STOCK_TOGGLED" } }]
 * ```
 */
export const getActiveFilters = (state: StoreState): ActiveFilter[] => {
  const filters: ActiveFilter[] = [];

  for (const category of state.categories) {
    filters.push({
      key: `category:${category}`,
      label: CATEGORY_LABELS[category],
      remove: { type: "CATEGORY_TOGGLED", category },
    });
  }

  for (const brand of state.brands) {
    filters.push({
      key: `brand:${brand}`,
      label: brand,
      remove: { type: "BRAND_TOGGLED", brand },
    });
  }

  const band = PRICE_BAND_OPTIONS.find(
    (option) => option.value === state.priceBand,
  );

  if (state.priceBand !== "any" && band !== undefined) {
    filters.push({
      key: "price",
      label: band.label,
      remove: { type: "PRICE_BAND_SELECTED", priceBand: "any" },
    });
  }

  const rating = RATING_OPTIONS.find(
    (option) => option.value === state.minRating,
  );

  if (rating !== undefined) {
    filters.push({
      key: "rating",
      label: rating.label,
      remove: { type: "MIN_RATING_SELECTED", minRating: null },
    });
  }

  if (state.inStockOnly) {
    filters.push({
      key: "inStock",
      label: "In stock",
      remove: { type: "IN_STOCK_TOGGLED" },
    });
  }

  if (state.emptySet) {
    filters.push({
      key: "emptySet",
      label: "Brand in nothing",
      remove: { type: "EMPTY_SET_TOGGLED" },
    });
  }

  return filters;
};
