import type { StandardSchema } from "src/types/StandardSchema";

export type Product = {
  id: string;
  name: string;
  brand: string;
  price: number;
  inStock: boolean;
  tags: readonly string[];
};

const isProduct = (value: unknown): value is Product => {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const record: Record<string, unknown> = { ...value };

  return (
    typeof record["id"] === "string" &&
    typeof record["name"] === "string" &&
    typeof record["brand"] === "string" &&
    typeof record["price"] === "number" &&
    typeof record["inStock"] === "boolean" &&
    Array.isArray(record["tags"])
  );
};

/**
 * A hand written Standard Schema, so the core's tests depend on no validator.
 * A real application passes Zod, Valibot or ArkType here instead.
 */
export const ProductSchema: StandardSchema<Product> = {
  "~standard": {
    version: 1,
    vendor: "scout-test",
    validate: (value) =>
      isProduct(value)
        ? { value }
        : { issues: [{ message: "Not a product." }] },
  },
};

export const product = (overrides: Partial<Product> = {}): Product => ({
  id: "p1",
  name: "Running shoe",
  brand: "Nike",
  price: 120,
  inStock: true,
  tags: ["sale"],
  ...overrides,
});
