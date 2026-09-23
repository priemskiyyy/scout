import { CaretRight } from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";
import type { ReactNode } from "react";

import { CODE_BLOCK_CLASS_NAME } from "examples/shared/ui/styles/codeStyles";
import {
  codeBlockStyles,
  detailsStyles,
  summaryStyles,
} from "examples/shared/ui/styles/detailsStyles";

type CodeDetailsProps = {
  summary: string;
  label: string;
  badge?: ReactNode;
  code: string;
  variant?: "boxed" | "quiet";
};

/** A closed block of code or JSON that opens on demand. */
export const CodeDetails: React.FunctionComponent<CodeDetailsProps> = ({
  summary,
  label,
  badge,
  code,
  variant = "boxed",
}) => (
  <details className={detailsStyles({ variant })}>
    <summary className={summaryStyles({ variant })}>
      <CaretRight
        aria-hidden="true"
        size={14}
        weight="bold"
        className="text-stone-400 transition-transform group-open:rotate-90 motion-reduce:transition-none"
      />
      {summary}
      {badge}
    </summary>
    <pre
      aria-label={label}
      className={clsx(codeBlockStyles({ variant }), CODE_BLOCK_CLASS_NAME)}
    >
      {code}
    </pre>
  </details>
);
