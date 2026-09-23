import { ArrowsSplit } from "@phosphor-icons/react";
import type React from "react";

import { EngineCard } from "src/components/Engines/EngineCard";
import { Panel } from "src/components/Panel/Panel";
import type { EngineId } from "examples/shared/outpost/types/EngineId";
import type { OutpostRuntime } from "examples/shared/outpost/types/OutpostRuntime";
import type { StoreQuery } from "src/types/StoreQuery";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { buildStoreSearch } from "examples/shared/outpost/utils/buildStoreSearch";
import { ENGINE_IDS } from "examples/shared/outpost/constants/engines";

type EnginesPanelProps = {
  runtime: OutpostRuntime;
  state: StoreState;
  storeQuery: StoreQuery;
  onEngineSelect: (engine: EngineId) => void;
};

export const EnginesPanel: React.FunctionComponent<EnginesPanelProps> = ({
  runtime,
  state,
  storeQuery,
  onEngineSelect,
}) => (
  <Panel
    title="Four engines, one search"
    icon={ArrowsSplit}
    shows="The store's search, built once from the same declaration and run on every engine in the page. Each one answers in its own way, or refuses what it cannot do."
    aside={null}
  >
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {ENGINE_IDS.map((engine) => (
        <EngineCard
          key={engine}
          engine={engine}
          search={buildStoreSearch(runtime.indexes[engine], state)}
          selected={state.engine === engine}
          storeQuery={storeQuery}
          onSelect={() => onEngineSelect(engine)}
        />
      ))}
    </ul>
  </Panel>
);
