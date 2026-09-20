import type { FilterHelpers } from "src/types/FilterHelpers";

/**
 * The combinators a `where` callback receives. They only build nodes;
 * `normalizeFilter` is what collapses and flattens them later.
 */
export const FILTER_HELPERS: FilterHelpers = Object.freeze({
  and: (...expressions) => ({ type: "and", expressions }),
  or: (...expressions) => ({ type: "or", expressions }),
  not: (expression) => ({ type: "not", expression }),
});
