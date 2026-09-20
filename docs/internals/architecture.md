---
description: "How the Scout runtime is owned: the search path, what refuses a search and when, the uncertainty model, disposal, and every invariant with the test that guards it."
---

# Architecture

The runtime has these owners. Follow them in this order:

| Owner                 | Responsibility                                                           |
| --------------------- | ------------------------------------------------------------------------ |
| `Scout`               | Holds the declared indexes and coordinates disposal. Nothing else.       |
| `index()`             | Resolves one index's declarations once and builds its field objects.     |
| `SearchBuilder`       | Carries an immutable adapter request. Each chain method copies it.       |
| `normalizeFilter`     | Normalises groups, constants and set operands for identity and dispatch. |
| `canonicalize`        | Serializes supported values deterministically for query identity.        |
| `checkCapabilities`   | Refuses a search the adapter cannot translate, before it is sent.        |
| `executeSearch`       | Checks a request, dispatches it and calls the result mapper.             |
| `createSearchAdapter` | Supplies disposal, refusal after disposal, and abort handling.           |
| The adapter           | Translates one request onto one engine and nothing more.                 |

## Principles

1. Normalize the application-facing contract, not the engines. Adapters
   translate; the core owns the contract.
2. An index declares its portable names; the adapter is required to cover them.
3. Unsupported portable behaviour throws. It is never silently dropped and never
   emulated over one returned page.
4. Results preserve uncertainty. A total is exact, estimated, a lower bound or
   unknown, and a facet says whether it was exhaustive.
5. Highlights are safe text parts, never trusted markup.
6. Query identity is deterministic, and never contains a credential.
7. Building a search is pure. Only `execute()` reaches a provider.
8. TanStack Query owns caching, staleness, retries and infinite page storage.
   Scout sets none of those defaults.
9. Cleanup is idempotent, and a disposed index cannot produce results.
10. The core never branches on an adapter name. Adding an engine is one package.

## The path of a search

1. `index.search(text)` builds an immutable `AdapterSearchRequest`. Builder
   methods copy the request and snapshot caller-owned filter and provider data.
   Pagination travels as `page: { current, size }`, with one-based numbering.
2. Both `key()` and `execute()` normalise the filter. Empty and single-child
   groups collapse, nested groups flatten, constants are absorbed, and membership
   operands are sorted and deduplicated. Every operand is validated, including
   those after a constant that determines the result.
3. `key()` combines the normalised request with the adapter fingerprint.
   `execute()` instead checks disposal, empty-query policy, provider options and
   capabilities before sending the request with its signal.
4. The adapter translates the request into provider parameters and maps the
   answer back to Scout's page, total, facet and highlight contracts. A
   match-none filter can return `emptySearchResponse` without provider I/O.
5. Core validates documents, derives ids and fills requested facet and highlight
   fields omitted by the provider. Missing facets retain unknown exhaustiveness.

Key generation does not execute a search, and execution does not compute an
unused key. Identity, provider translation and result mapping have separate tests.

## Cancellation and ownership

`createSearchAdapter` rejects immediately for an already-aborted signal. It races
pending provider work against abort and disposal, so the caller settles even if
the SDK never does. Late provider failures remain observed. Transport cancellation
can stop provider I/O; logical cancellation only stops Scout waiting.

`Scout` snapshots its index registry at construction. Replacing an entry in the
caller's object cannot redirect searches or change which adapters are disposed.
Each index captures its configuration at declaration, including default sort and
profile names. The frozen declaration keeps search and cleanup on the same
adapter. Schemas and injected clients are retained by reference, not deep-frozen.
Cleanup visits every adapter even if one throws, then rethrows a single failure
or aggregates several. Repeated disposal is safe. The application owns injected
provider clients and must manage their lifetime.

## Invariants and the tests that guard them

| Invariant                                                            | Test                                                                                                                             |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| An adapter must cover every sort and profile its index declares      | `types.contracts.ts`: the stub adapter that declares no `priceAsc` sort                                                          |
| A builder is immutable                                               | `Scout.test.ts`: the builder is immutable, so a stored search is never changed by a later one                                    |
| Repeated `where` calls combine with AND                              | `Scout.test.ts`: repeated where calls combine with and                                                                           |
| Two searches that mean the same thing share a key                    | `Scout.test.ts`: two searches that mean the same thing share a key, and a different one does not                                 |
| Page size is part of identity                                        | `Scout.test.ts`: page size is part of the identity                                                                               |
| A non-serialisable provider option is refused, never dropped         | `canonicalize.test.ts`: the seven refusal cases                                                                                  |
| Values of different types never share an identity                    | `canonicalize.test.ts`: values of different types never share a canonical form                                                   |
| An empty `in` matches nothing and an empty `notIn` restricts nothing | `normalizeFilter.test.ts`: an empty in matches nothing and an empty notIn restricts nothing                                      |
| A constant decides or leaves its group                               | `normalizeFilter.test.ts`: a constant decides the group it can decide; a constant the group ignores disappears from it           |
| Normalisation is idempotent                                          | `normalizeFilter.test.ts`: normalising an already normal tree changes nothing                                                    |
| An unsupported feature is refused before dispatch                    | `Scout.test.ts`: a feature the adapter cannot translate is refused before anything is sent                                       |
| A page above the engine's limit names the limit                      | `Scout.test.ts`: a page larger than the adapter allows is refused with the limit named                                           |
| A provider option cannot overwrite a Scout owned field               | `Scout.test.ts`: a provider option that collides with a Scout owned field is refused                                             |
| An invalid document fails the search, or is skipped and counted      | `Scout.test.ts`: a document that fails the schema fails the search by default; skip drops invalid documents and reports how many |
| A requested facet or highlight is always present                     | `Scout.test.ts`: a requested facet the engine did not return is present and empty; hits carry the id the index derived           |
| `took` prefers the provider's own measurement                        | `Scout.test.ts`: took reports the provider's own time when it gave one                                                           |
| A disposed Scout refuses new searches and disposal repeats safely    | `Scout.test.ts`: a disposed Scout refuses new searches; disposal can be called twice                                             |
| An answer after disposal is refused                                  | `createMockSearchAdapter.test.ts`: an answer arriving after disposal is refused rather than returned                             |
| An abort rejection is a cancellation, not a provider failure         | `createMockSearchAdapter.test.ts`: an SDK rejection caused by the abort is reported as a cancellation                            |
| A failure with no abort stays a provider failure                     | `createMockSearchAdapter.test.ts`: a rejection with no abort stays a provider failure and is not disguised                       |
| Highlight parts rejoin to the original value                         | `testSearchAdapter.ts`: a requested highlight comes back as parts and never as markup                                            |
| Every adapter satisfies the contract                                 | each adapter's `conformance.test.ts`                                                                                             |

Regression tests are checked against deliberately broken implementations.
`scripts/mutate.mjs` additionally exercises silent failures in normalization,
identity, highlights and response metadata.
