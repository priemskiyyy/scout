import { expect, test } from "vitest";

import { getHitsFromMatches } from "src/utils/getHitsFromMatches";

const MATCHES = ["p1", "p2", "p3"].map((id, refIndex) => ({
  item: { id, title: `Shoe ${id}` },
  refIndex,
}));

test("a page is cut from every match in order", () => {
  expect(
    getHitsFromMatches(MATCHES, { current: 2, size: 2 }, []).map(
      (hit) => hit.native.item.id,
    ),
  ).toEqual(["p3"]);
});

test("each hit keeps its document, its requested highlights and the whole Fuse hit", () => {
  const [hit] = getHitsFromMatches(MATCHES, { current: 1, size: 1 }, ["title"]);

  expect(hit).toEqual({
    document: MATCHES[0]?.item,
    highlights: {
      title: [
        {
          path: ["title"],
          truncated: false,
          parts: [{ text: "Shoe p1", matched: false }],
        },
      ],
    },
    native: MATCHES[0],
  });
});
