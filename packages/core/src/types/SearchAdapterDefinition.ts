import type { SearchAdapter } from "src/types/SearchAdapter";

/**
 * The provider mapping passed to `createSearchAdapter`. Cleanup and reserved
 * option keys can be omitted when the mapping owns neither.
 *
 * @example
 * ```ts
 * const definition = {
 *   name: "catalogue", native: client, capabilities, sorts, profiles,
 *   fingerprint: () => "catalogue-v1", search,
 * } satisfies SearchAdapterDefinition<Client, Options, Hit, Response>;
 * ```
 */
export type SearchAdapterDefinition<
  TNative = unknown,
  TNativeOptions = never,
  TNativeHit = unknown,
  TNativeResponse = unknown,
> = Omit<
  SearchAdapter<TNative, TNativeOptions, TNativeHit, TNativeResponse>,
  "dispose" | "reservedOptions"
> & {
  /** Releases resources owned by the adapter, never a borrowed client. */
  dispose?: () => void;
  /** Provider option keys owned by the portable request. Defaults to none. */
  reservedOptions?: readonly string[];
};
