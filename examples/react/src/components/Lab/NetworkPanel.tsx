import { Eraser, Terminal } from "@phosphor-icons/react";
import type React from "react";

import { Badge } from "src/components/Badge/Badge";
import { EmptyState } from "src/components/EmptyState/EmptyState";
import { NetworkRow } from "src/components/Lab/NetworkRow";
import { Panel } from "src/components/Panel/Panel";
import { useEventLog } from "src/hooks/useEventLog";
import { useValueStore } from "src/hooks/useValueStore";
import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
import type { CatalogueBackend } from "examples/shared/outpost/types/CatalogueBackend";

type NetworkPanelProps = { backend: CatalogueBackend };

const getInFlightTone = (inFlight: number) => {
  if (inFlight === 0) {
    return "neutral";
  }

  return "info";
};

export const NetworkPanel: React.FunctionComponent<NetworkPanelProps> = ({
  backend,
}) => {
  const requests = useEventLog(backend.requests);
  const inFlight = useValueStore(backend.inFlight);

  return (
    <Panel
      title="Network"
      icon={Terminal}
      shows="What your API received from the HTTP adapter, newest first. Its body is the portable search, exactly as Scout resolved it."
      aside={
        <>
          <Badge tone={getInFlightTone(inFlight)}>{inFlight} in flight</Badge>
          <button
            type="button"
            disabled={requests.length === 0}
            onClick={backend.requests.clear}
            className={buttonStyles({ size: "small" })}
          >
            <Eraser aria-hidden="true" size={14} weight="bold" />
            Clear
          </button>
        </>
      }
    >
      {requests.length === 0 ? (
        <EmptyState
          icon={Terminal}
          title="No requests yet"
          description="Search the store with Your API. The in-page engines send nothing, and neither does a search Scout answers itself."
        />
      ) : (
        <ol
          aria-label="Requests"
          className="flex max-h-[32rem] flex-col divide-y divide-stone-200/70 overflow-y-auto text-sm dark:divide-stone-800"
        >
          {requests.map((request) => (
            <NetworkRow key={request.id} request={request} />
          ))}
        </ol>
      )}
    </Panel>
  );
};
