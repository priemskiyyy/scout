const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null;

/**
 * The kind an Orama schema declares for a property path, or `null` when it
 * declares none. Nested schemas are addressed with dots, as Orama does.
 *
 * @example
 * ```ts
 * getDeclaredKind({ brand: "enum", meta: { rating: "number" } }, "meta.rating"); // "number"
 * ```
 */
export const getDeclaredKind = (
  schema: Readonly<Record<string, unknown>>,
  field: string,
): string | null => {
  let current: unknown = schema;

  for (const segment of field.split(".")) {
    if (!isRecord(current)) {
      return null;
    }

    current = current[segment];
  }

  if (typeof current !== "string") {
    return null;
  }

  return current;
};
