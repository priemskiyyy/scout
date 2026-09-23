import type React from "react";

import { Badge } from "src/components/Badge/Badge";
import { CodeDetails } from "src/components/Code/CodeDetails";
import { formatDuration } from "examples/shared/outpost/formatting/formatDuration";
import { formatJson } from "examples/shared/outpost/formatting/formatJson";
import { formatRequestSummary } from "examples/shared/outpost/formatting/formatRequestSummary";
import { SEARCH_ENDPOINT } from "examples/shared/outpost/constants/backend";
import type { NetworkRequest } from "examples/shared/outpost/types/NetworkRequest";
import { REQUEST_LABELS } from "examples/shared/outpost/constants/labels";
import { REQUEST_TONES } from "examples/shared/ui/constants/tones";

type NetworkRowProps = { request: NetworkRequest };

export const NetworkRow: React.FunctionComponent<NetworkRowProps> = ({
  request,
}) => (
  <li className="flex flex-col gap-1.5 py-2.5">
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3">
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-mono">
          <span className="font-semibold">{SEARCH_ENDPOINT}</span>
          {request.status === null ? null : (
            <span className="text-stone-500"> · {request.status}</span>
          )}
        </span>
        <span className="truncate font-mono text-xs text-stone-500">
          {formatRequestSummary(request.search)}
        </span>
      </span>
      <Badge tone={REQUEST_TONES[request.outcome]}>
        {REQUEST_LABELS[request.outcome]}
      </Badge>
      <span className="w-16 text-right font-mono text-stone-500 tabular-nums">
        {formatDuration(request.duration)}
      </span>
    </div>
    <CodeDetails
      summary="The body it received"
      label={`The body of request ${request.id}`}
      code={formatJson(request.search)}
      variant="quiet"
    />
  </li>
);
