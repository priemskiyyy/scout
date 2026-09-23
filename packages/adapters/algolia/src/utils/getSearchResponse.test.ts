import { expect, test } from "vitest";

import type { AlgoliaSearchClient } from "src/types/AlgoliaSearchClient";
import { getSearchResponse } from "src/utils/getSearchResponse";

const getClient = (calls: string[]): AlgoliaSearchClient => ({
  searchSingleIndex: async () => {
    calls.push("searchSingleIndex");

    return { hits: [], queryID: "cached" };
  },
  searchSingleIndexWithHTTPInfo: async () => {
    calls.push("searchSingleIndexWithHTTPInfo");

    return { data: { hits: [], queryID: "fresh" } };
  },
});

test("the client's own caches are bypassed unless the application asks for them", async () => {
  const calls: string[] = [];
  const client = getClient(calls);
  const props = { indexName: "products" };

  const fresh = await getSearchResponse(client, false, props);
  const cached = await getSearchResponse(client, true, props);

  expect(calls).toEqual(["searchSingleIndexWithHTTPInfo", "searchSingleIndex"]);
  expect(fresh.queryID).toBe("fresh");
  expect(cached.queryID).toBe("cached");
});
