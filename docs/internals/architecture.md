---
description: "How the Scout runtime is owned: the search path, what refuses a search and when, the uncertainty model, disposal, and every invariant with the test that guards it."
---

# Architecture

The runtime has these owners. Follow them in this order:

| Owner               | Responsibility                                                                |
| ------------------- | ----------------------------------------------------------------------------- |
| `index()`           | Checks one declaration once, resolves its sorts and profiles, and freezes it. |
| `Scout`             | Binds one adapter to each index, checks the binding, and owns disposal.       |
| `SearchBuilder`     | Carries an immutable description of one search. Each method copies it.        |
| `resolveSearch`     | Resolves a description against its index into the request an adapter gets.    |
| `normalizeFilter`   | Normalises groups, constants and set operands for identity and dispatch.      |
| `canonicalize`      | Serialises supported values deterministically for query identity.             |
| `executeSearch`     | Answers contradictions, races the adapter against abort and disposal.         |
| `mapSearchResponse` | Validates documents, decodes facet values and derives the page.               |
| The adapter         | Translates one request onto one engine and nothing more.                      |

## Principles

1. Normalize the application-facing contract, not the engines. Adapters
   translate; the core owns the contract.
2. An index declares its portable names and what each one means; an adapter
   serves them, and one that needs configuration per name covers every name.
3. Unsupported portable behaviour is refused. It is never silently dropped and
   never emulated over one returned page.
4. Results preserve uncertainty. A total is exact, estimated, a lower bound or
   unknown, and a facet says whether it was exhaustive.
5. Highlights are safe text parts, never trusted markup.
6. Query identity is deterministic, and never contains a credential.
7. Building a search is pure. Only `execute()` reaches an engine.
8. TanStack Query owns caching, staleness, retries and infinite page storage.
   Scout sets none of those defaults.
9. Cleanup is idempotent, and a disposed `Scout` cannot produce results.
10. The core never branches on an adapter name. Adding an engine is one package.

## The path of a search

1. `index.search(text)` builds an immutable description of the search. Builder
   methods copy it and snapshot caller-owned filter and provider data. A page
   or page size that cannot mean anything, and a reversed `between`, are
   refused as they are called.
2. Both `key()` and `execute()` resolve the description against the index: the
   sort and profile names become their definitions, and the facet, highlight
   and filter fields are checked against the declaration. The filter is
   normalised, every operand and provider option must have a canonical form,
   and no provider option may be one the adapter reserves because it writes it
   itself. Anything wrong is a `"configuration"` error.
3. `key()` combines the resolved request with the adapter fingerprint.
   `execute()` instead checks disposal and the caller's signal, answers a
   filter that can match nothing itself, and otherwise hands the request to the
   adapter with a signal.
4. The adapter translates the request into engine parameters, refusing what the
   engine cannot express with `"unsupported-feature"` before it sends
   anything, and maps the answer into hits, a total, facets and a time.
5. The core validates documents and derives ids, decodes facet values to their
   declared types, fills requested facet and highlight fields the engine left
   out, and derives the page. A missing facet keeps unknown exhaustiveness.

Key generation does not execute a search, and execution does not compute an
unused key. Identity, adapter translation and result mapping have separate
tests.

## Cancellation and ownership

`executeSearch` refuses a search whose signal has already aborted, before the
adapter is called. Otherwise it gives the adapter one signal that aborts when
the caller's signal does or when the `Scout` is disposed, and races the
adapter's answer against it, so the caller settles even if the SDK never does.
An answer that arrives after either is refused, and a rejection caused by the
abort is reported as the abort rather than as a provider failure. An adapter
that passes the signal to its SDK stops the engine's work too; one that cannot
only stops Scout waiting.

`Scout` copies its index and adapter maps at construction. Replacing an entry in
the caller's object cannot redirect searches or change which adapters are
disposed. Each declaration is frozen when it is made, and handles are cached and
frozen. Schemas and injected clients are retained by reference, not
deep-frozen. Disposal aborts every search in flight, then visits every adapter
even if one throws, and rethrows a single failure or aggregates several.
Repeated disposal is safe. The application owns injected clients and manages
their lifetime.

## Invariants and the tests that guard them

| Invariant                                                            | Test                                                                                                                                                              |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every index has an adapter and every adapter an index                | `Scout.test.ts`: an index with no adapter is refused; an adapter that serves no index is refused                                                                  |
| An adapter's own sort configuration covers every declared sort       | `Scout.test.ts`: an adapter that serves sorts through its own configuration covers every declared one; `types.contracts.ts`                                       |
| A search reaches the adapter resolved against its index              | `resolveSearch.test.ts`: a search reaches the adapter resolved against its index                                                                                  |
| A name the index never declared is refused before anything is sent   | `resolveSearch.test.ts`: the `test.each` of refusals, including a hand built filter on an undeclared field                                                        |
| A builder is immutable                                               | `createSearchBuilder.test.ts`: the builder is immutable, so a stored search never changes                                                                         |
| Repeated `where` calls combine with AND                              | `resolveSearch.test.ts`: repeated where calls combine with and                                                                                                    |
| Two searches that mean the same thing share a key                    | `getSearchKey.test.ts`: two searches that mean the same thing share a key                                                                                         |
| Everything that changes results is part of the key                   | `getSearchKey.test.ts`: the `test.each` over query, profile, sort, filter, facets, highlights, page, page size and provider options                               |
| A contradiction and a tautology never share a key                    | `getSearchKey.test.ts`: a contradiction and a tautology have different keys                                                                                       |
| A non-serialisable value is refused, never dropped                   | `canonicalize.test.ts`: the refusal cases                                                                                                                         |
| Values of different types never share an identity                    | `canonicalize.test.ts`: values of different types never share a canonical form                                                                                    |
| An empty `in` matches nothing and an empty `notIn` restricts nothing | `normalizeFilter.test.ts`: an empty in matches nothing and an empty notIn restricts nothing                                                                       |
| A constant decides or leaves its group                               | `normalizeFilter.test.ts`: a constant decides the group it can decide; a constant the group ignores disappears from it                                            |
| Normalisation is idempotent                                          | `normalizeFilter.test.ts`: normalising an already normal tree changes nothing                                                                                     |
| A contradiction is answered without the engine                       | `executeSearch.test.ts`: a filter that can match nothing is answered without the engine                                                                           |
| An adapter's refusal reaches the caller unchanged                    | `executeSearch.test.ts`: a refusal from the adapter reaches the caller unchanged                                                                                  |
| An engine failure keeps its cause                                    | `executeSearch.test.ts`: an engine failure becomes a provider error that keeps the cause                                                                          |
| An abort settles at once and a late answer is refused                | `executeSearch.test.ts`: an abort reaches the adapter's signal and settles without waiting for it; a late answer from an engine that ignored the abort is refused |
| An abort rejection is a cancellation, not a provider failure         | `executeSearch.test.ts`: an engine rejection caused by the abort is reported as the abort                                                                         |
| Disposal settles a search in flight and refuses its answer           | `executeSearch.test.ts`: disposal settles a search in flight without waiting for the engine; an answer arriving after disposal is refused                         |
| The page is derived by the core                                      | `getSearchPage.test.ts`, every case                                                                                                                               |
| An invalid document fails the search, or is skipped and counted      | `mapSearchResponse.test.ts`: a document the schema rejects fails the search; validate skip drops the document and counts it                                       |
| Facet values arrive as the declared types                            | `mapSearchResponse.test.ts`: facet values are decoded to the type the index declared                                                                              |
| A requested facet or highlight is always present                     | `mapSearchResponse.test.ts`: a requested facet the engine skipped comes back unknown; a valid hit carries every requested highlight                               |
| `took` prefers the engine's own measurement                          | `executeSearch.test.ts`: took reports the engine's own time when it gave one                                                                                      |
| Disposal disposes every adapter once and repeats safely              | `Scout.test.ts`: disposal disposes every adapter once, however often it is called                                                                                 |
| Highlight parts never carry a marker                                 | `splitHighlight.test.ts`: no part ever carries a marker, so a document cannot render as markup                                                                    |
| The core never names an engine                                       | `index.test.ts`: the core never names an engine                                                                                                                   |
| Every adapter satisfies the contract                                 | each adapter's `conformance.test.ts`                                                                                                                              |

Regression tests are checked against deliberately broken implementations.
`scripts/mutate.mjs` breaks the core, the TanStack package, the reference
adapter the conformance suite is checked against and the adapters on purpose,
one change at a time, and fails when a break survives.
