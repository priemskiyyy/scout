import type { AdapterSearchRequest } from "@priemskiyyy/scout";
import { expect, test } from "vitest";

import { createProductIndex } from "src/fuse.fixture";
import { getQueryFromRequest } from "src/utils/getQueryFromRequest";

const getRequest = (
  overrides: Partial<AdapterSearchRequest> = {},
): AdapterSearchRequest => ({
  index: "products",
  query: "shoe",
  searchable: ["title", "tags"],
  profile: "default",
  sort: null,
  filter: null,
  facets: [],
  highlights: [],
  page: { current: 1, size: 10 },
  provider: null,
  ...overrides,
});

test("a query over every indexed key is Fuse's own search", () => {
  expect(getQueryFromRequest(createProductIndex(), getRequest())).toBe("shoe");
});

test("a profile over fewer keys is a logical query naming each of them", () => {
  expect(
    getQueryFromRequest(
      createProductIndex(),
      getRequest({ searchable: ["title"], profile: "titles" }),
    ),
  ).toEqual({ $or: [{ title: "shoe" }] });
});

// Fuse answers a blank query with every document, and a logical query of
// blank values with none.
test("a blank query browses, whatever the profile searches", () => {
  expect(
    getQueryFromRequest(
      createProductIndex(),
      getRequest({ query: "", searchable: ["title"], profile: "titles" }),
    ),
  ).toBe("");
});

test("a profile searching a field Fuse does not index is refused", () => {
  expect(() =>
    getQueryFromRequest(
      createProductIndex(),
      getRequest({ searchable: ["title", "category"], profile: "wide" }),
    ),
  ).toThrowError(
    expect.objectContaining({
      code: "configuration",
      message:
        "Fuse does not index category, which the wide profile searches. Add it to the Fuse keys.",
    }),
  );
});

test.each([{ useExtendedSearch: true }, { useTokenSearch: true }])(
  "fewer keys than Fuse indexes cannot be searched with %o",
  (options) => {
    const engine = createProductIndex(options);

    expect(() =>
      getQueryFromRequest(
        engine,
        getRequest({ searchable: ["title"], profile: "titles" }),
      ),
    ).toThrowError(expect.objectContaining({ code: "unsupported-feature" }));
    expect(getQueryFromRequest(engine, getRequest())).toBe("shoe");
  },
);
