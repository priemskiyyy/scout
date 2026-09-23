import { Funnel, Prohibit } from "@phosphor-icons/react";
import { flattenHits } from "@priemskiyyy/scout-tanstack-query";
import clsx from "clsx";
import type React from "react";

import { EmptyState } from "src/components/EmptyState/EmptyState";
import { LoadMore } from "src/components/Store/LoadMore";
import { ResultCard } from "src/components/Store/ResultCard";
import { ResultSkeleton } from "src/components/Store/ResultSkeleton";
import { StoreProblem } from "src/components/Store/StoreProblem";
import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
import type { SearchStatus } from "examples/shared/outpost/types/SearchStatus";
import type { StoreQuery } from "src/types/StoreQuery";
import type { StoreState } from "examples/shared/outpost/types/StoreState";

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

export const StoreResults: React.FunctionComponent<StoreResultsProps> = ({
  status,
  query,
  state,
  engineName,
  onFacetsToggle,
  onHighlightsToggle,
  onEmptySetToggle,
  onClearPress,
  onSkipInvalidPress,
  onRestartPress,
}) => {
  const handleRetryPress = () => {
    query.refetch().catch(() => {});
  };

  const handleLoadMorePress = () => {
    query.fetchNextPage().catch(() => {});
  };

  if (query.error !== null) {
    return (
      <StoreProblem
        error={query.error}
        engineName={engineName}
        state={state}
        onFacetsToggle={onFacetsToggle}
        onHighlightsToggle={onHighlightsToggle}
        onRetryPress={handleRetryPress}
        onSkipInvalidPress={onSkipInvalidPress}
        onRestartPress={onRestartPress}
      />
    );
  }

  const latest = query.data?.pages.at(-1);

  if (latest === undefined) {
    return <ResultSkeleton />;
  }

  const hits = flattenHits(query.data);

  // The engine never saw this search: the filter said it matches nothing.
  if (status === "answered-by-scout") {
    return (
      <EmptyState
        icon={Prohibit}
        title="Nothing can match"
        description="A set with nothing in it matches nothing, so Scout answered on its own, with an exact total of zero, and never asked the engine."
        action={
          <button
            type="button"
            onClick={onEmptySetToggle}
            className={buttonStyles({ size: "small" })}
          >
            Remove the empty set
          </button>
        }
      />
    );
  }

  if (hits.length === 0) {
    return (
      <EmptyState
        icon={Funnel}
        title="Nothing matches"
        description="No product matches this search and these filters. The total below says how sure the engine is of that."
        action={
          <button
            type="button"
            onClick={onClearPress}
            className={buttonStyles({ size: "small" })}
          >
            Clear filters
          </button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ol
        aria-label="Results"
        aria-busy={query.isPlaceholderData}
        className={clsx("flex flex-col gap-2.5 transition-opacity", {
          "opacity-60": query.isPlaceholderData,
        })}
      >
        {hits.map((hit) => (
          <ResultCard key={hit.id} hit={hit} />
        ))}
      </ol>
      <LoadMore
        shown={hits.length}
        latest={latest}
        loading={query.isFetchingNextPage}
        onPress={handleLoadMorePress}
      />
    </div>
  );
};
