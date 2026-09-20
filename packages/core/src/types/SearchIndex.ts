import type { IndexShape } from "src/types/IndexShape";
import type { SearchBuilder } from "src/types/SearchBuilder";

/**
 * One index, reached with `scout.index(name)`.
 *
 * `native` is the provider client the application injected, for the calls Scout
 * does not model. Going through it bypasses Scout's identity, capability checks
 * and result mapping, and therefore any cache built on them.
 *
 * @example
 * ```ts
 * const products = scout.index("products");
 * const result = await products.search("boots").pageSize(20).execute();
 * ```
 */
export type SearchIndex<TShape extends IndexShape> = {
  name: string;
  search: (text: string) => SearchBuilder<TShape>;
  native: TShape["native"]["client"];
};
