import { afterEach, expect, test } from "vitest";

import { startOutpost } from "examples/shared/outpost/utils/startOutpost";
import type { EngineId } from "examples/shared/outpost/types/EngineId";
import type { OutpostRuntime } from "examples/shared/outpost/types/OutpostRuntime";

const runtimes: OutpostRuntime[] = [];

const start = () => {
  const started = startOutpost({ latency: 0 });

  runtimes.push(started.runtime);

  return started;
};

afterEach(() => {
  for (const runtime of runtimes.splice(0)) {
    runtime.dispose();
  }
});

const ENGINES: EngineId[] = ["api", "orama", "minisearch", "fuse"];

test.each(ENGINES)(
  "%s finds the tents from one declaration",
  async (engine) => {
    const { runtime } = start();

    const result = await runtime.indexes[engine]
      .search("tent")
      .where((product) => product.inStock.eq(true))
      .page({ size: 20 })
      .execute();

    const names = result.hits.map((hit) => hit.document.name);

    expect(names).toContain("Ridgeline 2 tent");
    expect(names).not.toContain("Winter storm tent");
    expect(result.hits.every((hit) => hit.document.inStock)).toBe(true);
  },
);

test("your API serves facets and highlights, and the timeline saw it go out and come back", async () => {
  const { outpost, runtime } = start();

  const result = await runtime.indexes.api
    .search("tent")
    .facets("brand", "inStock")
    .highlight("name")
    .execute();

  expect(result.total).toEqual({
    value: 7,
    accuracy: "exact",
    scope: "matches",
  });
  expect(result.facets.inStock.values).toEqual([
    { value: true, count: 5 },
    { value: false, count: 2 },
  ]);
  expect(result.hits[0]?.highlights.name[0]?.parts).toContainEqual({
    text: "tent",
    matched: true,
  });
  expect(outpost.timeline.log.getSnapshot().map((entry) => entry.kind)).toEqual(
    ["answered", "sent"],
  );
});

test("MiniSearch refuses facets rather than inventing counts", async () => {
  const { runtime } = start();

  await expect(
    runtime.indexes.minisearch.search("tent").facets("brand").execute(),
  ).rejects.toMatchObject({ code: "unsupported-feature" });
});

test("Orama refuses highlights, and Fuse.js serves them", async () => {
  const { runtime } = start();

  await expect(
    runtime.indexes.orama.search("tent").highlight("name").execute(),
  ).rejects.toMatchObject({ code: "unsupported-feature" });

  const result = await runtime.indexes.fuse
    .search("tent")
    .highlight("name")
    .execute();

  expect(
    result.hits.some((hit) =>
      hit.highlights.name.some((fragment) =>
        fragment.parts.some((part) => part.matched),
      ),
    ),
  ).toBe(true);
});
