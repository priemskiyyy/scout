import { queryOptions } from "@priemskiyyy/scout-tanstack-query";
import { useQuery } from "@tanstack/react-query";
import type React from "react";

import { Badge } from "src/components/Badge/Badge";
import { EngineOutcomeView } from "src/components/Engines/EngineOutcomeView";
import { IconTile } from "src/components/IconTile/IconTile";
import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
import { chipStyles } from "examples/shared/ui/styles/chipStyles";
import type { EngineId } from "examples/shared/outpost/types/EngineId";
import type { StoreQuery } from "src/types/StoreQuery";
import type { StoreSearch } from "examples/shared/outpost/types/StoreSearch";
import { ENGINE_GUIDES } from "examples/shared/outpost/constants/engines";
import { ENGINE_ICONS } from "src/utils/constants/icons";
import { getEngineOutcome } from "examples/shared/outpost/utils/getEngineOutcome";

type EngineCardProps = {
  engine: EngineId;
  search: StoreSearch;
  selected: boolean;
  storeQuery: StoreQuery;
  onSelect: () => void;
};

export const EngineCard: React.FunctionComponent<EngineCardProps> = ({
  engine,
  search,
  selected,
  storeQuery,
  onSelect,
}) => {
  const guide = ENGINE_GUIDES[engine];

  // The store already runs this search on its own engine, so that card reads
  // the store's first page rather than asking a second time.
  const own = useQuery({ ...queryOptions(search), enabled: !selected });

  const readOutcome = () => {
    if (selected) {
      return getEngineOutcome(storeQuery.data?.pages[0], storeQuery.error);
    }

    return getEngineOutcome(own.data, own.error);
  };

  return (
    <li
      aria-label={guide.name}
      className={chipStyles({ selected, className: "flex-col items-stretch" })}
    >
      <div className="flex items-start gap-3">
        <IconTile icon={ENGINE_ICONS[engine]} size="regular" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold">{guide.name}</h4>
            {selected ? <Badge tone="accent">In the store</Badge> : null}
          </div>
          <p className="truncate font-mono text-xs text-stone-500">
            {guide.packageName}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        <dt className="text-stone-500">Runs</dt>
        <dd>{guide.runs}</dd>
        <dt className="text-stone-500">Refuses</dt>
        <dd>{guide.refuses}</dd>
        <dt className="text-stone-500">Aborts</dt>
        <dd>{guide.cancels}</dd>
      </dl>
      <div className="min-h-24 rounded-lg bg-stone-100/70 p-3 dark:bg-stone-800/40">
        <EngineOutcomeView outcome={readOutcome()} />
      </div>
      <button
        type="button"
        disabled={selected}
        onClick={onSelect}
        className={buttonStyles({ size: "small" })}
      >
        Search the store with {guide.name}
      </button>
    </li>
  );
};
