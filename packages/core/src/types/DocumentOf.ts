import type { StandardSchema } from "src/types/StandardSchema";

/**
 * The document type a schema produces after validation.
 *
 * @example
 * ```ts
 * type Product = DocumentOf<typeof ProductSchema>;
 * ```
 *
 * @see {@linkcode StandardSchema}
 */
export type DocumentOf<TSchema> =
  TSchema extends StandardSchema<infer TValue> ? TValue : never;
