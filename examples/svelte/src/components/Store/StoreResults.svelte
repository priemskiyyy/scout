<script lang="ts">
  import { flattenHits } from "@priemskiyyy/scout-tanstack-query";
  import type { SearchStatus } from "examples/shared/outpost/types/SearchStatus";
  import type { StoreState } from "examples/shared/outpost/types/StoreState";
  import { ICONS } from "examples/shared/ui/constants/icons";
  import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
  import EmptyState from "src/components/EmptyState/EmptyState.svelte";
  import LoadMore from "src/components/Store/LoadMore.svelte";
  import ResultCard from "src/components/Store/ResultCard.svelte";
  import ResultSkeleton from "src/components/Store/ResultSkeleton.svelte";
  import StoreProblem from "src/components/Store/StoreProblem.svelte";
  import type { StoreQuery } from "src/types/StoreQuery";

  type Props = {
    status: SearchStatus;
    query: StoreQuery;
    storeState: StoreState;
    engineName: string;
    onFacetsToggle: () => void;
    onHighlightsToggle: () => void;
    onEmptySetToggle: () => void;
    onClearPress: () => void;
    onSkipInvalidPress: () => void;
    onRestartPress: () => void;
  };

  let {
    status,
    query,
    storeState,
    engineName,
    onFacetsToggle,
    onHighlightsToggle,
    onEmptySetToggle,
    onClearPress,
    onSkipInvalidPress,
    onRestartPress,
  }: Props = $props();

  const latest = $derived(query.data?.pages.at(-1));
  const hits = $derived(flattenHits(query.data));

  const handleRetryPress = () => {
    query.refetch().catch(() => {});
  };

  const handleLoadMorePress = () => {
    query.fetchNextPage().catch(() => {});
  };
</script>

{#snippet removeEmptySet()}
  <button
    type="button"
    onclick={onEmptySetToggle}
    class={buttonStyles({ size: "small" })}
  >
    Remove the empty set
  </button>
{/snippet}

{#snippet clearFilters()}
  <button
    type="button"
    onclick={onClearPress}
    class={buttonStyles({ size: "small" })}
  >
    Clear filters
  </button>
{/snippet}

{#if query.error !== null}
  <StoreProblem
    error={query.error}
    {engineName}
    {storeState}
    {onFacetsToggle}
    {onHighlightsToggle}
    onRetryPress={handleRetryPress}
    {onSkipInvalidPress}
    {onRestartPress}
  />
{:else if latest === undefined}
  <ResultSkeleton />
{:else if status === "answered-by-scout"}
  <!-- The engine never saw this search: the filter said it matches nothing. -->
  <EmptyState
    icon={ICONS.prohibit}
    title="Nothing can match"
    description="A set with nothing in it matches nothing, so Scout answered on its own, with an exact total of zero, and never asked the engine."
    action={removeEmptySet}
  />
{:else if hits.length === 0}
  <EmptyState
    icon={ICONS.funnel}
    title="Nothing matches"
    description="No product matches this search and these filters. The total below says how sure the engine is of that."
    action={clearFilters}
  />
{:else}
  <div class="flex flex-col gap-4">
    <ol
      aria-label="Results"
      aria-busy={query.isPlaceholderData}
      class={[
        "flex flex-col gap-2.5 transition-opacity",
        { "opacity-60": query.isPlaceholderData },
      ]}
    >
      {#each hits as hit (hit.id)}
        <ResultCard {hit} />
      {/each}
    </ol>
    <LoadMore
      shown={hits.length}
      {latest}
      loading={query.isFetchingNextPage}
      onPress={handleLoadMorePress}
    />
  </div>
{/if}
