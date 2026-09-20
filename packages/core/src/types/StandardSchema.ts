// Inlined rather than depended on, even as types: core ships zero dependencies.
type StandardSchemaResult<TValue> =
  | { value: TValue; issues?: undefined }
  | { issues: ReadonlyArray<{ message: string }> };

/**
 * The part of the Standard Schema v1 contract an index reads: a validator that
 * answers with the value or with issues. Zod, Valibot and ArkType all
 * implement it.
 *
 * Scout reads the document type from it at compile time to infer filter
 * operators and facet value types. It never introspects a schema at runtime,
 * and it only accepts a synchronous answer.
 *
 * @example
 * ```ts
 * const products = index({ schema: z.object({ id: z.string() }), ... });
 * ```
 */
export type StandardSchema<TValue> = {
  "~standard": {
    version: 1;
    vendor: string;
    validate: (
      value: unknown,
    ) => StandardSchemaResult<TValue> | Promise<StandardSchemaResult<TValue>>;
  };
};
