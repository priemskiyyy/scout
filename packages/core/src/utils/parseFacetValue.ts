import { SearchProviderError } from "src/errors/SearchProviderError";
import type { FacetValueType } from "src/types/FacetValueType";
import { assertUnreachable } from "src/utils/assertUnreachable";

/**
 * Decodes a provider's string facet label into its declared primitive type.
 * Invalid numeric and boolean labels reject instead of leaking another type.
 *
 * @example
 * ```ts
 * parseFacetValue({ adapter: "engine", field: "price", type: "number", value: "79" });
 * ```
 */
export const parseFacetValue = ({
  value,
  type,
  adapter,
  field,
}: {
  value: string;
  type: FacetValueType;
  adapter: string;
  field: string;
}): string | number | boolean => {
  if (type === "string") {
    return value;
  }
  if (type === "number") {
    const number = Number(value);
    if (value.trim() !== "" && Number.isFinite(number)) {
      return number;
    }
    throw new SearchProviderError({
      adapter,
      message: `The facet ${field} contained an invalid numeric value.`,
      cause: { field, value },
    });
  }
  if (type === "boolean") {
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
    throw new SearchProviderError({
      adapter,
      message: `The facet ${field} contained an invalid boolean value.`,
      cause: { field, value },
    });
  }
  return assertUnreachable(type);
};
