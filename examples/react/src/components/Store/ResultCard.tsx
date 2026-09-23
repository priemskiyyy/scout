import { Star } from "@phosphor-icons/react";
import clsx from "clsx";
import type React from "react";

import { Badge } from "src/components/Badge/Badge";
import { CodeDetails } from "src/components/Code/CodeDetails";
import { IconTile } from "src/components/IconTile/IconTile";
import { HighlightedText } from "src/components/Store/HighlightedText";
import { formatJson } from "examples/shared/outpost/formatting/formatJson";
import { formatPrice } from "examples/shared/outpost/formatting/formatPrice";
import { formatRating } from "examples/shared/outpost/formatting/formatRating";
import { CARD_CLASS_NAME } from "examples/shared/ui/styles/cardStyles";
import type { StoreHit } from "examples/shared/outpost/types/StoreHit";
import { CATEGORY_ICONS } from "src/utils/constants/icons";
import { CATEGORY_LABELS } from "examples/shared/outpost/constants/labels";
import { getRequestedHighlight } from "examples/shared/outpost/utils/getRequestedHighlight";

type ResultCardProps = { hit: StoreHit };

export const ResultCard: React.FunctionComponent<ResultCardProps> = ({
  hit,
}) => {
  const { document } = hit;

  return (
    <li
      aria-label={document.name}
      className={clsx("flex min-w-0 gap-3 p-3 sm:gap-4", CARD_CLASS_NAME)}
    >
      <IconTile icon={CATEGORY_ICONS[document.category]} size="large" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3">
          <h4 className="leading-snug font-semibold">
            <HighlightedText
              fragments={getRequestedHighlight(hit, "name")}
              text={document.name}
            />
          </h4>
          <span className="font-semibold tabular-nums">
            {formatPrice(document.price)}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          <HighlightedText
            fragments={getRequestedHighlight(hit, "description")}
            text={document.description}
          />
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-stone-500">
          <span>
            {document.brand} · {CATEGORY_LABELS[document.category]}
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Star
              aria-hidden="true"
              size={12}
              weight="fill"
              className="text-amber-500"
            />
            {formatRating(document.rating)}
          </span>
          {document.inStock ? (
            <Badge tone="positive">In stock</Badge>
          ) : (
            <Badge tone="neutral">Sold out</Badge>
          )}
        </div>
        <CodeDetails
          summary="What Scout returned"
          label={`What Scout returned for ${document.name}`}
          code={formatJson(hit)}
          variant="quiet"
        />
      </div>
    </li>
  );
};
