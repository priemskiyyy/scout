import type { Brand } from "examples/shared/outpost/types/Brand";
import type { Category } from "examples/shared/outpost/types/Category";
import type { EngineId } from "examples/shared/outpost/types/EngineId";
import type { PriceBand } from "examples/shared/outpost/types/PriceBand";
import type { ProfileName } from "examples/shared/outpost/types/ProfileName";
import type { SortName } from "examples/shared/outpost/types/SortName";

/** What the store's controls say, which is everything its search is built from. */
export type StoreState = {
  engine: EngineId;
  query: string;
  profile: ProfileName;
  sort: SortName;
  brands: readonly Brand[];
  categories: readonly Category[];
  priceBand: PriceBand;
  minRating: number | null;
  inStockOnly: boolean;
  emptySet: boolean;
  facets: boolean;
  highlights: boolean;
};
