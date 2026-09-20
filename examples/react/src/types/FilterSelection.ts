import type { FacetField } from "src/types/FacetField";

export type FilterSelection = Readonly<Record<FacetField, readonly string[]>>;
