import clsx from "clsx";
import type React from "react";

import { CARD_CLASS_NAME } from "examples/shared/ui/styles/cardStyles";

const PLACEHOLDERS = [1, 2, 3, 4];

export const ResultSkeleton: React.FunctionComponent = () => (
  <ul aria-label="Loading results" className="flex flex-col gap-2.5">
    {PLACEHOLDERS.map((placeholder) => (
      <li
        key={placeholder}
        className={clsx("flex animate-pulse gap-3 p-3", CARD_CLASS_NAME)}
      >
        <span className="size-12 shrink-0 rounded-2xl bg-stone-200 dark:bg-stone-800" />
        <span className="flex flex-1 flex-col gap-2 pt-1">
          <span className="h-3 w-24 rounded bg-stone-200 dark:bg-stone-800" />
          <span className="h-4 w-40 rounded bg-stone-200 dark:bg-stone-800" />
          <span className="h-3 w-full rounded bg-stone-200 dark:bg-stone-800" />
        </span>
      </li>
    ))}
  </ul>
);
