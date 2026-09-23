import type { FacetValueType } from "src/types/FacetValueType";
import { assertUnreachable } from "src/utils/internal/assertUnreachable";
import { ScoutError } from "src/utils/ScoutError";

// Some engines report every facet value as a string, so a value is read as
// its declared type from either form, and is undefined when it is neither.
const getDecodedValue = (
  type: FacetValueType,
  value: unknown,
): string | number | boolean | undefined => {
  if (type === "string") {
    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    return undefined;
  }

  if (type === "number") {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value !== "string" || value.trim() === "") {
      return undefined;
    }

    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }

    return undefined;
  }

  if (type === "boolean") {
    if (typeof value === "boolean") {
      return value;
    }

    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }

    return undefined;
  }

  return assertUnreachable(type);
};

/**
 * Decodes one facet value to the type its index declared. A value that
 * cannot be read as that type is refused rather than passed on as something
 * the type does not allow.
 */
export const decodeFacetValue = ({
  adapter,
  field,
  type,
  value,
}: {
  adapter: string;
  field: string;
  type: FacetValueType;
  value: unknown;
}): string | number | boolean => {
  const decoded = getDecodedValue(type, value);

  if (decoded === undefined) {
    throw new ScoutError({
      code: "provider",
      message: `The ${adapter} facet ${field} returned ${JSON.stringify(value)}, which is not a value of its declared type.`,
    });
  }

  return decoded;
};
