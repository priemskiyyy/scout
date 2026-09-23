import clsx from "clsx";
import { Show } from "solid-js";
import type { Component } from "solid-js";

import { CATEGORY_LABELS } from "examples/shared/outpost/constants/labels";
import { formatJson } from "examples/shared/outpost/formatting/formatJson";
import { formatPrice } from "examples/shared/outpost/formatting/formatPrice";
import { formatRating } from "examples/shared/outpost/formatting/formatRating";
import type { StoreHit } from "examples/shared/outpost/types/StoreHit";
import { getRequestedHighlight } from "examples/shared/outpost/utils/getRequestedHighlight";
import { CATEGORY_ICONS, ICONS } from "examples/shared/ui/constants/icons";
import { CARD_CLASS_NAME } from "examples/shared/ui/styles/cardStyles";
import { Badge } from "src/components/Badge/Badge";
import { BaseIcon } from "src/components/BaseIcon/BaseIcon";
import { CodeDetails } from "src/components/Code/CodeDetails";
import { IconTile } from "src/components/IconTile/IconTile";
import { HighlightedText } from "src/components/Store/HighlightedText";

type ResultCardProps = { hit: StoreHit };

export const ResultCard: Component<ResultCardProps> = (props) => {
  const document = () => props.hit.document;

  return (
    <li
      aria-label={document().name}
      class={clsx("flex min-w-0 gap-3 p-3 sm:gap-4", CARD_CLASS_NAME)}
    >
      <IconTile src={CATEGORY_ICONS[document().category]} size="large" />
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <div class="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3">
          <h4 class="leading-snug font-semibold">
            <HighlightedText
              fragments={getRequestedHighlight(props.hit, "name")}
              text={document().name}
            />
          </h4>
          <span class="font-semibold tabular-nums">
            {formatPrice(document().price)}
          </span>
        </div>
        <p class="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          <HighlightedText
            fragments={getRequestedHighlight(props.hit, "description")}
            text={document().description}
          />
        </p>
        <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-stone-500">
          <span>
            {document().brand} · {CATEGORY_LABELS[document().category]}
          </span>
          <span class="inline-flex items-center gap-1 tabular-nums">
            <BaseIcon src={ICONS.star} size="xsmall" class="text-amber-500" />
            {formatRating(document().rating)}
          </span>
          <Show
            when={document().inStock}
            fallback={<Badge tone="neutral">Sold out</Badge>}
          >
            <Badge tone="positive">In stock</Badge>
          </Show>
        </div>
        <CodeDetails
          summary="What Scout returned"
          label={`What Scout returned for ${document().name}`}
          code={formatJson(props.hit)}
          variant="quiet"
        />
      </div>
    </li>
  );
};
