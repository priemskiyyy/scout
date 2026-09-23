import type { AdapterSort } from "@priemskiyyy/scout";
import { expect, test } from "vitest";

import { PRODUCTS } from "src/minisearch.fixture";
import { getSortedMatches } from "src/utils/getSortedMatches";

type Match = { readonly id: string; readonly document: unknown };

const MATCHES: readonly Match[] = PRODUCTS.map((product) => ({
  id: product.id,
  document: product,
}));

const getSort = (by: AdapterSort["by"]): AdapterSort => ({ name: "sort", by });

const getIds = (matches: readonly Match[], sort: AdapterSort | null) =>
  getSortedMatches(matches, sort).map((match) => match.id);

test("relevance keeps MiniSearch's own order", () => {
  expect(getIds(MATCHES, null)).toEqual(["p1", "p2", "p3", "p4", "p5", "p6"]);
});

test("an ascending sort orders every match by its field", () => {
  expect(
    getIds(MATCHES, getSort([{ field: "price", direction: "asc" }])),
  ).toEqual(["p4", "p6", "p5", "p1", "p2", "p3"]);
});

test("a descending sort reverses the order, and a later field breaks ties", () => {
  expect(
    getIds(MATCHES, getSort([{ field: "price", direction: "desc" }])),
  ).toEqual(["p3", "p2", "p1", "p5", "p6", "p4"]);
  expect(
    getIds(
      MATCHES,
      getSort([
        { field: "category", direction: "asc" },
        { field: "price", direction: "desc" },
      ]),
    ),
  ).toEqual(["p4", "p3", "p2", "p1", "p6", "p5"]);
});

// A missing value has no place in either direction, so it goes last in both
// rather than jumping to the front of a descending sort.
test("a document missing the sort field sorts last in either direction", () => {
  const matches = MATCHES.map((match) => {
    if (match.id !== "p4") {
      return match;
    }

    return { id: "p4", document: { id: "p4", title: "Shoe polish" } };
  });

  for (const direction of [
    "asc",
    "desc",
  ] satisfies AdapterSort["by"][number]["direction"][]) {
    expect(
      getIds(matches, getSort([{ field: "price", direction }])).at(-1),
    ).toBe("p4");
  }
});

// Infinity minus Infinity is NaN, which a subtraction would hand the sort as
// the order of two equal values instead of reaching the next field.
test("equal infinite values tie, so the next field decides", () => {
  const matches = MATCHES.map((match) => {
    if (match.id !== "p1" && match.id !== "p2") {
      return match;
    }

    return {
      id: match.id,
      document: {
        ...PRODUCTS.find((product) => product.id === match.id),
        price: Number.POSITIVE_INFINITY,
      },
    };
  });

  expect(
    getIds(
      matches,
      getSort([
        { field: "price", direction: "asc" },
        { field: "title", direction: "desc" },
      ]),
    ).slice(-2),
  ).toEqual(["p2", "p1"]);
});

test("sorting leaves the matches it was given as they were", () => {
  const matches = [...MATCHES];

  getSortedMatches(matches, getSort([{ field: "price", direction: "asc" }]));

  expect(matches.map((match) => match.id)).toEqual([
    "p1",
    "p2",
    "p3",
    "p4",
    "p5",
    "p6",
  ]);
});
