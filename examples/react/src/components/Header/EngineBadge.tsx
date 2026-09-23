import type React from "react";

import { Badge } from "src/components/Badge/Badge";
import { dotStyles } from "examples/shared/ui/styles/dotStyles";
import type { SearchStatus } from "examples/shared/outpost/types/SearchStatus";
import { STATUS_LABELS } from "examples/shared/outpost/constants/labels";
import { STATUS_TONES } from "examples/shared/ui/constants/tones";

type EngineBadgeProps = { status: SearchStatus };

/** How the store's search stands, in the header, wherever the reader is. */
export const EngineBadge: React.FunctionComponent<EngineBadgeProps> = ({
  status,
}) => (
  <Badge tone={STATUS_TONES[status]}>
    <span
      aria-hidden="true"
      className={dotStyles({ tone: STATUS_TONES[status] })}
    />
    {STATUS_LABELS[status]}
  </Badge>
);
