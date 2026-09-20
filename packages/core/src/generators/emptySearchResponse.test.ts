import { expect, test } from "vitest";
import { emptySearchResponse } from "src/generators/emptySearchResponse";

const request = { page: { current: 1, size: 20 }, facets: [] };
test("a search that cannot match reports zero matches, exactly", () => {
  const response = emptySearchResponse(request);

  expect(response.hits).toEqual([]);
  // Zero matches is a count of matches, not of what pagination could reach,
  // and a contradiction leaves nothing to be uncertain about.
  expect(response.total).toEqual({
    value: 0,
    accuracy: "exact",
    scope: "matches",
  });
});

// Two adapters returned no facets at all, which the core fills in as
// "unknown", claiming the engine was unsure about a question with one answer.
test("every requested facet comes back empty and exhaustive", () => {
  const response = emptySearchResponse({
    ...request,
    facets: ["brand", "size"],
  });

  expect(response.facets).toEqual({
    brand: { field: "brand", values: [], exhaustive: true, native: null },
    size: { field: "size", values: [], exhaustive: true, native: null },
  });
});

test("a page that asked for nothing reports no facets rather than inventing one", () => {
  expect(emptySearchResponse(request).facets).toEqual({});
});

test("the page echoes what was asked for and leads nowhere forward", () => {
  expect(
    emptySearchResponse({
      ...request,
      page: { current: 3, size: request.page.size },
    }).page,
  ).toEqual({
    kind: "page",
    current: 3,
    size: 20,
    next: null,
    previous: 2,
  });
  expect(emptySearchResponse(request).page.previous).toBeNull();
});

// No engine time was spent, so reporting a zero would read as a fast provider
// rather than as no provider at all. The core measures instead.
test("no provider time is reported and the native payload defaults to null", () => {
  const response = emptySearchResponse(request);

  expect(response.took).toBeNull();
  expect(response.native).toBeNull();
});

test("an adapter whose native response is not null hands its own through", () => {
  const response = emptySearchResponse<{ id: string }, readonly string[]>(
    request,
    [],
  );

  expect(response.native).toEqual([]);
});

test("an explicitly supplied undefined payload is preserved", () => {
  expect(emptySearchResponse(request, undefined).native).toBeUndefined();
});
