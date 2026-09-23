import { ScoutError } from "src/utils/ScoutError";

const isPlainObject = (value: object): value is Record<string, unknown> => {
  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
};

const getCanonicalError = (path: string, what: string) =>
  new ScoutError({
    code: "configuration",
    message:
      `${path} is ${what}, which has no canonical form, so it cannot take part ` +
      `in the query identity, and two searches that differ only there would ` +
      `share a cache entry. Replace it with plain data.`,
  });

/**
 * Turns a value into the one string that stands for it in a query identity.
 *
 * Sorts object keys and treats `-0` as `0`. Rejects unsupported values so
 * different provider options cannot silently share a cache entry.
 *
 * @example
 * ```ts
 * canonicalize({ b: 1, a: 2 }, "provider"); // '{"a":2,"b":1}'
 * ```
 */
export const canonicalize = (
  value: unknown,
  path: string,
  ancestors?: Set<object>,
): string => {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (Number.isNaN(value)) {
      throw getCanonicalError(path, "NaN");
    }

    if (!Number.isFinite(value)) {
      throw getCanonicalError(path, "an infinite number");
    }

    return String(value);
  }

  if (typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "bigint") {
    return `${value.toString()}n`;
  }

  if (typeof value === "function") {
    throw getCanonicalError(path, "a function");
  }

  if (typeof value === "symbol") {
    throw getCanonicalError(path, "a symbol");
  }

  if (typeof value === "undefined") {
    throw getCanonicalError(path, "undefined");
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw getCanonicalError(path, "an invalid Date");
    }

    return JSON.stringify(value.toISOString());
  }

  const parents = ancestors ?? new Set<object>();

  if (parents.has(value)) {
    throw getCanonicalError(path, "a circular reference");
  }

  if (!Array.isArray(value) && !isPlainObject(value)) {
    // Custom prototypes may have no constructor to name.
    const named = value.constructor?.name ?? "an unnamed type";

    throw getCanonicalError(path, `an instance of ${named}`);
  }

  parents.add(value);

  try {
    if (Array.isArray(value)) {
      // Array.from visits holes too, so a sparse array cannot impersonate [].
      const parts = Array.from(value, (entry, position) =>
        canonicalize(entry, `${path}[${position}]`, parents),
      );

      return `[${parts.join(",")}]`;
    }

    const parts: string[] = [];

    for (const key of Object.keys(value).sort()) {
      const member = value[key];

      // Undefined object members do not change identity; array holes do.
      if (typeof member === "undefined") {
        continue;
      }

      parts.push(
        `${JSON.stringify(key)}:${canonicalize(member, `${path}.${key}`, parents)}`,
      );
    }

    return `{${parts.join(",")}}`;
  } finally {
    // Shared subtrees are valid. Only a reference to an ancestor is a cycle.
    parents.delete(value);
  }
};
