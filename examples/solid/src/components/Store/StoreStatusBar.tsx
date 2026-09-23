import { useIsFetching, useQueryClient } from "@tanstack/solid-query";
import type { Component } from "solid-js";

import { ENGINE_GUIDES } from "examples/shared/outpost/constants/engines";
import { formatCount } from "examples/shared/outpost/formatting/formatCount";
import type { EngineId } from "examples/shared/outpost/types/EngineId";
import { useExternalStore } from "src/primitives/useExternalStore";

type StoreStatusBarProps = { engine: EngineId };

/** The store's session in one line: which engine answers and what is in flight. */
export const StoreStatusBar: Component<StoreStatusBarProps> = (props) => {
  const fetching = useIsFetching();
  const cache = useQueryClient().getQueryCache();
  const cached = useExternalStore(cache.subscribe, () => cache.getAll().length);

  return (
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-stone-200 bg-stone-50/80 px-4 py-2 font-mono text-xs text-stone-500 dark:border-stone-800 dark:bg-stone-950/40">
      <span class="font-semibold text-stone-700 dark:text-stone-300">
        Outpost session
      </span>
      <span>{ENGINE_GUIDES[props.engine].packageName}</span>
      <span>fetching {fetching()}</span>
      <span>{formatCount(cached(), "cached search")}</span>
    </div>
  );
};
