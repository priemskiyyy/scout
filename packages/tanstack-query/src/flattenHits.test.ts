import { expect, test } from "vitest";

import { flattenHits } from "src/flattenHits";
import { infiniteQueryOptions } from "src/infiniteQueryOptions";
import { products } from "src/products.fixture";
import type { Product } from "src/products.fixture";

const PAGE_SIZE = 3;

const product = (id: string): Product => ({
  id,
  name: `Shoe ${id}`,
  brand: "Nike",
  price: 120,
});

const context = (pageParam: number) => ({
  pageParam,
  signal: new AbortController().signal,
});

test("a corpus that shifts between two fetches cannot produce a repeated hit", async () => {
  let corpus = ["a", "b", "c", "d", "e"].map(product);

  const { search } = products({
    pageSize: PAGE_SIZE,
    answer: (page) => ({
      documents: corpus.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      total: { accuracy: "unknown", scope: "unknown" },
    }),
  });

  const options = infiniteQueryOptions(search);

  const first = await options.queryFn(context(1));

  // A document was indexed while the user was reading page one, so every
  // document after it moved one place along. Page-number pagination has no
  // cursor to hold the reader's place, which every Scout adapter shares.
  corpus = [product("z"), ...corpus];

  const second = await options.queryFn(context(2));

  expect(first.hits.map((hit) => hit.id)).toEqual(["a", "b", "c"]);
  expect(second.hits.map((hit) => hit.id)).toEqual(["c", "d", "e"]);
  expect(flattenHits({ pages: [first, second] }).map((hit) => hit.id)).toEqual([
    "a",
    "b",
    "c",
    "d",
    "e",
  ]);
});

test("the first occurrence keeps the position the reader already saw it in", () => {
  const data = {
    pages: [
      { hits: [{ id: "a" }, { id: "b" }] },
      { hits: [{ id: "b" }, { id: "a" }, { id: "c" }] },
    ],
  };

  expect(flattenHits(data).map((hit) => hit.id)).toEqual(["a", "b", "c"]);
});

test("the pages are never touched, because they are the query cache's own data", () => {
  const pages = [
    { hits: [{ id: "a" }, { id: "b" }] },
    { hits: [{ id: "a" }, { id: "c" }] },
  ];

  const before = structuredClone(pages);

  const hits = flattenHits({ pages });

  expect(pages).toEqual(before);
  expect(hits).not.toBe(pages[0]?.hits);
});

test("a query that has not answered yet flattens to nothing", () => {
  expect(flattenHits(undefined)).toEqual([]);
});
