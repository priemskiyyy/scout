<script lang="ts">
  import { CATEGORY_LABELS } from "examples/shared/outpost/constants/labels";
  import { formatJson } from "examples/shared/outpost/formatting/formatJson";
  import { formatPrice } from "examples/shared/outpost/formatting/formatPrice";
  import { formatRating } from "examples/shared/outpost/formatting/formatRating";
  import type { StoreHit } from "examples/shared/outpost/types/StoreHit";
  import { getRequestedHighlight } from "examples/shared/outpost/utils/getRequestedHighlight";
  import { CATEGORY_ICONS, ICONS } from "examples/shared/ui/constants/icons";
  import { CARD_CLASS_NAME } from "examples/shared/ui/styles/cardStyles";
  import Badge from "src/components/Badge/Badge.svelte";
  import BaseIcon from "src/components/BaseIcon/BaseIcon.svelte";
  import CodeDetails from "src/components/Code/CodeDetails.svelte";
  import IconTile from "src/components/IconTile/IconTile.svelte";
  import HighlightedText from "src/components/Store/HighlightedText.svelte";

  type Props = { hit: StoreHit };

  let { hit }: Props = $props();

  const product = $derived(hit.document);
</script>

<li
  aria-label={product.name}
  class={["flex min-w-0 gap-3 p-3 sm:gap-4", CARD_CLASS_NAME]}
>
  <IconTile icon={CATEGORY_ICONS[product.category]} size="large" />
  <div class="flex min-w-0 flex-1 flex-col gap-1">
    <div class="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3">
      <h4 class="leading-snug font-semibold">
        <HighlightedText
          fragments={getRequestedHighlight(hit, "name")}
          text={product.name}
        />
      </h4>
      <span class="font-semibold tabular-nums">
        {formatPrice(product.price)}
      </span>
    </div>
    <p class="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
      <HighlightedText
        fragments={getRequestedHighlight(hit, "description")}
        text={product.description}
      />
    </p>
    <div
      class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-stone-500"
    >
      <span>{product.brand} · {CATEGORY_LABELS[product.category]}</span>
      <span class="inline-flex items-center gap-1 tabular-nums">
        <BaseIcon src={ICONS.star} size="xsmall" class="text-amber-500" />
        {formatRating(product.rating)}
      </span>
      {#if product.inStock}
        <Badge tone="positive">In stock</Badge>
      {:else}
        <Badge tone="neutral">Sold out</Badge>
      {/if}
    </div>
    <CodeDetails
      summary="What Scout returned"
      label={`What Scout returned for ${product.name}`}
      code={formatJson(hit)}
      variant="quiet"
    />
  </div>
</li>
