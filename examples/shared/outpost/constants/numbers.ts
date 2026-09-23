import type { FacetClaim } from "examples/shared/outpost/types/FacetClaim";
import type { FacetCounting } from "examples/shared/outpost/types/FacetCounting";
import type { NextPageKind } from "examples/shared/outpost/types/NextPageKind";
import type { Option } from "examples/shared/outpost/types/Option";
import type { PagingReach } from "examples/shared/outpost/types/PagingReach";
import type { TotalCounting } from "examples/shared/outpost/types/TotalCounting";

export const NEXT_PAGE_ORDER: NextPageKind[] = ["number", "none", "unknown"];

export const NEXT_PAGE_LABELS: Record<NextPageKind, string> = {
  number: "A page number",
  none: "None",
  unknown: "Unknown",
};

export const NEXT_PAGE_MEANINGS: Record<NextPageKind, string> = {
  number: "The count says there is more, so the core names the next page.",
  none: "This page was short, the count is exact, or paging reached its end.",
  unknown:
    "The page came back full and the count cannot say more, so there might be another.",
};

export const FACET_CLAIM_ORDER: FacetClaim[] = [
  "exhaustive",
  "sampled",
  "unsaid",
];

export const FACET_CLAIM_LABELS: Record<FacetClaim, string> = {
  exhaustive: "Exhaustive",
  sampled: "Sampled",
  unsaid: "Not said",
};

export const FACET_CLAIM_MEANINGS: Record<FacetClaim, string> = {
  exhaustive: "Every value was counted over every match. A missing value is 0.",
  sampled:
    "The engine counted a sample. A missing value may still match, so it shows as a dash.",
  unsaid: "The engine did not say how it counted.",
};

export const COUNTING_OPTIONS: Option<TotalCounting>[] = [
  { value: "exact", label: "Exactly" },
  { value: "estimated", label: "Roughly" },
  { value: "capped", label: "Up to 10" },
];

export const FACET_COUNTING_OPTIONS: Option<FacetCounting>[] = [
  { value: "every", label: "Every match" },
  { value: "sample", label: "A sample" },
];

export const PAGING_OPTIONS: Option<PagingReach>[] = [
  { value: "every", label: "Every match" },
  { value: "window", label: "The first 12" },
];
