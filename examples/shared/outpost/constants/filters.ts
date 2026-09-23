import {
  BRANDS,
  CATEGORIES,
} from "examples/shared/outpost/constants/catalogue";
import type { FacetOption } from "examples/shared/outpost/types/FacetOption";
import type { Option } from "examples/shared/outpost/types/Option";
import { CATEGORY_LABELS } from "examples/shared/outpost/constants/labels";

export const BRAND_OPTIONS: readonly FacetOption[] = BRANDS.map((brand) => ({
  value: brand,
  label: brand,
}));

export const CATEGORY_OPTIONS: readonly FacetOption[] = CATEGORIES.map(
  (category) => ({ value: category, label: CATEGORY_LABELS[category] }),
);

export const RATING_OPTIONS: Option<number>[] = [
  { value: 0, label: "Any rating" },
  { value: 4, label: "4.0 and up" },
  { value: 4.5, label: "4.5 and up" },
];
