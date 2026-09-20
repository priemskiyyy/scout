import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import * as barrel from "src/index";
import * as mock from "src/mock";
import * as testing from "src/testing";

// The published surface, pinned. Adding a line here is a deliberate act; an
// export appearing without one is an accident that would otherwise ship.
test("the public barrel exports exactly this", () => {
  expect(Object.keys(barrel).sort()).toEqual([
    "Scout",
    "ScoutError",
    "SearchAbortedError",
    "SearchConfigurationError",
    "SearchDisposedError",
    "SearchProviderError",
    "SearchValidationError",
    "UnsupportedSearchFeatureError",
    "assertUnreachable",
    "createHighlightMarkers",
    "createSearchAdapter",
    "emptySearchResponse",
    "index",
    "matchesFilter",
    "normalizeFilter",
    "parseFacetValue",
    "resolveConfigured",
    "searchKey",
    "splitHighlight",
  ]);
});

test("the mock and testing subpaths export exactly this", () => {
  expect(Object.keys(mock).sort()).toEqual(["createMockSearchAdapter"]);
  expect(Object.keys(testing).sort()).toEqual(["testSearchAdapter"]);
});

// Principle 10 in docs/internals/architecture.md: adding an engine is one new
// package and zero core edits. A name reaching the core is how that stops being
// true, and it is cheaper to catch here than in review.
test("the core never branches on an adapter name", () => {
  const root = fileURLToPath(new URL(".", import.meta.url));
  const sources = [
    "utils/internal/executeSearch.ts",
    "utils/internal/mapSearchResponse.ts",
    "utils/internal/checkCapabilities.ts",
    "utils/internal/createSearchBuilder.ts",
    "utils/internal/normalizeFilter.ts",
    "utils/Scout.ts",
    "utils/defineIndex.ts",
    "generators/createSearchAdapter.ts",
  ];
  const engines = [
    "typesense",
    "algolia",
    "meilisearch",
    "orama",
    "minisearch",
    "fuse",
  ];

  for (const source of sources) {
    const code = readFileSync(`${root}${source}`, "utf8")
      // Comments may name an engine as an example; code may not.
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    for (const engine of engines) {
      expect({
        source,
        engine,
        found: new RegExp(`\\b${engine}\\b`).test(code),
      }).toEqual({
        source,
        engine,
        found: false,
      });
    }
  }
});
