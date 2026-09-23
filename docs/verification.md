---
description: "What each Scout adapter is tested against, what those tests prove, and what they do not."
---

# Verification

This page says what has actually been run. A conformance suite passing against
an in-process fake is not the same claim as a suite passing against the real
engine, and the difference is written down here rather than left for you to
infer from a green badge.

## What the suites are

**Core tests** cover the parts of Scout that never touch a provider: the filter
AST and its normalisation, canonical query identity, name and field refusals,
cancellation and disposal, the answer to a filter that matches nothing, page
derivation, facet decoding and document validation. They run against a
deliberately badly behaved mock that answers out of order, answers after an
abort or disposal, ignores the signal, refuses and returns malformed documents.

**Mutation tests** cover the functions where a wrong answer is silent rather
than loud: filter normalisation, canonicalisation and set ordering, page
derivation, cancellation and disposal, facet decoding and the query key. Source
mutants are applied to the real source and the suite must go red for each. A
run only counts when the baseline is green.

Each mutant runs against the project that owns the file it touches, so every
adapter's own translation is covered too: presenting a count that Typesense cut
short as exact, passing Algolia's zero based page through untranslated, or
sending a highlight tag a document can forge all turn the suite red. A handful
of mutants break an evaluating adapter on purpose, to prove the conformance
suite fails one that drops a filter, ignores a sort or leaks a marker.

**Conformance** is `testSearchAdapter` from `@priemskiyyy/scout/testing`. Every
search goes through a real `Scout` over the index the adapter's tests declare,
and every facet, highlight, sort and profile that index declares is tested. A
feature is either served or refused with `unsupported-feature`, so an engine
that cannot facet is not failed for refusing to. It proves translation. It
proves nothing about relevance or ranking.

Its assertions about which documents came back run only where the thing behind
the adapter really evaluates searches, which the adapter's test says with
`evaluates`. Against a fake that records the request and returns the corpus
unfiltered, such an assertion would pass for an adapter that dropped the filter
entirely, so those checks are skipped instead. The suites for Orama, MiniSearch,
Fuse.js, HTTP, MongoDB Search, Elasticsearch and OpenSearch evaluate.

**Adapter tests** are each engine's own: the filter strings it emits, escaping
against values built to break out, page translation, accuracy mapping, every
refusal and highlight construction.

## The matrix

|                                    | Typesense       | Algolia         | Meilisearch     | MongoDB Search  | Elasticsearch   | OpenSearch      | Orama           | MiniSearch      | HTTP                         | Fuse.js         |
| ---------------------------------- | --------------- | --------------- | --------------- | --------------- | --------------- | --------------- | --------------- | --------------- | ---------------------------- | --------------- |
| Conformance suite                  | yes             | yes             | yes             | yes             | yes             | yes             | yes             | yes             | yes                          | yes             |
| Engine used in tests               | in-process fake | in-process fake | in-process fake | in-process fake | in-process fake | in-process fake | **real engine** | **real engine** | in-process fake `fetch`      | **real engine** |
| Filters really evaluated in tests  | no              | no              | no              | **yes**         | **yes**         | **yes**         | **yes**         | **yes**         | **yes**                      | **yes**         |
| Real backend run                   | **yes, Docker** | not possible    | **yes, Docker** | **yes, Docker** | **yes, Docker** | **yes, Docker** | by construction | by construction | not applicable               | by construction |
| Type contract against the real SDK | yes             | yes             | yes             | yes             | yes             | yes             | yes             | yes             | against the platform `fetch` | yes             |

Orama, MiniSearch and Fuse.js run in process, so their tests build a real database,
insert real documents and search it. Those results are real by construction.

The HTTP adapter has no SDK, so the platform's own `fetch` is what its type
contract pins. Its fake really evaluates the filter AST it is sent, so the
conformance suite's semantic assertions run fully against it, but a fake `fetch`
is not a server: it proves the format, the plumbing and the translation, and it
proves nothing about a real network.

MongoDB Search's fake evaluates the whole pipeline it is sent: the operators,
the count, string facets, highlights, the sort, the page and the `$set` that
carries the metadata, so the conformance suite's semantic assertions run
against it between backend runs. The driver types every stage as a plain
document, so the type contract pins the collection, the cursor and the signal,
and not `$search` itself.

The Elasticsearch and OpenSearch fakes share one engine, which evaluates the
query language both adapters send: `bool`, `term`, `terms`, `range`,
`match_all` and `multi_match` over a near standard analyzer, sorts, pages,
terms aggregations and highlights. Like the real engines, it compares a `term`
on a `text` field with its tokens and refuses to sort or aggregate one.

Typesense, Meilisearch, MongoDB Search, Elasticsearch and OpenSearch also run
against the real engine, started from its official image by
`pnpm test:backends`. The conformance suite runs there with
`evaluates: true`, so filters, sorts, pages, facets and highlights are checked
on the documents a real server returned, and breaking a translation on purpose,
such as a negation or an `or`, turns it red. Their unit tests still assert the
exact request sent to a fake, which is what pins the translation between runs.
The pinned images are Typesense 30.2, Meilisearch 1.54.0, MongoDB Atlas Local
8.3.11, Elasticsearch 9.5.3 and OpenSearch 3.8.0.

Algolia is hosted only. There is no local Algolia to run against, so it cannot
have a credential-free real backend suite at all. **Hosted Algolia delivery is
untested here.** Its behaviour is pinned by a structural fake plus a type
contract against the real `algoliasearch` 5.59.0 declarations.

## What none of this proves

- **Relevance.** Scout does not normalise scoring and does not test it. Which
  documents an engine ranks first is the engine's business.
- **Real network behaviour** for the remote adapters: timeouts, retries,
  partial responses, rate limiting and regional failover are untested.
- **Index configuration.** Scout can prove that a filter is expressible in its
  type system and that the adapter knows how to translate it. It cannot prove
  the remote index is actually configured to allow filtering on that attribute,
  because search-only credentials cannot read index settings. That failure
  arrives at execution time as a provider error.
- **Scale.** No adapter has been measured against a large corpus. MiniSearch, Fuse.js and
  Orama hold the whole corpus in memory by design.
- **Browsers.** The React example was manually checked at desktop (1280 by 900)
  and mobile (390 by 844) sizes, including engine switching, filtering, pagination
  and document inspection. There is no automated browser suite.

## Release gates

The specification lists eleven conditions for calling this stable. Here is where
each one stands, including the remaining infrastructure gaps.

| Gate                                                    | Status     | Evidence                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One consumer across several engines, unchanged          | partly met | `examples/react` runs one index declaration on Orama, MiniSearch and Fuse.js, with only the adapter differing. The remote engines need running backends, so they are not in the switch.                                                                                                                       |
| MiniSearch works without core hacks                     | met        | The core has no MiniSearch-specific branch. The adapter refuses facets and highlights with `unsupported-feature`, and the conformance suite accepts the refusal.                                                                                                                                              |
| Filter semantics documented and conformance tested      | met        | `filters.md`, `internals/architecture.md`, `normalizeFilter.test.ts`, `matchesFilter.test.ts`, and the mutation run over normalisation.                                                                                                                                                                       |
| Unsupported features fail explicitly                    | met        | Each adapter refuses before it sends anything, and its tests assert both the code and that nothing was sent.                                                                                                                                                                                                  |
| Pagination uncertainty preserved                        | met        | `SearchTotal` has four accuracies, each mapped from a real provider field, and the core derives every page from them. No adapter fabricates a count.                                                                                                                                                          |
| Unicode highlighting                                    | met        | Meilisearch tests accents, CJK and an astral-plane emoji and asserts the parts rejoin. Typesense asserts code-point counts around ASCII markers. Fuse.js rejects boundaries inside surrogate pairs.                                                                                                           |
| Deterministic TanStack keys                             | met        | The query key tests, the canonicalisation mutants, and the infinite-versus-page collision test.                                                                                                                                                                                                               |
| No credentials in keys or logs                          | met        | `canonicalize` refuses a value with no canonical form rather than dropping it; the conformance suite asserts a fingerprint carries no credential.                                                                                                                                                             |
| Real provider tests for the remote adapters             | partly met | Typesense, Meilisearch, MongoDB Search, Elasticsearch and OpenSearch pass the conformance suite against their official images in `pnpm test:backends`. Algolia is hosted only, so it cannot have a credential-free real backend suite.                                                                        |
| Exports work in Node, bundlers and React Native tooling | partly met | `verify-packages.mjs` packs every tarball, installs it into a throwaway consumer and typechecks against the published declarations. Every entry carries `types`, `import` and `default` on one ESM file, which is what React Native's Jest needs. No React Native project has actually been built against it. |
| Docs separate portable from provider behaviour          | met        | `adapters.md` is one table of engine differences, and every refusal in it is read from the adapter source.                                                                                                                                                                                                    |

A stable release still needs real remote-provider coverage and verification
inside a React Native application. The local engine suites and packed-consumer
check do not establish those properties.

## Reproducing it

```sh
pnpm install --frozen-lockfile
pnpm check
```

`pnpm check` runs the build, typecheck, lint, format check, every unit suite and
the mutation run. It needs no Docker, no server and no credentials, because
every engine it tests is either in process or faked in process.

```sh
pnpm build
pnpm test:backends
```

`pnpm test:backends` needs Docker. It starts each remote engine from
`scripts/backends/compose.yaml` one at a time, seeds it with its adapter's
corpus, runs the conformance suite against it and removes it with its data.
Name engines to run only those, such as `pnpm test:backends typesense`. CI runs
it in the `packages-backends` workflow.
