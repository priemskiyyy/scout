import clsx from "clsx";
import type { JSX, ParentComponent } from "solid-js";

import { CARD_CLASS_NAME } from "examples/shared/ui/styles/cardStyles";
import { IconTile } from "src/components/IconTile/IconTile";

type PanelProps = {
  title: string;
  icon: string;
  shows: string;
  aside: JSX.Element;
};

export const Panel: ParentComponent<PanelProps> = (props) => (
  <section
    aria-label={props.title}
    class={clsx("flex h-full min-w-0 flex-col gap-4 p-5", CARD_CLASS_NAME)}
  >
    <header class="flex flex-col gap-1.5">
      <div class="flex flex-wrap items-center gap-2">
        <IconTile src={props.icon} size="small" />
        <h3 class="text-base font-semibold tracking-tight text-stone-800 dark:text-stone-200">
          {props.title}
        </h3>
        <div class="ml-auto flex flex-wrap items-center gap-2">
          {props.aside}
        </div>
      </div>
      <p class="text-sm text-stone-500 dark:text-stone-400">{props.shows}</p>
    </header>
    {props.children}
  </section>
);
