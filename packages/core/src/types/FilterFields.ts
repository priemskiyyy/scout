import type { FilterField } from "src/types/FilterField";
import type { IndexShape } from "src/types/IndexShape";

/**
 * The field objects a `where` callback receives, one per filterable field.
 *
 * @example
 * ```ts
 * const inStock = (fields: FilterFields<ProductShape>) => fields.inStock.eq(true);
 * ```
 *
 * @see {@linkcode FilterField}
 */
export type FilterFields<TShape extends IndexShape> = {
  [TField in TShape["filterable"]]: FilterField<
    TField extends keyof TShape["document"] ? TShape["document"][TField] : never
  >;
};
