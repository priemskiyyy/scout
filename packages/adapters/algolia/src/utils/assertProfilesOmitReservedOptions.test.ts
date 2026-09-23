import { expect, test } from "vitest";

import { assertProfilesOmitReservedOptions } from "src/utils/assertProfilesOmitReservedOptions";

test.each([
  "filters",
  "numericFilters",
  "facetFilters",
  "tagFilters",
  "offset",
  "length",
  "restrictSearchableAttributes",
])("a profile that sets %s, which Scout writes, is refused", (key) => {
  expect(() =>
    assertProfilesOmitReservedOptions({
      strict: Object.fromEntries([[key, "hidden constraint"]]),
    }),
  ).toThrowError(
    expect.objectContaining({
      code: "configuration",
      message: `profiles.strict.${key} is written by Scout from the search itself.`,
    }),
  );
});

test("a profile of Algolia's own parameters passes", () => {
  expect(() =>
    assertProfilesOmitReservedOptions({ strict: { typoTolerance: false } }),
  ).not.toThrow();
});
