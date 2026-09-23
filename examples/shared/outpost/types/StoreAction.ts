import type { Brand } from "examples/shared/outpost/types/Brand";
import type { Category } from "examples/shared/outpost/types/Category";
import type { EngineId } from "examples/shared/outpost/types/EngineId";
import type { PriceBand } from "examples/shared/outpost/types/PriceBand";
import type { ProfileName } from "examples/shared/outpost/types/ProfileName";
import type { SortName } from "examples/shared/outpost/types/SortName";

export type StoreAction =
  | { type: "QUERY_CHANGED"; query: string }
  | { type: "PRESET_SELECTED"; query: string }
  | { type: "ENGINE_SELECTED"; engine: EngineId }
  | { type: "PROFILE_SELECTED"; profile: ProfileName }
  | { type: "SORT_SELECTED"; sort: SortName }
  | { type: "BRAND_TOGGLED"; brand: Brand }
  | { type: "CATEGORY_TOGGLED"; category: Category }
  | { type: "PRICE_BAND_SELECTED"; priceBand: PriceBand }
  | { type: "MIN_RATING_SELECTED"; minRating: number | null }
  | { type: "IN_STOCK_TOGGLED" }
  | { type: "EMPTY_SET_TOGGLED" }
  | { type: "FACETS_TOGGLED" }
  | { type: "HIGHLIGHTS_TOGGLED" }
  | { type: "FILTERS_CLEARED" };
