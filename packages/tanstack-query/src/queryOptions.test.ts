import { QueryClient } from "@tanstack/query-core";
import { SearchAbortedError } from "@priemskiyyy/scout";
import { expect, test } from "vitest";
import { products } from "src/products.fixture";
import { queryOptions } from "src/queryOptions";
import type { Product } from "src/products.fixture";

const product = (id: string): Product => ({
  id,
  name: `Shoe ${id}`,
  brand: "Nike",
  price: 120,
});

const context = () => ({ signal: new AbortController().signal });

test("the query key is the search's own canonical identity", () => {
  const { search } = products();

  expect(queryOptions(search).queryKey).toEqual(search.key());
  expect(queryOptions(search).queryKey).not.toEqual(
    queryOptions(search.page(2)).queryKey,
  );
});

test("the query function executes the search and answers with its result", async () => {
  const { mock, search } = products({
    answer: () => ({ documents: [product("a")], next: null }),
  });

  const result = await queryOptions(search).queryFn(context());

  expect(result.hits.map((hit) => hit.id)).toEqual(["a"]);
  expect(mock.requests[0]?.request.page.current).toBe(1);
});

test("the signal TanStack supplies reaches the adapter, so cancelling cancels", async () => {
  const { mock, search } = products({ hold: true });
  const controller = new AbortController();

  const pending = queryOptions(search).queryFn({ signal: controller.signal });
  controller.abort(new Error("the component unmounted"));

  await expect(pending).rejects.toThrowError(SearchAbortedError);
  // The adapter was handed this signal and no other. Without it the mock holds
  // its answer for ever and nothing ever settles.
  expect(mock.requests[0]?.aborted()).toBe(true);
});

test("no caching defaults are set, because staleness and retries are the application's", () => {
  const { search } = products();

  expect(Object.keys(queryOptions(search))).toEqual(["queryKey", "queryFn"]);
});

test("the options go into a query client unchanged", async () => {
  const { search } = products({
    answer: () => ({ documents: [product("a"), product("b")], next: 2 }),
  });
  const client = new QueryClient();
  const options = queryOptions(search);

  const result = await client.query(options);
  await client.ensureQueryData(options);

  expect(result.hits.map((hit) => hit.id)).toEqual(["a", "b"]);
  expect(client.getQueryData(options.queryKey)).toBe(result);
});

test("cancelling the query in flight aborts the search behind it", async () => {
  const { mock, search } = products({ hold: true });
  const client = new QueryClient();
  const options = queryOptions(search);

  const pending = client.fetchQuery({ ...options, retry: false });
  await client.cancelQueries({ queryKey: options.queryKey });

  expect(mock.requests[0]?.aborted()).toBe(true);
  await expect(pending).rejects.toThrowError();
});
