import type { AdapterSearchRequest } from "src/types/AdapterSearchRequest";
import type { AdapterSearchResponse } from "src/types/AdapterSearchResponse";

/**
 * Translates Scout's requests onto one engine, and nothing more. Creating one
 * performs no I/O. The core owns everything around a search: it resolves the
 * request, answers a filter that matches nothing, cancels, disposes, wraps
 * provider failures and derives the page.
 *
 * - `native` is the client the application injected, reached through
 *   `scout.index(name).native`.
 * - `fingerprint` names what else decides the results, such as a collection or
 *   a corpus revision. It reaches cache keys and devtools, so it never carries
 *   a credential.
 * - `search` throws a `ScoutError` with the code `unsupported-feature` for
 *   anything the engine cannot express, rather than dropping it.
 * - `reservedOptions` names the provider options the adapter writes itself,
 *   which the core refuses before the search reaches the adapter.
 * - `sorts` lists the sorts an engine can only serve through configuration of
 *   its own, keyed by the index's sort names, so a missing one is caught when
 *   the Scout is built.
 * - `profiles` holds engine tuning keyed by profile name, checked the same way.
 * - `dispose` releases what the adapter owns, never an injected client.
 *
 * @example
 * ```ts
 * export const engine = (options: EngineOptions): SearchAdapter<Client> => ({
 *   name: "engine",
 *   native: options.client,
 *   fingerprint: () => options.collection,
 *   search: async (request, { signal }) => translate(await call(request, signal)),
 * });
 * ```
 *
 * @see [Writing an adapter](https://priemskiyyy.github.io/scout/writing-an-adapter.html)
 */
export type SearchAdapter<
  TNative = unknown,
  TNativeOptions = never,
  TNativeHit = unknown,
  TNativeResponse = unknown,
> = {
  readonly name: string;
  readonly native: TNative;
  readonly fingerprint: () => string;
  // A method, so an adapter with its own options is still an adapter.
  search(
    request: AdapterSearchRequest<TNativeOptions>,
    context: { signal: AbortSignal },
  ):
    | AdapterSearchResponse<TNativeHit, TNativeResponse>
    | Promise<AdapterSearchResponse<TNativeHit, TNativeResponse>>;
  /**
   * Provider option keys the adapter writes from the search itself. A search
   * whose provider options carry one is refused, because the adapter would
   * overwrite it, or, on a search that leaves it unset, let it change what the
   * search means.
   */
  readonly reservedOptions?: readonly string[] | undefined;
  // Keyed by name, and typed no further, so an adapter's own literal keys are
  // what the Scout checks. Optional config passes straight through, so
  // undefined means absent.
  readonly sorts?: object | undefined;
  readonly profiles?: object | undefined;
  readonly dispose?: (() => void) | undefined;
};
