import { ScoutError } from "@priemskiyyy/scout";
import type React from "react";

import { Badge } from "src/components/Badge/Badge";
import { claimStyles } from "examples/shared/ui/styles/claimStyles";
import {
  ERROR_MEANINGS,
  ERROR_ORDER,
} from "examples/shared/outpost/constants/labels";
import { ERROR_TONES } from "examples/shared/ui/constants/tones";

type ErrorLegendProps = { error: Error | null };

const getCurrentCode = (error: Error | null) => {
  if (error instanceof ScoutError) {
    return error.code;
  }

  return null;
};

/** Every code a search can fail with, and the one the store's search has now. */
export const ErrorLegend: React.FunctionComponent<ErrorLegendProps> = ({
  error,
}) => {
  const current = getCurrentCode(error);

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-stone-100/70 p-4 dark:bg-stone-800/40">
      <h4 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
        What each failure means
      </h4>
      <dl className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-3">
        {ERROR_ORDER.map((code) => (
          <div
            key={code}
            aria-current={code === current ? "true" : undefined}
            className={claimStyles({
              current: code === current,
              className: "flex flex-col items-start gap-1",
            })}
          >
            <dt>
              <Badge tone={ERROR_TONES[code]}>{code}</Badge>
            </dt>
            <dd className="text-stone-600 dark:text-stone-400">
              {ERROR_MEANINGS[code]}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
};
