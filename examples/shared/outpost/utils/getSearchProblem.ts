import { ScoutError } from "@priemskiyyy/scout";

import { formatError } from "examples/shared/outpost/formatting/formatError";
import type { SearchProblem } from "examples/shared/outpost/types/SearchProblem";

const getCause = (error: Error) => {
  if (error.cause === undefined) {
    return error.message;
  }

  return `${error.message} Cause: ${formatError(error.cause)}`;
};

/**
 * The store's words for a failed search, by the code Scout gave it, and the
 * way on it offers. Every example draws it with its own icons and buttons.
 *
 * @example
 * ```ts
 * getSearchProblem(error, "MiniSearch").title; // "MiniSearch refused this search"
 * ```
 */
export const getSearchProblem = (
  error: Error,
  engineName: string,
): SearchProblem => {
  if (!(error instanceof ScoutError)) {
    return {
      code: "unexpected",
      title: "The search failed",
      message: formatError(error),
      explanation:
        "Scout wraps everything an engine throws, so this should not happen. The console has the details.",
      action: "retry",
    };
  }

  if (error.code === "unsupported-feature") {
    return {
      code: error.code,
      title: `${engineName} refused this search`,
      message: error.message,
      explanation:
        "An engine that cannot do part of a search refuses it before anything is sent, rather than quietly answering a narrower one. Your application decides what to do instead.",
      action: "narrow",
    };
  }

  if (error.code === "provider") {
    return {
      code: error.code,
      title: `${engineName} failed`,
      message: getCause(error),
      explanation:
        "The engine or its client threw, and Scout kept the original as the cause. TanStack Query retried once, as this page configured it to.",
      action: "retry",
    };
  }

  if (error.code === "validation") {
    return {
      code: error.code,
      title: "A document failed the schema",
      message: error.message,
      explanation:
        "Every hit is validated against the index's Zod schema before the page sees it. The index can drop an invalid document and count it instead.",
      action: "skip-invalid",
    };
  }

  if (error.code === "aborted") {
    return {
      code: error.code,
      title: "You stopped this search",
      message: error.message,
      explanation:
        "The signal reached Scout, which settled the search at once, and reached your API through its client, which stopped working on it.",
      action: "retry",
    };
  }

  if (error.code === "disposed") {
    return {
      code: error.code,
      title: "This Scout is disposed",
      message: error.message,
      explanation:
        "A disposed Scout settles everything in flight and refuses every new search. Build a new one to search again.",
      action: "restart",
    };
  }

  return {
    code: error.code,
    title: "The search cannot run as written",
    message: error.message,
    explanation:
      "Scout checks a search before any engine sees it, and refuses one that cannot work.",
    action: "retry",
  };
};
