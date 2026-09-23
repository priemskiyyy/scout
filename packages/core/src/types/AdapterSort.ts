import type { SortDirection } from "src/types/SortDirection";

/**
 * A named sort as an adapter receives it: its name, for an engine that serves
 * sorts through configuration of its own such as Algolia's replicas, and the
 * fields it orders by, in priority order.
 *
 * @example
 * ```ts
 * const sort: AdapterSort = { name: "priceAsc", by: [{ field: "price", direction: "asc" }] };
 * ```
 *
 * @see [Writing an adapter](https://priemskiyyy.github.io/scout/writing-an-adapter.html)
 */
export type AdapterSort = {
  readonly name: string;
  readonly by: readonly {
    readonly field: string;
    readonly direction: SortDirection;
  }[];
};
