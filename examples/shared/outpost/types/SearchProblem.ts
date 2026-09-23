import type { SearchProblemAction } from "examples/shared/outpost/types/SearchProblemAction";
import type { SearchProblemCode } from "examples/shared/outpost/types/SearchProblemCode";

/** What the store says about a search that failed, in the same words on every framework. */
export type SearchProblem = {
  code: SearchProblemCode;
  title: string;
  message: string;
  explanation: string;
  action: SearchProblemAction;
};
