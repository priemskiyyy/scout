import { QueryClient } from "@tanstack/query-core";
import { SearchAbortedError } from "@priemskiyyy/scout";
import { expect, test } from "vitest";
import { infiniteQueryOptions } from "src/infiniteQueryOptions";
import { products } from "src/products.fixture";
import { queryOptions } from "src/queryOptions";
import type { Product } from "src/products.fixture";
import type { SearchPage } from "@priemskiyyy/scout";

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

/** The next page parameter after one real page came back looking like this. */
const nextAfter = async (
  documents: readonly Product[],
  next: SearchPage["next"],
) => {
  const { search } = products({
    pageSize: 3,
    answer: () => ({ documents, next }),
  });
  const options = infiniteQueryOptions(search);

  return options.getNextPageParam(await options.queryFn(context(1)));
};

test("the base key is stable across pages, so one entry holds the whole list", () => {
  const { search } = products();

  expect(infiniteQueryOptions(search).queryKey).toEqual(
    infiniteQueryOptions(search.page(7)).queryKey,
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
    answer: () => ({ documents: [product("a")], next: null }),
  });
  const client = new QueryClient();
  const page = queryOptions(search.page(1));
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

  await expect(pending).rejects.toThrowError(SearchAbortedError);
  expect(mock.requests[0]?.aborted()).toBe(true);
});

test("an engine that names the next page is believed", async () => {
  await expect(nextAfter([product("a")], 4)).resolves.toBe(4);
});

test("an engine that says there is no next page ends the list", async () => {
  await expect(nextAfter([product("a")], null)).resolves.toBeUndefined();
});

test("an engine that cannot say advances while the page came back full", async () => {
  const full = [product("a"), product("b"), product("c")];

  await expect(nextAfter(full, "unknown")).resolves.toBe(2);
});

test("an engine that cannot say stops on a page that came back short", async () => {
  await expect(
    nextAfter([product("a"), product("b")], "unknown"),
  ).resolves.toBeUndefined();
});

test("validation skips do not hide a full provider page from infinite pagination", async () => {
  const { search } = products({
    pageSize: 3,
    answer: () => ({ documents: [product("a")], next: "unknown" }),
  });
  const options = infiniteQueryOptions(search);
  const page = await options.queryFn(context(1));

  expect(options.getNextPageParam({ ...page, skipped: 2 })).toBe(2);
  expect(options.getNextPageParam({ ...page, skipped: 1 })).toBeUndefined();
});

test("a last page that is exactly full costs one empty request and then stops", async () => {
  const { mock, search } = products({
    pageSize: 2,
    // Two documents and nothing more, on an engine that never says whether
    // another page exists. Page one is indistinguishable from a full page in
    // the middle of a list, so the heuristic asks for page two.
    answer: (page) => ({
      documents: page === 1 ? [product("a"), product("b")] : [],
      next: "unknown",
    }),
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
