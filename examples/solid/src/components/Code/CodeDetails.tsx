import clsx from "clsx";
import type { Component } from "solid-js";

import { ICONS } from "examples/shared/ui/constants/icons";
import { CODE_BLOCK_CLASS_NAME } from "examples/shared/ui/styles/codeStyles";
import {
  codeBlockStyles,
  detailsStyles,
  summaryStyles,
} from "examples/shared/ui/styles/detailsStyles";
import { BaseIcon } from "src/components/BaseIcon/BaseIcon";

type CodeDetailsProps = {
  summary: string;
  label: string;
  code: string;
  variant?: "boxed" | "quiet";
};

/** A closed block of code or JSON that opens on demand. */
export const CodeDetails: Component<CodeDetailsProps> = (props) => {
  const variant = () => props.variant ?? "boxed";

  return (
    <details class={detailsStyles({ variant: variant() })}>
      <summary class={summaryStyles({ variant: variant() })}>
        <BaseIcon
          src={ICONS.caretRight}
          size="small"
          class="text-stone-400 transition-transform group-open:rotate-90 motion-reduce:transition-none"
        />
        {props.summary}
      </summary>
      <pre
        aria-label={props.label}
        class={clsx(
          codeBlockStyles({ variant: variant() }),
          CODE_BLOCK_CLASS_NAME,
        )}
      >
        {props.code}
      </pre>
    </details>
  );
};
