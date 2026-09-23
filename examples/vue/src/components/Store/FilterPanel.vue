<script setup lang="ts">
import { computed } from "vue";

import {
  BRAND_OPTIONS,
  CATEGORY_OPTIONS,
  RATING_OPTIONS,
} from "examples/shared/outpost/constants/filters";
import { FACET_NOTES } from "examples/shared/outpost/constants/labels";
import { PRICE_BAND_OPTIONS } from "examples/shared/outpost/constants/store";
import { formatFacetCount } from "examples/shared/outpost/formatting/formatFacetCount";
import type { Brand } from "examples/shared/outpost/types/Brand";
import type { Category } from "examples/shared/outpost/types/Category";
import type { PriceBand } from "examples/shared/outpost/types/PriceBand";
import type { StoreResult } from "examples/shared/outpost/types/StoreResult";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { getFacetCountsNote } from "examples/shared/outpost/utils/getFacetCountsNote";
import { getRequestedFacet } from "examples/shared/outpost/utils/getRequestedFacet";
import { ICONS } from "examples/shared/ui/constants/icons";
import { FACET_NOTE_TONES } from "examples/shared/ui/constants/tones";
import { checkStyles } from "examples/shared/ui/styles/checkStyles";
import { dotStyles } from "examples/shared/ui/styles/dotStyles";
import { LEGEND_CLASS_NAME } from "examples/shared/ui/styles/legendStyles";
import BaseIcon from "src/components/BaseIcon/BaseIcon.vue";
import FacetGroup from "src/components/Store/FacetGroup.vue";

const props = defineProps<{ state: StoreState; latest: StoreResult | null }>();

const emit = defineEmits<{
  brandToggle: [brand: Brand];
  categoryToggle: [category: Category];
  priceBandSelect: [priceBand: PriceBand];
  minRatingSelect: [minRating: number | null];
  inStockToggle: [];
  clear: [];
}>();

const isBrand = (value: string): value is Brand =>
  BRAND_OPTIONS.some((option) => option.value === value);

const isCategory = (value: string): value is Category =>
  CATEGORY_OPTIONS.some((option) => option.value === value);

const getFacets = (latest: StoreResult | null) => {
  if (latest === null) {
    return { brand: null, category: null, inStock: null };
  }

  return {
    brand: getRequestedFacet(latest, "brand"),
    category: getRequestedFacet(latest, "category"),
    inStock: getRequestedFacet(latest, "inStock"),
  };
};

const facets = computed(() => getFacets(props.latest));
const note = computed(() => getFacetCountsNote(props.state, props.latest));

const inStockCount = computed(() =>
  formatFacetCount(facets.value.inStock, true),
);

const handleBrandToggle = (value: string) => {
  if (!isBrand(value)) {
    return;
  }

  emit("brandToggle", value);
};

const handleCategoryToggle = (value: string) => {
  if (!isCategory(value)) {
    return;
  }

  emit("categoryToggle", value);
};

const handleRatingSelect = (value: number) => {
  if (value === 0) {
    emit("minRatingSelect", null);

    return;
  }

  emit("minRatingSelect", value);
};
</script>

<template>
  <div class="flex flex-col gap-5">
    <div
      class="flex items-start gap-2 px-2 text-xs leading-relaxed text-stone-500"
    >
      <span
        aria-hidden="true"
        :class="dotStyles({ tone: FACET_NOTE_TONES[note] })"
      />
      <span class="-mt-0.5">{{ FACET_NOTES[note] }}</span>
    </div>
    <FacetGroup
      title="Category"
      :facet="facets.category"
      :options="CATEGORY_OPTIONS"
      :selected="state.categories"
      @toggle="handleCategoryToggle"
    />
    <FacetGroup
      title="Brand"
      :facet="facets.brand"
      :options="BRAND_OPTIONS"
      :selected="state.brands"
      @toggle="handleBrandToggle"
    />
    <fieldset class="flex flex-col gap-0.5">
      <legend :class="LEGEND_CLASS_NAME">Price</legend>
      <label
        v-for="option in PRICE_BAND_OPTIONS"
        :key="option.value"
        :class="checkStyles({ checked: state.priceBand === option.value })"
      >
        <input
          type="radio"
          name="price"
          :checked="state.priceBand === option.value"
          class="size-4 accent-amber-600"
          @change="emit('priceBandSelect', option.value)"
        />
        {{ option.label }}
      </label>
    </fieldset>
    <fieldset class="flex flex-col gap-0.5">
      <legend :class="LEGEND_CLASS_NAME">Rating</legend>
      <label
        v-for="option in RATING_OPTIONS"
        :key="option.value"
        :class="
          checkStyles({ checked: (state.minRating ?? 0) === option.value })
        "
      >
        <input
          type="radio"
          name="rating"
          :checked="(state.minRating ?? 0) === option.value"
          class="size-4 accent-amber-600"
          @change="handleRatingSelect(option.value)"
        />
        {{ option.label }}
      </label>
    </fieldset>
    <fieldset class="flex flex-col gap-0.5">
      <legend :class="LEGEND_CLASS_NAME">Availability</legend>
      <label :class="checkStyles({ checked: state.inStockOnly })">
        <input
          type="checkbox"
          :checked="state.inStockOnly"
          class="size-4 accent-amber-600"
          @change="emit('inStockToggle')"
        />
        <span class="min-w-0 flex-1">In stock only</span>
        <span
          v-if="inStockCount !== null"
          class="font-mono text-xs text-stone-500 tabular-nums"
        >
          {{ inStockCount }}
        </span>
      </label>
    </fieldset>
    <button
      type="button"
      class="mx-2 inline-flex items-center gap-1.5 self-start text-sm font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
      @click="emit('clear')"
    >
      <BaseIcon :src="ICONS.eraser" size="small" />
      Clear filters
    </button>
  </div>
</template>
