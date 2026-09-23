/** One field of a document the application gave Fuse, read as an own property. */
export const getFieldValue = (document: unknown, field: string): unknown => {
  if (typeof document !== "object" || document === null) {
    return undefined;
  }

  return Object.getOwnPropertyDescriptor(document, field)?.value;
};
