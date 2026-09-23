import { ScoutError } from "@priemskiyyy/scout";
import type { AdapterSearchRequest } from "@priemskiyyy/scout";

import type { FuseIndex } from "src/types/FuseIndex";

/**
 * What to ask Fuse for one search. Fuse's keys are fixed when it is built, so
 * a profile over fewer of them is a logical query naming each one.
 *
 * @example
 * ```ts
 * getQueryFromRequest(engine, request); // "shoe", or { $or: [{ title: "shoe" }] }
 * ```
 */
export const getQueryFromRequest = (
  index: FuseIndex<unknown>,
  request: AdapterSearchRequest,
): string | { $or: Record<string, string>[] } => {
  const indexed = index.getIndex().keys.map((key) => key.id);

  for (const field of request.searchable) {
    if (!indexed.includes(field)) {
      throw new ScoutError({
        code: "configuration",
        message: `Fuse does not index ${field}, which the ${request.profile} profile searches. Add it to the Fuse keys.`,
      });
    }
  }

  // Fuse answers a blank query with every document, in collection order.
  if (request.query.trim() === "") {
    return request.query;
  }

  if (indexed.every((key) => request.searchable.includes(key))) {
    return request.query;
  }

  // A logical query builds its searchers without token search's corpus
  // statistics, and reads an extended `!term` per key instead of across them.
  if (index.options.useExtendedSearch || index.options.useTokenSearch) {
    throw new ScoutError({
      code: "unsupported-feature",
      message: `Fuse cannot search fewer than all of its keys with extended or token search on, and the ${request.profile} profile does.`,
    });
  }

  return {
    $or: request.searchable.map((field) => ({ [field]: request.query })),
  };
};
