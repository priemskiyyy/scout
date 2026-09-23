import { z } from "zod";

export const BrandSchema = z.enum([
  "Fjord & Co",
  "Halden",
  "Kestrel",
  "Nimbus",
  "Tern",
  "Vester",
]);

export const CategorySchema = z.enum([
  "tents",
  "sleeping",
  "packs",
  "footwear",
  "jackets",
  "cooking",
  "lighting",
]);

/**
 * The document every engine hands back. Scout validates each hit against it,
 * and the index reads the document type straight off it, so nothing here is
 * written twice.
 */
export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  brand: BrandSchema,
  category: CategorySchema,
  price: z.number(),
  rating: z.number(),
  inStock: z.boolean(),
  tags: z.array(z.string()),
});
