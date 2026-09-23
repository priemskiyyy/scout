import type React from "react";

import { SEARCH_PRESETS } from "examples/shared/outpost/constants/store";

type SearchPresetsProps = {
  query: string;
  onSelect: (query: string) => void;
};

export const SearchPresets: React.FunctionComponent<SearchPresetsProps> = ({
  query,
  onSelect,
}) => (
  <div className="flex flex-wrap items-center gap-1.5">
    <span className="text-sm text-stone-500">Try</span>
    {SEARCH_PRESETS.map((preset) => (
      <button
        key={preset.label}
        type="button"
        aria-pressed={preset.query === query}
        onClick={() => onSelect(preset.query)}
        className="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm text-stone-700 transition hover:border-stone-300 hover:bg-stone-50 aria-pressed:border-amber-500 aria-pressed:text-amber-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:aria-pressed:border-amber-400 dark:aria-pressed:text-amber-200"
      >
        {preset.label}
      </button>
    ))}
  </div>
);
