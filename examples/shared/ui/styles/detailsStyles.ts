import { cva } from "class-variance-authority";

/** A disclosure: boxed where it is the point, quiet where it is an aside. */
export const detailsStyles = cva("group", {
  variants: {
    variant: {
      boxed: "rounded-xl border border-stone-200 dark:border-stone-800",
      quiet: "",
    },
  },
});

export const summaryStyles = cva(
  "flex cursor-pointer list-none flex-wrap items-center gap-2 select-none [&::-webkit-details-marker]:hidden",
  {
    variants: {
      variant: {
        boxed:
          "rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800/50",
        quiet:
          "text-xs font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-200",
      },
    },
  },
);

export const codeBlockStyles = cva("max-h-80", {
  variants: {
    variant: {
      boxed: "rounded-b-xl border-t border-stone-200 dark:border-stone-800",
      quiet: "mt-2 rounded-lg",
    },
  },
});
