import type { StoreAction } from "examples/shared/outpost/types/StoreAction";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { assertUnreachable } from "examples/shared/outpost/utils/assertUnreachable";

export const initialStoreState: StoreState = {
  engine: "api",
  query: "tent",
  profile: "default",
  sort: "relevance",
  brands: [],
  categories: [],
  priceBand: "any",
  minRating: null,
  inStockOnly: false,
  emptySet: false,
  facets: true,
  highlights: true,
};

const toggle = <T>(values: readonly T[], value: T): readonly T[] => {
  if (values.includes(value)) {
    return values.filter((current) => current !== value);
  }

  return [...values, value];
};

const clearFilters = (state: StoreState): StoreState => ({
  ...state,
  brands: [],
  categories: [],
  priceBand: "any",
  minRating: null,
  inStockOnly: false,
  emptySet: false,
});

export const storeReducer = (
  state: StoreState,
  action: StoreAction,
): StoreState => {
  if (action.type === "QUERY_CHANGED") {
    return { ...state, query: action.query };
  }

  // A preset is a fresh search, so the filters of the last one go.
  if (action.type === "PRESET_SELECTED") {
    return { ...clearFilters(state), query: action.query };
  }

  if (action.type === "ENGINE_SELECTED") {
    return { ...state, engine: action.engine };
  }

  if (action.type === "PROFILE_SELECTED") {
    return { ...state, profile: action.profile };
  }

  if (action.type === "SORT_SELECTED") {
    return { ...state, sort: action.sort };
  }

  if (action.type === "BRAND_TOGGLED") {
    return { ...state, brands: toggle(state.brands, action.brand) };
  }

  if (action.type === "CATEGORY_TOGGLED") {
    return { ...state, categories: toggle(state.categories, action.category) };
  }

  if (action.type === "PRICE_BAND_SELECTED") {
    return { ...state, priceBand: action.priceBand };
  }

  if (action.type === "MIN_RATING_SELECTED") {
    return { ...state, minRating: action.minRating };
  }

  if (action.type === "IN_STOCK_TOGGLED") {
    return { ...state, inStockOnly: !state.inStockOnly };
  }

  if (action.type === "EMPTY_SET_TOGGLED") {
    return { ...state, emptySet: !state.emptySet };
  }

  if (action.type === "FACETS_TOGGLED") {
    return { ...state, facets: !state.facets };
  }

  if (action.type === "HIGHLIGHTS_TOGGLED") {
    return { ...state, highlights: !state.highlights };
  }

  if (action.type === "FILTERS_CLEARED") {
    return clearFilters(state);
  }

  return assertUnreachable(action);
};
