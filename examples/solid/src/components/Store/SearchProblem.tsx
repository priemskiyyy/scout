import type { ParentComponent } from "solid-js";

import type { Tone } from "examples/shared/ui/types/Tone";
import { Badge } from "src/components/Badge/Badge";
import { BaseIcon } from "src/components/BaseIcon/BaseIcon";

type SearchProblemProps = {
  icon: string;
  tone: Tone;
  code: string;
  title: string;
  message: string;
  explanation: string;
};

/** A search that did not answer, with its code, its reason and a way on. */
export const SearchProblem: ParentComponent<SearchProblemProps> = (props) => (
  <div
    role="alert"
    class="flex flex-col gap-3 rounded-xl border border-dashed border-stone-300 p-5 dark:border-stone-700"
  >
    <div class="flex flex-wrap items-center gap-2">
      <BaseIcon src={props.icon} size="large" class="text-stone-500" />
      <p class="text-base font-semibold">{props.title}</p>
      <Badge tone={props.tone}>{props.code}</Badge>
    </div>
    <p class="rounded-lg bg-stone-100 px-3 py-2 font-mono text-sm leading-relaxed break-words text-stone-700 dark:bg-stone-800 dark:text-stone-300">
      {props.message}
    </p>
    <p class="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
      {props.explanation}
    </p>
    <div class="flex flex-wrap gap-2">{props.children}</div>
  </div>
);
