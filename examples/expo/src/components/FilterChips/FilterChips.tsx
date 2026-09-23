import type React from "react";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  BRAND_OPTIONS,
  CATEGORY_OPTIONS,
} from "examples/shared/outpost/constants/filters";
import { FACET_NOTES } from "examples/shared/outpost/constants/labels";
import { PRICE_BAND_OPTIONS } from "examples/shared/outpost/constants/store";
import { formatFacetCount } from "examples/shared/outpost/formatting/formatFacetCount";
import type { Brand } from "examples/shared/outpost/types/Brand";
import type { Category } from "examples/shared/outpost/types/Category";
import type { PriceBand } from "examples/shared/outpost/types/PriceBand";
import type { StoreResult } from "examples/shared/outpost/types/StoreResult";
import type { StoreState } from "examples/shared/outpost/types/StoreState";
import { getActiveFilters } from "examples/shared/outpost/utils/getActiveFilters";
import { getFacetCountsNote } from "examples/shared/outpost/utils/getFacetCountsNote";
import { getRequestedFacet } from "examples/shared/outpost/utils/getRequestedFacet";
import { Chip } from "src/components/Chip/Chip";
import { COLORS } from "src/utils/constants/colors";

type FilterChipsProps = {
  state: StoreState;
  latest: StoreResult | null;
  onCategoryToggle: (category: Category) => void;
  onBrandToggle: (brand: Brand) => void;
  onPriceBandSelect: (priceBand: PriceBand) => void;
  onInStockToggle: () => void;
  onClearPress: () => void;
};

type FilterRowProps = { title: string; children: ReactNode };

const FilterRow: React.FunctionComponent<FilterRowProps> = ({
  title,
  children,
}) => (
  <View style={styles.group}>
    <Text style={styles.title}>{title}</Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={title}
      contentContainerStyle={styles.row}
    >
      {children}
    </ScrollView>
  </View>
);

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

export const FilterChips: React.FunctionComponent<FilterChipsProps> = ({
  state,
  latest,
  onCategoryToggle,
  onBrandToggle,
  onPriceBandSelect,
  onInStockToggle,
  onClearPress,
}) => {
  const facets = getFacets(latest);
  const note = getFacetCountsNote(state, latest);
  const active = getActiveFilters(state).length;

  const handleCategoryPress = (value: string) => {
    if (!isCategory(value)) {
      return;
    }

    onCategoryToggle(value);
  };

  const handleBrandPress = (value: string) => {
    if (!isBrand(value)) {
      return;
    }

    onBrandToggle(value);
  };

  return (
    <View style={styles.filters}>
      <Text style={styles.note}>{FACET_NOTES[note]}</Text>
      <FilterRow title="Category">
        {CATEGORY_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            count={formatFacetCount(facets.category, option.value)}
            selected={state.categories.some(
              (category) => category === option.value,
            )}
            onPress={() => handleCategoryPress(option.value)}
          />
        ))}
      </FilterRow>
      <FilterRow title="Brand">
        {BRAND_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            count={formatFacetCount(facets.brand, option.value)}
            selected={state.brands.some((brand) => brand === option.value)}
            onPress={() => handleBrandPress(option.value)}
          />
        ))}
      </FilterRow>
      <FilterRow title="Price">
        {PRICE_BAND_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={option.value === state.priceBand}
            onPress={() => onPriceBandSelect(option.value)}
          />
        ))}
      </FilterRow>
      <View style={styles.row}>
        <Chip
          label="In stock only"
          count={formatFacetCount(facets.inStock, true)}
          selected={state.inStockOnly}
          onPress={onInStockToggle}
        />
        {active === 0 ? null : (
          <Chip
            label={`Clear filters (${active})`}
            selected={false}
            onPress={onClearPress}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  filters: { gap: 10 },
  note: { fontSize: 12, color: COLORS.muted },
  group: { gap: 6 },
  title: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: COLORS.muted,
  },
  row: { flexDirection: "row", gap: 6 },
});
