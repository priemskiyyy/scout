import type { AdapterSearchRequest } from "src/types/AdapterSearchRequest";
import type { AdapterSearchResponse } from "src/types/AdapterSearchResponse";
import type { SearchCapabilities } from "src/types/SearchCapabilities";

/**
 * Maps an engine onto Scout's portable contract. Creation performs no I/O;
 * `search` sends requests. Sorts and profiles must cover the index declaration.
 *
 * The fingerprint identifies result-affecting state outside the request, such
 * as the collection and corpus revision. Never include credentials in it:
 * fingerprints appear in cache keys and devtools.
 *
 * @example
 * ```ts
 * export const provider = (options: ProviderOptions) =>
 *   createSearchAdapter({
 *     name: "provider",
 *     native: options.client,
 *     capabilities,
 *     sorts: options.sorts,
 *     profiles: options.profiles,
 *     reservedOptions: ["filter_by"],
 *     fingerprint: () => options.collection,
 *     search: async (request, { signal }) => translate(await call(request, signal)),
 *   });
 * ```
 */
export type SearchAdapter<
  TNative = unknown,
  TNativeOptions = never,
  TNativeHit = unknown,
  TNativeResponse = unknown,
> = {
  name: string;
  native: TNative;
  capabilities: SearchCapabilities;
  sorts: Readonly<Record<string, unknown>>;
  profiles: Readonly<Record<string, unknown>>;
  /** Provider option keys that would collide with a Scout owned field. */
  reservedOptions: readonly string[];
  fingerprint: () => string;
  search: (
    request: AdapterSearchRequest<TNativeOptions>,
    context: { signal: AbortSignal },
  ) => Promise<AdapterSearchResponse<TNativeHit, TNativeResponse>>;
  dispose: () => void;
};
