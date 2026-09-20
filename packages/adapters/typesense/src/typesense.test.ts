import {
  SearchConfigurationError,
  SearchProviderError,
} from "@priemskiyyy/scout";
import type {
  AdapterSearchRequest,
  FilterExpression,
  FilterOperator,
} from "@priemskiyyy/scout";
import { expect, test } from "vitest";
import { typesense } from "src/typesense";
import type { TypesenseSearchParameters } from "src/types/TypesenseSearchParameters";
import { createTypesenseFake } from "src/typesense.fixture";
import type { TypesenseFakeOptions } from "src/typesense.fixture";

const setup = (options: TypesenseFakeOptions = {}) => {
  const fake = createTypesenseFake(options);
  const adapter = typesense({
    client: fake.client,
    collection: "products",
    profiles: {
      default: { queryBy: ["name", "brand", "tags"], prefix: true },
      plain: { queryBy: ["name"] },
    },
    sorts: { relevance: {}, priceAsc: { sortBy: "price:asc" } },
    facets: { price: "number", inStock: "boolean" },
  });
  return { fake, adapter };
};

const request = (
  overrides: Partial<AdapterSearchRequest<TypesenseSearchParameters>> = {},
): AdapterSearchRequest<TypesenseSearchParameters> => ({
  index: "products",
  query: "shoe",
  profile: "default",
  sort: "relevance",
  filter: { type: "constant", value: true },
  facets: [],
  highlights: [],
  page: { current: 1, size: 10 },
  provider: null,
  ...overrides,
});

const field = (
  name: string,
  operator: FilterOperator,
  value: unknown,
): FilterExpression => ({ type: "comparison", field: name, operator, value });

const sentFor = async (
  overrides: Partial<AdapterSearchRequest<TypesenseSearchParameters>>,
) => {
  const { fake, adapter } = setup();
  await adapter.search(request(overrides), {
    signal: new AbortController().signal,
  });
  return fake.calls[0];
};

const filterFor = async (filter: FilterExpression) =>
  (await sentFor({ filter }))?.filter_by;

test("an eq filter on a string is exact and quoted, never a token match", async () => {
  expect(await filterFor(field("brand", "eq", "dark red"))).toBe(
    "brand:=`dark red`",
  );
});

test("an eq filter on a number or a boolean is written bare", async () => {
  expect(await filterFor(field("price", "eq", 120))).toBe("price:=120");
  expect(await filterFor(field("inStock", "eq", true))).toBe("inStock:=true");
});

test("a neq filter is written with the not equal operator", async () => {
  expect(await filterFor(field("brand", "neq", "Nimbus"))).toBe(
    "brand:!=`Nimbus`",
  );
});

test("a set filter becomes a bracketed list, negated for notIn", async () => {
  expect(await filterFor(field("brand", "in", ["Nimbus", "Halden"]))).toBe(
    "brand:=[`Nimbus`,`Halden`]",
  );
  expect(await filterFor(field("price", "not-in", [1, 2]))).toBe(
    "price:!=[1,2]",
  );
});

test("an empty set matches nothing and its negation restricts nothing", async () => {
  const { fake, adapter } = setup();
  const empty = await adapter.search(
    request({ filter: field("brand", "in", []) }),
    { signal: new AbortController().signal },
  );

  expect(empty.hits).toHaveLength(0);
  expect(fake.calls).toHaveLength(0);
  expect(await filterFor(field("brand", "not-in", []))).toBeUndefined();
});

test("the four comparisons become their Typesense operators", async () => {
  expect(await filterFor(field("price", "gt", 10))).toBe("price:>10");
  expect(await filterFor(field("price", "gte", 10))).toBe("price:>=10");
  expect(await filterFor(field("price", "lt", 10))).toBe("price:<10");
  expect(await filterFor(field("price", "lte", 10))).toBe("price:<=10");
});

test("a between filter becomes a Typesense range", async () => {
  expect(await filterFor(field("price", "between", [100, 200]))).toBe(
    "price:[100..200]",
  );
});

test("a group of more than one branch is parenthesised so precedence survives", async () => {
  const filter: FilterExpression = {
    type: "and",
    expressions: [
      field("brand", "eq", "Nimbus"),
      {
        type: "or",
        expressions: [field("price", "lt", 100), field("inStock", "eq", true)],
      },
    ],
  };

  expect(await filterFor(filter)).toBe(
    "(brand:=`Nimbus` && (price:<100 || inStock:=true))",
  );
});

test("a negation is pushed down to the fields, because Typesense cannot negate a group", async () => {
  const filter: FilterExpression = {
    type: "not",
    expression: {
      type: "and",
      expressions: [field("brand", "eq", "Nimbus"), field("price", "gte", 100)],
    },
  };

  expect(await filterFor(filter)).toBe("(brand:!=`Nimbus` || price:<100)");
});

test("a doubled negation is the expression itself again", async () => {
  const filter: FilterExpression = {
    type: "not",
    expression: { type: "not", expression: field("brand", "eq", "Nimbus") },
  };

  expect(await filterFor(filter)).toBe("brand:=`Nimbus`");
});

test("a negated range becomes the two open ranges around it", async () => {
  const filter: FilterExpression = {
    type: "not",
    expression: field("price", "between", [100, 200]),
  };

  expect(await filterFor(filter)).toBe("(price:<100 || price:>200)");
});

// A backtick would end the quoted value early and a backslash would escape the
// wrong character, so both are the only things that have to be rewritten. The
// rest is here to prove it stays untouched.
const HOSTILE = "a`b\\c,d[e](f)&&g||h\"i'j é́ \u{1F600} 中文";
const HOSTILE_ESCAPED = "a\\`b\\\\c,d[e](f)&&g||h\"i'j é́ \u{1F600} 中文";

test("a hostile value is quoted with only its backticks and backslashes escaped", async () => {
  expect(await filterFor(field("name", "eq", HOSTILE))).toBe(
    `name:=\`${HOSTILE_ESCAPED}\``,
  );
});

test("a hostile value in a set is escaped member by member", async () => {
  expect(await filterFor(field("name", "in", ["x,y", "`z"]))).toBe(
    "name:=[`x,y`,`\\`z`]",
  );
});

test("a filter value that is not a string, a number or a boolean is refused", async () => {
  await expect(filterFor(field("name", "eq", null))).rejects.toThrowError(
    SearchConfigurationError,
  );
  await expect(
    filterFor(field("price", "eq", Number.NaN)),
  ).rejects.toThrowError(SearchConfigurationError);
});

test("a range comparison against a string is refused rather than guessed", async () => {
  await expect(filterFor(field("name", "gt", "a"))).rejects.toThrowError(
    SearchConfigurationError,
  );
  await expect(
    filterFor(field("price", "between", ["a", "b"])),
  ).rejects.toThrowError(SearchConfigurationError);
});

test("a contradiction answers empty without asking the engine", async () => {
  const { fake, adapter } = setup();
  const response = await adapter.search(
    request({ filter: { type: "constant", value: false }, facets: ["brand"] }),
    { signal: new AbortController().signal },
  );

  expect(fake.calls).toHaveLength(0);
  expect(response.hits).toHaveLength(0);
  expect(response.total).toEqual({
    value: 0,
    accuracy: "exact",
    scope: "matches",
  });
  // Nothing matched, so the counting was trivially complete. Reporting no
  // facets at all would make the core call a settled question unknown.
  expect(response.facets["brand"]).toEqual({
    field: "brand",
    values: [],
    exhaustive: true,
    native: null,
  });
  expect(response.native).toBeNull();
  expect(response.took).toBeNull();
});

test("a contradiction inside an and makes the whole filter match nothing", async () => {
  const { fake, adapter } = setup();
  await adapter.search(
    request({
      filter: {
        type: "and",
        expressions: [
          field("brand", "eq", "Nimbus"),
          { type: "constant", value: false },
        ],
      },
    }),
    { signal: new AbortController().signal },
  );

  expect(fake.calls).toHaveLength(0);
});

test("a tautology inside an or drops the rest of the group", async () => {
  expect(
    await filterFor({
      type: "or",
      expressions: [
        field("brand", "eq", "Nimbus"),
        { type: "constant", value: true },
      ],
    }),
  ).toBeUndefined();
});

test("a filter that restricts nothing sends no filter_by", async () => {
  expect(await filterFor({ type: "constant", value: true })).toBeUndefined();
});

test("the profile decides query_by and prefix, and the sort decides sort_by", async () => {
  const withSort = await sentFor({ sort: "priceAsc" });
  const plain = await sentFor({ profile: "plain" });

  expect(withSort?.query_by).toBe("name,brand,tags");
  expect(withSort?.prefix).toBe(true);
  expect(withSort?.sort_by).toBe("price:asc");
  expect(plain?.query_by).toBe("name");
  expect(plain?.prefix).toBeUndefined();
  // "relevance" declares no sort_by, so Typesense keeps its own ranking.
  expect(plain?.sort_by).toBeUndefined();
});

test("an undeclared sort or profile is a configuration error", async () => {
  await expect(sentFor({ sort: "missing" })).rejects.toThrowError(
    SearchConfigurationError,
  );
  await expect(sentFor({ profile: "missing" })).rejects.toThrowError(
    SearchConfigurationError,
  );
});

test("facets, highlights, the page and the page size reach their parameters", async () => {
  const sent = await sentFor({
    facets: ["brand", "price"],
    highlights: ["name"],
    page: { current: 3, size: 25 },
  });

  expect(sent?.facet_by).toBe("brand,price");
  expect(sent?.highlight_fields).toBe("name");
  // Minted per search, so the test asserts the shape and the pairing rather
  // than a literal. A fixed marker is what let a document forge a match.
  expect(sent?.highlight_start_tag).toMatch(/^\[scout:[0-9a-z-]+\]$/);
  expect(sent?.highlight_end_tag).toBe(
    sent?.highlight_start_tag?.replace("[scout:", "[/scout:"),
  );
  // Typesense pages are one based like Scout's, so nothing is shifted.
  expect(sent?.page).toBe(3);
  expect(sent?.per_page).toBe(25);
});

test("nothing is highlighted or faceted when nothing was asked for", async () => {
  const sent = await sentFor({});

  expect(sent?.facet_by).toBeUndefined();
  expect(sent?.highlight_fields).toBeUndefined();
});

test("the page size Typesense refuses is the one the capabilities cap", async () => {
  const { adapter } = setup();

  expect(adapter.capabilities.pagination.maxPageSize).toBe(250);
  expect(adapter.capabilities.cancellation).toBe("transport");
  expect(adapter.capabilities.highlights).toBe("parts");
});

test("an empty query is sent as the Typesense wildcard", async () => {
  expect((await sentFor({ query: "" }))?.q).toBe("*");
  expect((await sentFor({ query: "shoe" }))?.q).toBe("shoe");
});

test("the signal reaches the client, which is what transport cancellation means", async () => {
  const { fake, adapter } = setup();
  const controller = new AbortController();
  await adapter.search(request(), { signal: controller.signal });

  expect(fake.signals[0]).toBe(controller.signal);
});

test("a search cutoff turns the total from exact into estimated", async () => {
  const exact = setup();
  const cutoff = setup({
    respond: (response) => ({ ...response, search_cutoff: true }),
  });
  const signal = new AbortController().signal;

  expect((await exact.adapter.search(request(), { signal })).total).toEqual({
    value: 3,
    accuracy: "exact",
    scope: "matches",
  });
  expect((await cutoff.adapter.search(request(), { signal })).total).toEqual({
    value: 3,
    accuracy: "estimated",
    scope: "matches",
  });
});

test("the engine's own time is the took it reports", async () => {
  const { adapter } = setup();
  const response = await adapter.search(request(), {
    signal: new AbortController().signal,
  });

  expect(response.took).toBe(3);
});

test("a page knows its neighbours and says unknown only when the count stopped early", async () => {
  const signal = new AbortController().signal;
  const full = setup({ respond: (response) => ({ ...response, found: 30 }) });
  const cutoff = setup({
    respond: (response) => ({ ...response, search_cutoff: true }),
  });
  const { adapter } = setup();

  expect(
    (
      await full.adapter.search(request({ page: { current: 2, size: 10 } }), {
        signal,
      })
    ).page,
  ).toEqual({ kind: "page", current: 2, size: 10, next: 3, previous: 1 });
  expect((await adapter.search(request(), { signal })).page.next).toBeNull();
  expect((await cutoff.adapter.search(request(), { signal })).page.next).toBe(
    "unknown",
  );
});

test("a sampled facet is reported as not exhaustive", async () => {
  const signal = new AbortController().signal;
  const { adapter } = setup();
  const sampled = setup({
    respond: (response) => ({
      ...response,
      facet_counts: response.facet_counts.map((counts) => ({
        ...counts,
        sampled: true,
      })),
    }),
  });

  const counted = await adapter.search(request({ facets: ["brand"] }), {
    signal,
  });
  const guessed = await sampled.adapter.search(request({ facets: ["brand"] }), {
    signal,
  });

  expect(counted.facets["brand"]?.exhaustive).toBe(true);
  expect(guessed.facets["brand"]?.exhaustive).toBe(false);
});

test("a facet value is coerced to the declared field type", async () => {
  const { adapter } = setup();
  const response = await adapter.search(
    request({ facets: ["brand", "price", "inStock"] }),
    { signal: new AbortController().signal },
  );

  expect(response.facets["brand"]?.values).toContainEqual({
    value: "Nimbus",
    count: 2,
  });
  // Typesense reports every facet value as a string, so an undeclared field
  // stays a string and a declared one is read back as its own type.
  expect(response.facets["price"]?.values).toContainEqual({
    value: 120,
    count: 1,
  });
  expect(response.facets["inStock"]?.values).toContainEqual({
    value: true,
    count: 2,
  });
});

test("a highlight snippet becomes alternating parts and never markup", async () => {
  const { adapter } = setup();
  const response = await adapter.search(request({ highlights: ["name"] }), {
    signal: new AbortController().signal,
  });

  expect(response.hits[0]?.highlights["name"]).toEqual([
    {
      path: ["name"],
      truncated: "unknown",
      parts: [
        { text: "Trail running ", matched: false },
        { text: "shoe", matched: true },
      ],
    },
  ]);
});

// Typesense defaults to <mark>, which a document can contain. A balanced pair
// in the document's own text parses cleanly, so with a fixed marker the
// document's markup was reported as a match the engine never made.
test("a document carrying a balanced marker pair cannot forge a match", async () => {
  const { adapter } = setup({
    respond: (response, parameters) => ({
      ...response,
      hits: response.hits.slice(0, 1).map((hit) => ({
        ...hit,
        highlights: [
          {
            field: "name",
            // The engine marked "shoe". The "<mark>forged</mark>" is the
            // document's own text, which Typesense did not match.
            snippet:
              `${parameters.highlight_start_tag}shoe` +
              `${parameters.highlight_end_tag} and <mark>forged</mark>`,
            matched_tokens: ["shoe"],
          },
        ],
      })),
    }),
  });
  const response = await adapter.search(request({ highlights: ["name"] }), {
    signal: new AbortController().signal,
  });
  const parts = response.hits[0]?.highlights["name"]?.[0]?.parts ?? [];

  expect(parts.filter((part) => part.matched).map((part) => part.text)).toEqual(
    ["shoe"],
  );
  // The document's markup survives as ordinary text, because stripping it
  // would corrupt the document.
  expect(parts.map((part) => part.text).join("")).toBe(
    "shoe and <mark>forged</mark>",
  );
  adapter.dispose();
});

test("a highlight keeps astral characters and combining marks whole", async () => {
  const { adapter } = setup({
    respond: (response, parameters) => ({
      ...response,
      hits: response.hits.slice(0, 1).map((hit) => ({
        ...hit,
        highlights: [
          {
            field: "name",
            snippet: `\u{1F468}‍\u{1F469}‍\u{1F467} ${parameters.highlight_start_tag}é${parameters.highlight_end_tag}\u{1F1FA}\u{1F1E6} tail`,
            matched_tokens: ["é"],
          },
        ],
      })),
    }),
  });
  const response = await adapter.search(request({ highlights: ["name"] }), {
    signal: new AbortController().signal,
  });
  const parts = response.hits[0]?.highlights["name"]?.[0]?.parts ?? [];

  expect(parts).toEqual([
    { text: "\u{1F468}‍\u{1F469}‍\u{1F467} ", matched: false },
    { text: "é", matched: true },
    { text: "\u{1F1FA}\u{1F1E6} tail", matched: false },
  ]);
  // A cut inside a surrogate pair would leave a lone half here.
  expect([...(parts[0]?.text ?? "")]).toHaveLength(6);
  expect([...(parts[2]?.text ?? "")]).toHaveLength(7);
});

test("an array field reports which element matched", async () => {
  const { adapter } = setup();
  const response = await adapter.search(request({ highlights: ["tags"] }), {
    signal: new AbortController().signal,
  });

  expect(response.hits[0]?.highlights["tags"]).toEqual([
    {
      path: ["tags", 1],
      truncated: "unknown",
      parts: [{ text: "shoe", matched: true }],
    },
  ]);
});

test("a whole value is not truncated and a snippet does not say", async () => {
  const { adapter } = setup({
    respond: (response, parameters) => {
      const open = parameters.highlight_start_tag ?? "";
      const close = parameters.highlight_end_tag ?? "";
      return {
        ...response,
        hits: response.hits.slice(0, 1).map((hit) => ({
          ...hit,
          highlights: [
            {
              field: "name",
              value: `Trail running ${open}shoe${close}`,
              snippet: `running ${open}shoe${close}`,
              matched_tokens: ["shoe"],
            },
          ],
        })),
      };
    },
  });
  const response = await adapter.search(request({ highlights: ["name"] }), {
    signal: new AbortController().signal,
  });

  expect(response.hits[0]?.highlights["name"]?.[0]?.truncated).toBe(false);
});

test("an unbalanced marker degrades to one unmatched part of plain text", async () => {
  const degrade = async (
    build: (markers: { open: string; close: string }) => string,
  ) => {
    const { adapter } = setup({
      respond: (response, parameters) => ({
        ...response,
        hits: response.hits.slice(0, 1).map((hit) => ({
          ...hit,
          highlights: [
            {
              field: "name",
              snippet: build({
                open: parameters.highlight_start_tag ?? "",
                close: parameters.highlight_end_tag ?? "",
              }),
              matched_tokens: [],
            },
          ],
        })),
      }),
    });
    const response = await adapter.search(request({ highlights: ["name"] }), {
      signal: new AbortController().signal,
    });
    return response.hits[0]?.highlights["name"]?.[0]?.parts;
  };

  expect(
    await degrade(({ open, close }) => `a ${open}b${close} c ${open} d`),
  ).toEqual([{ text: "a b c  d", matched: false }]);
  expect(await degrade(({ close }) => `${close}oops`)).toEqual([
    { text: "oops", matched: false },
  ]);
});

test("a document that carries markup never leaves markup in a part", async () => {
  const { adapter } = setup({
    respond: (response, parameters) => {
      const open = parameters.highlight_start_tag ?? "";
      const close = parameters.highlight_end_tag ?? "";
      return {
        ...response,
        hits: response.hits.slice(0, 1).map((hit) => ({
          ...hit,
          highlights: [
            {
              field: "name",
              snippet: `${open}shoe${close} <img onerror=x> ${close}`,
              matched_tokens: ["shoe"],
            },
          ],
        })),
      };
    },
  });
  const response = await adapter.search(request({ highlights: ["name"] }), {
    signal: new AbortController().signal,
  });

  for (const part of response.hits[0]?.highlights["name"]?.[0]?.parts ?? []) {
    expect(part.text).not.toMatch(/<\/?mark\b/i);
  }
});

test("only the highlights that were asked for are reported", async () => {
  const { adapter } = setup();
  const response = await adapter.search(request({ highlights: ["name"] }), {
    signal: new AbortController().signal,
  });

  expect(Object.keys(response.hits[0]?.highlights ?? {})).toEqual(["name"]);
});

test("the raw hit and the raw response are preserved", async () => {
  const { adapter } = setup();
  const response = await adapter.search(request(), {
    signal: new AbortController().signal,
  });

  expect(response.hits[0]?.native).toHaveProperty("text_match");
  expect(response.native).toHaveProperty("out_of", 5);
  expect(response.native).toHaveProperty("request_params");
});

test("the fingerprint is the collection and carries no credential", () => {
  const { adapter } = setup();

  expect(adapter.fingerprint()).toBe("products");
  expect(adapter.fingerprint()).not.toMatch(/key|secret|token/i);
});

test("the reserved options name every field the adapter writes", () => {
  const { adapter } = setup();

  for (const key of [
    "filter_by",
    "q",
    "page",
    "per_page",
    "sort_by",
    "facet_by",
    "group_by",
  ]) {
    expect(adapter.reservedOptions).toContain(key);
  }
});

test("a grouping provider option is refused before the request leaves", async () => {
  const { fake, adapter } = setup();

  await expect(
    adapter.search(request({ provider: { group_by: "brand" } }), {
      signal: new AbortController().signal,
    }),
  ).rejects.toThrowError(SearchConfigurationError);
  expect(fake.calls).toHaveLength(0);
});

test("a grouped response is refused rather than mapped to an empty page", async () => {
  const { adapter } = setup({
    respond: (response) => ({
      ...response,
      hits: [],
      grouped_hits: [{ group_key: ["Nimbus"], hits: response.hits }],
    }),
  });

  await expect(
    adapter.search(request(), { signal: new AbortController().signal }),
  ).rejects.toThrowError(SearchConfigurationError);
});

test("provider options are carried, and a Scout owned field still wins", async () => {
  const sent = await sentFor({
    provider: { num_typos: 0, exhaustive_search: true, q: "ignored" },
  });

  expect(sent?.num_typos).toBe(0);
  expect(sent?.exhaustive_search).toBe(true);
  expect(sent?.q).toBe("shoe");
});

test("a provider failure is a Scout provider error keeping the original cause", async () => {
  const boom = new Error("connection refused");
  const { adapter } = setup({ fail: boom });

  const failure = await adapter
    .search(request(), { signal: new AbortController().signal })
    .catch((error: unknown) => error);

  expect(failure).toBeInstanceOf(SearchProviderError);
  expect(failure).toHaveProperty("cause", boom);
});
