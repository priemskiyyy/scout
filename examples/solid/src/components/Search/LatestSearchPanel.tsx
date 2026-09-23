import type { QueryKey } from "@tanstack/solid-query";
import { Show } from "solid-js";
import type { Component } from "solid-js";

import { STATUS_LABELS } from "examples/shared/outpost/constants/labels";
import { formatJson } from "examples/shared/outpost/formatting/formatJson";
import { formatSearchCode } from "examples/shared/outpost/formatting/formatSearchCode";
import type { SearchStatus } from "examples/shared/outpost/types/SearchStatus";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { getFacetCountsNote } from "examples/shared/outpost/utils/getFacetCountsNote";
import { getLatestPage } from "examples/shared/outpost/utils/getLatestPage";
import { ICONS } from "examples/shared/ui/constants/icons";
import { STATUS_TONES } from "examples/shared/ui/constants/tones";
import { Badge } from "src/components/Badge/Badge";
import { CodeDetails } from "src/components/Code/CodeDetails";
import { Panel } from "src/components/Panel/Panel";
import { SearchCode } from "src/components/Search/SearchCode";
import { SearchFacts } from "src/components/Search/SearchFacts";
import { SearchFailure } from "src/components/Search/SearchFailure";
import type { StoreQuery } from "src/types/StoreQuery";

type LatestSearchPanelProps = {
  state: StoreState;
  query: StoreQuery;
  queryKey: QueryKey;
  status: SearchStatus;
};

type LatestSearchProps = Pick<LatestSearchPanelProps, "state" | "query">;

const LatestSearch: Component<LatestSearchProps> = (props) => {
  const latest = () => getLatestPage(props.query);

  return (
    <Show
      when={latest()}
      fallback={<p class="text-sm text-stone-500">Waiting for the engine…</p>}
    >
      {(page) => (
        // Keyed by when the answer arrived, so each new one mounts afresh and flashes.
        <Show when={props.query.dataUpdatedAt} keyed>
          <div class="-m-2 flex animate-flash flex-col gap-3 rounded-xl p-2 motion-reduce:animate-none">
            <SearchFacts
              latest={page()}
              note={getFacetCountsNote(props.state, page())}
            />
            <CodeDetails
              summary="The latest page, with its first two hits"
              label="The latest page"
              code={formatJson({ ...page(), hits: page().hits.slice(0, 2) })}
            />
          </div>
        </Show>
      )}
    </Show>
  );
};

export const LatestSearchPanel: Component<LatestSearchPanelProps> = (props) => (
  <Panel
    title="Latest search"
    icon={ICONS.binoculars}
    shows="The search the store just ran: the code that built it, what came back, and how sure the engine was."
    aside={
      <Badge tone={STATUS_TONES[props.status]}>
        {STATUS_LABELS[props.status]}
      </Badge>
    }
  >
    <SearchCode code={formatSearchCode(props.state.engine, props.state)} />
    <Show
      when={props.query.error}
      fallback={<LatestSearch state={props.state} query={props.query} />}
    >
      {(error) => <SearchFailure error={error()} />}
    </Show>
    <CodeDetails
      summary="Its query key"
      label="Query key"
      code={formatJson(props.queryKey)}
    />
  </Panel>
);
