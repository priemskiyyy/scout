import MiniSearch from "minisearch";
import { expect, test } from "vitest";

import { createProductIndex } from "src/minisearch.fixture";
import type { MiniSearchIndex } from "src/types/MiniSearchIndex";
import type { MiniSearchSearchOptions } from "src/types/MiniSearchSearchOptions";
import { getResultsFromIndex } from "src/utils/getResultsFromIndex";

type Wildcard = typeof MiniSearch.wildcard;

const OPTIONS: MiniSearchSearchOptions = {
  fields: ["title", "category", "tags"],
};

/** The real index, with every query it received recorded. */
const getRecordingIndex = () => {
  const products = createProductIndex();
  const queries: (string | Wildcard)[] = [];

  const recording: MiniSearchIndex<Wildcard> = {
    search: (query, options) => {
      queries.push(query);

      return products.search(query, options);
    },
  };

  return { queries, recording };
};

test("a query is searched as it is", () => {
  const { queries, recording } = getRecordingIndex();

  expect(
    getResultsFromIndex(recording, MiniSearch.wildcard, "shoe", OPTIONS),
  ).toHaveLength(5);
  expect(queries).toEqual(["shoe"]);
});

test("an empty query browses every document through the wildcard", () => {
  const { queries, recording } = getRecordingIndex();

  expect(
    getResultsFromIndex(recording, MiniSearch.wildcard, "", OPTIONS),
  ).toHaveLength(6);
  expect(queries).toEqual([MiniSearch.wildcard]);
});

test("an empty query without the wildcard is refused before the index is searched", () => {
  const { queries, recording } = getRecordingIndex();

  expect(() =>
    getResultsFromIndex(recording, undefined, "", OPTIONS),
  ).toThrowError(expect.objectContaining({ code: "unsupported-feature" }));
  expect(queries).toEqual([]);
});
