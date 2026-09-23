import { MagnifyingGlass, Stop, X } from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";

import { buttonStyles } from "examples/shared/ui/styles/buttonStyles";

type SearchFieldProps = {
  value: string;
  searching: boolean;
  onChange: (value: string) => void;
  onStopPress: () => void;
};

export const SearchField: React.FunctionComponent<SearchFieldProps> = ({
  value,
  searching,
  onChange,
  onStopPress,
}) => (
  <div className="relative flex items-center">
    <MagnifyingGlass
      aria-hidden="true"
      size={20}
      weight="bold"
      className="pointer-events-none absolute left-3.5 text-stone-400"
    />
    <input
      type="search"
      aria-label="Search the store"
      placeholder="Search tents, boots, stoves…"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={clsx(
        "h-12 w-full rounded-xl border border-stone-300 bg-white pr-28 pl-11 text-base shadow-sm outline-none [&::-webkit-search-cancel-button]:hidden",
        "focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40 dark:border-stone-700 dark:bg-stone-900 dark:focus:border-amber-400",
      )}
    />
    <div className="absolute right-2 flex items-center gap-1">
      {searching ? (
        <button
          type="button"
          onClick={onStopPress}
          className={buttonStyles({ variant: "ghost", size: "small" })}
        >
          <Stop aria-hidden="true" size={14} weight="fill" />
          Stop
        </button>
      ) : null}
      {value === "" ? null : (
        <button
          type="button"
          aria-label="Clear the search"
          onClick={() => onChange("")}
          className={buttonStyles({ variant: "ghost", size: "small" })}
        >
          <X aria-hidden="true" size={14} weight="bold" />
        </button>
      )}
    </div>
  </div>
);
