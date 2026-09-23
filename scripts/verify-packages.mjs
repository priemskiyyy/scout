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
  elasticsearch: "@elastic/elasticsearch",
  opensearch: "@opensearch-project/opensearch",
  mongodb: "mongodb",
  // The HTTP adapter has no SDK to inject, so there is nothing it must avoid
  // importing. It is still packed, published and compiled against below.
};

/**
 * Workspace modules that are never published. An adapter bundles what it
 * takes from one, so a bundle that still imports one would fail to install.
 */
const PRIVATE_MODULES = ["@priemskiyyy/scout-elastic-dsl"];

/**
 * Names that live in `internal/` or behind the barrel. A declaration file that
 * mentions one of them is leaking a contract nobody may import, which turns an
 * internal rename into a consumer's compile error.
 */
const INTERNAL_ONLY = [
  "IndexRuntime",
  "SearchState",
  "createFilterFields",
  "createSearchBuilder",
  "executeSearch",
  "getSearchPage",
  "normalizeFilter",
  "resolveSearch",
  "validateDocument",
];

/**
 * One consumer of everything published, compiled against the real provider
 * SDKs. Type level only: it proves the published declarations resolve, that an
 * adapter still satisfies the index coverage constraint after bundling, and
 * that the SDKs a consumer already installed are accepted structurally.
 */
const CONSUMER = `
import { Client as ElasticsearchClient } from "@elastic/elasticsearch";
import { Client as OpenSearchClient } from "@opensearch-project/opensearch";
import { create, insert, search } from "@orama/orama";
import { index, Scout, ScoutError } from "@priemskiyyy/scout";
import type {
  AdapterSearchRequest,
  IndexShape,
  ScoutErrorCode,
  SearchBuilder,
  SearchFacet,
  SearchIndex,
  SearchPage,
  SearchTotal,
  StandardSchema,
} from "@priemskiyyy/scout";
import {
  createHighlightMarkers,
  matchesFilter,
  splitHighlight,
} from "@priemskiyyy/scout/adapter";
import { createMockSearchAdapter } from "@priemskiyyy/scout/mock";
import { testSearchAdapter } from "@priemskiyyy/scout/testing";
import { algolia } from "@priemskiyyy/scout-algolia";
import { elasticsearch } from "@priemskiyyy/scout-elasticsearch";
import { fuse } from "@priemskiyyy/scout-fuse";
import { http } from "@priemskiyyy/scout-http";
import { meilisearch } from "@priemskiyyy/scout-meilisearch";
import { minisearch } from "@priemskiyyy/scout-minisearch";
import { mongodb } from "@priemskiyyy/scout-mongodb";
import { opensearch } from "@priemskiyyy/scout-opensearch";
import { orama } from "@priemskiyyy/scout-orama";
import {
  flattenHits,
  infiniteQueryOptions,
  queryOptions,
} from "@priemskiyyy/scout-tanstack-query";
import { typesense } from "@priemskiyyy/scout-typesense";
import { algoliasearch } from "algoliasearch";
import Fuse from "fuse.js";
import { Meilisearch } from "meilisearch";
import MiniSearch from "minisearch";
import { MongoClient } from "mongodb";
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

// One declaration, bound to every engine below.
const products = index({
  schema: ProductSchema,
  id: (product) => product.id,
  searchable: ["name", "brand"],
  filterable: ["brand", "price", "inStock"],
  facetable: { brand: "string" },
  highlightable: ["name"],
  sorts: { priceAsc: { price: "asc" } },
  profiles: { names: { searchable: ["name"] } },
});

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
  fields: ["name", "brand"],
  storeFields: ["id", "name", "brand", "price", "inStock"],
});

const mock = createMockSearchAdapter();

// Every adapter is checked against the published types: an index without an
// adapter, an adapter without an index, and a replica missing for a declared
// sort are all compile errors.
export const scout = new Scout({
  indexes: {
    typesense: products,
    algolia: products,
    meilisearch: products,
    orama: products,
    minisearch: products,
    fuse: products,
    mongodb: products,
    elasticsearch: products,
    opensearch: products,
    http: products,
    mock: products,
  },
  adapters: {
    typesense: typesense({
      client: new Client({
        nodes: [{ host: "localhost", port: 8108, protocol: "http" }],
        apiKey: "not-a-real-key",
      }),
      collection: "products",
      profiles: { names: { prefix: false } },
    }),
    algolia: algolia({
      client: algoliasearch("APPID", "not-a-real-key"),
      indexName: "products",
      replicas: { priceAsc: "products_price_asc" },
    }),
    meilisearch: meilisearch({
      index: new Meilisearch({ host: "http://localhost:7700" }).index("products"),
    }),
    orama: orama({ db: database, search, revision: () => 1 }),
    minisearch: minisearch({
      index: catalogue,
      wildcard: MiniSearch.wildcard,
      revision: () => 1,
    }),
    fuse: fuse({
      index: new Fuse<Product>([], { keys: ["name", "brand"], includeMatches: true }),
      revision: () => 1,
    }),
    mongodb: mongodb({
      collection: new MongoClient("mongodb://localhost:27017")
        .db("shop")
        .collection<Product>("products"),
      tokens: ["brand"],
    }),
    elasticsearch: elasticsearch({
      client: new ElasticsearchClient({ node: "http://localhost:9200" }),
      index: "products",
      keywords: { brand: "brand.keyword" },
    }),
    opensearch: opensearch({
      client: new OpenSearchClient({ node: "http://localhost:9201" }),
      index: "products",
      keywords: { brand: "brand.keyword" },
    }),
    http: http({
      fingerprint: "catalogue-api",
      request: async ({ search, signal }) => {
        const response = await fetch("https://api.example.test/search", {
          method: "POST",
          body: JSON.stringify(search),
          signal,
        });
        return response.json();
      },
    }),
    mock: mock.adapter,
  },
});

export const missingReplica = () =>
  new Scout({
    indexes: { products },
    // @ts-expect-error the algolia adapter has no replica for priceAsc
    adapters: { products: algolia({ client: algoliasearch("APPID", "not-a-real-key"), indexName: "products" }) },
  });

export const strayAdapter = () =>
  new Scout({
    indexes: { products },
    // @ts-expect-error orders serves no index
    adapters: { products: mock.adapter, orders: mock.adapter },
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
  .page({ size: 20 });

export const browse = scout.index("fuse").search("").profile("names");

// Each adapter types its own provider options.
export const withNativeOptions = scout
  .index("typesense")
  .search("shoe")
  .provider({ num_typos: 1 });

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

export const describeError = (error: unknown): ScoutErrorCode | "unknown" => {
  if (error instanceof ScoutError) {
    return error.code;
  }
  return "unknown";
};

export const matched: boolean = matchesFilter(
  { type: "comparison", field: "brand", operator: "eq", value: "Nike" },
  { brand: "Nike" },
);

export const parts = splitHighlight("Running shoe", createHighlightMarkers());

export const manualRequest: AdapterSearchRequest<never> = {
  index: "products",
  query: "shoe",
  searchable: ["name"],
  profile: "default",
  sort: null,
  filter: null,
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
    index: products,
    createAdapter: () => orama({ db: database, search, revision: () => 1 }),
    evaluates: true,
    fixtures: { query: "shoe", equality: { field: "brand", value: "Nike" } },
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
        "@elastic/elasticsearch",
        "@opensearch-project/opensearch",
        "@orama/orama",
        "@tanstack/query-core",
        "algoliasearch",
        "fuse.js",
        "meilisearch",
        "minisearch",
        "mongodb",
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

    // The consumer compiles with skipLibCheck, which would hide a declaration
    // file importing a module nobody can install, so both files are read.
    const typeSpecifiers = importsOf(
      bundleOf(`@priemskiyyy/scout-${adapter}/dist/index.d.ts`),
    );

    for (const module of PRIVATE_MODULES) {
      assert(
        !specifiers.includes(module) && !typeSpecifiers.includes(module),
        `@priemskiyyy/scout-${adapter} imports ${module}, which is never published.`,
      );
    }
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
