import { ScoutError } from "@priemskiyyy/scout";
import type { AdapterFacet } from "@priemskiyyy/scout";

import type { ElasticSearchResponseBody } from "src/types/ElasticSearchResponseBody";
import type { ElasticTermsAggregate } from "src/types/ElasticTermsAggregate";
import { isPartialResponse } from "src/utils/isPartialResponse";

const getExhaustive = (
  aggregate: ElasticTermsAggregate,
  partial: boolean,
): boolean | "unknown" => {
  if (partial) {
    return false;
  }

  if (
    aggregate.sum_other_doc_count === 0 &&
    aggregate.doc_count_error_upper_bound === 0
  ) {
    return true;
  }

  // Values were left out of the top buckets, or a shard may have been
  // undercounted. A bound of -1 means the engine could not tell.
  if (
    (aggregate.sum_other_doc_count ?? 0) > 0 ||
    (aggregate.doc_count_error_upper_bound ?? 0) > 0
  ) {
    return false;
  }

  return "unknown";
};

/**
 * Every facet one answer counted, keyed by field. A boolean's key is 1 or 0,
 * so `key_as_string` is passed on when there is one, and the core decodes
 * each value to the type the index declared.
 *
 * @example
 * ```ts
 * getFacetsFromResponse(body).brand?.values; // [{ value: "Acme", count: 12 }]
 * ```
 */
export const getFacetsFromResponse = (
  body: ElasticSearchResponseBody,
): Readonly<Record<string, AdapterFacet>> => {
  const facets: Record<string, AdapterFacet> = {};
  const partial = isPartialResponse(body);

  for (const [field, aggregate] of Object.entries(body.aggregations ?? {})) {
    const values = Object.values(aggregate.buckets ?? {}).map((bucket) => {
      // The OpenSearch client's types admit a bucket without a count, which a
      // terms bucket always carries, so one without it is not what was asked.
      if (typeof bucket.doc_count !== "number") {
        throw new ScoutError({
          code: "provider",
          message: `The ${field} aggregation answered a bucket without a count.`,
        });
      }

      return {
        value: bucket.key_as_string ?? bucket.key,
        count: bucket.doc_count,
      };
    });

    facets[field] = {
      values,
      exhaustive: getExhaustive(aggregate, partial),
      native: aggregate,
    };
  }

  return facets;
};
