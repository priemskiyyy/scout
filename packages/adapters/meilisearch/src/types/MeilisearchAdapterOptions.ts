import type { MeilisearchProfiles } from "src/types/MeilisearchProfiles";
import type { MeilisearchSorts } from "src/types/MeilisearchSorts";
import type { MeilisearchIndexClient } from "src/types/MeilisearchIndexClient";
import type { FacetValueType } from "@priemskiyyy/scout";

/**
 * Configures a borrowed Meilisearch index, named search profiles and sorts.
 *
 * @example
 * ```ts
 * const adapter = meilisearch({ index: client.index("products"),
 *   profiles: { default: {} }, sorts: { relevance: {}, priceAsc: { sort: ["price:asc"] } } });
 * ```
 * @see [meilisearch adapter](https://priemskiyyy.github.io/scout/adapters.html#meilisearch)
 */
export type MeilisearchAdapterOptions<
  TProfiles extends MeilisearchProfiles = MeilisearchProfiles,
  TSorts extends MeilisearchSorts = MeilisearchSorts,
> = {
  /** The index client the application built and owns. */
  index: MeilisearchIndexClient;
  /** Every profile name the index declares, and the options it stands for. */
  profiles: TProfiles;
  /** Every sort name the index declares, and the Meilisearch sort it becomes. */
  sorts: TSorts;
  /** Types of non-string facet labels. Omitted fields retain their string value. */
  facets?: Readonly<Record<string, FacetValueType>>;
  /**
   * `"page"` sends `page` and `hitsPerPage` and reports an exhaustive total.
   * `"offset"` sends `offset` and `limit` and reports an estimate. Scout is
   * page based, so `"page"` is the default.
   */
  pagination?: "page" | "offset";
  /**
   * The index's configured `pagination.maxTotalHits`. Page mode counts up to
   * this number and stops, so a total that reaches it is a cap rather than a
   * count. Meilisearch's own default is 1000.
   */
  maxTotalHits?: number;
};
