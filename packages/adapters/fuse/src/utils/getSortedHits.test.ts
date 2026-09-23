import type { AdapterSort } from "@priemskiyyy/scout";
import { expect, test } from "vitest";

import { getSortedHits } from "src/utils/getSortedHits";

const getHits = (items: readonly Record<string, unknown>[]) =>
  items.map((item, refIndex) => ({ item, refIndex }));

const getIds = (hits: readonly { item: Record<string, unknown> }[]) =>
  hits.map((hit) => hit.item["id"]);

const HITS = getHits([
  { id: "p1", category: "footwear", price: 90 },
  { id: "p2", category: "footwear", price: 140 },
  { id: "p3", category: "care", price: 8 },
]);

const getSort = (by: AdapterSort["by"]): AdapterSort => ({ name: "sort", by });

test("relevance keeps Fuse's own order", () => {
  expect(getSortedHits(HITS, null)).toBe(HITS);
});

test("a sort orders by its field in either direction", () => {
  expect(
    getIds(
      getSortedHits(HITS, getSort([{ field: "price", direction: "asc" }])),
    ),
  ).toEqual(["p3", "p1", "p2"]);
  expect(
    getIds(
      getSortedHits(HITS, getSort([{ field: "price", direction: "desc" }])),
    ),
  ).toEqual(["p2", "p1", "p3"]);
});

test("a later field decides only where the earlier ones tie", () => {
  expect(
    getIds(
      getSortedHits(
        HITS,
        getSort([
          { field: "category", direction: "asc" },
          { field: "price", direction: "desc" },
        ]),
      ),
    ),
  ).toEqual(["p3", "p2", "p1"]);
});

test("a document without the field comes last in either direction", () => {
  const hits = getHits([
    { id: "a", price: 2 },
    { id: "b" },
    { id: "c", price: 1 },
  ]);

  expect(
    getIds(
      getSortedHits(hits, getSort([{ field: "price", direction: "asc" }])),
    ),
  ).toEqual(["c", "a", "b"]);
  expect(
    getIds(
      getSortedHits(hits, getSort([{ field: "price", direction: "desc" }])),
    ),
  ).toEqual(["a", "c", "b"]);
});

test("a tie keeps Fuse's own order", () => {
  const hits = getHits([
    { id: "a", price: 1 },
    { id: "b", price: 1 },
  ]);

  expect(
    getIds(
      getSortedHits(hits, getSort([{ field: "price", direction: "desc" }])),
    ),
  ).toEqual(["a", "b"]);
});
