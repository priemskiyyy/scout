---
description: "Build a Scout adapter for an engine that has none: the plain object contract, what the core already does, the decisions to make before writing code, and the conformance suite it has to pass."
---

# Writing an adapter

## Before you start: is your backend an HTTP endpoint?

If it is, use `@priemskiyyy/scout-http` instead of writing an adapter from
scratch. It owns the parts every HTTP backend needs identically, which is
`fetch`, the abort signal, status and parse failures, and a fingerprint with
the credentials stripped out, and it ships a ready-made wire format for when
you control both ends. [Adapters](adapters.md) has its options.

Write an adapter from scratch when the engine is not reached over HTTP at all,
such as an in-process engine or one behind a vendor SDK, or when its client
does something `fetch` cannot.

## The contract

An adapter is a plain object. It maps one engine onto the portable contract and
nothing more:

```ts
import { ScoutError } from "@priemskiyyy/scout";
import type { SearchAdapter } from "@priemskiyyy/scout";

export const engine = ({
  client,
  collection,
}: EngineAdapterOptions): SearchAdapter<
  EngineClient,
  EngineSearchOptions,
  EngineHit,
  EngineResponse
> => ({
  name: "engine",
  native: client,
  fingerprint: () => collection,
  reservedOptions: RESERVED_OPTIONS,
  search: async (request, { signal }) => {
    if (request.page.size > MAX_PAGE_SIZE) {
      throw new ScoutError({
        code: "unsupported-feature",
        message: `Engine returns at most ${MAX_PAGE_SIZE} hits a page.`,
      });
    }

    const response = await client.search(
      collection,
      getSearchParameters(request),
      { signal },
    );

    return {
      hits: getHitsFromResponse(response),
      total: getTotalEntriesCountFromResponse(response),
      facets: getFacetsFromResponse(response),
      took: response.took ?? null,
      native: response,
    };
  },
});
```

That is the whole surface:

- `name` names the engine in messages.
- `native` is the client the application injected, reached through
  `scout.index(name).native`.
- `fingerprint()` names what decides the results without being in the request.
- `search(request, { signal })` translates one request and maps one answer.
- `reservedOptions`, optional, names the provider options the adapter writes
  itself. The core refuses a search that passes one.
- `sorts`, optional, is configuration for an engine that serves sorts from its
  own setup, keyed by the index's sort names, such as Algolia's replicas.
- `profiles`, optional, is engine tuning keyed by the index's profile names.
- `dispose`, optional, releases what the adapter owns, never an injected client.

The factory is cold: creating the adapter calls nothing on the client.

## What the core already does

Everything around a search belongs to the core, so an adapter never does it:

- **Names.** The request arrives resolved. `searchable` holds the fields the
  profile searches, `sort` is the sort's definition, `{ name, by }`, or `null`
  for relevance, and every facet, highlight and filter field is one the index
  declared.
- **Filters.** The filter arrives normalised, or `null` when nothing is
  filtered out. A filter that can match nothing never reaches the adapter.
- **The page.** An adapter reports hits and a total. The core derives `page`
  from those and the request, so no adapter computes `next` or `previous`. An
  engine that pages no further than a window, as Algolia does, reports how many
  hits paging can reach as `retrievable` on the response, and the core ends the
  pages there.
- **Facet values.** An adapter passes each value on as the engine sent it, and
  the core decodes it to the type the index declared.
- **Documents.** The core validates each document against the schema and
  derives its id.
- **The lifecycle.** The core disposes each adapter once, refuses searches
  after disposal, and settles a search on abort or disposal whatever the
  engine does, refusing a late answer.
- **Errors.** A `ScoutError` the adapter throws reaches the caller unchanged.
  Anything else it throws becomes a `ScoutError` with code `"provider"`, with
  the original on `cause`, or `"aborted"` and `"disposed"` when that is why it
  failed.
- **Identity.** The core builds the query key from the resolved request and the
  fingerprint.

## Decide the mapping before you write it

Write the mapping into your README first, as a table. If you cannot write down
what a portable feature becomes, you do not yet know whether the engine
supports it. Answer these in this order.

**Cancellation.** Does the SDK accept an `AbortSignal` on the search call? If it
does, pass the signal through, and aborting cancels the request. If it does
not, say plainly in the README that aborting stops Scout waiting while the
engine may still run and still bill. Do not invent a cancellation path.

**Page numbering.** `request.page.current` is one-based. Translate it when the
engine counts from zero or takes an offset.

**Accuracy.** Find the field where the engine admits it is guessing, such as
Typesense's `search_cutoff`, and map it onto `SearchTotal` honestly. A count
that was capped rather than counted is `"lower-bound"`, and one that counts only
what paging can reach has `scope: "retrievable"`, never `"exact"`. An engine
that reports nothing is `{ accuracy: "unknown", scope: "unknown" }`, which
carries no number at all.

**Facet exhaustiveness.** Typesense has `facet_counts[].sampled`. If the engine
says nothing, it is `"unknown"`. Do not compute a `true` you cannot justify.

**What the engine cannot do.** Refuse it. Throw a `ScoutError` with code
`"unsupported-feature"` from `search`, before anything is sent, and say in the
message what the limit is. That is a feature of this design, not an admission.
Never emulate a missing feature by filtering or sorting the page you got back:
the results look right, and the totals are wrong in a way nobody can see. An
in-process engine that holds every match may filter and sort all of them before
it pages, which is not emulation.

## The SDK is injected, never imported

The application passes its own client and the adapter types it structurally, so
the package imports no provider SDK at runtime, not even its types. One build
then serves the browser, Node and React Native, and the version of the SDK the
application installed is the one that runs.

Describe only the part of the client you call:

```ts
export type EngineClient = {
  search: (
    collection: string,
    parameters: EngineParameters,
    options: { signal?: AbortSignal },
  ) => Promise<EngineResponse>;
};
```

Keep the real SDK as a dev dependency and pin your structural types to it in a
`*.contracts.ts` file, so an SDK upgrade that changes a shape fails your build
rather than production.

## Provider options

Type them as the engine's parameters without the ones Scout writes, and list
those keys as the adapter's `reservedOptions`, for a JavaScript caller:

```ts
export type EngineSearchOptions = Omit<
  EngineParameters,
  "q" | "filter" | "sort" | "page" | "per_page"
>;
```

The core refuses a search whose provider options carry a reserved key, with a
`ScoutError` whose code is `"configuration"`, before the adapter sees it. A
parameter Scout writes would otherwise be overwritten, or, on a search that
leaves it unset, silently change what the search means behind its identity.

## Translating a filter

The AST uses kebab-case operator values, including `"not-in"`. Consumers use
the fluent `.notIn(values)` method; adapters translate its `"not-in"` node.

The tree you receive is already normalised, so you never collapse an empty
group, sort a set or fold an empty `in` yourself. Every group has at least two
members and none of its own kind, and nothing constant is left in it. Each
comparison carries its operator's value type, a number for a range, a list for
a set and a `[min, max]` pair for `between`, and the core has already refused
`NaN` and infinite numbers, so a translator reads its operands and never
checks them.

The rest is the part that goes quietly wrong:

- **Escaping is a correctness problem, not a formatting one.** Quote and escape
  string values so a value containing a quote, a backslash, a comma, a bracket
  or one of the engine's own keywords cannot change the meaning of the
  expression. The conformance suite sends a quote, a backslash and a colon.
- **Exact equality means exact.** Typesense's `:` is token oriented and `:=` is
  exact, and Scout's `eq` is the exact one. Getting this wrong silently returns
  partial word matches.
- **Follow the engine's boolean grammar.** Parenthesise every group, push a
  negation down where the engine cannot negate a group, as Typesense cannot,
  and refuse a tree the engine cannot express with `"unsupported-feature"`.
- **Refuse a value you cannot encode.** Throw a `"configuration"` error rather
  than stringifying a `Date` or an object into something that filters on the
  wrong thing.

If the engine matches a field by token where Scout promises exact equality, and
you cannot make it exact, refuse that field rather than translating it.

## Highlights, facets and timings

**Highlights are parts, never markup.** Ask the engine to wrap matches in
markers from `createHighlightMarkers()`, made for each search, and split its
answer with `splitHighlight()`. Both come from `@priemskiyyy/scout/adapter`. A
document that contains a fixed marker could forge a match; it cannot contain
one made after it was written. If you must use offsets, find out which encoding
they count in first: a UTF-8 byte offset is not a JavaScript string index.

**Pass facet values through.** An engine that returns every facet value as a
string still hands the core the string. The core decodes it by the type the
index declared, and refuses one that cannot be read.

**`took` is the engine's own processing time in milliseconds, or `null`.** Do
not invent a number. The core measures the call itself when you answer `null`,
and `result.took.source` says which of the two the consumer is looking at.

**Preserve native.** The raw hit on each hit's `native`, the raw response on
`native`, and the engine's own relevance score along with them. Scout has no
normalised score, and a consumer that needs ranking detail reads it from there.

An in-process engine that filters by itself can use `matchesFilter(filter,
document)` from `@priemskiyyy/scout/adapter`, the reference evaluator of the
portable semantics, over the whole match set before it pages.

## `fingerprint`

`fingerprint()` identifies what the request does not: the collection or index
being queried, a replica mapping, and for a local engine the corpus revision the
application supplies. It takes part in the query identity and therefore in cache
keys, logs and devtools, so it must never carry a credential. A local engine
without a revision in its fingerprint serves stale results forever, because
nothing else can see that the corpus changed.

## Lay it out like the others

Copy the closest bundled adapter. Typesense is the model for a remote engine
reached through a vendor SDK:

```text
packages/adapters/<name>/
  package.json            peer on @priemskiyyy/scout, optional peer on the SDK
  README.md
  src/
    index.ts              the only barrel
    <name>.ts             the factory, and nothing else
    <name>.contracts.ts   typecheck only: pins the structural types to the SDK
    <name>.fixture.ts     the fake, its corpus and that corpus's index
    <name>.test.ts
    conformance.test.ts
    types/                one type per file
    utils/                every helper, one per file, each tested beside it
    utils/constants/      the engine's limits and names, by topic
```

Every helper lives in `utils/`, one export per file, named for what it returns
and from what, such as `getSearchParameters`, `getFilterByFromFilter` or
`getTotalEntriesCountFromResponse`, with its own test beside it that calls it
directly. The adapter's own test then covers what belongs to the adapter as a
whole. `utils/constants/` holds values such as `limits.ts` with the largest
page and the most sort fields, and `parameters.ts` with the reserved options.
Throw each `ScoutError` where the decision is made, with no helper wrapped
around the throw, so the reason for each refusal reads at its site.

## Test it

- `src/<name>.fixture.ts` is an in-process fake of the SDK's shape, and it
  declares the fake's corpus as an index with `index()`, exported as
  `productIndex`. For a local engine, use the real package instead, and those
  tests are then real by construction.
- `src/conformance.test.ts` runs the suite every adapter passes:

  ```ts
  import { testSearchAdapter } from "@priemskiyyy/scout/testing";

  testSearchAdapter({
    name: "engine",
    index: productIndex,
    createAdapter: () =>
      engine({ client: createEngineFake().client, collection: "products" }),
    fixtures: {
      query: "shoe",
      equality: { field: "brand", value: "Nimbus" },
      range: { field: "price", min: 100, max: 200 },
    },
  });
  ```

  Every search goes through a real `Scout`, so the adapter meets the requests
  the core resolves and its answers pass through the core's validation and
  facet decoding. It checks the name, a fingerprint without a secret, the
  answer's shape and honest total, paging, browsing, the portable filters and
  escaping, and every facet, highlight, sort and profile the index declares.
  Each feature is either served or refused with `"unsupported-feature"`. The
  query has to match at least two documents, the equality value has to be held
  by some documents and not all, and so does the range.

  Pass `evaluates: true` when the engine behind the adapter really evaluates
  searches, an in-process engine or a fake that implements the engine's
  grammar. The suite then also checks that every hit matches the filter, using
  `matchesFilter`, that pages hold different documents and that sorts order.
  A fake that only records the request does not evaluate, and asserting which
  documents came back from it proves nothing.

- `src/<name>.test.ts` holds engine specific behaviour: the exact strings you
  emit, escaping against hostile values, page translation, accuracy mapping,
  highlight construction with multi-byte text, every refusal with nothing sent,
  and that creating the adapter asks nothing of the client.
- `src/<name>.contracts.ts` pins the fake and your structural types to the real
  SDK types.
- Break the implementation on purpose and watch the right tests go red before
  you trust them. `scripts/mutate.mjs` holds a list of such breaks for every
  package, and `pnpm test:mutation` fails on one no test catches.

`createMockSearchAdapter` from `@priemskiyyy/scout/mock` is the other half: an
adapter that records every request, holds answers until a test settles them,
settles them out of order, ignores the signal or refuses, for testing code that
uses Scout rather than an adapter.

## Then document it

Open the README with the mapping table, then what the adapter refuses and why,
then the escape hatches. Say what is not proven: if the engine has no local
server and your tests run against a fake, say so rather than letting a matrix
imply a real backend.

The same applies to this site. A new adapter belongs in
[adapters](adapters.md), and in [verification](verification.md) with an honest
line about what has been run against a real engine. The invariants the core
guarantees, and the test that guards each one, are in
[architecture](internals/architecture.md).
