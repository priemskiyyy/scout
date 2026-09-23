import { expect, test } from "vitest";

import { createProductIndex } from "src/minisearch.fixture";
import { getPageHitsFromMatches } from "src/utils/getPageHitsFromMatches";

const MATCHES = createProductIndex()
  .search("shoe")
  .map((result) => ({ result, document: { id: result.id } }));

const getIds = (current: number, size: number) =>
  getPageHitsFromMatches(MATCHES, { current, size }).map(
    (hit) => hit.native.id,
  );

test("a page is a one based slice of every match", () => {
  const every = MATCHES.map((match) => match.result.id);

  expect(getIds(1, 2)).toEqual(every.slice(0, 2));
  expect(getIds(2, 2)).toEqual(every.slice(2, 4));
  expect(getIds(4, 2)).toEqual([]);
});

test("each hit keeps its document and the raw MiniSearch result", () => {
  const [hit] = getPageHitsFromMatches(MATCHES, { current: 1, size: 1 });

  expect(hit?.document).toEqual({ id: MATCHES[0]?.result.id });
  expect(hit?.highlights).toEqual({});
  expect(hit?.native).toBe(MATCHES[0]?.result);
  expect(hit?.native).toHaveProperty("score");
  expect(hit?.native).toHaveProperty("match");
});
