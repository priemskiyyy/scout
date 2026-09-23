import { Binoculars } from "@phosphor-icons/react";
import type { QueryKey } from "@tanstack/react-query";
import type React from "react";

import { Badge } from "src/components/Badge/Badge";
import { CodeDetails } from "src/components/Code/CodeDetails";
import { Panel } from "src/components/Panel/Panel";
import { SearchCode } from "src/components/Search/SearchCode";
import { SearchFacts } from "src/components/Search/SearchFacts";
import { SearchFailure } from "src/components/Search/SearchFailure";
import { formatJson } from "examples/shared/outpost/formatting/formatJson";
import { formatSearchCode } from "examples/shared/outpost/formatting/formatSearchCode";
import type { SearchStatus } from "examples/shared/outpost/types/SearchStatus";
import type { StoreQuery } from "src/types/StoreQuery";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { STATUS_LABELS } from "examples/shared/outpost/constants/labels";
import { STATUS_TONES } from "examples/shared/ui/constants/tones";
import { getFacetCountsNote } from "examples/shared/outpost/utils/getFacetCountsNote";
import { getLatestPage } from "examples/shared/outpost/utils/getLatestPage";

type LatestSearchPanelProps = {
  state: StoreState;
  query: StoreQuery;
  queryKey: QueryKey;
  status: SearchStatus;
};

type LatestSearchProps = Omit<LatestSearchPanelProps, "status" | "queryKey">;

const LatestSearch: React.FunctionComponent<LatestSearchProps> = ({
  state,
  query,
}) => {
  if (query.error !== null) {
    return <SearchFailure error={query.error} />;
  }

  const latest = getLatestPage(query);

  if (latest === null) {
    return <p className="text-sm text-stone-500">Waiting for the engine…</p>;
  }

  // Keyed by the page, so each new answer mounts afresh and flashes.
  return (
    <div
      key={`${query.dataUpdatedAt}`}
      className="-m-2 flex animate-flash flex-col gap-3 rounded-xl p-2 motion-reduce:animate-none"
    >
      <SearchFacts latest={latest} note={getFacetCountsNote(state, latest)} />
      <CodeDetails
        summary="The latest page, with its first two hits"
        label="The latest page"
        code={formatJson({ ...latest, hits: latest.hits.slice(0, 2) })}
      />
    </div>
  );
};

export const LatestSearchPanel: React.FunctionComponent<
  LatestSearchPanelProps
> = ({ state, query, queryKey, status }) => (
  <Panel
    title="Latest search"
    icon={Binoculars}
    shows="The search the store just ran: the code that built it, what came back, and how sure the engine was."
    aside={<Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>}
  >
    <SearchCode code={formatSearchCode(state.engine, state)} />
    <LatestSearch state={state} query={query} />
    <CodeDetails
      summary="Its query key"
      label="Query key"
      code={formatJson(queryKey)}
    />
  </Panel>
);
