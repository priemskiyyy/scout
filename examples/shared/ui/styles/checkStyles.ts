import { cva } from "class-variance-authority";

/** One facet value: a checkbox row whose count is dimmed when it is not a number the engine gave. */
export const checkStyles = cva(
  "flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-sm transition hover:bg-stone-100 dark:hover:bg-stone-800/70",
  {
    variants: {
      checked: {
        true: "font-medium text-stone-900 dark:text-stone-100",
        false: "text-stone-700 dark:text-stone-300",
      },
    },
  },
);
