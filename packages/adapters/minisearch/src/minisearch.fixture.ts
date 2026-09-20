import MiniSearch from "minisearch";

/**
 * The corpus every test in this package searches. It is deliberately small and
 * deliberately overlapping: several products share a category, several share a
 * tag, and the word "shoe" reaches more than one of them, so a filter that was
 * dropped and a page that was sliced wrongly both show up as a different count.
 */
export type Product = {
  id: string;
  title: string;
  category: string;
  price: number;
  tags: readonly string[];
};

export const PRODUCT_FIELDS = ["id", "title", "category", "price", "tags"];

export const PRODUCTS: readonly Product[] = [
  {
    id: "p1",
    title: "Running shoe",
    category: "footwear",
    price: 90,
    tags: ["sale", "sport"],
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
    tags: ["formal", "sale"],
  },
  {
    id: "p5",
    title: "Shoe rack",
    category: "storage",
    price: 45,
    tags: ["sale"],
  },
  {
    id: "p6",
    title: "Wool sock",
    category: "hosiery",
    price: 12,
    tags: ["sport"],
  },
];

/**
 * A real MiniSearch instance over the corpus. `storeFields` is the interesting
 * knob: it decides how much of the document a result carries back, which is the
 * whole reason the adapter takes a document resolver.
 *
 * @example
 * ```ts
 * const partial = createProductIndex({ storeFields: ["title"] });
 * ```
 */
export const createProductIndex = (
  options: { storeFields?: readonly string[] } = {},
): MiniSearch<Product> => {
  const storeFields = options.storeFields ?? PRODUCT_FIELDS;
  const index = new MiniSearch<Product>({
    fields: ["title", "category", "tags"],
    storeFields: [...storeFields],
  });
  index.addAll([...PRODUCTS]);
  return index;
};

/**
 * The document resolver an application writes when its `storeFields` is a
 * subset of the schema: the id goes back to wherever the documents already
 * live, and the whole document comes out.
 */
export const resolveProduct = (id: unknown): Product => {
  const product = PRODUCTS.find((candidate) => candidate.id === id);
  if (typeof product === "undefined") {
    throw new Error(`No product for id ${String(id)}`);
  }
  return product;
};
