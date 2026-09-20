import type { SearchCapabilities } from "src/types/SearchCapabilities";

/** Everything supported, as the starting point a mock narrows from. */
export const FULL_CAPABILITIES: SearchCapabilities = {
  filters: {
    eq: true,
    neq: true,
    in: true,
    notIn: true,
    comparison: true,
    between: true,
    booleanComposition: true,
  },
  pagination: { maxPageSize: null },
  facets: { resultScoped: true },
  highlights: "parts",
  cancellation: "transport",
};
