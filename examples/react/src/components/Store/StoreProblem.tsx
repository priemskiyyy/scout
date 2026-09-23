import { ArrowClockwise, Power } from "@phosphor-icons/react";
import type React from "react";

import type { SearchProblemAction } from "examples/shared/outpost/types/SearchProblemAction";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { getSearchProblem } from "examples/shared/outpost/utils/getSearchProblem";
import { PROBLEM_TONES } from "examples/shared/ui/constants/tones";
import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
import { SearchProblem } from "src/components/Store/SearchProblem";
import { PROBLEM_ICONS } from "src/utils/constants/icons";

type StoreProblemProps = {
  error: Error;
  engineName: string;
  state: StoreState;
  onFacetsToggle: () => void;
  onHighlightsToggle: () => void;
  onRetryPress: () => void;
  onSkipInvalidPress: () => void;
  onRestartPress: () => void;
};

type ProblemActionsProps = Omit<StoreProblemProps, "error" | "engineName"> & {
  action: SearchProblemAction;
};

// The way on each problem offers, as buttons.
const ProblemActions: React.FunctionComponent<ProblemActionsProps> = ({
  action,
  state,
  onFacetsToggle,
  onHighlightsToggle,
  onRetryPress,
  onSkipInvalidPress,
  onRestartPress,
}) => {
  if (action === "narrow") {
    return (
      <>
        {state.facets ? (
          <button
            type="button"
            onClick={onFacetsToggle}
            className={buttonStyles()}
          >
            Search without facet counts
          </button>
        ) : null}
        {state.highlights ? (
          <button
            type="button"
            onClick={onHighlightsToggle}
            className={buttonStyles()}
          >
            Search without highlights
          </button>
        ) : null}
      </>
    );
  }

  if (action === "skip-invalid") {
    return (
      <button
        type="button"
        onClick={onSkipInvalidPress}
        className={buttonStyles()}
      >
        Skip invalid documents
      </button>
    );
  }

  if (action === "restart") {
    return (
      <button type="button" onClick={onRestartPress} className={buttonStyles()}>
        <Power aria-hidden="true" size={16} weight="bold" />
        Restart Scout
      </button>
    );
  }

  return (
    <button type="button" onClick={onRetryPress} className={buttonStyles()}>
      <ArrowClockwise aria-hidden="true" size={16} weight="bold" />
      Try again
    </button>
  );
};

export const StoreProblem: React.FunctionComponent<StoreProblemProps> = ({
  error,
  engineName,
  ...actions
}) => {
  const problem = getSearchProblem(error, engineName);

  return (
    <SearchProblem
      icon={PROBLEM_ICONS[problem.code]}
      tone={PROBLEM_TONES[problem.code]}
      code={problem.code}
      title={problem.title}
      message={problem.message}
      explanation={problem.explanation}
      actions={<ProblemActions action={problem.action} {...actions} />}
    />
  );
};
