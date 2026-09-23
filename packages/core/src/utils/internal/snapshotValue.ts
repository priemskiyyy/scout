/** Copies caller-owned search data without freezing the caller's objects. */
export const snapshotValue = (
  value: unknown,
  copies?: Map<object, unknown>,
): unknown => {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  const snapshots = copies ?? new Map<object, unknown>();

  if (snapshots.has(value)) {
    return snapshots.get(value);
  }

  if (Array.isArray(value)) {
    const copy: unknown[] = [];

    snapshots.set(value, copy);

    for (const entry of value) {
      copy.push(snapshotValue(entry, snapshots));
    }

    return Object.freeze(copy);
  }

  const prototype = Object.getPrototypeOf(value);

  if (prototype !== Object.prototype && prototype !== null) {
    // Defer unsupported-value errors to key() and execute().
    return value;
  }

  const copy: Record<string, unknown> = {};

  snapshots.set(value, copy);

  for (const [key, entry] of Object.entries(value)) {
    // Defining an own property also preserves a field named __proto__.
    Object.defineProperty(copy, key, {
      value: snapshotValue(entry, snapshots),
      enumerable: true,
    });
  }

  return Object.freeze(copy);
};
