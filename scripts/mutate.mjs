// Mutation checks require a green baseline and restore every changed file.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

const CORE = "packages/core/src";
const TYPESENSE = "packages/adapters/typesense/src";
const MEILISEARCH = "packages/adapters/meilisearch/src";
const FUSE = "packages/adapters/fuse/src";
const HTTP = "packages/adapters/http/src";
const ALGOLIA = "packages/adapters/algolia/src";
const ORAMA = "packages/adapters/orama/src";
const MINISEARCH = "packages/adapters/minisearch/src";
const MONGODB = "packages/adapters/mongodb/src";
const ELASTIC_DSL = "packages/internal/elastic-dsl/src";
const ELASTICSEARCH = "packages/adapters/elasticsearch/src";
const OPENSEARCH = "packages/adapters/opensearch/src";

const MUTANTS = [
  {
    file: `${CORE}/utils/internal/normalizeFilter.ts`,
    find: 'return expression.operator === "not-in";',
    replace: 'return expression.operator === "in";',
    describes: "an empty in() matching everything instead of nothing",
  },
  {
    file: `${CORE}/utils/internal/normalizeFilter.ts`,
    find: "return !decides;",
    replace: "return decides;",
    describes: "an empty or all-neutral group collapsing the wrong way",
  },
  {
    file: `${CORE}/utils/internal/normalizeFilter.ts`,
    find: "return !inner;",
    replace: "return inner;",
    describes: "a negated constant not inverting",
  },
  {
    file: `${CORE}/utils/internal/normalizeFilter.ts`,
    find: "remaining.push(...normalized.expressions);",
    replace: "remaining.push(normalized);",
    describes: "nested groups never flattening",
  },
  {
    file: `${CORE}/utils/internal/normalizeFilter.ts`,
    find: "[...seen.entries()].sort(compareKeys)",
    replace: "[...seen.entries()]",
    describes: "set operands left in call order, so two equal filters differ",
  },
  {
    file: `${CORE}/utils/internal/normalizeFilter.ts`,
    find: 'const decides = expression.type === "or";',
    replace: 'const decides = expression.type === "and";',
    describes:
      "constant absorption inverted, so an or narrows instead of widening",
  },
  {
    file: `${CORE}/utils/internal/normalizeFilter.ts`,
    find: "decided = true;",
    replace: "return decides;",
    describes: "a deciding constant hiding a later invalid operand",
  },
  {
    file: `${CORE}/utils/internal/canonicalize.ts`,
    find: "Object.keys(value).sort()",
    replace: "Object.keys(value)",
    describes: "object keys left unsorted, so key order changes identity",
  },
  {
    file: `${CORE}/utils/internal/canonicalize.ts`,
    find: 'if (typeof value === "boolean") {\n    return String(value);\n  }',
    replace:
      'if (typeof value === "boolean") {\n    return value ? "1" : "0";\n  }',
    describes: "a boolean canonicalised as a number, colliding with 0 and 1",
  },
  {
    file: `${CORE}/utils/internal/canonicalize.ts`,
    find: 'if (typeof member === "undefined") {\n        continue;\n      }',
    replace:
      'if (typeof member === "undefined") {\n        parts.push(`${JSON.stringify(key)}:null`);\n        continue;\n      }',
    describes: "an undefined member kept instead of omitted",
  },
  {
    file: `${CORE}/utils/splitHighlight.ts`,
    find: "if (leaked || parts.length === 0) {",
    replace: "if (parts.length === 0) {",
    describes:
      "a leaked marker left in a part, so a document forges a highlight",
  },
  {
    file: `${CORE}/utils/matchesFilter.ts`,
    find: "return expression.expressions.some((member) =>",
    replace: "return expression.expressions.every((member) =>",
    describes: "the reference matcher reading an or as an and",
  },
  {
    file: `${CORE}/utils/internal/getSearchPage.ts`,
    find: "if (received < page.size) {",
    replace: "if (received < 0) {",
    describes: "a short page not ending the results",
  },
  {
    file: `${CORE}/utils/internal/getSearchPage.ts`,
    find: 'if (total.accuracy === "exact" || total.scope === "retrievable") {',
    replace: 'if (total.accuracy === "exact") {',
    describes: "a retrievable total not ending the results once reached",
  },
  {
    file: `${CORE}/utils/internal/decodeFacetValue.ts`,
    find: 'value.trim() === ""',
    replace: "false",
    describes: "an empty facet value decoded as the number zero",
  },
  {
    file: `${CORE}/utils/internal/mapSearchResponse.ts`,
    find: 'type: type ?? "string",',
    replace: 'type: "string",',
    describes: "facet values passed on in the engine's encoding",
  },
  {
    file: `${CORE}/utils/internal/mapSearchResponse.ts`,
    find: 'if (declaration.validate === "skip") {',
    replace: 'if (declaration.validate === "error") {',
    describes: "invalid documents dropped by default instead of refused",
  },
  {
    file: `${CORE}/utils/internal/resolveSearch.ts`,
    find: "assertFilterFieldsAreDeclared(name, declaration.filterable, expression);",
    replace: "",
    describes: "a hand built filter on an undeclared field reaching the engine",
  },
  {
    file: `${CORE}/utils/internal/executeSearch.ts`,
    find: "if (filter === false) {",
    replace: "if (filter === null) {",
    describes: "a contradiction sent to the engine instead of answered",
  },
  {
    file: `${CORE}/utils/internal/executeSearch.ts`,
    find: "const handleAbort = () => controller.abort(caller.reason);",
    replace: "const handleAbort = () => undefined;",
    describes: "a caller's abort never reaching the adapter",
  },
  {
    file: `${CORE}/utils/internal/executeSearch.ts`,
    find: "const handleClose = () => controller.abort(closed.reason);",
    replace: "const handleClose = () => undefined;",
    describes: "disposal leaving a search in flight",
  },
  {
    file: `${CORE}/utils/internal/executeSearch.ts`,
    find: "    if (caller.aborted) {\n      throw getAbortedError(name, caller.reason);\n    }\n\n    return response;",
    replace: "    return response;",
    describes: "a late answer returned after the caller aborted",
  },
  {
    file: `${CORE}/utils/internal/executeSearch.ts`,
    find: "    if (closed.aborted) {\n      throw getDisposedError(name);\n    }\n\n    if (caller.aborted) {",
    replace: "    if (caller.aborted) {",
    describes: "a late answer returned after the Scout was disposed",
  },
  {
    file: `${CORE}/utils/internal/executeSearch.ts`,
    find: "    if (caller.aborted) {\n      throw getAbortedError(name, caller.reason);\n    }\n\n    if (error instanceof ScoutError) {",
    replace: "    if (error instanceof ScoutError) {",
    describes: "an engine rejection caused by the abort reported as a failure",
  },
  {
    file: `${CORE}/utils/internal/getSearchKey.ts`,
    find: "fingerprint: runtime.adapter.fingerprint(),",
    replace: 'fingerprint: "",',
    describes: "the adapter's fingerprint left out of the identity",
  },
  {
    file: `${CORE}/utils/internal/getSearchKey.ts`,
    find: "        filter,",
    replace: "        filter: request.filter,",
    describes: "a contradiction and a tautology sharing a cache entry",
  },
  {
    file: `${CORE}/utils/internal/createSearchBuilder.ts`,
    find: "Object.freeze([...new Set([...current, ...added])].sort());",
    replace: "Object.freeze([...new Set([...current, ...added])]);",
    describes: "requested facets left in call order, so equal searches differ",
  },
  {
    file: `${CORE}/utils/Scout.ts`,
    find: "for (const name of Object.keys(adapters)) {",
    replace: "for (const name of Object.keys({})) {",
    describes: "an adapter under a name no index has accepted",
  },
  {
    file: `${CORE}/utils/Scout.ts`,
    find: 'if (kind === "profiles") {',
    replace: 'if (kind === "profiles" || kind === "sorts") {',
    describes: "an adapter's sorts not covering the index's",
  },
  {
    file: `${CORE}/utils/Scout.ts`,
    find: "if (this.#closed.signal.aborted) {",
    replace: "if (this.#closed.signal.aborted && false) {",
    describes: "a second dispose disposing every adapter again",
  },
  {
    file: "packages/tanstack-query/src/infiniteQueryOptions.ts",
    find: "return page.current + 1;",
    replace: "return undefined;",
    describes: "an infinite list ending on a full page whose count is unknown",
  },
  {
    file: "packages/tanstack-query/src/infiniteQueryOptions.ts",
    find: 'const queryKey: QueryKey = [namespace, "infinite", ...rest];',
    replace: "const queryKey: QueryKey = [namespace, ...rest];",
    describes: "an infinite query sharing a cache entry with its first page",
  },
  {
    file: `${CORE}/utils/internal/getSearchPage.ts`,
    find: "if (retrievable !== undefined && page.current * page.size >= retrievable) {",
    replace: "if (false) {",
    describes: "pages running past where the engine stops paging",
  },
  {
    file: `${TYPESENSE}/utils/getTotalEntriesCountFromResponse.ts`,
    find: 'return { value: response.found, accuracy: "estimated", scope: "matches" };',
    replace:
      'return { value: response.found, accuracy: "exact", scope: "matches" };',
    describes: "a Typesense count cut short but still presented as exact",
  },
  {
    file: `${TYPESENSE}/utils/getFacetsFromResponse.ts`,
    find: "exhaustive: !counts.sampled,",
    replace: "exhaustive: true,",
    describes: "a sampled Typesense facet presented as counted in full",
  },
  {
    file: `${TYPESENSE}/utils/getSearchParameters.ts`,
    find: 'parameters.q = "*";',
    replace: "",
    describes: "a Typesense browse sent as an empty query",
  },
  {
    file: `${TYPESENSE}/utils/getSortByFromSort.ts`,
    find: "if (sort.by.length > MAX_SORT_FIELDS) {",
    replace: "if (sort.by.length > MAX_SORT_FIELDS + 1) {",
    describes: "a Typesense sort on more fields than it orders by sent anyway",
  },
  {
    file: `${TYPESENSE}/typesense.ts`,
    find: "if (request.page.size > MAX_PAGE_SIZE) {",
    replace: "if (request.page.size > MAX_PAGE_SIZE + 1) {",
    describes: "a Typesense page larger than it returns sent anyway",
  },
  {
    file: `${TYPESENSE}/typesense.ts`,
    find: "  reservedOptions: RESERVED_OPTIONS,\n",
    replace: "",
    describes:
      "a Typesense provider option overriding a parameter Scout writes",
  },
  {
    file: `${TYPESENSE}/typesense.ts`,
    find: "abortSignal: signal,",
    replace: "abortSignal: null,",
    describes: "a Typesense search that cannot be cancelled on the wire",
  },
  {
    file: `${TYPESENSE}/utils/getSearchParameters.ts`,
    find: "parameters.highlight_start_tag = markers.open;",
    replace: 'parameters.highlight_start_tag = "<mark>";',
    describes: "a Typesense highlight marked with a tag a document can forge",
  },
  {
    file: `${TYPESENSE}/utils/getHighlightsFromHit.ts`,
    find: "if (!requested.includes(field)) {",
    replace: "if (false) {",
    describes: "a Typesense highlight reported for a field nobody asked for",
  },
  {
    file: `${TYPESENSE}/utils/getFilterByFromFilter.ts`,
    find: 'value.replace(/[\\\\`]/g, "\\\\$&")',
    replace: 'value.replace(/[`]/g, "\\\\$&")',
    describes: "a Typesense filter value whose backslash is left unescaped",
  },
  {
    file: `${TYPESENSE}/utils/getFilterByFromFilter.ts`,
    find: 'return { type: "or", expressions: expression.expressions.map(getNegation) };',
    replace:
      'return { type: "and", expressions: expression.expressions.map(getNegation) };',
    describes: "a negated Typesense and pushed down without De Morgan",
  },
  {
    file: `${CORE}/utils/internal/resolveSearch.ts`,
    find: "assertProviderOptionsAreNotReserved(\n    runtime.adapter.reservedOptions ?? [],\n    state.provider,\n  );",
    replace: "",
    describes: "a provider option overriding what an adapter writes itself",
  },
  {
    file: `${CORE}/utils/internal/createSearchBuilder.ts`,
    find: "page.size ?? state.page.size",
    replace: "page.size ?? 20",
    describes: "a page call resetting the size it left out",
  },
  {
    file: `${ORAMA}/utils/getSearchParameters.ts`,
    find: 'if (request.query !== "") {',
    replace: "if (true) {",
    describes:
      "an Orama browse sent as an empty term over the profile's properties",
  },
  {
    file: `${ORAMA}/utils/getSortByFromSort.ts`,
    find: "if (only === undefined || others.length > 0) {",
    replace: "if (only === undefined) {",
    describes: "an Orama sort by several properties sent as its first one",
  },
  {
    file: `${ORAMA}/utils/getFacetDefinitionsFromFields.ts`,
    find: 'if (kind === "number" || kind === "number[]") {',
    replace: 'if (kind === "number[]") {',
    describes: "an Orama number facet sent without the ranges it needs",
  },
  {
    file: `${ORAMA}/utils/getFacetsFromResponse.ts`,
    find: "exhaustive: values.length === result.count,",
    replace: "exhaustive: true,",
    describes: "a truncated Orama facet presented as counted in full",
  },
  {
    file: `${ORAMA}/orama.ts`,
    find: "if (request.highlights.length > 0) {",
    replace: "if (request.highlights.length > 1) {",
    describes: "an Orama highlight answered with nothing instead of refused",
  },
  {
    file: `${ORAMA}/orama.ts`,
    find: "took: response.elapsed.raw / NANOSECONDS_PER_MILLISECOND,",
    replace: "took: response.elapsed.raw,",
    describes: "Orama's nanoseconds reported as milliseconds",
  },
  {
    file: `${ORAMA}/orama.ts`,
    find: "fingerprint: () => `orama:${revision()}`,",
    replace: 'fingerprint: () => "orama",',
    describes: "an Orama corpus change that leaves the query key alone",
  },
  {
    file: `${ORAMA}/orama.ts`,
    find: "if (request.provider !== null) {",
    replace: "if (request.provider === undefined) {",
    describes: "an Orama provider option passed through instead of refused",
  },
  {
    file: `${ORAMA}/utils/getSearchParameters.ts`,
    find: "offset: (request.page.current - 1) * request.page.size,",
    replace: "offset: 0,",
    describes: "every Orama page answered with the first",
  },
  {
    file: `${ORAMA}/utils/getWhereFromFilter.ts`,
    find: "not: getEquality(field, kind, comparison.operator, comparison.value),",
    replace:
      "...getEquality(field, kind, comparison.operator, comparison.value),",
    describes: "an Orama neq filter translated as eq",
  },
  {
    file: `${ORAMA}/utils/getWhereFromFilter.ts`,
    find: 'if (kind === "number" || kind === "enum" || kind === "boolean") {',
    replace:
      'if (kind === "number" || kind === "enum" || kind === "boolean" || kind === "string") {',
    describes: "an Orama filter on a string property matched by token",
  },
  {
    file: `${MEILISEARCH}/utils/getTotalEntriesCountFromResponse.ts`,
    find: 'accuracy: "estimated",',
    replace: 'accuracy: "exact",',
    describes: "a Meilisearch offset estimate presented as exact",
  },
  {
    file: `${MEILISEARCH}/utils/getTotalEntriesCountFromResponse.ts`,
    find: "if (response.totalHits >= maxTotalHits) {",
    replace: "if (response.totalHits > maxTotalHits) {",
    describes:
      "a Meilisearch total capped by maxTotalHits presented as a count",
  },
  {
    file: `${MEILISEARCH}/meilisearch.ts`,
    find: "if (request.page.size > maxTotalHits) {",
    replace: "if (request.page.size > maxTotalHits + 1) {",
    describes: "a Meilisearch page larger than maxTotalHits sent anyway",
  },
  {
    file: `${MEILISEARCH}/meilisearch.ts`,
    find: "  reservedOptions: RESERVED_OPTIONS,\n",
    replace: "",
    describes:
      "a Meilisearch provider option overriding a parameter Scout writes",
  },
  {
    file: `${MEILISEARCH}/utils/getSearchParameters.ts`,
    find: "params.highlightPreTag = markers.open;",
    replace: 'params.highlightPreTag = "<em>";',
    describes: "a Meilisearch highlight marked with a tag a document can forge",
  },
  {
    file: `${MEILISEARCH}/meilisearch.ts`,
    find: "const response = await index.search(request.query, params, { signal });",
    replace:
      "const response = await index.search(request.query, params, { signal: null });",
    describes: "a Meilisearch search that cannot be cancelled on the wire",
  },
  {
    file: `${MEILISEARCH}/utils/getHitsFromResponse.ts`,
    find: "([key]) => !HIT_METADATA_KEYS.includes(key)",
    replace: "() => true",
    describes: "Meilisearch's own hit keys left in the document",
  },
  {
    file: `${MEILISEARCH}/utils/getHighlightTruncationFromParameters.ts`,
    find: 'return "unknown";',
    replace: "return false;",
    describes: "a cropped Meilisearch highlight claimed to be whole",
  },
  {
    file: `${MEILISEARCH}/utils/getFilterFromFilter.ts`,
    find: 'value.replace(/\\\\/g, "\\\\\\\\").replace(/"/g, \'\\\\"\')',
    replace: "value.replace(/\"/g, '\\\\\"')",
    describes: "a Meilisearch filter value whose backslash is left unescaped",
  },
  {
    file: `${MEILISEARCH}/utils/getFilterFromFilter.ts`,
    find: '.join(" OR ");',
    replace: '.join(" AND ");',
    describes: "a Meilisearch or translated as an and",
  },
  {
    file: `${FUSE}/utils/getQueryFromRequest.ts`,
    find: "if (!indexed.includes(field)) {",
    replace: "if (false) {",
    describes:
      "a Fuse profile searching an unindexed field silently finding nothing",
  },
  {
    file: `${FUSE}/utils/getQueryFromRequest.ts`,
    find: "if (indexed.every((key) => request.searchable.includes(key))) {",
    replace: "if (true) {",
    describes: "a narrower Fuse profile searching every key",
  },
  {
    file: `${FUSE}/utils/getQueryFromRequest.ts`,
    find: "if (index.options.useExtendedSearch || index.options.useTokenSearch) {",
    replace: "if (index.options.useExtendedSearch) {",
    describes:
      "a narrower Fuse profile sent as a logical query token search crashes on",
  },
  {
    file: `${FUSE}/utils/getQueryFromRequest.ts`,
    find: 'if (request.query.trim() === "") {',
    replace: "if (false) {",
    describes:
      "a Fuse browse over a narrower profile sent as a logical query of blanks",
  },
  {
    file: `${FUSE}/fuse.ts`,
    find: "native.filter((hit) => matchesFilter(request.filter, hit.item)),",
    replace: "native,",
    describes: "Fuse matches returned unfiltered",
  },
  {
    file: `${FUSE}/fuse.ts`,
    find: "      request.sort,",
    replace: "      null,",
    describes: "a Fuse search ignoring its sort",
  },
  {
    file: `${FUSE}/fuse.ts`,
    find: "if (request.facets.length > 0) {",
    replace: "if (request.facets.length > 1) {",
    describes: "a Fuse facet answered as empty instead of refused",
  },
  {
    file: `${FUSE}/fuse.ts`,
    find: "if (request.highlights.length > 0 && !index.options.includeMatches) {",
    replace: "if (false) {",
    describes: "a Fuse highlight without includeMatches answered as plain text",
  },
  {
    file: `${FUSE}/fuse.ts`,
    find: "fingerprint: () => `fuse:${String(revision())}`,",
    replace: 'fingerprint: () => "fuse",',
    describes: "a Fuse corpus change that leaves the query key alone",
  },
  {
    file: `${FUSE}/utils/getSortedHits.ts`,
    find: "return -order;",
    replace: "return order;",
    describes: "a descending Fuse sort ordered ascending",
  },
  {
    file: `${FUSE}/utils/getSortedHits.ts`,
    find: "if (isLeftMissing) {\n        return 1;",
    replace: "if (isLeftMissing) {\n        return -1;",
    describes: "a Fuse document without the sorted field sorted first",
  },
  {
    file: `${FUSE}/utils/getOrderOfValues.ts`,
    find: "if (left < right) {",
    replace: "if (left.localeCompare(right) < 0) {",
    describes: "Fuse strings ordered by the runtime's locale",
  },
  {
    file: `${FUSE}/utils/getHitsFromMatches.ts`,
    find: "const start = (page.current - 1) * page.size;",
    replace: "const start = 0;",
    describes: "a Fuse search ignoring the page it was asked for",
  },
  {
    file: `${FUSE}/utils/getHighlightPartsFromMatch.ts`,
    find: "isSplittingSurrogate(text, end)",
    replace: "false",
    describes: "a Fuse highlight range cutting a surrogate pair",
  },
  {
    file: `${FUSE}/utils/getHighlightPartsFromMatch.ts`,
    find: "match.value !== text ||",
    replace: "",
    describes: "stale Fuse match text replacing the document's own text",
  },
  {
    file: `${ALGOLIA}/utils/getSearchParameters.ts`,
    find: "page: request.page.current - 1,",
    replace: "page: request.page.current,",
    describes: "Algolia's zero based page sent untranslated",
  },
  {
    file: `${ALGOLIA}/utils/getTotalEntriesCountFromResponse.ts`,
    find: "if (value > limit) {",
    replace: "if (value < 0) {",
    describes:
      "an Algolia count past the pagination window presented as retrievable",
  },
  {
    file: `${ALGOLIA}/utils/getTotalEntriesCountFromResponse.ts`,
    find: 'return { value, accuracy: "estimated", scope };',
    replace: 'return { value, accuracy: "exact", scope };',
    describes: "an approximated Algolia count presented as exact",
  },
  {
    file: `${ALGOLIA}/utils/getFacetsFromResponse.ts`,
    find: 'exhaustive: exhaustive ?? "unknown",',
    replace: "exhaustive: exhaustive ?? true,",
    describes:
      "an Algolia facet whose counting it said nothing about presented as exhaustive",
  },
  {
    file: `${ALGOLIA}/utils/getSearchParameters.ts`,
    find: "params.highlightPreTag = markers.open;",
    replace: 'params.highlightPreTag = "<em>";',
    describes: "an Algolia highlight marked with a tag a document can forge",
  },
  {
    file: `${ALGOLIA}/utils/getIndexNameFromSort.ts`,
    find: "const replica = replicas[sort.name];",
    replace: "const replica = indexName;",
    describes:
      "an Algolia sort searching the primary index instead of its replica",
  },
  {
    file: `${ALGOLIA}/utils/getSearchResponse.ts`,
    find: "if (cache) {",
    replace: "if (!cache) {",
    describes: "the Algolia client's own caches answering by default",
  },
  {
    file: `${ALGOLIA}/utils/assertProfilesOmitReservedOptions.ts`,
    find: "if (Object.hasOwn(parameters, key)) {",
    replace: 'if (Object.hasOwn(parameters, key) && key === "") {',
    describes: "an Algolia profile overriding a parameter Scout writes",
  },
  {
    file: `${ALGOLIA}/algolia.ts`,
    find: "    reservedOptions: RESERVED_OPTIONS,\n",
    replace: "",
    describes: "an Algolia provider option overriding a parameter Scout writes",
  },
  {
    file: `${ALGOLIA}/algolia.ts`,
    find: "        retrievable: paginationLimitedTo,\n",
    replace: "",
    describes: "Algolia pages running past its pagination window",
  },
  {
    file: `${ALGOLIA}/utils/getHitsFromResponse.ts`,
    find: "Object.entries(hit).filter(([key]) => !HIT_METADATA_KEYS.includes(key)),",
    replace: "Object.entries(hit),",
    describes: "Algolia's own hit keys left in the document",
  },
  {
    file: `${ALGOLIA}/utils/getFiltersFromFilter.ts`,
    find: 'value.replace(/\\\\/g, "\\\\\\\\").replace(/"/g, \'\\\\"\')',
    replace: "value.replace(/\"/g, '\\\\\"')",
    describes: "an Algolia filter value whose backslash is left unescaped",
  },
  {
    file: `${ALGOLIA}/utils/getFiltersFromFilter.ts`,
    find: "if (new Set(getKinds(expression)).size > 1) {",
    replace: "if (new Set(getKinds(expression)).size > 2) {",
    describes: "an Algolia set mixing numbers and facet values sent anyway",
  },
  {
    file: `${MINISEARCH}/utils/getSearchOptions.ts`,
    find: "    options.filter = (result) =>\n      matchesFilter(filter, getDocumentFromResult(result, resolve));\n",
    replace: "",
    describes: "a MiniSearch filter dropped instead of run over every match",
  },
  {
    file: `${MINISEARCH}/utils/getSortedMatches.ts`,
    find: "if (sort === null) {",
    replace: "if (sort !== undefined) {",
    describes: "a MiniSearch sort ignored, leaving relevance order",
  },
  {
    file: `${MINISEARCH}/utils/getSortedMatches.ts`,
    find: "return -order;",
    replace: "return order;",
    describes: "a descending MiniSearch sort run ascending",
  },
  {
    file: `${MINISEARCH}/utils/getSortedMatches.ts`,
    find: "if (rank !== 0) {",
    replace: "if (rank !== 0 && by.length === 0) {",
    describes: "a document missing the MiniSearch sort field not sorted last",
  },
  {
    file: `${MINISEARCH}/utils/getSortedMatches.ts`,
    find: "return getOrder(left, right);",
    replace: "return Math.sign(left - right);",
    describes: "two infinite MiniSearch sort values not tying",
  },
  {
    file: `${MINISEARCH}/utils/getPageHitsFromMatches.ts`,
    find: "const start = (page.current - 1) * page.size;",
    replace: "const start = page.current * page.size;",
    describes: "a MiniSearch page read as zero based",
  },
  {
    file: `${MINISEARCH}/utils/getResultsFromIndex.ts`,
    find: "return index.search(wildcard, options);",
    replace: 'return index.search("", options);',
    describes: "a MiniSearch browse run as an empty query that finds nothing",
  },
  {
    file: `${MINISEARCH}/utils/getSearchOptions.ts`,
    find: "fields: [...request.searchable],",
    replace: "",
    describes:
      "a MiniSearch search reading every field instead of the profile's",
  },
  {
    file: `${MINISEARCH}/minisearch.ts`,
    find: "if (request.facets.length > 0) {",
    replace: "if (request.facets.length > 1) {",
    describes: "a MiniSearch facet answered empty instead of refused",
  },
  {
    file: `${MINISEARCH}/minisearch.ts`,
    find: "  reservedOptions: RESERVED_OPTIONS,\n",
    replace: "",
    describes: "a MiniSearch provider option overriding an option Scout writes",
  },
  {
    file: `${MINISEARCH}/minisearch.ts`,
    find: "if (request.highlights.length > 0) {",
    replace: "if (request.highlights.length > 1) {",
    describes: "a MiniSearch highlight answered empty instead of refused",
  },
  {
    file: `${MINISEARCH}/utils/getTotalEntriesCountFromResults.ts`,
    find: '  accuracy: "exact",\n  scope: "matches",\n});',
    replace: '  accuracy: "estimated",\n  scope: "matches",\n});',
    describes: "an exact MiniSearch count presented as an estimate",
  },
  {
    file: `${MINISEARCH}/utils/getDocumentFromResult.ts`,
    find: 'if (typeof resolve === "function") {',
    replace: "if (false) {",
    describes:
      "a MiniSearch resolver ignored, leaving the stored subset as the document",
  },
  {
    file: `${MINISEARCH}/utils/getDocumentFromResult.ts`,
    find: "if (Object.keys(stored).length === 0) {",
    replace: "if (false) {",
    describes:
      "a MiniSearch instance that stores nothing answered with bare ids",
  },
  {
    file: `${CORE}/utils/internal/getSearchPage.ts`,
    find: 'if (total.accuracy === "estimated") {',
    replace: "if (false) {",
    describes: "an estimated count promising a next page it cannot know",
  },
  {
    file: `${HTTP}/http.ts`,
    find: 'code: "unsupported-feature",',
    replace: 'code: "provider",',
    describes: "a backend's refusal reported as a failure",
  },
  {
    file: `${HTTP}/http.ts`,
    find: "native: request,",
    replace: "native: null,",
    describes: "an http adapter whose native handle is not the request",
  },
  {
    file: `${HTTP}/http.ts`,
    find: "const answer = await request({ search, signal });",
    replace:
      "const answer = await request({ search, signal: new AbortController().signal });",
    describes: "an http search that cannot be cancelled on the wire",
  },
  {
    file: `${HTTP}/http.ts`,
    find: "fingerprint: () => fingerprint,",
    replace: 'fingerprint: () => "http",',
    describes: "an http adapter whose fingerprint does not name its backend",
  },
  {
    file: `${HTTP}/http.ts`,
    find: 'total: answer.total ?? { accuracy: "unknown", scope: "unknown" },',
    replace:
      'total: answer.total ?? { value: 0, accuracy: "exact", scope: "matches" },',
    describes: "an absent wire total read as an exact zero",
  },
  {
    file: `${HTTP}/http.ts`,
    find: "took: answer.took ?? null,",
    replace: "took: answer.took ?? 0,",
    describes: "an absent wire time read as instant",
  },
  {
    file: `${HTTP}/http.ts`,
    find: "highlights: hit.highlights ?? {},",
    replace: "highlights: {},",
    describes: "a wire hit's highlights dropped",
  },
  {
    file: `${HTTP}/http.ts`,
    find: "native: hit,",
    replace: "native: hit.document,",
    describes: "a wire hit's own keys lost from native",
  },
  {
    file: `${HTTP}/http.ts`,
    find: "retrievable: answer.retrievable,",
    replace: "retrievable: undefined,",
    describes: "a backend's paging window ignored",
  },
  {
    file: `${HTTP}/utils/getFacetsFromResponse.ts`,
    find: 'exhaustive: facet.exhaustive ?? "unknown",',
    replace: "exhaustive: facet.exhaustive ?? true,",
    describes:
      "an exhaustiveness the backend never claimed reported as complete",
  },
  // The suite has to fail an adapter that is wrong, not only pass one that
  // is right, so these break the evaluating adapter it runs against.
  {
    file: `${CORE}/testing/customAdapter.test.ts`,
    find: "matchesFilter(request.filter, document) &&",
    replace: "",
    describes: "the conformance suite passing an adapter that drops filters",
  },
  {
    file: `${MONGODB}/utils/getOperatorFromFilter.ts`,
    find: "        mustNot: [getOperatorFromFilter(expression.expression, tokens)],",
    replace:
      "        filter: [getOperatorFromFilter(expression.expression, tokens)],",
    describes: "a negation sent as the filter it negates",
  },
  {
    file: `${MONGODB}/utils/getOperatorFromFilter.ts`,
    find: "        should: expression.expressions.map((member) =>\n          getOperatorFromFilter(member, tokens),\n        ),\n        minimumShouldMatch: 1,",
    replace:
      "        filter: expression.expressions.map((member) =>\n          getOperatorFromFilter(member, tokens),\n        ),",
    describes: "an or sent as an and",
  },
  {
    file: `${MONGODB}/utils/getOperatorFromFilter.ts`,
    find: "return { range: { path, gte: min, lte: max } };",
    replace: "return { range: { path, gt: min, lt: max } };",
    describes: "between excluding its bounds",
  },
  {
    file: `${MONGODB}/utils/getOperatorFromFilter.ts`,
    find: 'if (types.has("string") && !tokens.includes(path)) {',
    replace: 'if (types.has("string") && tokens.length < 0) {',
    describes:
      "a string compared on a field not indexed as token sent instead of refused",
  },
  {
    file: `${MONGODB}/utils/getSearchPipeline.ts`,
    find: "compound.must = [everything];",
    replace: "compound.must = [];",
    describes: "an empty query that browses nothing",
  },
  {
    file: `${MONGODB}/utils/getSearchPipeline.ts`,
    find: "{ $skip: (request.page.current - 1) * request.page.size },",
    replace: "{ $skip: request.page.current * request.page.size },",
    describes: "one based pages skipped as zero based, losing the first page",
  },
  {
    file: `${MONGODB}/utils/getSortFromSort.ts`,
    find: "order[field] = 1;",
    replace: "order[field] = -1;",
    describes: "an ascending sort sent descending",
  },
  {
    file: `${MONGODB}/utils/getTotalEntriesCountFromRows.ts`,
    find: 'accuracy: "lower-bound",',
    replace: 'accuracy: "exact",',
    describes: "a lower bound past its threshold presented as an exact count",
  },
  {
    file: `${MONGODB}/utils/getTotalEntriesCountFromRows.ts`,
    find: "if (page.current === 1) {",
    replace: "if (page.current >= 1) {",
    describes: "a page past the last match presented as nothing matching",
  },
  {
    file: `${MONGODB}/utils/getFacetsFromRows.ts`,
    find: 'exhaustive: "unknown",',
    replace: "exhaustive: true,",
    describes: "a facet cut at ten buckets claimed exhaustive",
  },
  {
    file: `${MONGODB}/mongodb.ts`,
    find: "`${collection.dbName}.${collection.collectionName}/${index}`",
    replace: "`${collection.dbName}.${collection.collectionName}`",
    describes: "two search indexes over one collection sharing query keys",
  },
  {
    file: `${MONGODB}/mongodb.ts`,
    find: "        signal,\n      })",
    replace: "        signal: new AbortController().signal,\n      })",
    describes:
      "the signal never reaching the driver, so an abort stops only the wait",
  },
  {
    file: `${ELASTIC_DSL}/utils/getQueryFromFilter.ts`,
    find: "const field = getExactFieldFromKeywords(comparison.field, keywords);",
    replace: "const field = comparison.field;",
    describes:
      "a filter reading a text field rather than its exact keyword field",
  },
  {
    file: `${ELASTIC_DSL}/utils/getQueryFromFilter.ts`,
    find: "        minimum_should_match: 1,\n",
    replace: "",
    describes:
      "an or leaving how many of its clauses must match to its context",
  },
  {
    file: `${ELASTIC_DSL}/utils/getQueryFromFilter.ts`,
    find: "must_not: [getQueryFromFilter(expression.expression, keywords)],",
    replace: "filter: [getQueryFromFilter(expression.expression, keywords)],",
    describes: "a negation keeping what it should exclude",
  },
  {
    file: `${ELASTIC_DSL}/utils/getQueryFromFilter.ts`,
    find: "return { range: { [field]: { gte: min, lte: max } } };",
    replace: "return { range: { [field]: { gt: min, lt: max } } };",
    describes: "between excluding its own ends",
  },
  {
    file: `${ELASTIC_DSL}/utils/getSearchBody.ts`,
    find: "    bool.must = [{ match_all: {} }];\n",
    replace: "",
    describes: "an empty query matching nothing instead of browsing",
  },
  {
    file: `${ELASTIC_DSL}/utils/getSearchBody.ts`,
    find: "from: (request.page.current - 1) * request.page.size,",
    replace: "from: request.page.current * request.page.size,",
    describes: "pages counted from zero, so the first page is skipped",
  },
  {
    file: `${ELASTIC_DSL}/utils/getSearchBody.ts`,
    find: "fields[field] = { number_of_fragments: 0 };",
    replace: "fields[field] = { number_of_fragments: 5 };",
    describes: "a highlight cut into fragments rather than asked for whole",
  },
  {
    file: `${ELASTIC_DSL}/utils/getSearchBody.ts`,
    find: "if (settings.trackTotalHits === true) {",
    replace: "if (settings.trackTotalHits !== undefined) {",
    describes: "an exact count asked for when trackTotalHits is false",
  },
  {
    file: `${ELASTIC_DSL}/utils/getTotalEntriesCountFromResponse.ts`,
    find: 'if (relation === "gte") {',
    replace: 'if (relation === "eq") {',
    describes: "a count the engine stopped reported as exact",
  },
  {
    file: `${ELASTIC_DSL}/utils/isPartialResponse.ts`,
    find: "body.timed_out || body._shards.failed > 0",
    replace: "body.timed_out",
    describes: "an answer missing a failed shard counted as whole",
  },
  {
    file: `${ELASTIC_DSL}/utils/getFacetsFromResponse.ts`,
    find: "aggregate.sum_other_doc_count === 0 &&\n    aggregate.doc_count_error_upper_bound === 0",
    replace: "aggregate.sum_other_doc_count === 0",
    describes: "a facet a shard may have undercounted reported as exhaustive",
  },
  {
    file: `${ELASTIC_DSL}/utils/getFacetsFromResponse.ts`,
    find: "value: bucket.key_as_string ?? bucket.key,",
    replace: "value: bucket.key,",
    describes: "a boolean facet value passed on as 1 or 0",
  },
  {
    file: `${ELASTICSEARCH}/elasticsearch.ts`,
    find: "if (current * size > maxResultWindow) {",
    replace: "if (current * size >= maxResultWindow) {",
    describes: "a page ending exactly at max_result_window refused",
  },
  {
    file: `${ELASTICSEARCH}/elasticsearch.ts`,
    find: "if (current * size > maxResultWindow) {",
    replace: "if ((current - 1) * size > maxResultWindow) {",
    describes: "a page refused only once it starts past max_result_window",
  },
  {
    file: `${ELASTICSEARCH}/elasticsearch.ts`,
    find: "      retrievable: maxResultWindow,\n",
    replace: "",
    describes: "paging running past max_result_window",
  },
  {
    file: `${ELASTICSEARCH}/elasticsearch.ts`,
    find: "      { signal },\n",
    replace: "      { signal: new AbortController().signal },\n",
    describes: "the caller's signal never reaching the client",
  },
  {
    file: `${ELASTICSEARCH}/elasticsearch.ts`,
    find: "const markers = createHighlightMarkers();",
    replace: 'const markers = { open: "<em>", close: "</em>" };',
    describes: "fixed highlight markers a document can forge",
  },
  {
    file: `${ELASTICSEARCH}/elasticsearch.ts`,
    find: "getSearchBody(request, settings, markers)",
    replace: "getSearchBody(request, {}, markers)",
    describes: "keywords and trackTotalHits never reaching the body",
  },
  {
    file: `${ELASTICSEARCH}/elasticsearch.ts`,
    find: "  reservedOptions: RESERVED_OPTIONS,\n",
    replace: "",
    describes: "a provider option overwriting what Scout writes",
  },
  {
    file: `${ELASTICSEARCH}/elasticsearch.ts`,
    find: "fingerprint: () => index,",
    replace: 'fingerprint: () => "elasticsearch",',
    describes: "a fingerprint that does not name the index",
  },
  {
    file: `${ELASTICSEARCH}/elasticsearch.ts`,
    find: "took: body.took,",
    replace: "took: null,",
    describes: "the engine's own time dropped",
  },
  {
    file: `${ELASTICSEARCH}/elasticsearch.ts`,
    find: "total: getTotalEntriesCountFromResponse(body),",
    replace: 'total: { accuracy: "unknown", scope: "matches" },',
    describes: "the engine's count thrown away",
  },
  {
    file: `${OPENSEARCH}/opensearch.ts`,
    find: "if (current * size > maxResultWindow) {",
    replace: "if (current * size >= maxResultWindow) {",
    describes: "a page ending exactly at max_result_window refused",
  },
  {
    file: `${OPENSEARCH}/opensearch.ts`,
    find: "        retrievable: maxResultWindow,\n",
    replace: "",
    describes: "paging running past max_result_window",
  },
  {
    file: `${OPENSEARCH}/opensearch.ts`,
    find: "const handleAbort = () => pending.abort();",
    replace: "const handleAbort = () => undefined;",
    describes:
      "an abort that settles the caller and leaves the request running",
  },
  {
    file: `${OPENSEARCH}/opensearch.ts`,
    find: '      signal.removeEventListener("abort", handleAbort);\n',
    replace: "",
    describes: "a finished search aborted when its signal fires later",
  },
  {
    file: `${OPENSEARCH}/opensearch.ts`,
    find: "      body: getSearchBody(request, settings, markers),\n",
    replace: "      ...getSearchBody(request, settings, markers),\n",
    describes:
      "the body sent at the top level, where the client reads query parameters",
  },
  {
    file: `${OPENSEARCH}/opensearch.ts`,
    find: "const markers = createHighlightMarkers();",
    replace: 'const markers = { open: "<em>", close: "</em>" };',
    describes: "fixed highlight markers a document can forge",
  },
  {
    file: `${OPENSEARCH}/opensearch.ts`,
    find: "body: getSearchBody(request, settings, markers),",
    replace: "body: getSearchBody(request, {}, markers),",
    describes: "keywords and trackTotalHits never reaching the body",
  },
  {
    file: `${OPENSEARCH}/opensearch.ts`,
    find: "  reservedOptions: RESERVED_OPTIONS,\n",
    replace: "",
    describes: "a provider option overwriting what Scout writes",
  },
  {
    file: `${OPENSEARCH}/opensearch.ts`,
    find: "fingerprint: () => index,",
    replace: 'fingerprint: () => "opensearch",',
    describes: "a fingerprint that does not name the index",
  },
  {
    file: `${OPENSEARCH}/opensearch.ts`,
    find: "        native: body,\n",
    replace: "        native: null,\n",
    describes: "the answer body dropped from result.native",
  },
  {
    file: `${CORE}/testing/customAdapter.test.ts`,
    find: "const start = (request.page.current - 1) * request.page.size;",
    replace: "const start = 0;",
    describes: "the conformance suite passing an adapter that ignores the page",
  },
  {
    file: `${CORE}/testing/customAdapter.test.ts`,
    find: "start + request.page.size,",
    replace: "start + request.page.size + 1,",
    describes: "the conformance suite passing an adapter that overfills a page",
  },
  {
    file: `${CORE}/testing/customAdapter.test.ts`,
    find: "  if (sort === null) {",
    replace: "  if (sort !== undefined) {",
    describes: "the conformance suite passing an adapter that ignores sorts",
  },
  {
    file: `${CORE}/testing/customAdapter.test.ts`,
    find: "parts: splitHighlight(marked, markers)",
    replace: "parts: [{ text: marked, matched: false }]",
    describes: "the conformance suite passing an adapter that leaks markers",
  },
];

// The package manager prints its own banner to stdout before the reporter
// does, so the report starts at the first brace rather than at the first byte.
// A suite that failed to load has no failed tests, so it is counted apart:
// a mutant that stops a file parsing proves nothing about the tests.
const countFailures = (text) => {
  const start = text.indexOf('{"numTotalTestSuites"');

  if (start === -1) {
    return { tests: -1, suites: -1 };
  }

  try {
    const report = JSON.parse(text.slice(start));

    return {
      tests: report.numFailedTests ?? -1,
      suites: report.numFailedTestSuites ?? -1,
    };
  } catch {
    return { tests: -1, suites: -1 };
  }
};

// Each package is a vitest project named after its folder.
const getProject = (file) =>
  /packages\/(?:adapters\/|internal\/)?([^/]+)\//.exec(file)[1];

const failingTests = (project) => {
  try {
    return countFailures(
      execFileSync(
        "node_modules/.bin/vitest",
        ["run", "--project", project, "--reporter", "json"],
        { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      ),
    );
  } catch (error) {
    // A non-zero exit is the normal case for a caught mutant, so the report on
    // stdout still decides. Only an unparseable report is a runner failure.
    return countFailures(String(error.stdout ?? ""));
  }
};

const baseline = failingTests("core").tests;

if (baseline !== 0) {
  console.error(
    `The baseline is not green (${baseline} failing). A mutation run against a ` +
      `red baseline proves nothing. Fix the suite first.`,
  );
  process.exit(1);
}

for (const project of new Set(
  MUTANTS.map((mutant) => getProject(mutant.file)),
)) {
  if (project === "core") {
    continue;
  }

  if (failingTests(project).tests !== 0) {
    console.error(`The ${project} baseline is not green. Fix the suite first.`);
    process.exit(1);
  }
}

console.log("Baseline green. Running mutants.\n");

let caught = 0;
const survivors = [];
const broken = [];

for (const mutant of MUTANTS) {
  const path = new URL(mutant.file, `file://${root}`);
  const original = readFileSync(path, "utf8");

  if (!original.includes(mutant.find)) {
    console.error(
      `Mutant is stale, its target text is gone: ${mutant.describes}`,
    );
    process.exit(1);
  }

  try {
    // A replacer, because a replacement string would expand `$&` and its kin.
    writeFileSync(
      path,
      original.replace(mutant.find, () => mutant.replace),
    );

    const failures = failingTests(getProject(mutant.file));
    const failed = failures.tests;

    if (failed === 0 && failures.suites > 0) {
      broken.push(mutant.describes);
      console.log(`BROKEN   ${mutant.describes} (the file no longer loads)`);
      continue;
    }

    if (failed > 0) {
      caught += 1;
      console.log(`caught   ${mutant.describes} (${failed} tests went red)`);
      continue;
    }

    survivors.push(mutant.describes);
    console.log(`SURVIVED ${mutant.describes}`);
  } finally {
    writeFileSync(path, original);
  }
}

console.log(`\n${caught} of ${MUTANTS.length} mutants caught.`);

// A mutant that stops a file loading proves nothing about the tests, so it is
// fixed rather than counted.
if (broken.length > 0) {
  console.error("\nMutants that no longer load, each a mistake in its text:");

  for (const mutant of broken) {
    console.error(`  ${mutant}`);
  }

  process.exit(1);
}

if (survivors.length > 0) {
  console.error("\nSurvivors, each either a missing test or dead code:");

  for (const survivor of survivors) {
    console.error(`  ${survivor}`);
  }

  process.exit(1);
}
