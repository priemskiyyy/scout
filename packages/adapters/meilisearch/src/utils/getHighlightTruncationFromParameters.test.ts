import { expect, test } from "vitest";

import { getHighlightTruncationFromParameters } from "src/utils/getHighlightTruncationFromParameters";

// Meilisearch never says whether it cropped a value, so a cropping search
// cannot claim a fragment is whole.
test("a cropping search cannot say whether a fragment was cut", () => {
  expect(
    getHighlightTruncationFromParameters({ attributesToCrop: ["title"] }),
  ).toBe("unknown");
});

test("a search that crops nothing knows nothing was cut", () => {
  expect(getHighlightTruncationFromParameters({})).toBe(false);
  expect(getHighlightTruncationFromParameters({ attributesToCrop: [] })).toBe(
    false,
  );
});
