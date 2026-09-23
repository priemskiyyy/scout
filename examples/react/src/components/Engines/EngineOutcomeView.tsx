import { ScoutError } from "@priemskiyyy/scout";
import type React from "react";

import { Badge } from "src/components/Badge/Badge";
import { formatError } from "examples/shared/outpost/formatting/formatError";
import { formatTook } from "examples/shared/outpost/formatting/formatTook";
import { formatTotal } from "examples/shared/outpost/formatting/formatTotal";
import type { EngineOutcome } from "examples/shared/outpost/types/EngineOutcome";
import {
  ACCURACY_LABELS,
  ERROR_LABELS,
} from "examples/shared/outpost/constants/labels";
import {
  ACCURACY_TONES,
  ERROR_TONES,
} from "examples/shared/ui/constants/tones";

type EngineOutcomeViewProps = { outcome: EngineOutcome };

const TOP_HITS = 3;

export const EngineOutcomeView: React.FunctionComponent<
  EngineOutcomeViewProps
> = ({ outcome }) => {
  if (outcome.kind === "searching") {
    return <p className="text-sm text-stone-500">Searching…</p>;
  }

  if (outcome.kind === "failed") {
    const { error } = outcome;

    return (
      <div className="flex flex-col items-start gap-1.5 text-sm">
        {error instanceof ScoutError ? (
          <Badge tone={ERROR_TONES[error.code]}>
            {ERROR_LABELS[error.code]}
          </Badge>
        ) : null}
        <p className="leading-relaxed text-stone-600 dark:text-stone-400">
          {formatError(error)}
        </p>
      </div>
    );
  }

  const { result } = outcome;

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{formatTotal(result.total)}</span>
        <Badge tone={ACCURACY_TONES[result.total.accuracy]}>
          {ACCURACY_LABELS[result.total.accuracy]}
        </Badge>
      </div>
      <ol className="flex flex-col gap-0.5 text-stone-600 dark:text-stone-400">
        {result.hits.slice(0, TOP_HITS).map((hit, position) => (
          <li key={hit.id} className="flex gap-2 truncate">
            <span className="font-mono text-xs text-stone-400 tabular-nums">
              {position + 1}
            </span>
            <span className="truncate">{hit.document.name}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-stone-500">{formatTook(result.took)}</p>
    </div>
  );
};
