// Pins the structural types in `src/minisearch.ts` to the real minisearch
// types, so the package can import no SDK at runtime and still be wrong out
// loud when the SDK changes shape. The version is the one the workspace
// installs, minisearch 7.2.0.
//
// The negative cases are not decoration. Each one is the evidence behind a
// capability this adapter declares false: MiniSearch's own options type has no
// sort, no facet and no highlight, so there is nothing to translate them into.
import type MiniSearch from "minisearch";
import type { MatchInfo, SearchOptions, SearchResult } from "minisearch";
import { expectTypeOf } from "vitest";
import { minisearch } from "src/minisearch";
import type { MiniSearchIndex } from "src/types/MiniSearchIndex";
import type { MiniSearchProfile } from "src/types/MiniSearchProfile";
import type { MiniSearchResult } from "src/types/MiniSearchResult";
import type { MiniSearchSearchOptions } from "src/types/MiniSearchSearchOptions";
import type { MiniSearchSort } from "src/types/MiniSearchSort";
import type { Product } from "src/minisearch.fixture";

// An application hands over the instance it already built.
expectTypeOf<MiniSearch<Product>>().toExtend<MiniSearchIndex>();

// What this adapter reads off a result is what MiniSearch puts there.
expectTypeOf<SearchResult>().toExtend<MiniSearchResult>();
expectTypeOf<SearchResult["score"]>().toEqualTypeOf<number>();
expectTypeOf<SearchResult["match"]>().toEqualTypeOf<MatchInfo>();

// What this adapter passes to `search` is what MiniSearch accepts.
expectTypeOf<MiniSearchProfile>().toExtend<SearchOptions>();
expectTypeOf<MiniSearchSearchOptions>().toExtend<SearchOptions>();

// Stored fields are not the document. This is the whole reason the adapter
// takes a resolver, and the compiler agrees.
const stored: ReturnType<MiniSearch<Product>["getStoredFields"]> = {
  title: "Running shoe",
};
// @ts-expect-error A MiniSearch result carries only the fields in storeFields, so its stored record is not the application document.
const document: Product = stored;
expectTypeOf(document).toExtend<Product>();

// MiniSearch has no sort option, which is why only relevance is declared.
const withoutSort: SearchOptions = {
  // @ts-expect-error MiniSearch orders by BM25 score and takes no sort option, so there is no other order to translate a sort name into.
  sort: "price",
};
expectTypeOf(withoutSort).toExtend<SearchOptions>();

// MiniSearch has no facet option, which is why facets.resultScoped is false.
const withoutFacets: SearchOptions = {
  // @ts-expect-error MiniSearch has no facet support, so counts could only come from materialising every match, which is why the adapter refuses instead.
  facets: ["category"],
};
expectTypeOf(withoutFacets).toExtend<SearchOptions>();

// MiniSearch has no highlight option, which is why highlights are "none".
const withoutHighlights: SearchOptions = {
  // @ts-expect-error MiniSearch reports matched fields through `match` and never offsets, so highlight parts could only be guessed.
  highlight: ["title"],
};
expectTypeOf(withoutHighlights).toExtend<SearchOptions>();

// MiniSearch has no pagination, which is why the adapter slices the full
// result array itself and can report an exact total over every match.
const withoutPagination: SearchOptions = {
  // @ts-expect-error MiniSearch returns every match with no limit or offset, which is what makes the total exact and the page a slice.
  limit: 10,
};
expectTypeOf(withoutPagination).toExtend<SearchOptions>();

// A profile shapes the query. It may not filter, because Scout owns filtering
// through the portable AST and a second predicate would be invisible to the
// query identity.
const profile: MiniSearchProfile = {
  fields: ["title", "category"],
  prefix: true,
  combineWith: "AND",
  // @ts-expect-error `filter` is reserved for the filter AST, so a profile cannot carry its own predicate.
  filter: () => true,
};
expectTypeOf(profile).toExtend<MiniSearchProfile>();

// Every declared sort is an alias for relevance, because there is nothing else
// MiniSearch can order by.
const sorts: Readonly<Record<string, MiniSearchSort>> = {
  best: "relevance",
  // @ts-expect-error A sort name can only alias relevance; MiniSearch cannot order by a field.
  cheapest: "price-asc",
};
expectTypeOf(sorts).toExtend<Readonly<Record<string, MiniSearchSort>>>();

// An index declares the names its application uses and the adapter has to cover
// every one of them. `SearchAdapter` widens its records, so the names have to
// survive on the returned type for that constraint to mean anything.
declare const catalogue: MiniSearchIndex;

const adapter = minisearch({
  index: catalogue,
  revision: () => 1,
  profiles: { default: { fields: ["title"] } },
  sorts: { relevance: "relevance" },
});

const covered: Readonly<Record<"relevance", unknown>> = adapter.sorts;
expectTypeOf(covered).toExtend<Readonly<Record<"relevance", unknown>>>();

// @ts-expect-error An index declaring a sort this adapter was not configured with fails here, which is where a provider swap is supposed to fail rather than at a consumer call site.
const uncovered: Readonly<Record<"priceAsc", unknown>> = adapter.sorts;
expectTypeOf(uncovered).toExtend<Readonly<Record<"priceAsc", unknown>>>();

// @ts-expect-error The same holds for a profile the configuration does not name.
const uncoveredProfile: Readonly<Record<"autocomplete", unknown>> =
  adapter.profiles;
expectTypeOf(uncoveredProfile).toExtend<
  Readonly<Record<"autocomplete", unknown>>
>();
