import type { AlgoliaSort } from "src/types/AlgoliaSort";
import type { AlgoliaProfile } from "src/types/AlgoliaProfile";
import type { AlgoliaSearchClient } from "src/types/AlgoliaSearchClient";
import type { FacetValueType } from "@priemskiyyy/scout";

/**
 * Configures the injected Algolia client, named replicas and search profiles.
 *
 * @example
 * ```ts
 * const options = { client, index: { name: "products" },
 *   sorts: { relevance: { index: { name: "products" } } }, profiles: { default: {} } };
 * const adapter = algolia(options);
 * ```
 * @see [algolia adapter](https://priemskiyyy.github.io/scout/adapters.html#algolia)
 */
export type AlgoliaOptions<
  TSorts extends Readonly<Record<string, AlgoliaSort>>,
  TProfiles extends Readonly<Record<string, AlgoliaProfile>>,
> = {
  /** A search client the application owns. The adapter never disposes it. */
  client: AlgoliaSearchClient;
  /** The primary index identity. Each named sort selects its request target. */
  index: { name: string };
  sorts: TSorts;
  profiles: TProfiles;
  /** Types of non-string facet labels. Omitted fields retain their string value. */
  facets?: Readonly<Record<string, FacetValueType>>;
  /**
   * Whether to let the client's own `requestsCache` and `responsesCache` answer
   * a search. It is `false` by default, because TanStack Query already owns
   * caching and a cache inside the client would swallow an invalidation before
   * it reached the network.
   */
  cache?: boolean;
  /**
   * The index's `paginationLimitedTo` setting, which is 1000 unless it was
   * changed. Matches past this window exist but cannot be paged to, so the
   * adapter caps `page.next` and says `scope: "matches"` rather than pretending
   * they are retrievable.
   */
  paginationLimitedTo?: number;
};
