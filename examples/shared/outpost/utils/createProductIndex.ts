import { index } from "@priemskiyyy/scout";

import { ProductSchema } from "examples/shared/outpost/constants/productSchema";
import type { ValidationMode } from "examples/shared/outpost/types/ValidationMode";

/**
 * Outpost's one index declaration. It names no engine: the same declaration
 * is served by your API, Orama, MiniSearch and Fuse.js in the page, and
 * translated for six more. The lab chooses what a failing document does.
 *
 * @example
 * ```ts
 * const products = createProductIndex("error");
 * ```
 */
export const createProductIndex = (validate: ValidationMode) =>
  index({
    schema: ProductSchema,
    id: (product) => product.id,
    searchable: ["name", "description", "tags"],
    filterable: ["brand", "category", "price", "rating", "inStock", "tags"],
    facetable: { brand: "string", category: "string", inStock: "boolean" },
    highlightable: ["name", "description"],
    sorts: {
      priceAsc: { price: "asc" },
      priceDesc: { price: "desc" },
      topRated: { rating: "desc" },
    },
    profiles: { names: { searchable: ["name"] } },
    validate,
  });
