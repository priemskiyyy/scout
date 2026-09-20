---
description: "Install Scout, an adapter for your engine and the optional TanStack Query package, and check the versions and runtime requirements each one has."
---

# Installation

Scout is three installs at most: the core, one adapter for the engine you
search, and the TanStack Query package when you want caching handled for you.

```sh
pnpm add @priemskiyyy/scout @priemskiyyy/scout-typesense typesense
```

The core carries the index declaration, the search builder, the filter AST and
the result types. The adapter carries the translation onto one engine. The
engine's own SDK is a peer dependency that you install and own, because Scout
never opens a connection or holds a client of its own.

## The packages

| Package                             | What it is                                 | Peer dependencies                                 |
| ----------------------------------- | ------------------------------------------ | ------------------------------------------------- |
| `@priemskiyyy/scout`                | The core: indexes, builder, filters, types | `vitest` (optional, only for the testing subpath) |
| `@priemskiyyy/scout-typesense`      | Typesense adapter                          | `@priemskiyyy/scout`, `typesense` 3               |
| `@priemskiyyy/scout-algolia`        | Algolia adapter                            | `@priemskiyyy/scout`, `algoliasearch` 5           |
| `@priemskiyyy/scout-meilisearch`    | Meilisearch adapter                        | `@priemskiyyy/scout`, `meilisearch` 0.50 or newer |
| `@priemskiyyy/scout-orama`          | Orama adapter, in process                  | `@priemskiyyy/scout`, `@orama/orama` 3            |
| `@priemskiyyy/scout-minisearch`     | MiniSearch adapter, in process             | `@priemskiyyy/scout`, `minisearch` 7              |
| `@priemskiyyy/scout-fuse`           | Fuse.js adapter, in process                | `@priemskiyyy/scout`, `fuse.js` >=7.5 <8          |
| `@priemskiyyy/scout-http`           | Your JSON search endpoint                  | `@priemskiyyy/scout`                              |
| `@priemskiyyy/scout-tanstack-query` | Query options built from a search          | `@priemskiyyy/scout`, `@tanstack/query-core` 5    |

[Choose an adapter](adapters.md) compares what each engine can actually do
behind the contract.

## A schema library

An index validates every document it returns against a schema, so you need one
that implements [Standard Schema](https://standardschema.dev) version 1. Zod,
Valibot and ArkType all do.

```sh
pnpm add zod
```

Scout reads the document type from the schema at compile time and calls the
validator at runtime. It never introspects a schema, and it only accepts a
synchronous answer: a validator that returns a promise is treated as a
validation failure rather than awaited, because a page of fifty hits would
otherwise await fifty times. [Indexes](indexes.md) covers what that means for
the schema you write.

## Runtime and tooling

- Node 22.18 or newer for the toolchain. The published packages are ESM only,
  with `types`, then `import`, then `default` in every `exports` entry, so a
  bundler, Node and a React Native Jest resolver all find the same file.
- TypeScript 5.5 or newer with `strict` on. Most of what Scout gives you is in
  the types: filter operators inferred per field, sort and profile names as
  literal unions, facet and highlight keys on the result. Without `strict` the
  inference still works, but the compile errors that make a provider swap safe
  get weaker.
- No runtime dependencies in the core, in the TanStack package or in any
  adapter. An adapter imports no provider SDK, not even its types, so one build
  serves the browser, Node and React Native, and the version of the SDK you
  installed is the one that runs.

## Test-only subpaths

Two subpaths exist for testing and never reach a production bundle:

```ts
import { createMockSearchAdapter } from "@priemskiyyy/scout/mock";
import { testSearchAdapter } from "@priemskiyyy/scout/testing";
```

`./mock` is a deliberately badly behaved adapter for testing an application
against held answers, out-of-order completion and malformed documents. `./testing`
is the conformance suite every adapter runs, described in
[writing an adapter](writing-an-adapter.md). Both declare `vitest` as an
optional peer dependency, so installing Scout without vitest is not a warning
unless you import them.

Next: [getting started](getting-started.md) runs one search end to end.
