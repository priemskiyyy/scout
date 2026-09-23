import { ScoutError } from "@priemskiyyy/scout";

import type { HttpAdapter } from "src/types/HttpAdapter";
import type { HttpAdapterOptions } from "src/types/HttpAdapterOptions";
import { getFacetsFromResponse } from "src/utils/getFacetsFromResponse";

/**
 * Searches your own backend through your own client. `request` sends the
 * portable search and resolves with the backend's answer in the wire format.
 * An answer that refuses a feature is `unsupported-feature`, and anything
 * else that fails is a `provider` error.
 *
 * @example
 * ```ts
 * const adapter = http({
 *   fingerprint: "catalogue-api",
 *   request: async ({ search, signal }) => {
 *     const response = await fetch("https://api.example.com/search", {
 *       method: "POST",
 *       headers: { "content-type": "application/json" },
 *       body: JSON.stringify(search),
 *       signal,
 *     });
 *     if (!response.ok) {
 *       throw new Error(`The search endpoint answered ${response.status}.`);
 *     }
 *     return response.json();
 *   },
 * });
 * ```
 */
export const http = <TNativeOptions = never>({
  fingerprint,
  request,
}: HttpAdapterOptions<TNativeOptions>): HttpAdapter<TNativeOptions> => ({
  name: "http",
  native: request,
  fingerprint: () => fingerprint,
  search: async (search, { signal }) => {
    const answer = await request({ search, signal });

    if ("refusal" in answer) {
      throw new ScoutError({
        code: "unsupported-feature",
        message: answer.refusal.message,
      });
    }

    return {
      hits: answer.hits.map((hit) => ({
        document: hit.document,
        highlights: hit.highlights ?? {},
        native: hit,
      })),
      total: answer.total ?? { accuracy: "unknown", scope: "unknown" },
      facets: getFacetsFromResponse(answer),
      took: answer.took ?? null,
      retrievable: answer.retrievable,
      native: answer,
    };
  },
});
