import { SearchConfigurationError } from "@priemskiyyy/scout";
import Fuse from "fuse.js";
import { expect, test, vi } from "vitest";
import { fuse } from "src/fuse";
import { createProductIndex, PRODUCTS, request } from "src/fuse.fixture";
import type { FuseIndex } from "src/types/FuseIndex";

const options = {
  revision: () => 1,
  sorts: { relevance: null },
  profiles: { default: null },
};
const context = () => ({ signal: new AbortController().signal });

test("pagination slices the full result set and preserves Fuse metadata", async () => {
  const engine = createProductIndex();
  const adapter = fuse({ ...options, index: engine });
  const result = await adapter.search(
    request({ page: { current: 2, size: 2 } }),
    context(),
  );
  expect(result.hits.map((hit) => hit.native.item.id)).toEqual(["p3", "p4"]);
  expect(result.total).toEqual({
    value: 5,
    accuracy: "exact",
    scope: "matches",
  });
  expect(result.page).toEqual({
    kind: "page",
    current: 2,
    size: 2,
    previous: 1,
    next: 3,
  });
  expect(result.native).toEqual(engine.search("shoe"));
  expect(result.hits[0]?.native.score).toEqual(expect.any(Number));
  expect(adapter.native).toBe(engine);
  expect(result.took).toBeNull();
});

test("portable filters apply before pagination, including arrays and composition", async () => {
  const adapter = fuse({ ...options, index: createProductIndex() });
  const result = await adapter.search(
    request({
      page: { current: 2, size: 1 },
      filter: {
        type: "and",
        expressions: [
          {
            type: "comparison",
            field: "tags",
            operator: "in",
            value: ["sale"],
          },
          {
            type: "not",
            expression: {
              type: "comparison",
              field: "price",
              operator: "gte",
              value: 90,
            },
          },
        ],
      },
    }),
    context(),
  );
  expect(result.hits.map((hit) => hit.native.item.id)).toEqual(["p5"]);
  expect(result.total).toMatchObject({ value: 2 });
  expect(result.page.next).toBeNull();
  expect(result.native).toHaveLength(5);
});

test("a contradiction does not call Fuse", async () => {
  const engine = createProductIndex();
  const search = vi.spyOn(engine, "search");
  const result = await fuse({ ...options, index: engine }).search(
    request({ filter: { type: "constant", value: false } }),
    context(),
  );
  expect(search).not.toHaveBeenCalled();
  expect(result.total).toMatchObject({ value: 0 });
  expect(result.native).toBeNull();
});

test("native empty-query semantics are retained", async () => {
  const result = await fuse({ ...options, index: createProductIndex() }).search(
    request({ query: "" }),
    context(),
  );
  expect(result.hits.map((hit) => hit.native.item)).toEqual(PRODUCTS);
  expect(result.total).toMatchObject({ value: PRODUCTS.length });
});

test("highlights preserve non-ASCII text and inclusive match ranges", async () => {
  const engine = new Fuse([{ title: "Café ☕ 京都" }], {
    keys: ["title"],
    includeMatches: true,
    threshold: 0,
    ignoreLocation: true,
  });
  const result = await fuse({ ...options, index: engine }).search(
    request({ query: "京都", highlights: ["title"] }),
    context(),
  );
  expect(result.hits[0]?.highlights.title).toEqual([
    {
      path: ["title"],
      truncated: false,
      parts: [
        { text: "Café ☕ ", matched: false },
        { text: "京都", matched: true },
      ],
    },
  ]);
});

test("array highlights keep element paths and untouched values", async () => {
  const engine = new Fuse([{ tags: ["casual", "京都"] }], {
    keys: ["tags"],
    includeMatches: true,
    threshold: 0,
  });
  const result = await fuse({ ...options, index: engine }).search(
    request({ query: "京都", highlights: ["tags"] }),
    context(),
  );
  expect(result.hits[0]?.highlights.tags).toEqual([
    {
      path: ["tags", 0],
      truncated: false,
      parts: [{ text: "casual", matched: false }],
    },
    {
      path: ["tags", 1],
      truncated: false,
      parts: [{ text: "京都", matched: true }],
    },
  ]);
});

test.each(
  [
    [[-1, 2]],
    [[0, 50]],
    [[2, 1]],
    [[0.5, 2]],
    [
      [0, 2],
      [1, 3],
    ],
    [[0, 0]],
  ].map((indices) => ({ indices })),
)(
  "malformed or split-surrogate ranges degrade to the original text: $indices",
  async ({ indices }) => {
    const engine: FuseIndex<{ title: string }> = {
      options: { includeMatches: true },
      search: () => [
        {
          item: { title: "😀 shoe" },
          refIndex: 0,
          matches: [
            {
              key: "title",
              value: "😀 shoe",
              indices: indices.map((range) => [range[0] ?? -1, range[1] ?? -1]),
            },
          ],
        },
      ],
    };
    const result = await fuse({ ...options, index: engine }).search(
      request({ highlights: ["title"] }),
      context(),
    );
    expect(result.hits[0]?.highlights.title?.[0]?.parts).toEqual([
      { text: "😀 shoe", matched: false },
    ]);
  },
);

test("stale match text cannot replace the actual document text", async () => {
  const engine: FuseIndex<{ title: string }> = {
    options: { includeMatches: true },
    search: () => [
      {
        item: { title: "shoe" },
        refIndex: 0,
        matches: [{ key: "title", value: "other", indices: [[0, 3]] }],
      },
    ],
  };
  const result = await fuse({ ...options, index: engine }).search(
    request({ highlights: ["title"] }),
    context(),
  );
  expect(result.hits[0]?.highlights.title?.[0]?.parts).toEqual([
    { text: "shoe", matched: false },
  ]);
});

test("capabilities describe the injected configuration", () => {
  const adapter = fuse({ ...options, index: createProductIndex(false) });
  expect(adapter.capabilities.highlights).toBe("none");
  expect(adapter.capabilities.facets.resultScoped).toBe(false);
  expect(adapter.capabilities.cancellation).toBe("logical");
});

test("unknown sort and profile names fail without searching", async () => {
  const engine = createProductIndex();
  const search = vi.spyOn(engine, "search");
  const adapter = fuse({ ...options, index: engine });
  await expect(
    adapter.search(request({ sort: "missing" }), context()),
  ).rejects.toThrow(SearchConfigurationError);
  await expect(
    adapter.search(request({ profile: "missing" }), context()),
  ).rejects.toThrow(SearchConfigurationError);
  expect(search).not.toHaveBeenCalled();
});

test("corpus revisions change identity and disposal leaves the borrowed engine usable", () => {
  let revision = 1;
  const engine = createProductIndex();
  const adapter = fuse({ ...options, index: engine, revision: () => revision });
  const before = adapter.fingerprint();
  revision += 1;
  expect(adapter.fingerprint()).not.toBe(before);
  adapter.dispose();
  expect(engine.search("shoe")).toHaveLength(PRODUCTS.length);
});
