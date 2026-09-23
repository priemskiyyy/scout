import { Show } from "solid-js";
import type { Component } from "solid-js";

import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { getSearchProblem } from "examples/shared/outpost/utils/getSearchProblem";
import { ICONS, PROBLEM_ICONS } from "examples/shared/ui/constants/icons";
import { PROBLEM_TONES } from "examples/shared/ui/constants/tones";
import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
import { BaseIcon } from "src/components/BaseIcon/BaseIcon";
import { SearchProblem } from "src/components/Store/SearchProblem";

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

export const StoreProblem: Component<StoreProblemProps> = (props) => {
  const problem = () => getSearchProblem(props.error, props.engineName);

  return (
    <SearchProblem
      icon={PROBLEM_ICONS[problem().code]}
      tone={PROBLEM_TONES[problem().code]}
      code={problem().code}
      title={problem().title}
      message={problem().message}
      explanation={problem().explanation}
    >
      <Show when={problem().action === "retry"}>
        <button
          type="button"
          onClick={() => props.onRetryPress()}
          class={buttonStyles()}
        >
          <BaseIcon src={ICONS.arrowClockwise} size="regular" />
          Try again
        </button>
      </Show>
      <Show when={problem().action === "narrow"}>
        <Show when={props.state.facets}>
          <button
            type="button"
            onClick={() => props.onFacetsToggle()}
            class={buttonStyles()}
          >
            Search without facet counts
          </button>
        </Show>
        <Show when={props.state.highlights}>
          <button
            type="button"
            onClick={() => props.onHighlightsToggle()}
            class={buttonStyles()}
          >
            Search without highlights
          </button>
        </Show>
      </Show>
      <Show when={problem().action === "skip-invalid"}>
        <button
          type="button"
          onClick={() => props.onSkipInvalidPress()}
          class={buttonStyles()}
        >
          Skip invalid documents
        </button>
      </Show>
      <Show when={problem().action === "restart"}>
        <button
          type="button"
          onClick={() => props.onRestartPress()}
          class={buttonStyles()}
        >
          <BaseIcon src={ICONS.power} size="regular" />
          Restart Scout
        </button>
      </Show>
    </SearchProblem>
  );
};
