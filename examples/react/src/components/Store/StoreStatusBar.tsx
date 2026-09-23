import { useIsFetching } from "@tanstack/react-query";
import type React from "react";

import { formatCount } from "examples/shared/outpost/formatting/formatCount";
import type { EngineId } from "examples/shared/outpost/types/EngineId";
import { ENGINE_GUIDES } from "examples/shared/outpost/constants/engines";

type StoreStatusBarProps = { engine: EngineId; cached: number };

/** The store's session in one line: which engine answers and what is in flight. */
export const StoreStatusBar: React.FunctionComponent<StoreStatusBarProps> = ({
  engine,
  cached,
}) => {
  const fetching = useIsFetching();

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-stone-200 bg-stone-50/80 px-4 py-2 font-mono text-xs text-stone-500 dark:border-stone-800 dark:bg-stone-950/40">
      <span className="font-semibold text-stone-700 dark:text-stone-300">
        Outpost session
      </span>
      <span>{ENGINE_GUIDES[engine].packageName}</span>
      <span>fetching {fetching}</span>
      <span>{formatCount(cached, "cached search")}</span>
    </div>
  );
};
