# Contributing

Use Node 22.18 or newer and the pnpm version in `package.json`. Run `pnpm install --frozen-lockfile`, then `pnpm check` before submitting a change.

## Layout

- `packages/core`: the runtime, the index and schema contract, the search builder, the filter AST, canonical identity, the adapter contract and its helpers, the mock adapter and the conformance suite, published as `@priemskiyyy/scout` with the `./adapter`, `./mock` and `./testing` subpaths.
- `packages/tanstack-query`: `queryOptions`, `infiniteQueryOptions` and the page helpers, published as `@priemskiyyy/scout-tanstack-query`.
- `packages/adapters/*`, one package per engine, published as `@priemskiyyy/scout-<name>`:
  - Remote: `typesense`, `algolia`, `meilisearch`, `mongodb`, `elasticsearch`, `opensearch`, `http`.
  - Local: `orama`, `minisearch`, `fuse`.
- `packages/internal/*`: private modules that adapters share, bundled into each of them and never published. `elastic-dsl` is the query translation, and the fake engine its `./testing` entry exports, that the Elasticsearch and OpenSearch adapters share.
- `examples/*`: Outpost, one store searched through Scout. `examples/shared` holds the domain and the Tailwind recipes, `examples/react` is the full tour, and `examples/vue`, `solid`, `svelte` and `expo` run the store on each framework's TanStack Query binding.
- `scripts/*`: the verification scripts behind `pnpm test:mutation`, `pnpm test:package` and `pnpm verify:release`.

Runtime owners and helpers live in `utils/`, shared contracts in `types/`, and constants in `utils/constants/`, grouped by topic. Internal contracts belong in each folder's `internal/` directory, so `utils/internal/` holds the helpers no consumer may import. Package entry points export the supported public API explicitly, one export per file, and they are the only files that re-export: each package's `index.ts`, and the core's `adapter.ts`, `mock.ts` and `testing.ts`. No other file is named `index.ts`. Use `src/...` imports within each package. An adapter keeps only its factory in `src/<name>.ts`. Every helper lives in `utils/`, one export per file, named for what it returns and from what, such as `getSearchParameters` or `getTotalEntriesCountFromResponse`, with its own test beside it; a helper that only throws when something is wrong is named `assert<Fact>`. `utils/constants/` holds the engine's limits, reserved options and grammar.

## Code

Prefer names that say what a helper returns, early returns, explicit branches over a ternary that picks a result, `type` over `interface`, and exhaustive dispatch closed by `assertUnreachable`. Inline a one-line helper with one caller, and never wrap a `throw` in a helper: write `throw new ScoutError({ code, message })` where it happens. No `enum`, `switch`, `any`, `as` casts, the `void` operator, `&&` as control flow, or the logical assignment operators; a guard clause says what happens when the value is already there. Classes are only for stateful owners, with `#private` fields and arrow-property methods so a destructured method stays bound; everything else is a `const` arrow function. There are no default exports, no module-level mutable state and no `process.env` read inside the library. Group option fields by domain concept rather than prefixing them. Avoid introducing a shared abstraction for a single use.

The builder holds a frozen state and resolves it only when `key()` or `execute()` is called: sort and profile names become their definitions, requested fields are checked against the index, and the filter is normalised. `key()` canonicalises the resolved search together with the adapter fingerprint. `execute()` answers a filter that matches nothing itself, and otherwise dispatches with a signal that aborts on the caller's abort or on disposal, then validates documents, decodes facet values and derives the page. Identity and response mapping stay separate from provider calls so they can be tested without a live service.

## Adapters

An adapter is a plain object: a `name`, the injected client as `native`, a `fingerprint`, and `search`, with optional `reservedOptions`, `sorts`, `profiles` and `dispose`. `reservedOptions` names the provider options the adapter writes itself, and the core refuses a search that passes one. It maps one engine onto the contract and nothing more. What the engine cannot express it refuses with a `ScoutError` whose code is `unsupported-feature`, rather than dropping it or emulating it over one returned page. It owns escaping, page numbering, total and facet accuracy and highlight parts, because only the adapter knows the wire encoding; the core derives the page and decodes facet values to the index's declared types. Provider SDKs are injected and typed structurally, so an adapter package imports no provider SDK; the real SDK is a dev dependency pinned by `src/<name>.contracts.ts`. Adapter helpers come from `@priemskiyyy/scout/adapter`. Every adapter runs the shared conformance suite from `@priemskiyyy/scout/testing` in `src/conformance.test.ts`, over an index its fixture declares; engine-specific behaviour gets its own tests next to it. See [Writing an adapter](docs/writing-an-adapter.md) for the full checklist.

## Testing

`pnpm test:unit` runs one vitest project per package, each with a `src` alias onto its own source, all in `node` because Scout is headless. Use flat `test()` calls with `globals: false`. Assert calls with their arguments; a bare `toHaveBeenCalled()` is not an assertion. A new test is watched failing before it is trusted.

Type contracts live in `*.contracts.ts` with `expectTypeOf` and a `// @ts-expect-error <reason sentence>` on every negative case. The directive suppresses only the line after it, so on a multi-line object literal it belongs on the offending property. A negative case counts only when the whole file compiles to exit 0.

Adapters over an SDK test against an in-process fake of the SDK's shape, exported from `src/<name>.fixture.ts`, with `src/<name>.contracts.ts` pinning that fake to the real types. A remote adapter with an official image also has `src/<name>.backend.test.ts`, which seeds the real engine and runs the conformance suite against it with `evaluates: true`; `pnpm test:backends` starts each engine from `scripts/backends/compose.yaml` in turn, and `pnpm test:unit` never runs these. Algolia is hosted only, so it cannot have a credential-free real backend suite at all. `docs/verification.md` is the matrix and says plainly what has and has not been run. Orama, MiniSearch and Fuse run in process, so their tests are real by construction.

Mutation testing covers the paths where a silent wrong answer is the failure mode: filter normalisation, canonical identity, page derivation, cancellation and disposal, facet decoding, highlight splitting, the conformance suite's own teeth, and each adapter's translation. Each mutant runs against the project that owns the file it touches, and a run only counts when that project's baseline was green. A mutation run is only evidence when the baseline was green.

## Documentation

Every page under `docs/` starts with a frontmatter `description`, has one `h1`, links to sibling pages as `page.md`, and shows snippets that compile against the current API. Package READMEs follow the same rules. Keep prose concise and use commas, colons or separate sentences instead of em dashes.
