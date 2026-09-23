// Pins the structural types to the real minisearch 7.2.0 types, so the package
// imports no SDK at runtime and is still wrong out loud when the SDK changes
// shape. It compiles and never runs.
//
// The negative cases are the evidence behind what the adapter refuses:
// MiniSearch's own options have no facet and no highlight, so there is nothing
// to translate either into.
import type MiniSearch from "minisearch";
import type { MatchInfo, SearchOptions, SearchResult } from "minisearch";
import { expectTypeOf } from "vitest";

import { minisearch } from "src/minisearch";
import type { Product } from "src/minisearch.fixture";
import type { MiniSearchIndex } from "src/types/MiniSearchIndex";
import type { MiniSearchProfile } from "src/types/MiniSearchProfile";
import type { MiniSearchResult } from "src/types/MiniSearchResult";
import type { MiniSearchSearchOptions } from "src/types/MiniSearchSearchOptions";

type Wildcard = typeof MiniSearch.wildcard;

declare const catalogue: MiniSearch<Product>;
declare const wildcard: Wildcard;
declare const stranger: symbol;

// An application hands over the instance it already built, searched by text
// alone or with its wildcard too.
expectTypeOf<MiniSearch<Product>>().toExtend<MiniSearchIndex>();
expectTypeOf<MiniSearch<Product>>().toExtend<MiniSearchIndex<Wildcard>>();

minisearch({ index: catalogue, revision: () => 1 });
minisearch({ index: catalogue, wildcard, revision: () => 1 });

// @ts-expect-error Only MiniSearch's own wildcard is a query it accepts, so any other symbol is refused here.
minisearch({ index: catalogue, wildcard: stranger, revision: () => 1 });

// What this adapter reads off a result is what MiniSearch puts there.
expectTypeOf<SearchResult>().toExtend<MiniSearchResult>();
expectTypeOf<SearchResult["score"]>().toEqualTypeOf<number>();
expectTypeOf<SearchResult["match"]>().toEqualTypeOf<MatchInfo>();

// What this adapter passes to `search` is what MiniSearch accepts.
expectTypeOf<MiniSearchProfile>().toExtend<SearchOptions>();
expectTypeOf<MiniSearchSearchOptions>().toExtend<SearchOptions>();

// Stored fields are not the document, which is why the adapter takes a
// resolver, and the compiler agrees.
const stored: ReturnType<MiniSearch<Product>["getStoredFields"]> = {
  title: "Running shoe",
};

// @ts-expect-error A MiniSearch result carries only the fields in storeFields, so its stored record is not the application document.
const document: Product = stored;

expectTypeOf(document).toExtend<Product>();

// MiniSearch has no sort option, so the adapter orders the match set itself.
const withoutSort: SearchOptions = {
  // @ts-expect-error MiniSearch orders by BM25 score and takes no sort option.
  sort: "price",
};

expectTypeOf(withoutSort).toExtend<SearchOptions>();

// MiniSearch has no facet option, which is why a facet is refused.
const withoutFacets: SearchOptions = {
  // @ts-expect-error MiniSearch has no facet support, so counts could only come from tallying every match.
  facets: ["category"],
};

expectTypeOf(withoutFacets).toExtend<SearchOptions>();

// MiniSearch has no highlight option, which is why a highlight is refused.
const withoutHighlights: SearchOptions = {
  // @ts-expect-error MiniSearch reports matched fields through `match` and never offsets, so highlight parts could only be guessed.
  highlight: ["title"],
};

expectTypeOf(withoutHighlights).toExtend<SearchOptions>();

// MiniSearch has no pagination, which is why the adapter slices every match
// itself and can count them exactly.
const withoutPagination: SearchOptions = {
  // @ts-expect-error MiniSearch returns every match with no limit or offset.
  limit: 10,
};

expectTypeOf(withoutPagination).toExtend<SearchOptions>();

// A profile tunes the query. The fields it searches are the index's, and the
// filter is Scout's, so it carries neither.
const profile: MiniSearchProfile = {
  prefix: true,
  combineWith: "AND",
  // @ts-expect-error The fields a profile searches come from the index.
  fields: ["title"],
};

expectTypeOf(profile).toExtend<MiniSearchProfile>();

const unfiltered: MiniSearchProfile = {
  // @ts-expect-error `filter` is built from the filter AST, so a profile cannot carry its own predicate.
  filter: () => true,
};

expectTypeOf(unfiltered).toExtend<MiniSearchProfile>();
