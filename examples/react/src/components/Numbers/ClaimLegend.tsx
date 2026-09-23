import type React from "react";

import { claimStyles } from "examples/shared/ui/styles/claimStyles";

type ClaimLegendProps<TClaim extends string> = {
  order: readonly TClaim[];
  labels: Record<TClaim, string>;
  meanings: Record<TClaim, string>;
  current: TClaim | null;
};

/** Every claim a number can make, with the one it makes now marked. */
export const ClaimLegend = <TClaim extends string>({
  order,
  labels,
  meanings,
  current,
}: ClaimLegendProps<TClaim>): React.ReactElement => (
  <dl className="flex flex-col gap-1.5 text-sm">
    {order.map((claim) => (
      <div
        key={claim}
        aria-current={claim === current ? "true" : undefined}
        className={claimStyles({ current: claim === current })}
      >
        <dt className="font-medium">{labels[claim]}</dt>
        <dd className="text-stone-600 dark:text-stone-400">
          {meanings[claim]}
        </dd>
      </div>
    ))}
  </dl>
);
