---
description: "Build a Scout adapter for an engine that has none: what the contract asks for, what the generator already does, the decisions to make before writing code, and the conformance suite it has to pass."
---

# Writing an adapter

## Before you start: is your backend an HTTP endpoint?

If it is, use `@priemskiyyy/scout-http` instead of writing an adapter from
scratch. It owns the parts every HTTP backend needs identically, which is
`fetch`, the abort signal, status and parse failures, the empty answer for a
contradiction, and a fingerprint with the credentials stripped out. You supply
the two functions only you can write, which map your request body and your
response JSON, plus your own capability declaration, because only you know what
your backend can do.

If you control both ends, `scoutWireRequest` and `scoutWireResponse` are a
ready-made format and the whole adapter is about twenty lines.

Write an adapter from scratch when the engine is not reached over HTTP at all,
such as an in-process engine or one behind a vendor SDK, or when its client
does something `fetch` cannot.

An adapter maps one engine onto the portable contract and nothing more. It owns
translation, escaping, page numbering, accuracy mapping, facet coercion and
highlight construction. It owns no cache, no retries, no debouncing and no page
accumulation.

```ts
import { createSearchAdapter } from "@priemskiyyy/scout";
import type {
  AdapterSearchRequest,
  AdapterSearchResponse,
  SearchCapabilities,
} from "@priemskiyyy/scout";

export const engine = <TSort extends string, TProfile extends string>(options: {
  client: EngineClient;
  collection: string;
  sorts: Readonly<Record<TSort, EngineSort>>;
  profiles: Readonly<Record<TProfile, EngineProfile>>;
}) =>
  createSearchAdapter({
    name: "engine",
    native: options.client,
    capabilities: CAPABILITIES,
    sorts: options.sorts,
    profiles: options.profiles,
    reservedOptions: ["q", "filter", "page", "per_page"],
    fingerprint: () => options.collection,
    search: async (
      request: AdapterSearchRequest<EngineParams>,
      { signal }: { signal: AbortSignal },
    ): Promise<AdapterSearchResponse<EngineHit, EngineResponse>> =>
      translate(await options.client.search(build(request), { signal })),
  });
```

That is the whole surface. Everything below is about getting the details right,
because the details are where an adapter can return results that look correct
and are not.

## Read these first

- `SearchAdapter` and the types it names: `AdapterSearchRequest`,
  `AdapterSearchResponse`, `AdapterSearchHit`, `SearchCapabilities`,
  `SearchPage`, `SearchTotal`, `SearchFacet`, `HighlightFragment` and
  `FilterExpression`. They are all exported from `@priemskiyyy/scout`.
- `createSearchAdapter`, which you build on rather than around.
- `testSearchAdapter` from `@priemskiyyy/scout/testing`, the suite you have to
  pass.
- The closest bundled adapter: Meilisearch for a remote engine with rich
  filtering, Typesense for exact filter syntax, MiniSearch for an engine that
  supports a subset, Orama for a local engine with a corpus revision.

## Decide the mapping before you write it

Write the mapping into your README first, as a table. If you cannot write down
what a portable feature becomes, you do not yet know whether the engine supports
it. Answer these in this order.

**Cancellation.** Does the SDK accept an `AbortSignal` on the search call? If it
does, declare `cancellation: "transport"` and pass the signal through. If it
does not, declare `"logical"` and say plainly in the README that aborting stops
Scout waiting while the engine may still run and still bill. Do not invent a
cancellation path. Algolia is `"logical"` for exactly this reason.

**Page numbering.** Requests group pagination as `page: { current, size }`.
`current` is one-based. Translate both the outgoing request and the response's
`page.current` when the provider uses another numbering scheme.

**Accuracy.** Find the field where the engine admits it is guessing. Algolia has
`exhaustive.nbHits`, Typesense has `search_cutoff`, Meilisearch has two
pagination modes that count differently. Map it onto `SearchTotal` honestly. A
count that was capped rather than counted is `"lower-bound"` with
`scope: "retrievable"`, never `"exact"`. An engine that reports nothing is
`{ accuracy: "unknown", scope: "unknown" }`, which carries no number at all.

**Facet exhaustiveness.** Algolia has `exhaustive.facetValues`, Typesense has
`facet_counts[].sampled`. If the engine says nothing, it is `"unknown"`. Do not
compute a `true` you cannot justify.

**What the engine cannot do.** Set those capability flags to `false`. That is a
feature of this design, not an admission. Never emulate a missing feature by
filtering or sorting the page you got back: the results look right, and the
totals are wrong in a way nobody can see.

## What the generator already does

`createSearchAdapter` wraps your `search` and `dispose` so every adapter gets
the same lifecycle. `dispose` and `reservedOptions` are optional when the
mapping owns neither resources nor reserved option keys:

- disposal that can be called twice;
- a refusal to start a search after disposal;
- a refusal of a search whose signal was already aborted, so it never reaches
  the provider;
- prompt rejection when aborted or disposed, even if the provider never settles;
- observation of late provider failures, so abandoned requests do not cause
  unhandled rejections;
- `SearchAbortedError` with the signal's abort reason on `cause`;
- wrapping unexpected provider failures in `SearchProviderError`.

Call it without explicit type arguments. The adapter's whole type is inferred
from the value, which is what keeps the literal keys of `sorts` and `profiles`.
A `Readonly<Record<string, unknown>>` satisfies a record of any literal keys, so
erasing those names would make an index's coverage requirement vacuous and every
engine would look like it supported every sort.

Annotate the mapping's request and response when inference has no value to read.
The configured sort and profile names survive directly, so no wrapper needs to
spread the result or restore their types. `SearchAdapterDefinition` describes
the input mapping; `SearchAdapter` describes the complete returned contract.

## The SDK is injected, never imported

The application passes its own client and the adapter types it structurally, so
the package imports no provider SDK at runtime, not even its types. One build
then serves the browser, Node and React Native, and the version of the SDK the
application installed is the one that runs.

Describe only the part of the client you call:

```ts
export type EngineClient = {
  search: (
    params: EngineParams,
    options: { signal?: AbortSignal },
  ) => Promise<EngineResponse>;
};
```

Keep the real SDK as a dev dependency and pin your structural types to it in a
`*.contracts.ts` file, so an SDK upgrade that changes a shape fails your build
rather than production.

## Translating a filter

The AST uses kebab-case operator values, including `"not-in"`. Consumers use
the fluent `.notIn(values)` method; adapters translate its `"not-in"` node.

The tree you receive is already normalised, so you never have to collapse an
empty group, sort a set or fold an empty `in` yourself. Two properties follow
from that and both are worth relying on:

- A `constant` node is only ever the whole expression. Normalisation absorbs a
  constant inside a group, so a group never has a constant child.
- `constant true` means send no filter at all. `constant false` matches nothing,
  and answering it with an empty page without a request is correct and cheaper,
  which is what every bundled adapter does.

The rest is the part that goes quietly wrong:

- **Escaping is a correctness problem, not a formatting one.** Quote and escape
  string values so a value containing a quote, a backslash, a comma, a bracket
  or one of the engine's own keywords cannot change the meaning of the
  expression. Test it with a value that tries to break out.
- **Exact equality means exact.** Typesense's `:` is token oriented and `:=` is
  exact, and Scout's `eq` is the exact one. Getting this wrong silently returns
  partial word matches.
- **Follow the engine's boolean grammar.** Parenthesise where supported, and
  refuse trees the engine cannot express. Algolia rejects parentheses around
  AND groups and cannot put an AND inside an OR.
- **Refuse a value you cannot encode.** Throw `UnsupportedSearchFeatureError`
  rather than stringifying a `Date` or an object into something that filters on
  the wrong thing.

If the engine matches a field by token where Scout promises exact equality, and
you cannot make it exact, refuse that field rather than translating it. Orama
does this for `string` properties, and the README says which property kinds to
use instead.

## Highlights, facets and timings

**Highlights are parts, never markup.** Prefer setting your own pre and post
tags and splitting on them over arithmetic with offsets. Make the markers
unguessable per search, so a document that contains your marker cannot forge a
match. If you must use offsets, remember that Meilisearch reports UTF-8 byte
offsets, which are not JavaScript string indexes, and that slicing on them
corrupts any non ASCII text. Malformed metadata degrades to one unmatched part
carrying the plain text; it never throws and never leaks a marker.

**Coerce facet values to the schema field type.** Typesense returns every facet
value as a string, even for a numeric field. Only the adapter knows the wire
encoding, so only the adapter can fix it. Take the declared types as
configuration, as the Typesense adapter's `facets` option does.

**`took` is the engine's own processing time in milliseconds, or `null`.** Do
not invent a number. The core measures the call itself when you answer `null`,
and `result.took.source` says which of the two the consumer is looking at.

**Preserve native.** The raw hit on `hit.native`, the raw response on `native`,
and the provider's own relevance score along with them. Scout has no normalised
score, and a consumer that needs ranking detail reads it from there.

## `fingerprint` and `reservedOptions`

`fingerprint()` identifies what the request does not: the collection or index
being queried, a replica mapping, and for a local engine the corpus revision. It
takes part in the query identity and therefore in cache keys, logs and devtools,
so it must never carry a credential. A local engine without a revision in its
fingerprint serves stale results forever, because nothing else can see that the
corpus changed.

`reservedOptions` lists every provider option key that would collide with
something Scout owns: the query, the filter, the page, the page size, the sort,
the facets and the highlight markers. The core refuses a `.provider()` payload
touching one of them before dispatch, with the path named.

## Test it

- `src/conformance.test.ts` runs `testSearchAdapter` with your fixtures. It
  probes your declared capabilities once and runs only the blocks they admit, so
  an engine that cannot facet is not failed for not faceting. This is the
  contract, and it is not optional.
- `src/<name>.test.ts` holds engine specific behaviour: the exact strings you
  emit, escaping against hostile values, page translation, accuracy mapping,
  facet coercion, highlight construction with multi-byte text, and the
  short-circuit cases.
- `src/<name>.fixture.ts` is an in-process fake of the SDK's shape. For a local
  engine, use the real package instead, and those tests are then real by
  construction.
- `src/<name>.contracts.ts` pins the fake and your structural types to the real
  SDK types.
- A fake that reimplements the engine's filter grammar only proves the fake.
  Assert the request you built, not the results the fake invented.
- Break the implementation on purpose and watch the right tests go red before
  you trust them.

## Then document it

Open the README with the mapping table, then the capability list with a reason
for every `false`, then the escape hatches. Say what is not proven: if the
engine has no local server and your tests run against a fake, say so rather than
letting a matrix imply a real backend.

The same applies to this site. A new adapter belongs in the table in
[adapters](adapters.md), and in [verification](verification.md) with an honest
line about what has been run against a real engine. The invariants the core
guarantees, and the test that guards each one, are in
[architecture](internals/architecture.md).
