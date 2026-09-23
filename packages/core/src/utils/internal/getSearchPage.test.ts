import { expect, test } from "vitest";

import type { SearchTotal } from "src/types/SearchTotal";
import { getSearchPage } from "src/utils/internal/getSearchPage";

const exact = (value: number): SearchTotal => ({
  value,
  accuracy: "exact",
  scope: "matches",
});

test("the first page has no previous, and a later one points back", () => {
  expect(
    getSearchPage({ current: 1, size: 2 }, exact(9), 2).previous,
  ).toBeNull();
  expect(getSearchPage({ current: 3, size: 2 }, exact(9), 2).previous).toBe(2);
});

test("a page that came back short is the last, whatever the total says", () => {
  expect(
    getSearchPage({ current: 1, size: 10 }, exact(100), 3).next,
  ).toBeNull();
});

test("an exact total with more beyond this page has a next", () => {
  expect(getSearchPage({ current: 1, size: 2 }, exact(3), 2).next).toBe(2);
});

test("an exact total this page reaches has no next", () => {
  expect(getSearchPage({ current: 2, size: 2 }, exact(4), 2).next).toBeNull();
});

test("an unknown total leaves a full page's next unknown", () => {
  expect(
    getSearchPage(
      { current: 1, size: 2 },
      { accuracy: "unknown", scope: "unknown" },
      2,
    ).next,
  ).toBe("unknown");
});

// An estimate can run high or low, so a full page after it may or may not be
// followed by another, however far this page got.
test("an estimate neither promises another page nor rules one out", () => {
  expect(
    getSearchPage(
      { current: 1, size: 2 },
      { value: 100, accuracy: "estimated", scope: "matches" },
      2,
    ).next,
  ).toBe("unknown");
  expect(
    getSearchPage(
      { current: 1, size: 2 },
      { value: 2, accuracy: "estimated", scope: "retrievable" },
      2,
    ).next,
  ).toBe("unknown");
});

// At least that many documents match, so a page short of the bound certainly
// has a next. Reaching the bound proves nothing, unless it counts what paging
// can reach, as Meilisearch's maxTotalHits does.
test("a lower bound promises the pages below it and rules out none past it", () => {
  expect(
    getSearchPage(
      { current: 1, size: 2 },
      { value: 100, accuracy: "lower-bound", scope: "matches" },
      2,
    ).next,
  ).toBe(2);
  expect(
    getSearchPage(
      { current: 1, size: 2 },
      { value: 2, accuracy: "lower-bound", scope: "matches" },
      2,
    ).next,
  ).toBe("unknown");
  expect(
    getSearchPage(
      { current: 1, size: 2 },
      { value: 2, accuracy: "lower-bound", scope: "retrievable" },
      2,
    ).next,
  ).toBeNull();
});

// Algolia counts every match but pages no further than paginationLimitedTo,
// so a page at that window is the last, whatever the total says.
test("a page that reaches where the engine stops paging is the last", () => {
  expect(
    getSearchPage({ current: 2, size: 5 }, exact(100), 5, 10).next,
  ).toBeNull();
  expect(getSearchPage({ current: 1, size: 5 }, exact(100), 5, 10).next).toBe(
    2,
  );
});

test("the page echoes the position that was asked for", () => {
  expect(getSearchPage({ current: 2, size: 5 }, exact(20), 5)).toEqual({
    current: 2,
    size: 5,
    next: 3,
    previous: 1,
  });
});
