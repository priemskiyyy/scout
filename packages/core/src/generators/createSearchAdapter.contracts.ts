import { expectTypeOf } from "vitest";
import type { AdapterSearchRequest } from "src/types/AdapterSearchRequest";
import { createSearchAdapter } from "src/generators/createSearchAdapter";
import { emptySearchResponse } from "src/generators/emptySearchResponse";
import { FULL_CAPABILITIES } from "src/utils/constants/defaultCapabilities";
import { Scout } from "src/utils/Scout";
import { index } from "src/utils/defineIndex";
import { ProductSchema, product } from "src/utils/internal/testSchema.fixture";

type Options = { locale: "en" | "uk" };

const adapter = createSearchAdapter({
  name: "typed",
  native: { collection: "products" },
  capabilities: FULL_CAPABILITIES,
  sorts: { relevance: null },
  profiles: { default: null },
  metadata: { owner: "catalogue" },
  fingerprint: () => "typed",
  search: async (request: AdapterSearchRequest<Options>) => ({
    ...emptySearchResponse(request, { request: { id: "request-1" } }),
    hits: [{ document: product(), highlights: {}, native: { score: 1 } }],
  }),
});

expectTypeOf(adapter.native).toEqualTypeOf<{ collection: string }>();
expectTypeOf(adapter.metadata).toEqualTypeOf<{ owner: string }>();
expectTypeOf<
  Parameters<typeof adapter.search>[0]["provider"]
>().toEqualTypeOf<Options | null>();

const products = new Scout({
  indexes: {
    products: index({
      schema: ProductSchema,
      id: (document) => document.id,
      filterable: ["brand"],
      facetable: [],
      highlightable: [],
      sorts: ["relevance"],
      profiles: ["default"],
      adapter,
    }),
  },
}).index("products");
const search = products.search("shoe").provider({ locale: "uk" });
expectTypeOf(search.execute)
  .returns.resolves.toHaveProperty("hits")
  .items.toHaveProperty("native")
  .toEqualTypeOf<{ score: number }>();
expectTypeOf(search.execute)
  .returns.resolves.toHaveProperty("native")
  .toEqualTypeOf<{ request: { id: string } }>();
// @ts-expect-error Provider options retain the mapping's accepted locales.
products.search("shoe").provider({ locale: "fr" });
const request: AdapterSearchRequest<Options> = {
  index: "products",
  query: "shoe",
  profile: "default",
  sort: "relevance",
  filter: { type: "constant", value: true },
  facets: [],
  highlights: [],
  page: { current: 1, size: 20 },
  provider: { locale: "uk" },
};
// @ts-expect-error The wrapper requires a signal context even when the mapping ignores it.
adapter.search(request);
adapter.search(
  // @ts-expect-error Pagination travels as one object in the adapter request.
  { ...request, page: 1 },
  { signal: new AbortController().signal },
);
