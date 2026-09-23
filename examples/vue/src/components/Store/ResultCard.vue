<script setup lang="ts">
import { CATEGORY_LABELS } from "examples/shared/outpost/constants/labels";
import { formatJson } from "examples/shared/outpost/formatting/formatJson";
import { formatPrice } from "examples/shared/outpost/formatting/formatPrice";
import { formatRating } from "examples/shared/outpost/formatting/formatRating";
import type { StoreHit } from "examples/shared/outpost/types/StoreHit";
import { getRequestedHighlight } from "examples/shared/outpost/utils/getRequestedHighlight";
import { CATEGORY_ICONS, ICONS } from "examples/shared/ui/constants/icons";
import { CARD_CLASS_NAME } from "examples/shared/ui/styles/cardStyles";
import ToneBadge from "src/components/Badge/ToneBadge.vue";
import BaseIcon from "src/components/BaseIcon/BaseIcon.vue";
import CodeDetails from "src/components/Code/CodeDetails.vue";
import IconTile from "src/components/IconTile/IconTile.vue";
import HighlightedText from "src/components/Store/HighlightedText.vue";

defineProps<{ hit: StoreHit }>();
</script>

<template>
  <li
    :aria-label="hit.document.name"
    class="flex min-w-0 gap-3 p-3 sm:gap-4"
    :class="CARD_CLASS_NAME"
  >
    <IconTile :src="CATEGORY_ICONS[hit.document.category]" size="large" />
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <div
        class="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3"
      >
        <h4 class="leading-snug font-semibold">
          <HighlightedText
            :fragments="getRequestedHighlight(hit, 'name')"
            :text="hit.document.name"
          />
        </h4>
        <span class="font-semibold tabular-nums">
          {{ formatPrice(hit.document.price) }}
        </span>
      </div>
      <p class="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
        <HighlightedText
          :fragments="getRequestedHighlight(hit, 'description')"
          :text="hit.document.description"
        />
      </p>
      <div
        class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-stone-500"
      >
        <span>
          {{ hit.document.brand }} ·
          {{ CATEGORY_LABELS[hit.document.category] }}
        </span>
        <span class="inline-flex items-center gap-1 tabular-nums">
          <span class="text-amber-500">
            <BaseIcon :src="ICONS.star" size="xsmall" />
          </span>
          {{ formatRating(hit.document.rating) }}
        </span>
        <ToneBadge v-if="hit.document.inStock" tone="positive">
          In stock
        </ToneBadge>
        <ToneBadge v-else tone="neutral">Sold out</ToneBadge>
      </div>
      <CodeDetails
        summary="What Scout returned"
        :label="`What Scout returned for ${hit.document.name}`"
        :code="formatJson(hit)"
        variant="quiet"
      />
    </div>
  </li>
</template>
