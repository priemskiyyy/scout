import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

import * as adapter from "src/adapter";
import * as root from "src/index";
import * as mock from "src/mock";
import * as testing from "src/testing";

// The published surface, pinned. Adding a line here is a deliberate act; an
// export appearing without one is an accident that would otherwise ship.
test("each entry point exports exactly this", () => {
  expect(Object.keys(root).sort()).toEqual(["Scout", "ScoutError", "index"]);
  expect(Object.keys(adapter).sort()).toEqual([
    "createHighlightMarkers",
    "matchesFilter",
    "splitHighlight",
  ]);
  expect(Object.keys(mock).sort()).toEqual(["createMockSearchAdapter"]);
  expect(Object.keys(testing).sort()).toEqual(["testSearchAdapter"]);
});

// Adding an engine is one new package and no core edit. An engine's name in
// core code is how that stops being true, and it is cheaper to catch here.
test("the core never names an engine", () => {
  const directory = fileURLToPath(new URL(".", import.meta.url));

  const sources = readdirSync(directory, { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".ts"))
    .filter(
      (path) => !path.endsWith(".test.ts") && !path.includes(".fixture."),
    );

  const engines = /\b(typesense|algolia|meilisearch|orama|minisearch|fuse)\b/i;

  const named = sources.filter((source) =>
    engines.test(
      readFileSync(`${directory}${source}`, "utf8")
        // Documentation may name an engine as an example; code may not.
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, ""),
    ),
  );

  expect(sources.length).toBeGreaterThan(40);
  expect(named).toEqual([]);
});
