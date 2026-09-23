import { cva } from "class-variance-authority";

/** A choice laid out as a card: an engine, or a search to translate. */
export const chipStyles = cva(
  "flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500",
  {
    variants: {
      selected: {
        true: "border-amber-500 bg-white shadow-sm ring-2 ring-amber-500/60 dark:border-amber-400 dark:bg-stone-950",
        false:
          "border-stone-200 bg-white/60 hover:border-stone-300 hover:bg-white dark:border-stone-800 dark:bg-stone-900/60 dark:hover:border-stone-700 dark:hover:bg-stone-800",
      },
    },
  },
);
