import type { Icon } from "@phosphor-icons/react";
import type React from "react";
import type { ReactNode } from "react";

import { Badge } from "src/components/Badge/Badge";
import type { Tone } from "examples/shared/ui/types/Tone";

type SearchProblemProps = {
  icon: Icon;
  tone: Tone;
  code: string;
  title: string;
  message: string;
  explanation: string;
  actions: ReactNode;
};

/** A search that did not answer, with its code, its reason and a way on. */
export const SearchProblem: React.FunctionComponent<SearchProblemProps> = ({
  icon: ProblemIcon,
  tone,
  code,
  title,
  message,
  explanation,
  actions,
}) => (
  <div
    role="alert"
    className="flex flex-col gap-3 rounded-xl border border-dashed border-stone-300 p-5 dark:border-stone-700"
  >
    <div className="flex flex-wrap items-center gap-2">
      <ProblemIcon
        aria-hidden="true"
        size={22}
        weight="duotone"
        className="text-stone-500"
      />
      <p className="text-base font-semibold">{title}</p>
      <Badge tone={tone}>{code}</Badge>
    </div>
    <p className="rounded-lg bg-stone-100 px-3 py-2 font-mono text-sm leading-relaxed break-words text-stone-700 dark:bg-stone-800 dark:text-stone-300">
      {message}
    </p>
    <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
      {explanation}
    </p>
    <div className="flex flex-wrap gap-2">{actions}</div>
  </div>
);
