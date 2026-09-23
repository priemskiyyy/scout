import { Equals, NotEquals } from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";

import { Badge } from "src/components/Badge/Badge";
import { CodeDetails } from "src/components/Code/CodeDetails";
import { formatJson } from "examples/shared/outpost/formatting/formatJson";
import { CARD_CLASS_NAME } from "examples/shared/ui/styles/cardStyles";
import { CODE_BLOCK_CLASS_NAME } from "examples/shared/ui/styles/codeStyles";
import type { KeyComparison } from "examples/shared/outpost/types/KeyComparison";

type KeyComparisonCardProps = { comparison: KeyComparison };

export const KeyComparisonCard: React.FunctionComponent<
  KeyComparisonCardProps
> = ({ comparison }) => {
  const same =
    JSON.stringify(comparison.left.key) ===
    JSON.stringify(comparison.right.key);

  return (
    <li className={clsx("flex min-w-0 flex-col gap-3 p-4", CARD_CLASS_NAME)}>
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-semibold">{comparison.title}</h4>
        {same ? (
          <Badge tone="positive">
            <Equals aria-hidden="true" size={12} weight="bold" />
            Same key
          </Badge>
        ) : (
          <Badge tone="info">
            <NotEquals aria-hidden="true" size={12} weight="bold" />
            Different keys
          </Badge>
        )}
      </div>
      <div className="grid gap-2">
        <pre className={clsx("rounded-lg", CODE_BLOCK_CLASS_NAME)}>
          {comparison.left.code}
        </pre>
        <pre className={clsx("rounded-lg", CODE_BLOCK_CLASS_NAME)}>
          {comparison.right.code}
        </pre>
      </div>
      <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
        {comparison.explanation}
      </p>
      <CodeDetails
        summary="Both keys"
        label={`The keys for ${comparison.title}`}
        code={formatJson({
          left: comparison.left.key,
          right: comparison.right.key,
        })}
        variant="quiet"
      />
    </li>
  );
};
