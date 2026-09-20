// What a consumer actually receives, checked against what the workspace
// believes it publishes. Everything here runs outside the workspace: the
// packages are packed, installed into a throwaway project and compiled against
// the real provider SDKs, so a path alias that only resolves in this repo, a
// file that should not ship or an adapter that reaches for an SDK it promised
// not to import fails here rather than in someone's application.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspace = fileURLToPath(new URL("..", import.meta.url));
const artifacts = path.join(workspace, ".artifacts");
const release = path.join(artifacts, "release");
const consumer = mkdtempSync(path.join(tmpdir(), "scout-consumer-"));
const rootPackage = JSON.parse(
  readFileSync(path.join(workspace, "package.json"), "utf8"),
);

/** Every adapter and the SDK it must never import, because the SDK is injected. */
const INJECTED_SDKS = {
  typesense: "typesense",
  algolia: "algoliasearch",
  meilisearch: "meilisearch",
  orama: "@orama/orama",
  minisearch: "minisearch",
  fuse: "fuse.js",
  // The HTTP adapter has no SDK to inject, so there is nothing it must avoid
  // importing. It is still packed, published and compiled against below.
};

/**
 * Names that live in `internal/` or behind the barrel. A declaration file that
 * mentions one of them is leaking a contract nobody may import, which turns an
 * internal rename into a consumer's compile error.
 */
const INTERNAL_ONLY = [
  "IndexRuntime",
  "SearchDescriptor",
  "checkCapabilities",
  "createFilterFields",
  "createSearchBuilder",
  "executeSearch",
  "validateDocument",
];

/**
 * One consumer of everything published, compiled against the real provider
 * SDKs. Type level only: it proves the published declarations resolve, that an
 * adapter still satisfies the index coverage constraint after bundling, and
 * that the SDKs a consumer already installed are accepted structurally.
 */
const CONSUMER = `
import { create, insert, search } from "@orama/orama";
import {
  index,
  normalizeFilter,
  Scout,
  ScoutError,
  SearchAbortedError,
  SearchConfigurationError,
  SearchDisposedError,
  SearchProviderError,
  SearchValidationError,
  UnsupportedSearchFeatureError,
} from "@priemskiyyy/scout";
import type {
  AdapterSearchRequest,
  FilterExpression,
  IndexShape,
  SearchBuilder,
  SearchFacet,
  SearchIndex,
  SearchPage,
  SearchTotal,
  StandardSchema,
} from "@priemskiyyy/scout";
import { createMockSearchAdapter } from "@priemskiyyy/scout/mock";
import { testSearchAdapter } from "@priemskiyyy/scout/testing";
import { algolia } from "@priemskiyyy/scout-algolia";
import { meilisearch } from "@priemskiyyy/scout-meilisearch";
import { http, scoutWireRequest, scoutWireResponse } from "@priemskiyyy/scout-http";
import { minisearch } from "@priemskiyyy/scout-minisearch";
import { fuse } from "@priemskiyyy/scout-fuse";
import Fuse from "fuse.js";
import { orama } from "@priemskiyyy/scout-orama";
import {
  flattenHits,
  infiniteQueryOptions,
  queryOptions,
} from "@priemskiyyy/scout-tanstack-query";
import { typesense } from "@priemskiyyy/scout-typesense";
import { algoliasearch } from "algoliasearch";
import { Meilisearch } from "meilisearch";
import MiniSearch from "minisearch";
import { Client } from "typesense";

type Product = {
  id: string;
  name: string;
  brand: string;
  price: number;
  inStock: boolean;
};

const isProduct = (value: unknown): value is Product =>
  typeof value === "object" && value !== null && "id" in value;

const ProductSchema: StandardSchema<Product> = {
  "~standard": {
    version: 1,
    vendor: "scout-consumer",
    validate: (value) =>
      isProduct(value) ? { value } : { issues: [{ message: "Not a product." }] },
  },
};

const portable = {
  schema: ProductSchema,
  id: (product: Product) => product.id,
  filterable: ["brand", "price", "inStock"],
  facetable: ["brand"],
  profiles: ["default"],
} as const;

const database = create({
  schema: { name: "string", brand: "enum", price: "number", inStock: "boolean" },
});
insert(database, {
  id: "p1",
  name: "Running shoe",
  brand: "Nike",
  price: 120,
  inStock: true,
});

const catalogue = new MiniSearch<Product>({
  fields: ["name"],
  storeFields: ["id", "name", "brand", "price", "inStock"],
});

const mock = createMockSearchAdapter({
  sorts: { relevance: null },
  profiles: { default: null },
});

// Every declaration below states two sort names and one profile name, and the
// adapter beside it has to cover them. That coverage is the whole point of the
// contract, so it is checked here against the published types rather than
// against the workspace sources.
export const scout = new Scout({
  indexes: {
    typesense: index({
      ...portable,
      highlightable: ["name"],
      sorts: ["relevance", "priceAsc"],
      adapter: typesense({
        client: new Client({
          nodes: [{ host: "localhost", port: 8108, protocol: "http" }],
          apiKey: "not-a-real-key",
        }),
        collection: "products",
        profiles: { default: { queryBy: ["name"], prefix: true } },
        sorts: { relevance: {}, priceAsc: { sortBy: "price:asc" } },
        facets: { brand: "string" },
      }),
    }),
    algolia: index({
      ...portable,
      highlightable: ["name"],
      sorts: ["relevance", "priceAsc"],
      adapter: algolia({
        client: algoliasearch("APPID", "not-a-real-key"),
        index: { name: "products" },
        sorts: {
          relevance: { index: { name: "products" } },
          priceAsc: { index: { name: "products_price_asc" } },
        },
        profiles: { default: {} },
      }),
    }),
    meilisearch: index({
      ...portable,
      highlightable: ["name"],
      sorts: ["relevance", "priceAsc"],
      adapter: meilisearch({
        index: new Meilisearch({ host: "http://localhost:7700" }).index(
          "products",
        ),
        profiles: { default: {} },
        sorts: { relevance: {}, priceAsc: { sort: ["price:asc"] } },
      }),
    }),
    orama: index({
      ...portable,
      highlightable: [],
      sorts: ["relevance", "priceAsc"],
      adapter: orama({
        db: database,
        search,
        revision: () => 1,
        profiles: { default: { properties: ["name"] } },
        sorts: {
          relevance: {},
          priceAsc: { sortBy: { property: "price", order: "ASC" } },
        },
      }),
    }),
    minisearch: index({
      ...portable,
      highlightable: [],
      sorts: ["relevance"],
      adapter: minisearch({
        index: catalogue,
        revision: () => 1,
        profiles: { default: { fields: ["name"] } },
        sorts: { relevance: "relevance" },
      }),
    }),
    fuse: index({
      ...portable,
      highlightable: ["name"],
      sorts: ["relevance"],
      adapter: fuse({
        index: new Fuse<Product>([], { keys: ["name"], includeMatches: true }),
        revision: () => 1,
        profiles: { default: null },
        sorts: { relevance: null },
      }),
    }),
    http: index({
      ...portable,
      highlightable: ["name"],
      sorts: ["relevance"],
      adapter: http({
        endpoint: "https://api.example.test/search",
        capabilities: {
          filters: {
            eq: true,
            neq: true,
            in: true,
            notIn: true,
            comparison: true,
            between: true,
            booleanComposition: true,
          },
          pagination: { maxPageSize: 100 },
          facets: { resultScoped: true },
          highlights: "parts",
        },
        sorts: { relevance: null },
        profiles: { default: null },
        toRequest: scoutWireRequest,
        fromResponse: scoutWireResponse,
      }),
    }),
    mock: index({
      ...portable,
      highlightable: ["name"],
      sorts: ["relevance"],
      adapter: mock.adapter,
    }),
  },
});

export const productSearch = scout
  .index("orama")
  .search("shoe")
  .where((product, { and, or, not }) =>
    and(
      product.inStock.eq(true),
      product.price.between(10, 200),
      or(product.brand.in(["Nike", "Adidas"]), not(product.brand.eq("Puma"))),
    ),
  )
  .sort("priceAsc")
  .facets("brand")
  .pageSize(20);

// Orama declares no provider options, so its \`provider\` parameter is \`never\`
// and only an adapter that offers native options accepts one.
export const withNativeOptions = scout
  .index("minisearch")
  .search("shoe")
  .provider({ fuzzy: 0.2, boost: { name: 2 } });

export const runOnce = async (signal: AbortSignal) => {
  const result = await productSearch.execute({ signal });
  const total: SearchTotal = result.total;
  const page: SearchPage = result.page;
  const facet: SearchFacet<string> = result.facets.brand;
  const names: readonly string[] = result.hits.map((hit) => hit.document.name);
  const ids: readonly string[] = result.hits.map((hit) => hit.id);
  return { total, page, facet, names, ids, skipped: result.skipped, took: result.took };
};

export const highlighted = async () => {
  const result = await scout
    .index("typesense")
    .search("shoe")
    .highlight("name")
    .execute();
  return result.hits.flatMap((hit) =>
    hit.highlights.name.flatMap((fragment) =>
      fragment.parts.map((part) => part.text),
    ),
  );
};

export const nativeDatabase = scout.index("orama").native;

export const describeError = (error: unknown): string => {
  if (error instanceof SearchValidationError) {
    return "validation";
  }
  if (error instanceof UnsupportedSearchFeatureError) {
    return "unsupported";
  }
  if (error instanceof SearchConfigurationError) {
    return "configuration";
  }
  if (error instanceof SearchProviderError) {
    return "provider";
  }
  if (error instanceof SearchAbortedError) {
    return "aborted";
  }
  if (error instanceof SearchDisposedError) {
    return "disposed";
  }
  if (error instanceof ScoutError) {
    return error.code;
  }
  return "unknown";
};

export const normalized: FilterExpression = normalizeFilter({
  type: "and",
  expressions: [
    { type: "comparison", field: "brand", operator: "eq", value: "Nike" },
  ],
});

const manualRequest: AdapterSearchRequest<never> = {
  index: "products",
  query: "shoe",
  profile: "default",
  sort: "relevance",
  filter: { type: "constant", value: true },
  facets: [],
  highlights: [],
  page: { current: 1, size: 20 },
  provider: null,
};

// Consumers obtain keys from the builder.
export const keyOf = <TShape extends IndexShape>(
  builder: SearchBuilder<TShape>,
): readonly unknown[] => builder.key();

export const nameOf = <TShape extends IndexShape>(
  handle: SearchIndex<TShape>,
): string => handle.name;

export const onePage = queryOptions(productSearch);
export const manyPages = infiniteQueryOptions(productSearch);

export const collapse = async () => {
  const page = await productSearch.execute();
  return flattenHits({ pages: [page] }).map((hit) => hit.document.brand);
};

export const conformance = () =>
  testSearchAdapter({
    name: "orama",
    createAdapter: () =>
      orama({
        db: database,
        search,
        revision: () => 1,
        profiles: { default: {} },
        sorts: { relevance: {} },
      }),
    fixtures: {
      index: "products",
      query: "shoe",
      sort: "relevance",
      profile: "default",
      equality: { field: "brand", value: "Nike" },
      facet: "brand",
    },
  });

export const shutDown = () => scout.dispose();
`;

const run = (command, args, cwd = consumer) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 600_000,
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`,
      { cause: result.error },
    );
  }

  return result.stdout;
};

const write = (name, content) =>
  writeFileSync(path.join(consumer, name), content);
const json = (name, value) =>
  write(name, `${JSON.stringify(value, null, 2)}\n`);

/**
 * The module specifiers a bundle actually imports.
 *
 * Comments are stripped first, because every public export carries an
 * `@example` block and those examples import the very SDK names this check is
 * looking for. A string literal mangled by the comment strip is harmless: it
 * was never an import specifier.
 */
const importsOf = (bundle) => {
  const code = bundle
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  return [
    ...code.matchAll(/\b(?:from|import|require)\s*\(?\s*["']([^"']+)["']/g),
  ].map((match) => match[1]);
};

const bundleOf = (specifier) =>
  readFileSync(path.join(consumer, "node_modules", specifier), "utf8");

// Shared declaration chunks carry the editor documentation. Follow only the
// public entry's imports so mock and testing declarations cannot mask a leak.
const declarationsOf = (filename, visited = new Set()) => {
  if (visited.has(filename)) {
    return "";
  }
  visited.add(filename);
  const source = readFileSync(filename, "utf8");
  const dependencies = importsOf(source)
    .filter((specifier) => specifier.startsWith("."))
    .map((specifier) =>
      declarationsOf(
        path.resolve(
          path.dirname(filename),
          specifier.replace(/\.js$/, ".d.ts"),
        ),
        visited,
      ),
    );
  return [source, ...dependencies].join("\n");
};

// Copies a packed tarball with its checksum into the directory the publish
// workflow uploads, so publishing never repacks and never rebuilds.
const stageRelease = (name, tarball) => {
  const directory = path.join(release, name);
  const filename = path.basename(tarball);
  const checksum = createHash("sha256")
    .update(readFileSync(tarball))
    .digest("hex");
  mkdirSync(directory, { recursive: true });
  copyFileSync(tarball, path.join(directory, filename));
  writeFileSync(
    path.join(directory, "SHA256SUMS"),
    `${checksum}  ${filename}\n`,
  );
};

try {
  rmSync(release, { recursive: true, force: true });
  mkdirSync(artifacts, { recursive: true });

  const tarballs = ["packages", "packages/adapters"].flatMap((group) =>
    readdirSync(path.join(workspace, group))
      .filter((directory) =>
        existsSync(path.join(workspace, group, directory, "package.json")),
      )
      .map((directory) => {
        const packageDirectory = path.join(workspace, group, directory);
        process.stdout.write(
          run("pnpm", ["exec", "publint", packageDirectory], workspace),
        );
        const [packed] = JSON.parse(
          run(
            "npm",
            [
              "pack",
              "--ignore-scripts",
              "--json",
              "--pack-destination",
              artifacts,
            ],
            packageDirectory,
          ),
        );
        const files = packed.files.map((file) => file.path);
        assert(
          files.includes("README.md"),
          `${packed.name} ships no README.md, so npm would show an empty page.`,
        );
        assert(files.includes("LICENSE"), `${packed.name} ships no LICENSE.`);
        assert(
          !files.some((file) => file.startsWith("src/")),
          `${packed.name} ships its sources, so a consumer could import past the barrel.`,
        );
        assert(
          !files.some((file) => /\.(test|fixture|contracts)\./.test(file)),
          `${packed.name} ships test, fixture or contract files.`,
        );
        const tarball = path.join(artifacts, packed.filename);
        stageRelease(packed.name, tarball);
        return tarball;
      }),
  );

  json("package.json", {
    name: "scout-package-consumer",
    private: true,
    type: "module",
    dependencies: Object.fromEntries(
      [
        "@orama/orama",
        "@tanstack/query-core",
        "algoliasearch",
        "fuse.js",
        "meilisearch",
        "minisearch",
        "typescript",
        "typesense",
        "vitest",
      ].map((name) => [name, rootPackage.devDependencies[name]]),
    ),
  });
  process.stdout.write(
    "Installing packed packages in an isolated consumer...\n",
  );
  run("npm", [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    ...tarballs,
  ]);

  // A path alias that only this workspace resolves would survive the build and
  // fail at import time in an application.
  const coreDistribution = path.join(
    consumer,
    "node_modules/@priemskiyyy/scout/dist",
  );
  for (const file of readdirSync(coreDistribution).filter((name) =>
    name.endsWith(".js"),
  )) {
    const specifiers = importsOf(
      readFileSync(path.join(coreDistribution, file), "utf8"),
    );
    assert(
      !specifiers.some((specifier) => specifier.startsWith("src/")),
      `@priemskiyyy/scout dist/${file} imports from src/.`,
    );
  }

  // Provider SDKs are injected and typed structurally, so an adapter bundle
  // that imports one would drag the SDK into every consumer's graph and pin
  // the version the adapter was built against.
  for (const [adapter, sdk] of Object.entries(INJECTED_SDKS)) {
    const specifiers = importsOf(
      bundleOf(`@priemskiyyy/scout-${adapter}/dist/index.js`),
    );
    assert(
      !specifiers.some(
        (specifier) => specifier === sdk || specifier.startsWith(`${sdk}/`),
      ),
      `@priemskiyyy/scout-${adapter} imports ${sdk} at runtime, but the SDK is injected.`,
    );
  }

  const declarations = declarationsOf(
    path.join(coreDistribution, "index.d.ts"),
  );
  assert.match(
    declarations,
    /@example/,
    "The published types carry no examples, so editor help is empty.",
  );
  for (const name of INTERNAL_ONLY) {
    assert.doesNotMatch(
      declarations,
      new RegExp(`\\b${name}\\b`),
      `The published types leak the internal name ${name}.`,
    );
  }

  json("tsconfig.json", {
    compilerOptions: {
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "Bundler",
      lib: ["ES2022", "DOM"],
      verbatimModuleSyntax: true,
      exactOptionalPropertyTypes: true,
      noUncheckedIndexedAccess: true,
    },
    include: ["*.ts"],
  });
  write("consumer.ts", CONSUMER);
  run(process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit"]);

  process.stdout.write(
    `Packed consumer passed for ${tarballs.length} packages: publint, tarball ` +
      `contents, no source or test files, no src/ imports, no injected SDK in ` +
      `any adapter bundle, documented public types, and a compiled consumer ` +
      `against every adapter and the TanStack integration.\n`,
  );
} finally {
  rmSync(consumer, { recursive: true, force: true });
}
