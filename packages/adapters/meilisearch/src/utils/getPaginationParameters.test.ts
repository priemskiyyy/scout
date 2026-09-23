import { expect, test } from "vitest";

import { getPaginationParameters } from "src/utils/getPaginationParameters";

test("page mode asks for a page by its number and size", () => {
  expect(getPaginationParameters({ current: 2, size: 20 }, "page")).toEqual({
    page: 2,
    hitsPerPage: 20,
  });
});

test("offset mode asks by the offset of the page's first hit", () => {
  expect(getPaginationParameters({ current: 3, size: 20 }, "offset")).toEqual({
    offset: 40,
    limit: 20,
  });
});
