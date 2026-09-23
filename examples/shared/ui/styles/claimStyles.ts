import { cva } from "class-variance-authority";

/** One entry of a legend, marked when it is the claim a number makes now. */
export const claimStyles = cva(
  "rounded-lg px-3 py-2 ring-1 ring-inset transition",
  {
    variants: {
      current: {
        true: "bg-amber-50 ring-amber-300 dark:bg-amber-950/40 dark:ring-amber-800",
        false: "ring-transparent",
      },
    },
  },
);
