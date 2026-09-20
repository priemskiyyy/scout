# Contributing

Use Node 22.18 or newer and the pnpm version in `package.json`. Run `pnpm install --frozen-lockfile`, then `pnpm check` before submitting a change.

## Layout

- `packages/core`: the runtime, the index and schema contract, the search builder, the filter AST, canonical identity, the adapter contract, the adapter generator, the mock adapter and the conformance suite, published as `@priemskiyyy/scout` with the `./mock` and `./testing` subpaths.
- `packages/tanstack-query`: `queryOptions`, `infiniteQueryOptions` and the page helpers, published as `@priemskiyyy/scout-tanstack-query`.
- `packages/adapters/*`, one package per engine, published as `@priemskiyyy/scout-<name>`:
  - Remote: `typesense`, `algolia`, `meilisearch`, `http`.
  - Local: `orama`, `minisearch`, `fuse`.
- `examples/react`: one consumer that runs against several adapters without consumer API changes.
- `scripts/*`: the verification scripts behind `pnpm test:mutation`, `pnpm test:package` and `pnpm verify:release`.

Runtime owners and helpers live in `utils/`, shared contracts in `types/`, the adapter generator in `generators/`, and constants in `utils/constants/`. Internal contracts belong in each folder's `internal/` directory, so `utils/internal/` holds the helpers no consumer may import. Package roots export the supported public API explicitly, one export per file. `index.ts` is the only barrel and it is pure re-exports; no other file is named `index.ts`. Use `src/...` imports within each package.

## Code

Prefer descriptive names, early returns, `type` over `interface`, and exhaustive dispatch closed by `assertUnreachable`. No `enum`, `switch`, `any`, `as` casts, the `void` operator, `&&` as control flow, or the logical assignment operators; a guard clause says what happens when the value is already there. Classes are only for stateful owners, with `#private` fields and arrow-property methods so a destructured method stays bound; everything else is a `const` arrow function. There are no default exports, no module-level mutable state and no `process.env` read inside the library. Group option fields by domain concept rather than prefixing them. Avoid introducing a shared abstraction for a single use.

The builder holds a request and normalises its filter when `key()` or `execute()` is called. `key()` canonicalises that request together with the adapter fingerprint. `execute()` checks disposal, empty-query policy, provider options and capabilities before dispatching to the adapter with the signal, then validates and maps the response. Identity and response mapping stay separate from provider calls so they can be tested without a live service.

## Adapters

An adapter maps one engine onto the contract and nothing more. It declares capabilities that describe what it actually implements, not what the vendor advertises, and an unsupported portable request throws rather than being silently dropped or emulated over one returned page. It owns escaping, page numbering, total and facet accuracy mapping, highlight part construction and facet value coercion, because only the adapter knows the wire encoding. Provider SDKs are injected and typed structurally, so an adapter package imports no provider SDK; the real SDK is a dev dependency pinned by `src/<name>.contracts.ts`. Build on `createSearchAdapter`, which supplies idempotent disposal, guards after disposal and late-answer silencing. Every adapter runs the shared conformance suite from `@priemskiyyy/scout/testing` in `src/conformance.test.ts`; engine-specific behaviour gets its own tests next to it. See [Writing an adapter](docs/writing-an-adapter.md) for the full checklist.

## Testing

`pnpm test:unit` runs one vitest project per package, each with a `src` alias onto its own source, all in `node` because Scout is headless. Use flat `test()` calls with `globals: false`. Assert calls with their arguments; a bare `toHaveBeenCalled()` is not an assertion. A new test is watched failing before it is trusted.

Type contracts live in `*.contracts.ts` with `expectTypeOf` and a `// @ts-expect-error <reason sentence>` on every negative case. The directive suppresses only the line after it, so on a multi-line object literal it belongs on the offending property. A negative case counts only when the whole file compiles to exit 0; see `tasks/lessons.md`.

Adapters over an SDK test against an in-process fake of the SDK's shape, exported from `src/<name>.fixture.ts`, with `src/<name>.contracts.ts` pinning that fake to the real types. Every remote adapter is currently covered this way and by nothing else: there is no Docker backed suite yet, although Typesense and Meilisearch both publish images and should get one. Algolia is hosted only, so it cannot have a credential-free real backend suite at all. `docs/verification.md` is the matrix and says plainly what has and has not been run. Orama, MiniSearch and Fuse run in process, so their tests are real by construction.

Mutation testing covers the paths where a silent wrong answer is the failure mode: filter normalisation, canonical identity, highlight splitting, the empty answer, and each adapter's page and total translation. Each mutant runs against the project that owns the file it touches, and a run only counts when that project's baseline was green. A mutation run is only evidence when the baseline was green.

## Documentation

Every page under `docs/` starts with a frontmatter `description`, has one `h1`, links to sibling pages as `page.md`, and shows snippets that compile against the current API. Package READMEs follow the same rules. Keep prose concise and use commas, colons or separate sentences instead of em dashes.
