import { ArrowsClockwise, Database, Trash } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import type React from "react";

import { EmptyState } from "src/components/EmptyState/EmptyState";
import { CacheRow } from "src/components/Identity/CacheRow";
import { Panel } from "src/components/Panel/Panel";
import { useQueryCacheEntries } from "src/hooks/useQueryCacheEntries";
import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";

export const CachePanel: React.FunctionComponent = () => {
  const queryClient = useQueryClient();
  const entries = useQueryCacheEntries();

  const handleInvalidatePress = () => {
    queryClient.invalidateQueries().catch(() => {});
  };

  return (
    <Panel
      title="TanStack Query's cache"
      icon={Database}
      shows="Every search the page has run, under the key Scout gave it. Go back to an earlier search and it answers from here at once, while the store refreshes it in the background once it is stale."
      aside={
        <>
          <button
            type="button"
            disabled={entries.length === 0}
            onClick={handleInvalidatePress}
            className={buttonStyles({ size: "small" })}
          >
            <ArrowsClockwise aria-hidden="true" size={14} weight="bold" />
            Invalidate
          </button>
          <button
            type="button"
            disabled={entries.length === 0}
            onClick={() => queryClient.clear()}
            className={buttonStyles({ size: "small" })}
          >
            <Trash aria-hidden="true" size={14} weight="bold" />
            Clear
          </button>
        </>
      }
    >
      {entries.length === 0 ? (
        <EmptyState
          icon={Database}
          title="Nothing cached"
          description="Search the store, and each search lands here under its key."
        />
      ) : (
        <ol
          aria-label="Cached searches"
          className="flex max-h-[28rem] flex-col divide-y divide-stone-200/70 overflow-y-auto dark:divide-stone-800"
        >
          {entries.map((query) => (
            <CacheRow key={query.queryHash} query={query} />
          ))}
        </ol>
      )}
    </Panel>
  );
};
