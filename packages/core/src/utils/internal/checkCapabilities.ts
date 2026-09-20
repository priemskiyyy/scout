import { UnsupportedSearchFeatureError } from "src/errors/UnsupportedSearchFeatureError";
import type { AdapterSearchRequest } from "src/types/AdapterSearchRequest";
import type { AnySearchAdapter } from "src/types/AnySearchAdapter";
import type { FilterExpression } from "src/types/FilterExpression";
import type { FilterOperator } from "src/types/FilterOperator";
import type { SearchCapabilities } from "src/types/SearchCapabilities";
import { assertUnreachable } from "src/utils/assertUnreachable";

const FILTER_CAPABILITY = {
  eq: "eq",
  neq: "neq",
  in: "in",
  "not-in": "notIn",
  gt: "comparison",
  gte: "comparison",
  lt: "comparison",
  lte: "comparison",
  between: "between",
} satisfies Record<FilterOperator, keyof SearchCapabilities["filters"]>;

/** Refuses unsupported portable behavior before dispatch. */
export const checkCapabilities = ({
  adapter,
  request,
}: {
  adapter: Pick<AnySearchAdapter, "name" | "capabilities">;
  request: AdapterSearchRequest<unknown>;
}): void => {
  const refuse = (feature: string, message: string): never => {
    throw new UnsupportedSearchFeatureError({
      adapter: adapter.name,
      feature,
      message,
    });
  };

  let composed = false;
  const checkFilter = (filter: FilterExpression): void => {
    if (filter.type === "constant") {
      return;
    }
    if (filter.type === "comparison") {
      if (!adapter.capabilities.filters[FILTER_CAPABILITY[filter.operator]]) {
        refuse(
          `filters.${FILTER_CAPABILITY[filter.operator]}`,
          `The ${adapter.name} adapter cannot translate the ${filter.operator} filter.`,
        );
      }
      return;
    }
    composed = true;
    if (filter.type === "not") {
      checkFilter(filter.expression);
      return;
    }
    if (filter.type === "and" || filter.type === "or") {
      filter.expressions.forEach(checkFilter);
      return;
    }
    assertUnreachable(filter);
  };
  checkFilter(request.filter);
  if (composed && !adapter.capabilities.filters.booleanComposition) {
    refuse(
      "filters.booleanComposition",
      `The ${adapter.name} adapter cannot combine filters with and, or and not.`,
    );
  }
  if (request.facets.length > 0 && !adapter.capabilities.facets.resultScoped) {
    refuse(
      "facets.resultScoped",
      `The ${adapter.name} adapter does not report facets.`,
    );
  }
  if (
    request.highlights.length > 0 &&
    adapter.capabilities.highlights === "none"
  ) {
    refuse(
      "highlights",
      `The ${adapter.name} adapter does not report highlights.`,
    );
  }
  const maximum = adapter.capabilities.pagination.maxPageSize;
  if (maximum !== null && request.page.size > maximum) {
    refuse(
      "pagination.maxPageSize",
      `The ${adapter.name} adapter accepts at most ${maximum} results per ` +
        `page, and ${request.page.size} were requested.`,
    );
  }
};
