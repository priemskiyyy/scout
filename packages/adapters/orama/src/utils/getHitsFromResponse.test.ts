import { expect, test } from "vitest";

import { getHitsFromResponse } from "src/utils/getHitsFromResponse";

test("each hit keeps its document and the whole Orama hit, with no highlight", () => {
  const hit = { id: "p1", score: 1.5, document: { id: "p1", name: "Mug" } };

  expect(
    getHitsFromResponse({
      count: 1,
      hits: [hit],
      elapsed: { raw: 1 },
    }),
  ).toEqual([{ document: hit.document, highlights: {}, native: hit }]);
});
