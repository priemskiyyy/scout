import clsx from "clsx";
import { Show } from "solid-js";
import type { Component } from "solid-js";

import { ICONS } from "examples/shared/ui/constants/icons";
import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";
import { BaseIcon } from "src/components/BaseIcon/BaseIcon";

type SearchFieldProps = {
  value: string;
  searching: boolean;
  onChange: (value: string) => void;
  onStopPress: () => void;
};

export const SearchField: Component<SearchFieldProps> = (props) => (
  <div class="relative flex items-center">
    <BaseIcon
      src={ICONS.magnifyingGlass}
      size="large"
      class="pointer-events-none absolute left-3.5 text-stone-400"
    />
    <input
      type="search"
      aria-label="Search the store"
      placeholder="Search tents, boots, stoves…"
      value={props.value}
      onInput={(event) => props.onChange(event.currentTarget.value)}
      class={clsx(
        "h-12 w-full rounded-xl border border-stone-300 bg-white pr-28 pl-11 text-base shadow-sm outline-none [&::-webkit-search-cancel-button]:hidden",
        "focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40 dark:border-stone-700 dark:bg-stone-900 dark:focus:border-amber-400",
      )}
    />
    <div class="absolute right-2 flex items-center gap-1">
      <Show when={props.searching}>
        <button
          type="button"
          onClick={() => props.onStopPress()}
          class={buttonStyles({ variant: "ghost", size: "small" })}
        >
          <BaseIcon src={ICONS.stop} size="small" />
          Stop
        </button>
      </Show>
      <Show when={props.value !== ""}>
        <button
          type="button"
          aria-label="Clear the search"
          onClick={() => props.onChange("")}
          class={buttonStyles({ variant: "ghost", size: "small" })}
        >
          <BaseIcon src={ICONS.x} size="small" />
        </button>
      </Show>
    </div>
  </div>
);
