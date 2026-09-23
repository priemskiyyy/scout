import { defineConfig } from "vitepress";

// Read from the environment so a fork, a preview deployment and the published
// site build the same sources under different origins.
const siteUrl = process.env["DOCS_SITE_URL"];

const base =
  process.env["DOCS_BASE_PATH"] ??
  (siteUrl === undefined ? "/" : new URL(siteUrl).pathname);

const description =
  "Typed, provider-independent search for TypeScript. One typed search over " +
  "Typesense, Algolia, Meilisearch, MongoDB Search, Elasticsearch, OpenSearch, " +
  "Orama, MiniSearch or Fuse.js, with honest totals, safe highlights and " +
  "deterministic query identity.";

export default defineConfig({
  base,
  lang: "en-US",
  title: "Scout",
  description,
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: ["README.md"],
  head: [
    [
      "link",
      { rel: "icon", type: "image/svg+xml", href: `${base}favicon.svg` },
    ],
    ["meta", { name: "theme-color", content: "#b45309" }],
  ],
  ...(siteUrl === undefined ? {} : { sitemap: { hostname: siteUrl } }),
  themeConfig: {
    nav: [
      { text: "Guide", link: "/getting-started" },
      { text: "Adapters", link: "/adapters" },
      { text: "TanStack Query", link: "/tanstack-query" },
      { text: "Recipes", link: "/recipes" },
    ],
    sidebar: [
      {
        text: "Start here",
        items: [
          { text: "Getting started", link: "/getting-started" },
          { text: "Installation", link: "/installation" },
          { text: "Choose an adapter", link: "/adapters" },
          { text: "Example application", link: "/examples" },
        ],
      },
      {
        text: "Write a search",
        items: [
          { text: "Indexes", link: "/indexes" },
          { text: "The search builder", link: "/search-builder" },
          { text: "Filters", link: "/filters" },
          { text: "Profiles and sorts", link: "/profiles-and-sorts" },
          { text: "Pagination", link: "/pagination" },
          { text: "Facets", link: "/facets" },
          { text: "Highlights", link: "/highlights" },
        ],
      },
      {
        text: "Build an application",
        items: [
          { text: "TanStack Query", link: "/tanstack-query" },
          { text: "Recipes", link: "/recipes" },
          { text: "Native access", link: "/native-access" },
          { text: "Security", link: "/security" },
          { text: "Troubleshooting", link: "/troubleshooting" },
          { text: "Verification", link: "/verification" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "Writing an adapter", link: "/writing-an-adapter" },
          { text: "Architecture", link: "/internals/architecture" },
          { text: "Query identity", link: "/internals/query-identity" },
        ],
      },
    ],
    search: { provider: "local" },
    socialLinks: [
      { icon: "github", link: "https://github.com/priemskiyyy/scout" },
    ],
    editLink: {
      pattern: "https://github.com/priemskiyyy/scout/edit/main/docs/:path",
    },
    outline: { level: [2, 3] },
    footer: { message: "Released under the MIT License." },
  },
});
