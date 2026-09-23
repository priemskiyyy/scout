import { flattenHits } from "@priemskiyyy/scout-tanstack-query";
import { For, Show } from "solid-js";
import type { Component } from "solid-js";

import type { SearchStatus } from "examples/shared/outpost/types/SearchStatus";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { ICONS } from "examples/shared/ui/constants/icons";
import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
import { EmptyState } from "src/components/EmptyState/EmptyState";
import { LoadMore } from "src/components/Store/LoadMore";
import { ResultCard } from "src/components/Store/ResultCard";
import { ResultSkeleton } from "src/components/Store/ResultSkeleton";
import { StoreProblem } from "src/components/Store/StoreProblem";
import type { StoreQuery } from "src/types/StoreQuery";

type StoreResultsProps = {
  status: SearchStatus;
  query: StoreQuery;
  state: StoreState;
  engineName: string;
  onFacetsToggle: () => void;
  onHighlightsToggle: () => void;
  onEmptySetToggle: () => void;
  onClearPress: () => void;
  onSkipInvalidPress: () => void;
  onRestartPress: () => void;
};

export const StoreResults: Component<StoreResultsProps> = (props) => {
  const latest = () => props.query.data?.pages.at(-1);
  const hits = () => flattenHits(props.query.data);

  const handleRetryPress = () => {
    props.query.refetch().catch(() => {});
  };

  const handleLoadMorePress = () => {
    props.query.fetchNextPage().catch(() => {});
  };

  const answered = (
    <Show when={latest()} fallback={<ResultSkeleton />}>
      {(page) => (
        // The engine never saw this search: the filter said it matches nothing.
        <Show
          when={props.status !== "answered-by-scout"}
          fallback={
            <EmptyState
              icon={ICONS.prohibit}
              title="Nothing can match"
              description="A set with nothing in it matches nothing, so Scout answered on its own, with an exact total of zero, and never asked the engine."
              action={
                <button
                  type="button"
                  onClick={() => props.onEmptySetToggle()}
                  class={buttonStyles({ size: "small" })}
                >
                  Remove the empty set
                </button>
              }
            />
          }
        >
          <Show
            when={hits().length > 0}
            fallback={
              <EmptyState
                icon={ICONS.funnel}
                title="Nothing matches"
                description="No product matches this search and these filters. The total below says how sure the engine is of that."
                action={
                  <button
                    type="button"
                    onClick={() => props.onClearPress()}
                    class={buttonStyles({ size: "small" })}
                  >
                    Clear filters
                  </button>
                }
              />
            }
          >
            <div class="flex flex-col gap-4">
              <ol
                aria-label="Results"
                aria-busy={props.query.isPlaceholderData}
                class="flex flex-col gap-2.5 transition-opacity"
                classList={{ "opacity-60": props.query.isPlaceholderData }}
              >
                <For each={hits()}>{(hit) => <ResultCard hit={hit} />}</For>
              </ol>
              <LoadMore
                shown={hits().length}
                latest={page()}
                loading={props.query.isFetchingNextPage}
                onPress={handleLoadMorePress}
              />
            </div>
          </Show>
        </Show>
      )}
    </Show>
  );

  return (
    <Show when={props.query.error} fallback={answered}>
      {(error) => (
        <StoreProblem
          error={error()}
          engineName={props.engineName}
          state={props.state}
          onFacetsToggle={props.onFacetsToggle}
          onHighlightsToggle={props.onHighlightsToggle}
          onRetryPress={handleRetryPress}
          onSkipInvalidPress={props.onSkipInvalidPress}
          onRestartPress={props.onRestartPress}
        />
      )}
    </Show>
  );
};
