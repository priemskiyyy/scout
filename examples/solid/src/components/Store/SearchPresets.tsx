import { For } from "solid-js";
import type { Component } from "solid-js";

import { SEARCH_PRESETS } from "examples/shared/outpost/constants/store";

type SearchPresetsProps = {
  query: string;
  onSelect: (query: string) => void;
};

export const SearchPresets: Component<SearchPresetsProps> = (props) => (
  <div class="flex flex-wrap items-center gap-1.5">
    <span class="text-sm text-stone-500">Try</span>
    <For each={SEARCH_PRESETS}>
      {(preset) => (
        <button
          type="button"
          aria-pressed={preset.query === props.query}
          onClick={() => props.onSelect(preset.query)}
          class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm text-stone-700 transition hover:border-stone-300 hover:bg-stone-50 aria-pressed:border-amber-500 aria-pressed:text-amber-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:aria-pressed:border-amber-400 dark:aria-pressed:text-amber-200"
        >
          {preset.label}
        </button>
      )}
    </For>
  </div>
);
