import clsx from "clsx";
import { For } from "solid-js";
import type { Component } from "solid-js";

import { CARD_CLASS_NAME } from "examples/shared/ui/styles/cardStyles";

const PLACEHOLDERS = [1, 2, 3, 4];

export const ResultSkeleton: Component = () => (
  <ul aria-label="Loading results" class="flex flex-col gap-2.5">
    <For each={PLACEHOLDERS}>
      {() => (
        <li class={clsx("flex animate-pulse gap-3 p-3", CARD_CLASS_NAME)}>
          <span class="size-12 shrink-0 rounded-2xl bg-stone-200 dark:bg-stone-800" />
          <span class="flex flex-1 flex-col gap-2 pt-1">
            <span class="h-3 w-24 rounded bg-stone-200 dark:bg-stone-800" />
            <span class="h-4 w-40 rounded bg-stone-200 dark:bg-stone-800" />
            <span class="h-3 w-full rounded bg-stone-200 dark:bg-stone-800" />
          </span>
        </li>
      )}
    </For>
  </ul>
);
