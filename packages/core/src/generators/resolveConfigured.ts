import { SearchConfigurationError } from "src/errors/SearchConfigurationError";

/**
 * Resolves a named sort or profile, throwing `SearchConfigurationError` when
 * it is missing. Use null for a configured name that needs no options;
 * undefined counts as missing.
 *
 * @example
 * ```ts
 * const profile = resolveConfigured(options.profiles, request.profile, {
 *   adapter: "typesense",
 *   kind: "profiles",
 * });
 * ```
 */
export const resolveConfigured = <TValue>(
  configured: Readonly<Record<string, TValue>>,
  name: string,
  context: { adapter: string; kind: "sorts" | "profiles" },
): TValue => {
  const value = Object.hasOwn(configured, name) ? configured[name] : undefined;
  if (typeof value === "undefined") {
    const declared = Object.keys(configured);
    throw new SearchConfigurationError({
      path: `${context.kind}.${name}`,
      message:
        `The ${context.adapter} adapter has no ${name} entry in its ` +
        `${context.kind}. It was configured with ` +
        `${declared.length === 0 ? "nothing" : declared.join(", ")}.`,
    });
  }
  return value;
};
