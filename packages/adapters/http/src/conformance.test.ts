import { testSearchAdapter } from "@priemskiyyy/scout/testing";
import { http } from "src/http";
import { createSearchBackend } from "src/http.fixture";
import { scoutWireRequest } from "src/scoutWireRequest";
import { scoutWireResponse } from "src/scoutWireResponse";

// The fake behind this adapter is a backend, not a recorder: it evaluates the
// query, the filter AST and the facets it is sent, so the suite's semantic
// blocks assert which documents came back instead of skipping. It runs the
// shipped wire format end to end at the same time, which is the only way that
// format is proven rather than described.
testSearchAdapter({
  name: "http",
  createAdapter: () =>
    http({
      endpoint: "https://api.test/search",
      fetch: createSearchBackend().fetch,
      capabilities: {
        filters: {
          eq: true,
          neq: true,
          in: true,
          notIn: true,
          comparison: true,
          between: true,
          booleanComposition: true,
        },
        pagination: { maxPageSize: 100 },
        facets: { resultScoped: true },
        highlights: "parts",
      },
      sorts: { relevance: null, cheapest: null },
      profiles: { default: null },
      toRequest: scoutWireRequest,
      fromResponse: scoutWireResponse,
    }),
  fixtures: {
    index: "products",
    query: "shoe",
    sort: "relevance",
    profile: "default",
    evaluatesFilters: true,
    equality: { field: "brand", value: "Apex" },
    range: { field: "price", min: 50, max: 130 },
    facet: "brand",
    highlight: "title",
  },
});
