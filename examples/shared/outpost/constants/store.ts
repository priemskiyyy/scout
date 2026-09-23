import type { FacetField } from "examples/shared/outpost/types/FacetField";
import type { HighlightField } from "examples/shared/outpost/types/HighlightField";
import type { Option } from "examples/shared/outpost/types/Option";
import type { PriceBand } from "examples/shared/outpost/types/PriceBand";
import type { ProfileName } from "examples/shared/outpost/types/ProfileName";
import type { SearchPreset } from "examples/shared/outpost/types/SearchPreset";
import type { SortName } from "examples/shared/outpost/types/SortName";

export const PAGE_SIZE = 8;

export const FACET_FIELDS: readonly FacetField[] = [
  "brand",
  "category",
  "inStock",
];

export const HIGHLIGHT_FIELDS: readonly HighlightField[] = [
  "name",
  "description",
];

export const SEARCH_PRESETS: readonly SearchPreset[] = [
  { label: "tent", query: "tent" },
  { label: "waterproof", query: "waterproof" },
  { label: "winter", query: "winter" },
  { label: "ultralight stove", query: "ultralight stove" },
  { label: "A typo: wateproof", query: "wateproof" },
  { label: "Everything", query: "" },
];

export const SORT_OPTIONS: Option<SortName>[] = [
  { value: "relevance", label: "Relevance" },
  { value: "priceAsc", label: "Price, low first" },
  { value: "priceDesc", label: "Price, high first" },
  { value: "topRated", label: "Top rated" },
];

export const PROFILE_OPTIONS: Option<ProfileName>[] = [
  { value: "default", label: "Everything" },
  { value: "names", label: "Names only" },
];

export const PRICE_BAND_OPTIONS: Option<PriceBand>[] = [
  { value: "any", label: "Any" },
  { value: "under50", label: "Under $50" },
  { value: "50to200", label: "$50 to $200" },
  { value: "over200", label: "$200 and up" },
];
