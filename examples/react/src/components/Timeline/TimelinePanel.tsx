import { ClockCounterClockwise, Eraser } from "@phosphor-icons/react";
import type React from "react";

import { EmptyState } from "src/components/EmptyState/EmptyState";
import { Panel } from "src/components/Panel/Panel";
import { TimelineRow } from "src/components/Timeline/TimelineRow";
import { useEventLog } from "src/hooks/useEventLog";
import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
import type { EventLog } from "examples/shared/outpost/types/EventLog";
import type { TimelineEntry } from "examples/shared/outpost/types/TimelineEntry";

type TimelinePanelProps = { timeline: EventLog<TimelineEntry> };

export const TimelinePanel: React.FunctionComponent<TimelinePanelProps> = ({
  timeline,
}) => {
  const entries = useEventLog(timeline);

  return (
    <Panel
      title="Timeline"
      icon={ClockCounterClockwise}
      shows="What happened to each search, newest first. Every adapter is wrapped with a spread that reports when a search reaches it and how it ends."
      aside={
        <button
          type="button"
          disabled={entries.length === 0}
          onClick={timeline.clear}
          className={buttonStyles({ size: "small" })}
        >
          <Eraser aria-hidden="true" size={14} weight="bold" />
          Clear
        </button>
      }
    >
      {entries.length === 0 ? (
        <EmptyState
          icon={ClockCounterClockwise}
          title="Nothing recorded yet"
          description="Searches reaching an engine, their answers, refusals and aborts, and Scout disposing and starting again appear here."
        />
      ) : (
        <ol
          aria-label="Timeline events"
          className="flex max-h-[32rem] flex-col divide-y divide-stone-200/70 overflow-y-auto text-sm dark:divide-stone-800"
        >
          {entries.map((entry) => (
            <TimelineRow key={entry.id} entry={entry} />
          ))}
        </ol>
      )}
    </Panel>
  );
};
