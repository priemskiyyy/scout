import type { Query } from "@tanstack/react-query";
import type React from "react";

import { Badge } from "src/components/Badge/Badge";
import { formatClockTime } from "examples/shared/outpost/formatting/formatClockTime";
import type { Tone } from "examples/shared/ui/types/Tone";
import { getQueryKeySummary } from "examples/shared/outpost/utils/getQueryKeySummary";

type CacheRowProps = { query: Query };

const STATUS_LABELS: Record<Query["state"]["status"], string> = {
  pending: "Loading",
  error: "Failed",
  success: "Cached",
};

const STATUS_TONES: Record<Query["state"]["status"], Tone> = {
  pending: "info",
  error: "danger",
  success: "positive",
};

const getFreshness = (query: Query) => {
  if (query.state.fetchStatus === "fetching") {
    return "fetching";
  }

  if (query.isStale()) {
    return "stale";
  }

  return "fresh";
};

const getKind = (infinite: boolean) => {
  if (infinite) {
    return "infinite list";
  }

  return "one page";
};

const getUpdated = (query: Query) => {
  if (query.state.dataUpdatedAt === 0) {
    return "never answered";
  }

  return formatClockTime(query.state.dataUpdatedAt);
};

export const CacheRow: React.FunctionComponent<CacheRowProps> = ({ query }) => {
  const summary = getQueryKeySummary(query.queryKey);

  return (
    <li className="flex flex-col gap-1 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={STATUS_TONES[query.state.status]}>
          {STATUS_LABELS[query.state.status]}
        </Badge>
        <span className="font-mono text-sm font-semibold">{summary.index}</span>
        <span className="text-xs text-stone-500">
          {getKind(summary.infinite)} · {getFreshness(query)} ·{" "}
          {query.getObserversCount()} watching · {getUpdated(query)}
        </span>
      </div>
      <p className="truncate font-mono text-xs text-stone-500">
        {summary.identity}
      </p>
    </li>
  );
};
