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
AST and its normalisation, canonical query identity, capability refusals,
document validation, page and total mapping, and disposal. They run against a
deliberately badly behaved mock that answers out of order, answers after
disposal, ignores the abort signal and returns malformed documents.

**Mutation tests** cover the core functions where a wrong answer is silent
rather than loud: filter normalisation, canonicalisation and set ordering. Source
mutants are applied to the real source and the suite must go red for each. A run
only counts when the baseline is green.

Each mutant runs against the project that owns the file it touches, so an
adapter's own page and total translation is covered too: presenting a count that
Typesense cut short as exact, or passing Algolia's zero based page through
untranslated, both turn the suite red.

**Conformance** is `testSearchAdapter` from `@priemskiyyy/scout/testing`. It
probes the adapter's declared capabilities and runs only the blocks they admit,
so an engine that cannot facet is not failed for not faceting. It proves
translation and lifecycle. It proves nothing about relevance or ranking.

Its assertions about which documents came back run only where the thing behind
the adapter really filters, which the fixtures declare. Against a fake that
records the request and returns the corpus unfiltered, such an assertion would
pass for an adapter that dropped the filter entirely, so those blocks are
skipped with a stated reason instead. The suites for Orama, MiniSearch, Fuse.js and HTTP evaluate filters.

**Adapter tests** are each engine's own: the filter strings it emits, escaping
against values built to break out, page translation, accuracy mapping, facet
coercion and highlight construction.

## The matrix

|                                    | Typesense       | Algolia         | Meilisearch     | Orama           | MiniSearch      | HTTP                         | Fuse.js         |
| ---------------------------------- | --------------- | --------------- | --------------- | --------------- | --------------- | ---------------------------- | --------------- |
| Conformance suite                  | yes             | yes             | yes             | yes             | yes             | yes                          | yes             |
| Engine used in tests               | in-process fake | in-process fake | in-process fake | **real engine** | **real engine** | in-process fake `fetch`      | **real engine** |
| Filters really evaluated in tests  | no              | no              | no              | **yes**         | **yes**         | **yes**                      | **yes**         |
| Real backend run                   | not yet         | not possible    | not yet         | by construction | by construction | not applicable               | by construction |
| Type contract against the real SDK | yes             | yes             | yes             | yes             | yes             | against the platform `fetch` | yes             |

Orama, MiniSearch and Fuse.js run in process, so their tests build a real database,
insert real documents and search it. Those results are real by construction.

The HTTP adapter has no SDK, so the platform's own `fetch` is what its type
contract pins. Its fake really evaluates the filter AST it is sent, so the
conformance suite's semantic assertions run fully against it, but a fake `fetch`
is not a server: it proves the format, the plumbing and the translation, and it
proves nothing about a real network.

Typesense and Meilisearch have official Docker images and should get a real
backend suite. **That suite does not exist yet.** Until it does, their filter
translation is asserted as the exact string sent to a fake, not as the documents
a real engine returned. A fake that reimplemented the engine's filter grammar
would only prove the fake agrees with itself, so the tests assert the request
rather than inventing results.

Algolia is hosted only. There is no local Algolia to run against, so it cannot
have a credential-free real backend suite at all. **Hosted Algolia delivery is
untested here.** Its behaviour is pinned by a structural fake plus a type
contract against the real `algoliasearch` 5.59.0 declarations.

## What none of this proves

- **Relevance.** Scout does not normalise scoring and does not test it. Which
  documents an engine ranks first is the engine's business.
- **Real network behaviour** for the three remote adapters: timeouts, retries,
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

| Gate                                                    | Status      | Evidence                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One consumer across several engines, unchanged          | partly met  | `examples/react` switches between Orama, MiniSearch and Fuse.js with only the index declaration differing. The three remote engines need running backends, so they are not in the switch.                                                                                                                     |
| MiniSearch works without core hacks                     | met         | The core has no MiniSearch-specific branch. It declares `facets.resultScoped: false` and `highlights: "none"` and the conformance suite skips those blocks.                                                                                                                                                   |
| Filter semantics documented and conformance tested      | met         | `filters.md`, `internals/architecture.md`, `normalizeFilter.test.ts`, and the mutation run over normalisation.                                                                                                                                                                                                |
| Unsupported features fail explicitly                    | met         | `checkCapabilities` throws before dispatch; `Scout.test.ts` asserts nothing was sent.                                                                                                                                                                                                                         |
| Pagination uncertainty preserved                        | met         | `SearchTotal` has four accuracies, each mapped from a real provider field. No adapter fabricates a count.                                                                                                                                                                                                     |
| Unicode highlighting                                    | met         | Meilisearch tests accents, CJK and an astral-plane emoji and asserts the parts rejoin. Typesense asserts code-point counts around ASCII markers. Fuse.js validates inclusive ranges and rejects boundaries inside surrogate pairs.                                                                            |
| Deterministic TanStack keys                             | met         | `Scout.test.ts` identity suite, the canonicalisation mutants, and the infinite-versus-page collision test.                                                                                                                                                                                                    |
| No credentials in keys or logs                          | met         | `canonicalize` refuses a value with no canonical form rather than dropping it; the conformance suite asserts a fingerprint carries no key-like word.                                                                                                                                                          |
| Real provider tests for the three remote adapters       | **not met** | They do not exist. See the matrix above.                                                                                                                                                                                                                                                                      |
| Exports work in Node, bundlers and React Native tooling | partly met  | `verify-packages.mjs` packs every tarball, installs it into a throwaway consumer and typechecks against the published declarations. Every entry carries `types`, `import` and `default` on one ESM file, which is what React Native's Jest needs. No React Native project has actually been built against it. |
| Docs separate portable from provider behaviour          | met         | `adapters.md` is one table of engine differences; every capability value in it is read from the adapter source.                                                                                                                                                                                               |

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
