import type { PriceBand } from "examples/shared/outpost/types/PriceBand";
import type { StoreClause } from "examples/shared/outpost/types/StoreClause";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { assertUnreachable } from "examples/shared/outpost/utils/assertUnreachable";

const formatValues = (values: readonly string[]) =>
  `[${values.map((value) => JSON.stringify(value)).join(", ")}]`;

// Each band is a different operator, so the code shows all three.
const getPriceClause = (priceBand: PriceBand): StoreClause | null => {
  if (priceBand === "any") {
    return null;
  }

  if (priceBand === "under50") {
    return {
      code: "product.price.lt(50)",
      build: (product) => product.price.lt(50),
    };
  }

  if (priceBand === "50to200") {
    return {
      code: "product.price.between(50, 200)",
      build: (product) => product.price.between(50, 200),
    };
  }

  if (priceBand === "over200") {
    return {
      code: "product.price.gte(200)",
      build: (product) => product.price.gte(200),
    };
  }

  return assertUnreachable(priceBand);
};

/**
 * The filters the store's controls add, in the order the code shows them.
 *
 * @example
 * ```ts
 * getStoreClauses({ ...initialStoreState, inStockOnly: true });
 * // [{ code: "product.inStock.eq(true)", build: ... }]
 * ```
 */
export const getStoreClauses = (state: StoreState): StoreClause[] => {
  const clauses: StoreClause[] = [];
  const { brands, categories, minRating } = state;

  if (brands.length > 0) {
    clauses.push({
      code: `product.brand.in(${formatValues(brands)})`,
      build: (product) => product.brand.in(brands),
    });
  }

  if (categories.length > 0) {
    clauses.push({
      code: `product.category.in(${formatValues(categories)})`,
      build: (product) => product.category.in(categories),
    });
  }

  const price = getPriceClause(state.priceBand);

  if (price !== null) {
    clauses.push(price);
  }

  if (minRating !== null) {
    clauses.push({
      code: `product.rating.gte(${minRating})`,
      build: (product) => product.rating.gte(minRating),
    });
  }

  if (state.inStockOnly) {
    clauses.push({
      code: "product.inStock.eq(true)",
      build: (product) => product.inStock.eq(true),
    });
  }

  // A set with nothing in it matches nothing, which Scout knows without asking.
  if (state.emptySet) {
    clauses.push({
      code: "product.brand.in([])",
      build: (product) => product.brand.in([]),
    });
  }

  return clauses;
};
