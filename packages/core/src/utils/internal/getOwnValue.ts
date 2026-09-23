/** A record's own value for a key, never one inherited from its prototype. */
export const getOwnValue = <TValue>(
  record: Readonly<Record<string, TValue>>,
  key: string,
): TValue | undefined => {
  if (!Object.hasOwn(record, key)) {
    return undefined;
  }

  return record[key];
};
