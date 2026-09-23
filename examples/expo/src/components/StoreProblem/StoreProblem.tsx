import type React from "react";

import type { SearchProblemAction } from "examples/shared/outpost/types/SearchProblemAction";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { getSearchProblem } from "examples/shared/outpost/utils/getSearchProblem";
import { PROBLEM_TONES } from "examples/shared/ui/constants/tones";
import { Button } from "src/components/Button/Button";
import { SearchProblem } from "src/components/SearchProblem/SearchProblem";

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
          <Button
            label="Search without facet counts"
            variant="secondary"
            onPress={onFacetsToggle}
          />
        ) : null}
        {state.highlights ? (
          <Button
            label="Search without highlights"
            variant="secondary"
            onPress={onHighlightsToggle}
          />
        ) : null}
      </>
    );
  }

  if (action === "skip-invalid") {
    return (
      <Button
        label="Skip invalid documents"
        variant="secondary"
        onPress={onSkipInvalidPress}
      />
    );
  }

  if (action === "restart") {
    return (
      <Button
        label="Restart Scout"
        variant="secondary"
        onPress={onRestartPress}
      />
    );
  }

  return (
    <Button label="Try again" variant="secondary" onPress={onRetryPress} />
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
      tone={PROBLEM_TONES[problem.code]}
      code={problem.code}
      title={problem.title}
      message={problem.message}
      explanation={problem.explanation}
      actions={<ProblemActions action={problem.action} {...actions} />}
    />
  );
};
