import type { AnySearchAdapter } from "src/types/AnySearchAdapter";
import type { IndexShape } from "src/types/IndexShape";
import type { SearchIndex } from "src/types/SearchIndex";

/**
 * What `index()` produces and `Scout` holds. The shape of the index travels in
 * the return type of `create`, so nothing has to carry a phantom field to keep
 * the declaration and its handle related.
 *
 * @example
 * ```ts
 * const products: IndexDeclaration<ProductShape> = index(definition);
 * const scout = new Scout({ indexes: { products } });
 * ```
 *
 * @see [index usage](https://priemskiyyy.github.io/scout/indexes.html)
 */
export type IndexDeclaration<TShape extends IndexShape> = {
  readonly create: (
    name: string,
    isDisposed: () => boolean,
  ) => SearchIndex<TShape>;
  readonly adapter: AnySearchAdapter;
};
