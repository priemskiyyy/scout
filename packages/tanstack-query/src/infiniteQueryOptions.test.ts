import type { SearchTotal } from "@priemskiyyy/scout";
import { QueryClient } from "@tanstack/query-core";
import { expect, test } from "vitest";

import { infiniteQueryOptions } from "src/infiniteQueryOptions";
import { products } from "src/products.fixture";
import type { Product } from "src/products.fixture";
import { queryOptions } from "src/queryOptions";

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

const UNKNOWN: SearchTotal = { accuracy: "unknown", scope: "unknown" };

const getExact = (value: number): SearchTotal => ({
  value,
  accuracy: "exact",
  scope: "matches",
});

/** The next page parameter after one real page of three came back like this. */
const getNextAfter = async (
  documents: readonly unknown[],
  total: SearchTotal,
) => {
  const { search } = products({
    pageSize: 3,
    validate: "skip",
    answer: () => ({ documents, total }),
  });

  const options = infiniteQueryOptions(search);

  return options.getNextPageParam(await options.queryFn(context(1)));
};

test("the base key is stable across pages, so one entry holds the whole list", () => {
  const { search } = products();

  expect(infiniteQueryOptions(search).queryKey).toEqual(
    infiniteQueryOptions(search.page({ current: 7 })).queryKey,
  );
});

test("the base key is namespaced under the search's own, marked infinite", () => {
  const { search } = products();
  const key = infiniteQueryOptions(search).queryKey;

  // The namespace segment is shared, so invalidating every Scout query still
  // reaches an infinite one. The marker is what keeps them apart.
  expect(key[0]).toBe(search.key()[0]);
  expect(key).toContain("infinite");
});

test("an infinite query and a normal query at page one never share a cache entry", async () => {
  const { search } = products({
    answer: () => ({ documents: [product("a")], total: getExact(1) }),
  });

  const client = new QueryClient();
  const page = queryOptions(search.page({ current: 1 }));
  const infinite = infiniteQueryOptions(search);

  expect(infinite.queryKey).not.toEqual(page.queryKey);

  await client.fetchQuery(page);
  await client.fetchInfiniteQuery(infinite);

  expect(client.getQueryCache().getAll()).toHaveLength(2);
  // The page entry is still one page and not the infinite query's pages, which
  // is exactly what a shared key would have destroyed.
  expect(client.getQueryData(page.queryKey)).toMatchObject({
    page: { current: 1 },
  });
  expect(client.getQueryData(infinite.queryKey)).toMatchObject({
    pageParams: [1],
  });
});

test("the query function executes the page TanStack asked for", async () => {
  const { mock, search } = products();

  const page = await infiniteQueryOptions(search).queryFn(context(3));

  expect(mock.requests[0]?.request.page.current).toBe(3);
  expect(page.page.current).toBe(3);
});

test("the signal TanStack supplies reaches the adapter", async () => {
  const { mock, search } = products({ hold: true });
  const controller = new AbortController();

  const pending = infiniteQueryOptions(search).queryFn({
    pageParam: 2,
    signal: controller.signal,
  });

  controller.abort(new Error("the list unmounted"));

  await expect(pending).rejects.toMatchObject({ code: "aborted" });
  expect(mock.requests[0]?.aborted()).toBe(true);
});

test("a next page the core derived is followed", async () => {
  const full = [product("a"), product("b"), product("c")];

  await expect(getNextAfter(full, getExact(9))).resolves.toBe(2);
});

test("a count the page reached ends the list", async () => {
  const full = [product("a"), product("b"), product("c")];

  await expect(getNextAfter(full, getExact(3))).resolves.toBeUndefined();
});

test("an engine that cannot count advances while the page came back full", async () => {
  const full = [product("a"), product("b"), product("c")];

  await expect(getNextAfter(full, UNKNOWN)).resolves.toBe(2);
});

test("an engine that cannot count stops on a page that came back short", async () => {
  await expect(
    getNextAfter([product("a"), product("b")], UNKNOWN),
  ).resolves.toBeUndefined();
});

// The engine filled the page, so there may be more, however many of its
// documents the schema then dropped.
test("documents dropped by validation do not end the list early", async () => {
  await expect(
    getNextAfter([product("a"), { id: "broken" }, { id: "worse" }], UNKNOWN),
  ).resolves.toBe(2);
});

test("a last page that is exactly full costs one empty request and then stops", async () => {
  const { mock, search } = products({
    pageSize: 2,
    // Two documents and nothing more, on an engine that never says whether
    // another page exists. Page one is indistinguishable from a full page in
    // the middle of a list, so the heuristic asks for page two.
    answer: (page) => {
      if (page === 1) {
        return { documents: [product("a"), product("b")], total: UNKNOWN };
      }

      return { documents: [], total: UNKNOWN };
    },
  });

  const client = new QueryClient();

  const data = await client.fetchInfiniteQuery({
    ...infiniteQueryOptions(search),
    pages: 5,
  });

  expect(mock.requests.map((entry) => entry.request.page.current)).toEqual([
    1, 2,
  ]);
  expect(data.pageParams).toEqual([1, 2]);
  expect(data.pages[1]?.hits).toEqual([]);
});

test("the previous page parameter is the page the engine reported", async () => {
  const { search } = products();
  const options = infiniteQueryOptions(search);

  expect(options.getPreviousPageParam(await options.queryFn(context(3)))).toBe(
    2,
  );
  expect(
    options.getPreviousPageParam(await options.queryFn(context(1))),
  ).toBeNull();
});

test("no caching defaults are set, because staleness and retries are the application's", () => {
  const { search } = products();

  expect(Object.keys(infiniteQueryOptions(search))).toEqual([
    "queryKey",
    "queryFn",
    "initialPageParam",
    "getNextPageParam",
    "getPreviousPageParam",
  ]);
});
