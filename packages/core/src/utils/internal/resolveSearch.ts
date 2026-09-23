import type { AdapterSearchRequest } from "src/types/AdapterSearchRequest";
import type { FilterExpression } from "src/types/FilterExpression";
import { assertUnreachable } from "src/utils/internal/assertUnreachable";
import { canonicalize } from "src/utils/internal/canonicalize";
import { getOwnValue } from "src/utils/internal/getOwnValue";
import type { IndexRuntime } from "src/utils/internal/IndexRuntime";
import { normalizeFilter } from "src/utils/internal/normalizeFilter";
import type { SearchState } from "src/utils/internal/SearchState";
import { ScoutError } from "src/utils/ScoutError";

const getDeclared = <TValue>(
  index: string,
  kind: string,
  declared: Readonly<Record<string, TValue>>,
  name: string,
): TValue => {
  const value = getOwnValue(declared, name);

  if (value === undefined) {
    throw new ScoutError({
      code: "configuration",
      message: `The index ${index} has no ${kind} named ${JSON.stringify(name)}. It declares ${Object.keys(declared).join(", ")}.`,
    });
  }

  return value;
};

const assertFieldsAreDeclared = (
  index: string,
  kind: string,
  declared: readonly string[],
  requested: readonly string[],
) => {
  for (const field of requested) {
    if (declared.includes(field)) {
      continue;
    }

    throw new ScoutError({
      code: "configuration",
      message: `The index ${index} does not declare ${field} as ${kind}.`,
    });
  }
};

// The typed builder offers only declared fields, but an expression built by
// hand can name any, and an engine would quietly filter on it.
const assertFilterFieldsAreDeclared = (
  index: string,
  declared: readonly string[],
  expression: FilterExpression,
) => {
  if (expression.type === "comparison") {
    assertFieldsAreDeclared(index, "filterable", declared, [expression.field]);

    return;
  }

  if (expression.type === "not") {
    assertFilterFieldsAreDeclared(index, declared, expression.expression);

    return;
  }

  if (expression.type === "and" || expression.type === "or") {
    for (const member of expression.expressions) {
      assertFilterFieldsAreDeclared(index, declared, member);
    }

    return;
  }

  assertUnreachable(expression);
};

// A provider option the adapter writes itself would be overwritten, or, on a
// search that leaves it unset, silently change what the search means.
const assertProviderOptionsAreNotReserved = (
  reserved: readonly string[],
  provider: unknown,
) => {
  if (typeof provider !== "object" || provider === null) {
    return;
  }

  for (const key of reserved) {
    if (Object.hasOwn(provider, key)) {
      throw new ScoutError({
        code: "configuration",
        message: `provider.${key} is written by Scout from the search itself.`,
      });
    }
  }
};

// A constant filter never reaches an adapter: true filters nothing out, and
// false is answered by the core.
const getAdapterFilter = (
  filter: FilterExpression | boolean,
): FilterExpression | null => {
  if (typeof filter === "boolean") {
    return null;
  }

  return filter;
};

/**
 * Resolves a builder's state against its index: the sort and profile names
 * become their definitions, the filter is normalised, and provider options
 * are checked for a canonical form. `filter` keeps the constant for identity
 * and for the core's own answer to a contradiction.
 */
export const resolveSearch = (
  runtime: IndexRuntime,
  state: SearchState,
): {
  request: AdapterSearchRequest<unknown>;
  filter: FilterExpression | boolean;
} => {
  const { name, declaration } = runtime;

  if (typeof state.query !== "string") {
    throw new ScoutError({
      code: "configuration",
      message: `The query for ${name} must be a string. Pass "" to browse.`,
    });
  }

  const sort = getDeclared(name, "sort", declaration.sorts, state.sort);

  const searchable = getDeclared(
    name,
    "profile",
    declaration.profiles,
    state.profile,
  );

  assertFieldsAreDeclared(
    name,
    "facetable",
    Object.keys(declaration.facetable),
    state.facets,
  );

  assertFieldsAreDeclared(
    name,
    "highlightable",
    declaration.highlightable,
    state.highlights,
  );

  for (const expression of state.filters) {
    assertFilterFieldsAreDeclared(name, declaration.filterable, expression);
  }

  // Refuses provider options that could not take part in query identity.
  canonicalize(state.provider, "provider");
  assertProviderOptionsAreNotReserved(
    runtime.adapter.reservedOptions ?? [],
    state.provider,
  );

  const filter = normalizeFilter({ type: "and", expressions: state.filters });

  return {
    filter,
    request: Object.freeze({
      index: name,
      query: state.query,
      searchable,
      profile: state.profile,
      sort,
      filter: getAdapterFilter(filter),
      facets: state.facets,
      highlights: state.highlights,
      page: state.page,
      provider: state.provider,
    }),
  };
};
