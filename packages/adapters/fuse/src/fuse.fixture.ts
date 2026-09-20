import Fuse from "fuse.js";
import type { AdapterSearchRequest } from "@priemskiyyy/scout";

export const PRODUCTS = [
  {
    id: "p1",
    title: "Running shoe",
    category: "footwear",
    price: 90,
    tags: ["sport", "sale"],
  },
  {
    id: "p2",
    title: "Trail shoe",
    category: "footwear",
    price: 140,
    tags: ["sport"],
  },
  {
    id: "p3",
    title: "Leather shoe",
    category: "footwear",
    price: 220,
    tags: ["formal"],
  },
  {
    id: "p4",
    title: "Shoe polish",
    category: "care",
    price: 8,
    tags: ["sale"],
  },
  {
    id: "p5",
    title: "Shoe rack",
    category: "storage",
    price: 45,
    tags: ["sale"],
  },
];

export type Product = (typeof PRODUCTS)[number];

export const createProductIndex = (includeMatches = true) =>
  new Fuse(PRODUCTS, {
    keys: ["title", "tags"],
    threshold: 0.3,
    shouldSort: false,
    includeMatches,
    includeScore: true,
  });

export const request = (
  overrides: Partial<AdapterSearchRequest<never>> = {},
): AdapterSearchRequest<never> => ({
  index: "products",
  query: "shoe",
  profile: "default",
  sort: "relevance",
  filter: { type: "constant", value: true },
  facets: [],
  highlights: [],
  page: { current: 1, size: 10 },
  provider: null,
  ...overrides,
});
