import type React from "react";

import { Badge } from "src/components/Badge/Badge";
import { describeTimelineEntry } from "examples/shared/outpost/formatting/describeTimelineEntry";
import { formatClockTime } from "examples/shared/outpost/formatting/formatClockTime";
import type { TimelineEntry } from "examples/shared/outpost/types/TimelineEntry";

type TimelineRowProps = { entry: TimelineEntry };

export const TimelineRow: React.FunctionComponent<TimelineRowProps> = ({
  entry,
}) => {
  const { source, text, tone } = describeTimelineEntry(entry);

  return (
    <li className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3 py-2">
      <time
        dateTime={new Date(entry.at).toISOString()}
        className="font-mono text-xs text-stone-500 tabular-nums"
      >
        {formatClockTime(entry.at)}
      </time>
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        <Badge tone={tone}>{source}</Badge>
        <span className="min-w-0 break-words">{text}</span>
      </span>
    </li>
  );
};
