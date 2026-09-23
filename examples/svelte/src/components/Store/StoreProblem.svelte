<script lang="ts">
  import type { StoreState } from "examples/shared/outpost/types/StoreState";
  import { getSearchProblem } from "examples/shared/outpost/utils/getSearchProblem";
  import { ICONS, PROBLEM_ICONS } from "examples/shared/ui/constants/icons";
  import { PROBLEM_TONES } from "examples/shared/ui/constants/tones";
  import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
  import BaseIcon from "src/components/BaseIcon/BaseIcon.svelte";
  import SearchProblem from "src/components/Store/SearchProblem.svelte";

  type Props = {
    error: Error;
    engineName: string;
    storeState: StoreState;
    onFacetsToggle: () => void;
    onHighlightsToggle: () => void;
    onRetryPress: () => void;
    onSkipInvalidPress: () => void;
    onRestartPress: () => void;
  };

  let {
    error,
    engineName,
    storeState,
    onFacetsToggle,
    onHighlightsToggle,
    onRetryPress,
    onSkipInvalidPress,
    onRestartPress,
  }: Props = $props();

  const problem = $derived(getSearchProblem(error, engineName));

  const getActions = () => {
    if (problem.action === "narrow") {
      return narrow;
    }

    if (problem.action === "skip-invalid") {
      return skipInvalid;
    }

    if (problem.action === "restart") {
      return restart;
    }

    return retry;
  };
</script>

{#snippet retry()}
  <button type="button" onclick={onRetryPress} class={buttonStyles()}>
    <BaseIcon src={ICONS.arrowClockwise} size="regular" />
    Try again
  </button>
{/snippet}

{#snippet narrow()}
  {#if storeState.facets}
    <button type="button" onclick={onFacetsToggle} class={buttonStyles()}>
      Search without facet counts
    </button>
  {/if}
  {#if storeState.highlights}
    <button type="button" onclick={onHighlightsToggle} class={buttonStyles()}>
      Search without highlights
    </button>
  {/if}
{/snippet}

{#snippet skipInvalid()}
  <button type="button" onclick={onSkipInvalidPress} class={buttonStyles()}>
    Skip invalid documents
  </button>
{/snippet}

{#snippet restart()}
  <button type="button" onclick={onRestartPress} class={buttonStyles()}>
    <BaseIcon src={ICONS.power} size="regular" />
    Restart Scout
  </button>
{/snippet}

<SearchProblem
  icon={PROBLEM_ICONS[problem.code]}
  tone={PROBLEM_TONES[problem.code]}
  code={problem.code}
  title={problem.title}
  message={problem.message}
  explanation={problem.explanation}
  actions={getActions()}
/>
