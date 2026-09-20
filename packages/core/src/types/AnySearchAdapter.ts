import type { SearchAdapter } from "src/types/SearchAdapter";

/**
 * The supertype every concrete adapter satisfies, for code that holds an
 * adapter without knowing its native types.
 *
 * Native options are `never` rather than `unknown` on purpose: a request whose
 * `provider` is `null` is accepted by an adapter expecting its own options,
 * which is the direction assignability actually needs.
 *
 * @example
 * ```ts
 * const adapters: readonly AnySearchAdapter[] = [productsAdapter, articlesAdapter];
 * for (const adapter of adapters) { adapter.dispose(); }
 * ```
 *
 * @see {@linkcode SearchAdapter}
 */
export type AnySearchAdapter = SearchAdapter<unknown, never, unknown, unknown>;
